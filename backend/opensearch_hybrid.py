import logging
import os
import time
from typing import Any, Optional

from openai import OpenAI
from opensearchpy import NotFoundError, OpenSearch

logger = logging.getLogger(__name__)

INDEX_NAME = "inventory_items"
PIPELINE_NAME = "hybrid_search_pipeline"
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def _float_env(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return float(raw)
    except ValueError:
        logger.warning("Invalid %s=%r; using default %s", name, raw, default)
        return default


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning("Invalid %s=%r; using default %s", name, raw, default)
        return default


# Drop weak hybrid matches after min-max combination.
HYBRID_SEARCH_MIN_SCORE = _float_env("HYBRID_SEARCH_MIN_SCORE", 0.25)
HYBRID_SEARCH_RELATIVE_SCORE_RATIO = _float_env(
    "HYBRID_SEARCH_RELATIVE_SCORE_RATIO", 0.55
)
HYBRID_SEARCH_TEXT_WEIGHT = _float_env("HYBRID_SEARCH_TEXT_WEIGHT", 0.7)
HYBRID_SEARCH_VECTOR_WEIGHT = _float_env("HYBRID_SEARCH_VECTOR_WEIGHT", 0.3)
CHAT_SEARCH_CANDIDATE_LIMIT = _int_env("CHAT_SEARCH_CANDIDATE_LIMIT", 20)
CHAT_SEARCH_RESULT_LIMIT = _int_env("CHAT_SEARCH_RESULT_LIMIT", 5)
PHRASE_MATCH_SLOP = _int_env("HYBRID_SEARCH_PHRASE_SLOP", 3)
PHRASE_MATCH_BOOST = _float_env("HYBRID_SEARCH_PHRASE_BOOST", 4.0)


def search_debug_enabled() -> bool:
    return os.environ.get("SEARCH_DEBUG", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _hybrid_weights() -> tuple[float, float]:
    text_w = max(HYBRID_SEARCH_TEXT_WEIGHT, 0.0)
    vector_w = max(HYBRID_SEARCH_VECTOR_WEIGHT, 0.0)
    total = text_w + vector_w
    if total <= 0:
        return 0.7, 0.3
    return text_w / total, vector_w / total


def hybrid_pipeline_body() -> dict[str, Any]:
    text_weight, vector_weight = _hybrid_weights()
    return {
        "description": "Normalize and combine hybrid text + vector scores",
        "phase_results_processors": [
            {
                "normalization-processor": {
                    "normalization": {"technique": "min_max"},
                    "combination": {
                        "technique": "arithmetic_mean",
                        "parameters": {"weights": [text_weight, vector_weight]},
                    },
                },
            },
        ],
    }


TAGS_MAPPING: dict[str, Any] = {
    "type": "text",
    "analyzer": "english",
    "fields": {
        "keyword": {
            "type": "keyword",
            "ignore_above": 256,
        }
    },
}

INDEX_BODY: dict[str, Any] = {
    "settings": {
        "index.knn": True,
    },
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "english"},
            "description": {"type": "text", "analyzer": "english"},
            "tags": TAGS_MAPPING,
            "description_vector": {
                "type": "knn_vector",
                "dimension": EMBEDDING_DIM,
                "method": {
                    "name": "hnsw",
                    "space_type": "cosinesimil",
                    "engine": "lucene",
                    "parameters": {},
                },
            },
            "user_id": {"type": "keyword"},
        },
    },
}


def get_opensearch_client() -> OpenSearch:
    url = os.environ.get("OPENSEARCH_URL", "http://localhost:9200")
    username = os.environ.get("OPENSEARCH_USERNAME")
    password = os.environ.get("OPENSEARCH_PASSWORD")
    kwargs: dict[str, Any] = {
        "hosts": [url],
        "use_ssl": url.startswith("https"),
        "verify_certs": os.environ.get("OPENSEARCH_VERIFY_CERTS", "false").lower()
        == "true",
        "ssl_show_warn": False,
    }
    if username and password:
        kwargs["http_auth"] = (username, password)
    return OpenSearch(**kwargs)


