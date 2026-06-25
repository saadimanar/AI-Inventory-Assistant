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
# Drop weak hybrid matches (loose vector neighbors) common in small inventories.
HYBRID_SEARCH_MIN_SCORE = 0.05

INDEX_BODY: dict[str, Any] = {
    "settings": {
        "index.knn": True,
    },
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "english"},
            "description": {"type": "text", "analyzer": "english"},
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

PIPELINE_BODY: dict[str, Any] = {
    "description": "Normalize and combine hybrid text + vector scores",
    "phase_results_processors": [
        {
            "normalization-processor": {
                "normalization": {"technique": "min_max"},
                "combination": {"technique": "arithmetic_mean"},
            },
        },
    ],
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
        logger.info("OpenSearch index %s already exists", INDEX_NAME)
        return
    client.indices.create(index=INDEX_NAME, body=INDEX_BODY)
    logger.info("Created OpenSearch index %s", INDEX_NAME)


def ensure_hybrid_search_pipeline(client: OpenSearch) -> None:
    client.transport.perform_request(
        method="PUT",
        url=f"/_search/pipeline/{PIPELINE_NAME}",
        body=PIPELINE_BODY,
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
    opensearch_client: Optional[OpenSearch] = None,
) -> None:
    """Embed the description and index the item in OpenSearch."""
    os_client = opensearch_client or get_opensearch_client()
    vector = create_description_embedding(openai_client, description)
    document = {
        "id": item_id,
        "name": name,
        "description": description,
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


def hybrid_search_descriptions(
    *,
    query_text: str,
    user_id: str,
    limit: int = 20,
    openai_client: OpenAI,
    opensearch_client: Optional[OpenSearch] = None,
) -> list[dict[str, Any]]:
    """
    Run hybrid search: fuzzy match on description + kNN on description_vector.
    Uses the hybrid_search_pipeline for min_max + arithmetic_mean score blending.
    """
    trimmed = (query_text or "").strip()
    if len(trimmed) < 2:
        return []

    os_client = opensearch_client or get_opensearch_client()
    query_vector = create_description_embedding(openai_client, trimmed)

    search_body: dict[str, Any] = {
        "_source": {"exclude": ["description_vector"]},
        "size": limit,
        "post_filter": {"term": {"user_id": user_id}},
        "query": {
            "hybrid": {
                "queries": [
                    {
                        "match": {
                            "description": {
                                "query": trimmed,
                                "fuzziness": "AUTO",
                            },
                        },
                    },
                    {
                        "knn": {
                            "description_vector": {
                                "vector": query_vector,
                                "k": limit,
                            },
                        },
                    },
                ],
            },
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
