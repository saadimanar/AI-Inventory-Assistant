import json
import os
from typing import Any, Optional

from openai import OpenAI

SYSTEM_PROMPT = """You are a strict JSON extractor for an inventory app. The user can either SEARCH for items or ask GENERAL QUESTIONS about their inventory.

INTENTS:
- "search_items": user wants to find/list items. This includes:
  - Explicit requests: "show me oak tables", "items under $50", "find sku SSD-6001", "electronics items", "low stock items".
  - Natural product-style phrases (treat as search_items by default): short descriptions of what they want, even without "find" or "show me". Examples: "headphones with active noise", "wireless mouse", "storage device", "office chair with lumbar support", "noise cancelling headphones", "USB cable". Put the phrase in semantic_query; intent = "search_items".
- "inventory_question": user asks about inventory overview/counts (e.g. "how many items do I have?", "what's my total value?", "how many low stock?", "how many folders?", "give me a summary").
- "other": only when the message is clearly not about inventory (e.g. weather, off-topic) or is too vague with no product/filter hint. Do NOT use "other" for product descriptions like "headphones with active noise".

The items table has ONLY these filterable fields (for search_items only):
- name (text), description (text), tags (array of strings), folder_id (UUID), quantity, min_quantity, price (dollars), sku (text)
- low_stock_only (boolean): set TRUE when user asks for "low stock", "below minimum quantity", "items that need reordering", "under minimum". This filters items where quantity <= min_quantity.
We do NOT have dedicated filter fields for: category, material, color, shape, size, dimensions, location.

PRODUCT NOUNS (product_nouns):
- When the user names an explicit product type, extract the HEAD NOUN(S) into product_nouns.
- Examples:
  - "Find me a chair that stays cool" → product_nouns: ["chair"], semantic_query: "stays cool"
  - "Show me wireless headphones" → product_nouns: ["headphones"], semantic_query: "wireless"
  - "office chair with lumbar support" → product_nouns: ["chair"], semantic_query: "office lumbar support"
  - "I need a standing desk" → product_nouns: ["desk"], semantic_query: "standing"
  - "find a barcode scanner" → product_nouns: ["scanner"], semantic_query: "barcode"
- Use the product type head noun only (chair, headphones, desk, mouse, scanner, camera, table, monitor). Do NOT include adjectives (wireless, office, standing, ergonomic).
- Do NOT put product nouns in filters.name_contains or filters.description_contains. They may appear in name, tags, or description.
- If the user only paraphrases a need with NO explicit product type, set product_nouns to null:
  - "I need something comfortable to sit on" → product_nouns: null, semantic_query: "something comfortable to sit on"
  - "computer accessories", "office supplies" → product_nouns: null, semantic_query: that phrase
- product_nouns is NOT the same as filters.tags. Only set filters.tags when the user asks for a tag (e.g. "tagged electronics").

EXACT STRUCTURED QUERIES (put in filters, semantic_query can be null or minimal):
- "find item with sku X", "sku SSD-6001", "look up SKU-123" → filters.sku_contains = "X" or "SSD-6001" or "SKU-123" (normalize to the code part). semantic_query = null.
- "electronics items", "tagged electronics", "items with tag office" → filters.tags = ["electronics"] or ["office"]. semantic_query can be null or the same for hybrid.
- "items cheaper than 30", "under $50", "below 100 dollars" → filters.max_price = 30 or 50 or 100. semantic_query = null or short phrase.
- "items over $20", "more than 10 dollars" → filters.min_price = 20 or 10.
- "low stock", "items below minimum quantity", "need reorder" → filters.low_stock_only = true. semantic_query = null.

DESCRIPTIVE / SEMANTIC QUERIES (put in semantic_query, filters only if explicit):
- Put the DESCRIPTIVE remainder in semantic_query after extracting product_nouns.
- "Find me a chair that stays cool during long work sessions" → product_nouns: ["chair"], semantic_query: "stays cool during long work sessions".
- Do NOT put descriptive phrases in name_contains/description_contains (semantic search handles synonyms).
- Natural product phrases without "find"/"show" still extract product_nouns when a type is named.

Normalize units: $50 -> 50, "under 100" for price -> max_price 100. Parse numbers from text.

Output ONLY valid JSON with this exact shape (no markdown, no backticks):
{
  "intent": "search_items" | "inventory_question" | "other",
  "filters": {
    "name_contains": string | null,
    "description_contains": string | null,
    "tags": string[] | null,
    "folder_id": string | null,
    "max_price": number | null,
    "min_price": number | null,
    "max_quantity": number | null,
    "min_quantity": number | null,
    "sku_contains": string | null,
    "low_stock_only": boolean | null
  },
  "semantic_query": string | null,
  "product_nouns": string[] | null,
  "needs_clarification": boolean,
  "clarifying_question": string | null
}

Rules:
- Default for short product-like phrases: if the user message looks like a product or item description (e.g. "headphones with active noise", "wireless mouse", "storage device"), set intent = "search_items". Extract product_nouns when an explicit type is named; put remaining description in semantic_query.
- SKU lookup: always set sku_contains with the SKU/code the user mentioned; set semantic_query to null for pure SKU lookups.
- Tag lookup: set tags to the tag(s) the user asked for (e.g. ["electronics"]). semantic_query can be null.
- Price: set max_price for "cheaper than X", min_price for "over X". semantic_query can be null.
- low_stock_only: set true for "low stock", "below minimum quantity", "need reorder". semantic_query = null.
- For paraphrases with no product type (e.g. "something comfortable to sit on") put the phrase in semantic_query; product_nouns = null; leave name_contains/description_contains null.
- If the user asks how many items, total value, low stock count, folders, or summary, set intent to "inventory_question". Leave filters, semantic_query, and product_nouns null.
- If too vague or not about inventory (e.g. "hello", "what's the weather"), set intent to "other". Do NOT use "other" for product descriptions.
- Only set needs_clarification when the user explicitly asks to filter by a field we don't have; never when they describe what they want in words."""


