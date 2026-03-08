import type { ChatSearchExtraction, ExtractedFilters } from "./chat-search-types"

const SYSTEM_PROMPT = `You are a strict JSON extractor for an inventory app. The user can either SEARCH for items or ask GENERAL QUESTIONS about their inventory.

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

EXACT STRUCTURED QUERIES (put in filters, semantic_query can be null or minimal):
- "find item with sku X", "sku SSD-6001", "look up SKU-123" → filters.sku_contains = "X" or "SSD-6001" or "SKU-123" (normalize to the code part). semantic_query = null.
- "electronics items", "tagged electronics", "items with tag office" → filters.tags = ["electronics"] or ["office"]. semantic_query can be null or the same for hybrid.
- "items cheaper than 30", "under $50", "below 100 dollars" → filters.max_price = 30 or 50 or 100. semantic_query = null or short phrase.
- "items over $20", "more than 10 dollars" → filters.min_price = 20 or 10.
- "low stock", "items below minimum quantity", "need reorder" → filters.low_stock_only = true. semantic_query = null.

DESCRIPTIVE / SEMANTIC QUERIES (put in semantic_query, filters only if explicit):
- "computer accessories", "office supplies", "storage devices", "rounded table", "oak desk" → semantic_query = that phrase. Do NOT put in name_contains/description_contains (semantic search handles synonyms).
- Natural product phrases without "find"/"show": "headphones with active noise", "wireless mouse", "office chair with lumbar support" → intent = "search_items", semantic_query = the user's phrase (or a short normalized form, e.g. "headphones active noise"). Leave filters empty unless they also mention price/SKU/tags.

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
  "needs_clarification": boolean,
  "clarifying_question": string | null
}

Rules:
- Default for short product-like phrases: if the user message looks like a product or item description (e.g. "headphones with active noise", "wireless mouse", "storage device"), set intent = "search_items" and semantic_query = the phrase (optionally normalized, e.g. "headphones active noise"). Do not set intent to "other" for these.
- SKU lookup: always set sku_contains with the SKU/code the user mentioned; set semantic_query to null for pure SKU lookups.
- Tag lookup: set tags to the tag(s) the user asked for (e.g. ["electronics"]). semantic_query can be null.
- Price: set max_price for "cheaper than X", min_price for "over X". semantic_query can be null.
- low_stock_only: set true for "low stock", "below minimum quantity", "need reorder". semantic_query = null.
- For descriptive phrases only (e.g. "computer accessories", "rounded table", "headphones with active noise") put the phrase in semantic_query; leave name_contains/description_contains null.
- If the user asks how many items, total value, low stock count, folders, or summary, set intent to "inventory_question". Leave filters and semantic_query null.
- If too vague or not about inventory (e.g. "hello", "what's the weather"), set intent to "other". Do NOT use "other" for product descriptions.
- Only set needs_clarification when the user explicitly asks to filter by a field we don't have; never when they describe what they want in words.`

export async function extractSearchParams(
  message: string,
  previousFilters?: ExtractedFilters | null
): Promise<ChatSearchExtraction> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      intent: "search_items",
      filters: previousFilters || {},
      semantic_query: message.trim() || null,
      needs_clarification: false,
      clarifying_question: null,
    }
  }

  const userContent = previousFilters
    ? `Previous applied filters (for follow-up): ${JSON.stringify(previousFilters)}\n\nUser message: ${message}`
    : message

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LLM request failed: ${res.status} ${err}`)
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] }
  const raw = data.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error("Empty LLM response")

  const parsed = JSON.parse(raw) as ChatSearchExtraction
  if (!parsed.filters) parsed.filters = {}
  return parsed
}
