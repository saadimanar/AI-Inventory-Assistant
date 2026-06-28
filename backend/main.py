import os
from contextlib import asynccontextmanager
from typing import Any, Optional

from auth import AuthUser, authenticate_request
from chat_search import (
    build_applied_filters,
    extract_search_params,
    has_strong_structured_filters,
)
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

from opensearch_hybrid import (
    HYBRID_SEARCH_MIN_SCORE,
    delete_item_from_index,
    hybrid_search_descriptions,
    ingest_item,
    initialize_opensearch,
)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def create_db_engine() -> Engine:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=5,
        pool_pre_ping=True,
    )


engine = create_db_engine()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_opensearch()
    yield


app = FastAPI(title="inventory-api", lifespan=lifespan)

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHAT_SEARCH_TOP_N = 20


def get_openai_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


def create_embedding(client: OpenAI, input_text: str) -> list[float]:
    trimmed = (input_text or "").strip()
    if not trimmed:
        return [0.0] * EMBEDDING_DIM
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=trimmed[:8000])
    embedding = response.data[0].embedding
    if len(embedding) != EMBEDDING_DIM:
        raise HTTPException(status_code=500, detail="Invalid embedding dimensions")
    return embedding


def embedding_to_pgvector(embedding: list[float]) -> str:
    return "[" + ",".join(str(v) for v in embedding) + "]"


def build_search_text(name: str, description: str, tags: list[str]) -> str:
    parts = [name.strip(), description.strip(), *tags]
    return " ".join(p for p in parts if p).strip()


def row_to_item_json(row: Any) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "name": row.name,
        "description": row.description,
        "quantity": int(row.quantity),
        "min_quantity": int(row.min_quantity),
        "price": float(row.price),
        "sku": row.sku,
        "folder_id": str(row.folder_id) if row.folder_id else None,
        "tags": list(row.tags or []),
        "image_url": row.image_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "user_id": str(row.user_id),
        "score": float(row.score) if getattr(row, "score", None) is not None else None,
    }


def row_to_folder_json(row: Any) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "name": row.name,
        "parent_id": str(row.parent_id) if row.parent_id else None,
        "color": row.color,
        "item_count": int(row.item_count),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "user_id": str(row.user_id),
    }


class ItemCreate(BaseModel):
    name: str
    sku: str
    quantity: int
    price: float
    description: str = ""
    folder_id: Optional[str] = None
    min_quantity: int = 0
    tags: list[str] = Field(default_factory=list)
    image_url: Optional[str] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    price: Optional[float] = None
    sku: Optional[str] = None
    folder_id: Optional[str] = None
    tags: Optional[list[str]] = None
    image_url: Optional[str] = None


class SearchFilters(BaseModel):
    name_contains: Optional[str] = None
    description_contains: Optional[str] = None
    tags: Optional[list[str]] = None
    folder_id: Optional[str] = None
    max_price: Optional[float] = None
    min_price: Optional[float] = None
    max_quantity: Optional[int] = None
    min_quantity: Optional[int] = None
    sku_contains: Optional[str] = None
    low_stock_only: Optional[bool] = None


class SearchRequest(BaseModel):
    query: str
    keywords: Optional[list[str]] = None
    user_id: Optional[str] = None
    limit: int = 20
    semantic_query: Optional[str] = None
    fts_query: Optional[str] = None
    filter_only: bool = False
    filters: SearchFilters = Field(default_factory=SearchFilters)


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    color: str = "#6366F1"


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    color: Optional[str] = None


class ChatSearchRequest(BaseModel):
    message: str
    applied_filters: Optional[dict[str, Any]] = None


def to_chat_result_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "name": item["name"],
        "description": item["description"],
        "quantity": item["quantity"],
        "minQuantity": item["min_quantity"],
        "price": item["price"],
        "sku": item["sku"],
        "folderId": item.get("folder_id"),
        "tags": item.get("tags") or [],
        "imageUrl": item.get("image_url"),
        "createdAt": item.get("created_at"),
        "updatedAt": item.get("updated_at"),
        "score": item.get("score"),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/session")
def get_session(user: AuthUser = Depends(authenticate_request)) -> dict[str, str]:
    return {"userId": user.user_id, "displayName": user.display_name}


