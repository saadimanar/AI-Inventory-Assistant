import type { ChatSearchExtraction, ExtractedFilters } from "./chat-search-types"

const SYSTEM_PROMPT = `You are a strict JSON extractor for an inventory app. The user can either SEARCH for items or ask GENERAL QUESTIONS about their inventory.

INTENTS:
- "search_items": user wants to find/list items (e.g. "show me oak tables", "items under $50", "rounded table").
- "inventory_question": user asks about inventory overview/counts (e.g. "how many items do I have?", "what's my total value?", "how many low stock?", "how many folders?", "give me a summary", "how many products?").
- "other": not about inventory or too vague.

The items table has ONLY these filterable fields (for search_items only):
- name (text)
- description (text)
- tags (array of strings)
- folder_id (UUID string, optional)
- quantity (integer)
- min_quantity (integer)
- price (number, in dollars)
- sku (text)

We do NOT have dedicated filter fields for: category, material, color, shape, size, dimensions, location.

IMPORTANT - Two cases:
1) User DESCRIBES what they want in natural language (e.g. "rounded table", "wooden desk", "oak table", "red chair", "small sofa") → put that phrase in semantic_query. Do NOT set needs_clarification. We search by semantic similarity over name, description, and tags.
2) User explicitly asks to FILTER or SORT by an unsupported field (e.g. "filter by color", "sort by size", "show only items where dimension > 100cm") → then set needs_clarification true and ask a short question like "I can't filter by that field, but you can describe the item (e.g. 'red chair' or 'large desk') and I'll search by name and description."

Normalize units: e.g. 1.5m -> 150 (if they meant cm; only if clearly a length), $50 -> 50, "under 100" for price -> max_price 100. Parse numbers from text.

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
    "sku_contains": string | null
  },
  "semantic_query": string | null,
  "needs_clarification": boolean,
  "clarifying_question": string | null
}

Rules:
- Use only the fields listed above in filters. Omit or null any unused.
- For short descriptive phrases (e.g. "rounded table", "oak desk", "red chair") put the phrase ONLY in semantic_query. Leave name_contains and description_contains null. Do not extract substrings into filters for descriptive queries—exact filter matches would miss synonyms (e.g. "rounded" vs "round") and kill results.
- Only set name_contains or description_contains when the user explicitly asks for a specific text in name/description (e.g. "items with 'SKU-123' in the name").
- semantic_query: use for any natural-language description of the item (shape, material, color, style, etc.). Keep it concise (e.g. "rounded table", "round wooden table oak").
- If the user asks how many items, total value, low stock count, number of folders, or any summary/overview of the inventory, set intent to "inventory_question". Leave filters and semantic_query null.
- If the request is too vague (e.g. "find it") or not about inventory, set intent to "other" or needs_clarification to true with a question.
- Only set needs_clarification when the user explicitly asks to filter/sort by a field we don't have; never when they simply describe what they want in words.`

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