def normalize_product_nouns(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        candidates = [value]
    elif isinstance(value, list):
        candidates = value
    else:
        return []
    nouns: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        if not isinstance(item, str):
            continue
        noun = item.strip().lower()
        if not noun or noun in seen:
            continue
        seen.add(noun)
        nouns.append(noun)
    return nouns


def extract_search_params(
    message: str,
    previous_filters: Optional[dict[str, Any]] = None,
    client: Optional[OpenAI] = None,
) -> dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "intent": "search_items",
            "filters": previous_filters or {},
            "semantic_query": message.strip() or None,
            "product_nouns": normalize_product_nouns(
                (previous_filters or {}).get("product_nouns")
            )
            or None,
            "needs_clarification": False,
            "clarifying_question": None,
        }

    user_content = message
    if previous_filters:
        user_content = (
            f"Previous applied filters (for follow-up): {json.dumps(previous_filters)}\n\n"
            f"User message: {message}"
        )

    if client is None:
        client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    raw = (response.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("Empty LLM response")

    parsed = json.loads(raw)
    if not parsed.get("filters"):
        parsed["filters"] = {}
    nouns = normalize_product_nouns(parsed.get("product_nouns"))
    parsed["product_nouns"] = nouns or None
    # Product nouns belong in product_nouns, not name_contains.
    name_contains = parsed["filters"].get("name_contains")
    if (
        isinstance(name_contains, str)
        and name_contains.strip().lower() in set(nouns)
    ):
        parsed["filters"]["name_contains"] = None
    return parsed


def has_strong_structured_filters(filters: dict[str, Any]) -> bool:
    return bool(
        (isinstance(filters.get("sku_contains"), str) and filters["sku_contains"].strip())
        or (isinstance(filters.get("tags"), list) and len(filters["tags"]) > 0)
        or filters.get("low_stock_only") is True
        or (
            isinstance(filters.get("max_price"), (int, float))
            and not isinstance(filters.get("max_price"), bool)
        )
        or (
            isinstance(filters.get("min_price"), (int, float))
            and not isinstance(filters.get("min_price"), bool)
        )
        or (
            isinstance(filters.get("max_quantity"), int)
            and not isinstance(filters.get("max_quantity"), bool)
        )
        or (
            isinstance(filters.get("min_quantity"), int)
            and not isinstance(filters.get("min_quantity"), bool)
        )
        or (
            isinstance(filters.get("name_contains"), str)
            and filters["name_contains"].strip()
        )
        or (
            isinstance(filters.get("description_contains"), str)
            and filters["description_contains"].strip()
        )
        or (
            isinstance(filters.get("folder_id"), str) and filters["folder_id"].strip()
        )
    )


def _filter_value_present(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return len(value) > 0
    return True


def build_applied_filters(
    filters: dict[str, Any],
    product_nouns: Optional[list[str]] = None,
) -> dict[str, Any]:
    applied: dict[str, Any] = {}
    for key in (
        "name_contains",
        "description_contains",
        "tags",
        "folder_id",
        "max_price",
        "min_price",
        "max_quantity",
        "min_quantity",
        "sku_contains",
        "low_stock_only",
    ):
        value = filters.get(key)
        if _filter_value_present(value):
            applied[key] = value
    nouns = normalize_product_nouns(product_nouns)
    if nouns:
        applied["product_nouns"] = nouns
    return applied