def ensure_inventory_index(client: OpenSearch) -> None:
    if client.indices.exists(index=INDEX_NAME):
        client.indices.put_mapping(
            index=INDEX_NAME,
            body={"properties": {"tags": TAGS_MAPPING}},
        )
        logger.info("OpenSearch index %s exists; ensured tags mapping", INDEX_NAME)
        return
    client.indices.create(index=INDEX_NAME, body=INDEX_BODY)
    logger.info("Created OpenSearch index %s", INDEX_NAME)


def ensure_hybrid_search_pipeline(client: OpenSearch) -> None:
    client.transport.perform_request(
        method="PUT",
        url=f"/_search/pipeline/{PIPELINE_NAME}",
        body=hybrid_pipeline_body(),
    )
    logger.info("Provisioned search pipeline %s", PIPELINE_NAME)


def initialize_opensearch(
    *,
    max_retries: int = 30,
    retry_delay_seconds: float = 2.0,
) -> None:
    """Ensure the inventory index and hybrid search pipeline exist at startup."""
    last_error: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            client = get_opensearch_client()
            if not client.ping():
                raise RuntimeError("OpenSearch ping failed")
            ensure_inventory_index(client)
            ensure_hybrid_search_pipeline(client)
            return
        except Exception as exc:
            last_error = exc
            if attempt < max_retries:
                logger.warning(
                    "OpenSearch init attempt %s/%s failed: %s",
                    attempt,
                    max_retries,
                    exc,
                )
                time.sleep(retry_delay_seconds)
    raise RuntimeError(
        f"Failed to initialize OpenSearch after {max_retries} attempts"
    ) from last_error


def build_embedding_input(
    name: str,
    description: str,
    tags: Optional[list[str]] = None,
) -> str:
    parts: list[str] = []
    trimmed_name = (name or "").strip()
    trimmed_description = (description or "").strip()
    if trimmed_name:
        parts.append(trimmed_name)
    if trimmed_description:
        parts.append(trimmed_description)
    cleaned_tags = [
        tag.strip()
        for tag in (tags or [])
        if isinstance(tag, str) and tag.strip()
    ]
    if cleaned_tags:
        parts.append("Tags: " + ", ".join(cleaned_tags))
    return "\n".join(parts)


def create_description_embedding(client: OpenAI, description: str) -> list[float]:
    trimmed = (description or "").strip()
    if not trimmed:
        return [0.0] * EMBEDDING_DIM
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=trimmed[:8000],
    )
    embedding = response.data[0].embedding
    if len(embedding) != EMBEDDING_DIM:
        raise ValueError(f"Expected {EMBEDDING_DIM} dimensions, got {len(embedding)}")
    return embedding


def ingest_item(
    *,
    item_id: str,
    name: str,
    description: str,
    user_id: str,
    openai_client: OpenAI,
    tags: Optional[list[str]] = None,
    opensearch_client: Optional[OpenSearch] = None,
) -> None:
    """Embed name + description + tags and index the item in OpenSearch."""
    os_client = opensearch_client or get_opensearch_client()
    tag_list = [
        tag.strip()
        for tag in (tags or [])
        if isinstance(tag, str) and tag.strip()
    ]
    vector = create_description_embedding(
        openai_client,
        build_embedding_input(name, description, tag_list),
    )
    document = {
        "id": item_id,
        "name": name or "",
        "description": description or "",
        "tags": tag_list,
        "description_vector": vector,
        "user_id": user_id,
    }
    os_client.index(index=INDEX_NAME, id=item_id, body=document, refresh=True)


def delete_item_from_index(
    item_id: str,
    opensearch_client: Optional[OpenSearch] = None,
) -> None:
    os_client = opensearch_client or get_opensearch_client()
    try:
        os_client.delete(index=INDEX_NAME, id=item_id, refresh=True)
    except NotFoundError:
        return