@app.post("/api/chat/search")
def chat_search(
    body: ChatSearchRequest,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    user_id = user.user_id
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    previous_filters = body.applied_filters

    try:
        extraction = extract_search_params(message, previous_filters)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to understand the request")

    if extraction.get("needs_clarification") and extraction.get("clarifying_question"):
        return {"type": "clarify", "question": extraction["clarifying_question"]}

    intent = extraction.get("intent")

    if intent == "inventory_question":
        summary = _inventory_summary_for_user(user_id)
        parts: list[str] = []
        total = summary["totalItems"]
        unique = summary["uniqueProductCount"]
        parts.append(
            f"You have {total} item{'s' if total != 1 else ''} in total "
            f"({unique} distinct product{'s' if unique != 1 else ''})."
        )
        folders = summary["folderCount"]
        parts.append(f"{folders} folder{'s' if folders != 1 else ''}.")
        parts.append(f"Total value: ${summary['totalValue']:.2f}.")
        if summary["lowStockCount"] > 0:
            low = summary["lowStockCount"]
            parts.append(
                f"{low} low-stock item{'s' if low != 1 else ''} need attention."
            )
        else:
            parts.append("No low-stock items.")
        return {"type": "answer", "message": " ".join(parts)}

    if intent != "search_items":
        return {
            "type": "clarify",
            "question": (
                "I can only help with searching your inventory or answering questions "
                "about it (e.g. how many items, total value). Try something like: "
                "items under $50, or how many items do I have?"
            ),
        }

    semantic_query = (extraction.get("semantic_query") or "").strip()
    filters = extraction.get("filters") or {}
    strong_filters = has_strong_structured_filters(filters)

    if len(semantic_query) < 2 and not strong_filters:
        return {
            "type": "clarify",
            "question": (
                "What item are you looking for? You can try: a name or description, "
                "SKU (e.g. SSD-6001), tags (e.g. electronics), price (e.g. under $30), "
                "or low stock items."
            ),
        }

    use_filter_only = len(semantic_query) < 2 and strong_filters
    fts_query_for_rpc = (
        None
        if use_filter_only
        else semantic_query
        if len(semantic_query) >= 2
        else None
    )

    if not use_filter_only and not fts_query_for_rpc and len(semantic_query) < 2:
        return {
            "type": "results",
            "items": [],
            "appliedFilters": build_applied_filters(filters),
        }

    search_body = SearchRequest(
        query=message,
        user_id=user_id,
        limit=CHAT_SEARCH_TOP_N,
        semantic_query=semantic_query,
        fts_query=fts_query_for_rpc,
        filter_only=use_filter_only,
        filters=SearchFilters(
            **{
                k: v
                for k, v in filters.items()
                if k in SearchFilters.model_fields and v is not None
            }
        ),
    )
    raw_items = _run_hybrid_search(user_id, search_body)
    return {
        "type": "results",
        "items": [to_chat_result_item(i) for i in raw_items],
        "appliedFilters": build_applied_filters(filters),
    }


@app.post("/api/items")
def create_item(
    body: ItemCreate,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    user_id = user.user_id
    client = get_openai_client()
    embedding = create_embedding(client, body.description)
    search_text = build_search_text(body.name, body.description, body.tags)
    embedding_str = embedding_to_pgvector(embedding)

    sql = text(
        """
        INSERT INTO items (
          name, description, quantity, min_quantity, price, sku,
          folder_id, tags, image_url, user_id, search_text, embedding
        ) VALUES (
          :name, :description, :quantity, :min_quantity, :price, :sku,
          :folder_id, :tags, :image_url, :user_id, :search_text, CAST(:embedding AS vector(1536))
        )
        RETURNING *
        """
    )

    with engine.begin() as conn:
        row = conn.execute(
            sql,
            {
                "name": body.name,
                "description": body.description,
                "quantity": body.quantity,
                "min_quantity": body.min_quantity,
                "price": body.price,
                "sku": body.sku,
                "folder_id": body.folder_id,
                "tags": body.tags,
                "image_url": body.image_url,
                "user_id": user_id,
                "search_text": search_text,
                "embedding": embedding_str,
            },
        ).fetchone()

    if not row:
        raise HTTPException(status_code=500, detail="Failed to create item")

    try:
        ingest_item(
            item_id=str(row.id),
            name=row.name,
            description=row.description or "",
            user_id=user_id,
            openai_client=client,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to index item in OpenSearch")

    return {"item": row_to_item_json(row)}


@app.get("/api/items")
def list_items(user: AuthUser = Depends(authenticate_request)) -> dict[str, Any]:
    user_id = user.user_id
    sql = text(
        "SELECT * FROM items WHERE user_id = :user_id ORDER BY updated_at DESC"
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"user_id": user_id}).fetchall()
    return {"items": [row_to_item_json(r) for r in rows]}


@app.patch("/api/items/{item_id}")
def update_item(
    item_id: str,
    body: ItemUpdate,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    user_id = user.user_id
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        sql = text("SELECT * FROM items WHERE id = :id AND user_id = :user_id")
        with engine.connect() as conn:
            row = conn.execute(sql, {"id": item_id, "user_id": user_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"item": row_to_item_json(row)}

    column_map = {
        "name": "name",
        "description": "description",
        "quantity": "quantity",
        "min_quantity": "min_quantity",
        "price": "price",
        "sku": "sku",
        "folder_id": "folder_id",
        "tags": "tags",
        "image_url": "image_url",
    }
    set_parts = []
    params: dict[str, Any] = {"id": item_id, "user_id": user_id}
    for key, value in updates.items():
        col = column_map.get(key)
        if col:
            set_parts.append(f"{col} = :{key}")
            params[key] = value

    sql = text(
        f"UPDATE items SET {', '.join(set_parts)} WHERE id = :id AND user_id = :user_id RETURNING *"
    )
    with engine.begin() as conn:
        row = conn.execute(sql, params).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")

    if "name" in updates or "description" in updates:
        try:
            client = get_openai_client()
            ingest_item(
                item_id=str(row.id),
                name=row.name,
                description=row.description or "",
                user_id=user_id,
                openai_client=client,
            )
        except Exception:
            raise HTTPException(
                status_code=500, detail="Failed to update item in OpenSearch"
            )

    return {"item": row_to_item_json(row)}


@app.delete("/api/items/{item_id}")
def delete_item(
    item_id: str,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, bool]:
    user_id = user.user_id
    sql = text("DELETE FROM items WHERE id = :id AND user_id = :user_id")
    with engine.begin() as conn:
        result = conn.execute(sql, {"id": item_id, "user_id": user_id})
    deleted = (result.rowcount or 0) > 0
    if deleted:
        try:
            delete_item_from_index(item_id)
        except Exception:
            raise HTTPException(
                status_code=500, detail="Failed to remove item from OpenSearch"
            )
    return {"ok": deleted}


@app.post("/api/items/{item_id}/embedding")
def refresh_item_embedding(
    item_id: str,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, bool]:
    user_id = user.user_id
    select_sql = text(
        "SELECT id, name, description, tags FROM items WHERE id = :id AND user_id = :user_id"
    )
    with engine.connect() as conn:
        row = conn.execute(select_sql, {"id": item_id, "user_id": user_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")

    search_text = build_search_text(row.name or "", row.description or "", list(row.tags or []))
    client = get_openai_client()
    embedding = create_embedding(client, search_text)
    embedding_str = embedding_to_pgvector(embedding)

    update_sql = text(
        """
        UPDATE items SET search_text = :search_text, embedding = CAST(:embedding AS vector(1536))
        WHERE id = :id AND user_id = :user_id
        """
    )
    with engine.begin() as conn:
        conn.execute(
            update_sql,
            {
                "search_text": search_text,
                "embedding": embedding_str,
                "id": item_id,
                "user_id": user_id,
            },
        )

    try:
        ingest_item(
            item_id=item_id,
            name=row.name or "",
            description=row.description or "",
            user_id=user_id,
            openai_client=client,
        )
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to refresh item in OpenSearch"
        )

    return {"ok": True}


@app.get("/api/folders")
def list_folders(user: AuthUser = Depends(authenticate_request)) -> dict[str, Any]:
    user_id = user.user_id
    sql = text(
        "SELECT * FROM folders WHERE user_id = :user_id ORDER BY created_at ASC"
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"user_id": user_id}).fetchall()
    return {"folders": [row_to_folder_json(r) for r in rows]}


@app.post("/api/folders")
def create_folder(
    body: FolderCreate,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    user_id = user.user_id
    sql = text(
        """
        INSERT INTO folders (name, parent_id, color, user_id)
        VALUES (:name, :parent_id, :color, :user_id)
        RETURNING *
        """
    )
    with engine.begin() as conn:
        row = conn.execute(
            sql,
            {
                "name": body.name,
                "parent_id": body.parent_id,
                "color": body.color,
                "user_id": user_id,
            },
        ).fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create folder")
    return {"folder": row_to_folder_json(row)}


@app.patch("/api/folders/{folder_id}")
def update_folder(
    folder_id: str,
    body: FolderUpdate,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    user_id = user.user_id
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        sql = text("SELECT * FROM folders WHERE id = :id AND user_id = :user_id")
        with engine.connect() as conn:
            row = conn.execute(sql, {"id": folder_id, "user_id": user_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Folder not found")
        return {"folder": row_to_folder_json(row)}

    column_map = {"name": "name", "parent_id": "parent_id", "color": "color"}
    set_parts = []
    params: dict[str, Any] = {"id": folder_id, "user_id": user_id}
    for key, value in updates.items():
        col = column_map.get(key)
        if col:
            set_parts.append(f"{col} = :{key}")
            params[key] = value

    sql = text(
        f"UPDATE folders SET {', '.join(set_parts)} WHERE id = :id AND user_id = :user_id RETURNING *"
    )
    with engine.begin() as conn:
        row = conn.execute(sql, params).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"folder": row_to_folder_json(row)}


@app.delete("/api/folders/{folder_id}")
def delete_folder(
    folder_id: str,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, bool]:
    user_id = user.user_id
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE items SET folder_id = NULL WHERE folder_id = :id AND user_id = :user_id"),
            {"id": folder_id, "user_id": user_id},
        )
        result = conn.execute(
            text("DELETE FROM folders WHERE id = :id AND user_id = :user_id"),
            {"id": folder_id, "user_id": user_id},
        )
    return {"ok": (result.rowcount or 0) > 0}


def _inventory_summary_for_user(user_id: str) -> dict[str, Any]:
    items_sql = text(
        "SELECT quantity, min_quantity, price FROM items WHERE user_id = :user_id"
    )
    folders_sql = text(
        "SELECT COUNT(*)::int AS count FROM folders WHERE user_id = :user_id"
    )
    with engine.connect() as conn:
        items = conn.execute(items_sql, {"user_id": user_id}).fetchall()
        folder_row = conn.execute(folders_sql, {"user_id": user_id}).fetchone()

    total_items = sum(int(r.quantity) for r in items)
    total_value = sum(float(r.quantity) * float(r.price) for r in items)
    low_stock_count = sum(
        1 for r in items if int(r.quantity) <= int(r.min_quantity)
    )
    folder_count = int(folder_row.count) if folder_row else 0

    return {
        "totalItems": total_items,
        "totalValue": total_value,
        "lowStockCount": low_stock_count,
        "uniqueProductCount": len(items),
        "folderCount": folder_count,
    }


@app.get("/api/inventory/summary")
def inventory_summary(
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    return _inventory_summary_for_user(user.user_id)


def _apply_search_filters(
    items: list[dict[str, Any]],
    f: SearchFilters,
    keywords: Optional[list[str]],
) -> list[dict[str, Any]]:
    if f.name_contains:
        needle = f.name_contains.lower()
        items = [i for i in items if needle in (i.get("name") or "").lower()]
    if f.description_contains:
        needle = f.description_contains.lower()
        items = [
            i for i in items if needle in (i.get("description") or "").lower()
        ]
    if f.folder_id:
        items = [i for i in items if i.get("folder_id") == f.folder_id]
    if f.max_price is not None:
        items = [i for i in items if float(i["price"]) <= f.max_price]
    if f.min_price is not None:
        items = [i for i in items if float(i["price"]) >= f.min_price]
    if f.max_quantity is not None:
        items = [i for i in items if int(i["quantity"]) <= f.max_quantity]
    if f.min_quantity is not None:
        items = [i for i in items if int(i["quantity"]) >= f.min_quantity]
    if f.tags and len(f.tags) > 0:
        tag_set = {t.lower() for t in f.tags}
        items = [
            i
            for i in items
            if tag_set.intersection({(t or "").lower() for t in (i.get("tags") or [])})
        ]
    if f.sku_contains:
        sku = f.sku_contains.lower()
        items = [i for i in items if sku in (i.get("sku") or "").lower()]
    if f.low_stock_only:
        items = [
            i
            for i in items
            if int(i["quantity"]) <= int(i["min_quantity"])
        ]
    if keywords:
        lowered = [k.lower() for k in keywords if k.strip()]
        if lowered:
            items = [
                i
                for i in items
                if any(
                    kw in (i.get("name") or "").lower()
                    or kw in (i.get("description") or "").lower()
                    or kw in (i.get("sku") or "").lower()
                    for kw in lowered
                )
            ]
    return items


def _fetch_items_by_ids(user_id: str, item_ids: list[str]) -> list[dict[str, Any]]:
    if not item_ids:
        return []
    sql = text(
        """
        SELECT * FROM items
        WHERE user_id = :user_id AND id::text = ANY(:item_ids)
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(
            sql, {"user_id": user_id, "item_ids": item_ids}
        ).fetchall()
    return [row_to_item_json(r) for r in rows]


def _run_hybrid_search(user_id: str, body: SearchRequest) -> list[dict[str, Any]]:
    semantic = (body.semantic_query or body.query or "").strip()
    fts_query = body.fts_query
    f = body.filters

    if body.filter_only or (len(semantic) < 2 and not fts_query):
        return _structured_search(
            user_id, body.limit, f, semantic if len(semantic) >= 2 else None
        )

    query_text = (fts_query or semantic).strip()
    if len(query_text) < 2:
        return []

    client = get_openai_client()
    try:
        os_hits = hybrid_search_descriptions(
            query_text=query_text,
            user_id=user_id,
            limit=body.limit,
            openai_client=client,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="OpenSearch hybrid search failed")

    if not os_hits:
        return []

    # Trim loose semantic/hybrid noise before loading full items from Postgres.
    os_hits = [hit for hit in os_hits if hit["score"] >= HYBRID_SEARCH_MIN_SCORE]
    if not os_hits:
        return []

    score_by_id = {hit["id"]: hit["score"] for hit in os_hits}
    ordered_ids = [hit["id"] for hit in os_hits]
    items = _fetch_items_by_ids(user_id, ordered_ids)
    items.sort(key=lambda i: score_by_id.get(i["id"], 0.0), reverse=True)
    for item in items:
        item["score"] = score_by_id.get(item["id"])
    items = _apply_search_filters(items, f, body.keywords)
    return items[: body.limit]


@app.post("/api/search")
def hybrid_search(
    body: SearchRequest,
    user: AuthUser = Depends(authenticate_request),
) -> dict[str, Any]:
    return {"items": _run_hybrid_search(user.user_id, body)}


def _structured_search(
    user_id: str,
    limit: int,
    f: SearchFilters,
    semantic_query: Optional[str],
) -> list[dict[str, Any]]:
    conditions = ["user_id = :user_id"]
    params: dict[str, Any] = {"user_id": user_id, "limit": limit}

    def add_ilike(column: str, value: Optional[str], param: str) -> None:
        if value and value.strip():
            conditions.append(f"{column} ILIKE :{param}")
            params[param] = f"%{value.strip()}%"

    add_ilike("name", f.name_contains, "name_contains")
    add_ilike("description", f.description_contains, "description_contains")
    add_ilike("sku", f.sku_contains, "sku_contains")

    if f.folder_id:
        conditions.append("folder_id = :folder_id")
        params["folder_id"] = f.folder_id
    if f.max_price is not None:
        conditions.append("price <= :max_price")
        params["max_price"] = f.max_price
    if f.min_price is not None:
        conditions.append("price >= :min_price")
        params["min_price"] = f.min_price
    if f.max_quantity is not None:
        conditions.append("quantity <= :max_quantity")
        params["max_quantity"] = f.max_quantity
    if f.min_quantity is not None:
        conditions.append("quantity >= :min_quantity")
        params["min_quantity"] = f.min_quantity
    if f.tags and len(f.tags) > 0:
        conditions.append("tags && :tags")
        params["tags"] = f.tags

    if semantic_query and semantic_query.strip():
        for idx, word in enumerate(semantic_query.strip().split()):
            key = f"sem_{idx}"
            conditions.append(f"(name ILIKE :{key} OR description ILIKE :{key})")
            params[key] = f"%{word}%"

    sql = text(
        f"""
        SELECT id, name, description, quantity, min_quantity, price, sku,
               folder_id, tags, image_url, created_at, updated_at, user_id
        FROM items
        WHERE {' AND '.join(conditions)}
        ORDER BY updated_at DESC
        LIMIT :limit
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, params).fetchall()

    items = [row_to_item_json(r) for r in rows]
    if f.low_stock_only:
        items = [
            i
            for i in items
            if int(i["quantity"]) <= int(i["min_quantity"])
        ]
    return items