def _product_noun_clause(noun: str) -> dict[str, Any]:
    """Require the noun to match name, tags, or description via index analyzers."""
    return {
        "multi_match": {
            "query": noun,
            "fields": ["name", "tags", "description"],
            "operator": "and",
            "type": "best_fields",
        }
    }


def _retrieval_filter_clauses(
    user_id: str,
    product_nouns: Optional[list[str]] = None,
) -> list[dict[str, Any]]:
    clauses: list[dict[str, Any]] = [{"term": {"user_id": user_id}}]
    nouns = [
        noun.strip()
        for noun in (product_nouns or [])
        if isinstance(noun, str) and noun.strip()
    ]
    for noun in nouns:
        clauses.append(_product_noun_clause(noun))
    return clauses


def apply_hybrid_score_cutoffs(
    items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Keep hits that clear the absolute floor and stay close to the top score."""
    qualified = [
        item
        for item in items
        if float(item.get("score") or 0.0) >= HYBRID_SEARCH_MIN_SCORE
    ]
    if not qualified:
        return []
    top_score = max(float(item.get("score") or 0.0) for item in qualified)
    relative_floor = top_score * HYBRID_SEARCH_RELATIVE_SCORE_RATIO
    return [
        item
        for item in qualified
        if float(item.get("score") or 0.0) >= relative_floor
    ]


def hybrid_search_descriptions(
    *,
    query_text: str,
    user_id: str,
    limit: int = 20,
    product_nouns: Optional[list[str]] = None,
    phrase_text: Optional[str] = None,
    openai_client: OpenAI,
    opensearch_client: Optional[OpenSearch] = None,
) -> list[dict[str, Any]]:
    """
    Hybrid search: boosted lexical match on name/tags/description + kNN.
    Tenant and optional product-noun constraints are applied during retrieval.
    """
    trimmed = (query_text or "").strip()
    if len(trimmed) < 2:
        return []

    os_client = opensearch_client or get_opensearch_client()
    query_vector = create_description_embedding(openai_client, trimmed)
    filter_clauses = _retrieval_filter_clauses(user_id, product_nouns)
    retrieval_filter: dict[str, Any] = {"bool": {"filter": filter_clauses}}

    lexical_bool: dict[str, Any] = {
        "bool": {
            "filter": filter_clauses,
            "must": [
                {
                    "multi_match": {
                        "query": trimmed,
                        "fields": ["name^5", "tags^4", "description^3"],
                        "fuzziness": "AUTO",
                        "type": "best_fields",
                    }
                }
            ],
        }
    }
    phrase = (phrase_text or "").strip()
    if len(phrase) >= 2:
        lexical_bool["bool"]["should"] = [
            {
                "match_phrase": {
                    "description": {
                        "query": phrase,
                        "slop": PHRASE_MATCH_SLOP,
                        "boost": PHRASE_MATCH_BOOST,
                    }
                }
            }
        ]

    search_body: dict[str, Any] = {
        "_source": {"exclude": ["description_vector"]},
        "size": limit,
        "post_filter": retrieval_filter,
        "query": {
            "hybrid": {
                "queries": [
                    lexical_bool,
                    {
                        "knn": {
                            "description_vector": {
                                "vector": query_vector,
                                "k": limit,
                                "filter": retrieval_filter,
                            }
                        }
                    },
                ]
            }
        },
    }

    response = os_client.search(
        index=INDEX_NAME,
        body=search_body,
        params={"search_pipeline": PIPELINE_NAME},
    )

    hits = response.get("hits", {}).get("hits", [])
    results: list[dict[str, Any]] = []
    for hit in hits:
        source = hit.get("_source", {})
        results.append(
            {
                "id": source.get("id") or hit.get("_id"),
                "name": source.get("name"),
                "description": source.get("description"),
                "score": float(hit.get("_score") or 0.0),
            }
        )
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    initialize_opensearch()
    print(f"OpenSearch ready: index={INDEX_NAME}, pipeline={PIPELINE_NAME}")
