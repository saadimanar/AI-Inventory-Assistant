import { NextResponse } from "next/server"
import { requireSessionUserId } from "@/lib/auth-session"
import { getEmbedding } from "@/lib/embedding"
import { extractSearchParams } from "@/lib/chat-search-llm"
import {
  getInventorySummaryForUser,
  searchItemsHybrid,
} from "@/lib/inventory-search"
import type {
  ChatSearchResponse,
  ChatSearchResultItem,
  ExtractedFilters,
} from "@/lib/chat-search-types"

const TOP_N = 20

function hasStrongStructuredFilters(
  f: ExtractedFilters | Record<string, unknown>
): boolean {
  return (
    (typeof f.sku_contains === "string" && f.sku_contains.trim() !== "") ||
    (Array.isArray(f.tags) && f.tags.length > 0) ||
    (typeof f.low_stock_only === "boolean" && f.low_stock_only) ||
    (typeof f.max_price === "number" && !Number.isNaN(f.max_price)) ||
    (typeof f.min_price === "number" && !Number.isNaN(f.min_price)) ||
    (typeof f.max_quantity === "number" && !Number.isNaN(f.max_quantity)) ||
    (typeof f.min_quantity === "number" && !Number.isNaN(f.min_quantity)) ||
    (typeof f.name_contains === "string" && f.name_contains.trim() !== "") ||
    (typeof f.description_contains === "string" &&
      f.description_contains.trim() !== "") ||
    (typeof f.folder_id === "string" && f.folder_id.trim() !== "")
  )
}

function buildAppliedFilters(
  f: ExtractedFilters | Record<string, unknown>
): ExtractedFilters {
  return {
    name_contains: (f.name_contains as string) ?? null,
    description_contains: (f.description_contains as string) ?? null,
    tags: (f.tags as string[] | null) ?? null,
    folder_id: (f.folder_id as string) ?? null,
    max_price: (f.max_price as number) ?? null,
    min_price: (f.min_price as number) ?? null,
    max_quantity: (f.max_quantity as number) ?? null,
    min_quantity: (f.min_quantity as number) ?? null,
    sku_contains: (f.sku_contains as string) ?? null,
    low_stock_only: (f.low_stock_only as boolean) ?? null,
  }
}

export async function POST(request: Request) {
  let userId: string
  try {
    userId = await requireSessionUserId()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { message?: string; appliedFilters?: ExtractedFilters | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  const previousFilters = body.appliedFilters ?? null

  let extraction
  try {
    extraction = await extractSearchParams(message, previousFilters)
  } catch (e) {
    console.error("LLM extraction error:", e)
    return NextResponse.json(
      { error: "Failed to understand the request" },
      { status: 500 }
    )
  }

  if (extraction.needs_clarification && extraction.clarifying_question) {
    const response: ChatSearchResponse = {
      type: "clarify",
      question: extraction.clarifying_question,
    }
    return NextResponse.json(response)
  }

  if (extraction.intent === "inventory_question") {
    const summary = await getInventorySummaryForUser(userId)
    const parts: string[] = []
    parts.push(
      `You have ${summary.totalItems} item${summary.totalItems === 1 ? "" : "s"} in total (${summary.uniqueProductCount} distinct product${summary.uniqueProductCount === 1 ? "" : "s"}).`
    )
    parts.push(
      `${summary.folderCount} folder${summary.folderCount === 1 ? "" : "s"}.`
    )
    parts.push(`Total value: $${summary.totalValue.toFixed(2)}.`)
    if (summary.lowStockCount > 0) {
      parts.push(
        `${summary.lowStockCount} low-stock item${summary.lowStockCount === 1 ? "" : "s"} need attention.`
      )
    } else {
      parts.push("No low-stock items.")
    }

    const response: ChatSearchResponse = {
      type: "answer",
      message: parts.join(" "),
    }
    return NextResponse.json(response)
  }

  if (extraction.intent !== "search_items") {
    const response: ChatSearchResponse = {
      type: "clarify",
      question:
        "I can only help with searching your inventory or answering questions about it (e.g. how many items, total value). Try something like: items under $50, or how many items do I have?",
    }
    return NextResponse.json(response)
  }

  const semanticQuery = (extraction.semantic_query ?? "").trim()
  const f = extraction.filters || {}
  const strongFilters = hasStrongStructuredFilters(f)

  if (semanticQuery.length < 2 && !strongFilters) {
    const response: ChatSearchResponse = {
      type: "clarify",
      question:
        "What item are you looking for? You can try: a name or description, SKU (e.g. SSD-6001), tags (e.g. electronics), price (e.g. under $30), or low stock items.",
    }
    return NextResponse.json(response)
  }

  const useFilterOnly = semanticQuery.length < 2 && strongFilters

  let queryEmbedding: number[] | null = null
  if (semanticQuery.length >= 2 && process.env.OPENAI_API_KEY && !useFilterOnly) {
    try {
      queryEmbedding = await getEmbedding(semanticQuery)
    } catch (e) {
      console.error("Embedding error:", e)
    }
  }

  const embeddingStr =
    queryEmbedding && queryEmbedding.length === 1536
      ? `[${queryEmbedding.join(",")}]`
      : null
  const ftsQueryForRpc = useFilterOnly
    ? null
    : semanticQuery.length >= 2
      ? semanticQuery
      : null

  if (!useFilterOnly && !embeddingStr && !ftsQueryForRpc) {
    const response: ChatSearchResponse = {
      type: "results",
      items: [],
      appliedFilters: buildAppliedFilters(f),
    }
    return NextResponse.json(response)
  }

  let items: ChatSearchResultItem[] = []
  try {
    items = await searchItemsHybrid({
      userId,
      queryEmbedding: embeddingStr,
      ftsQuery: ftsQueryForRpc,
      limit: TOP_N,
      filters: f,
      filterOnly: useFilterOnly,
    })
  } catch (e) {
    console.error("Search error:", e)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }

  const response: ChatSearchResponse = {
    type: "results",
    items,
    appliedFilters: buildAppliedFilters(f),
  }
  return NextResponse.json(response)
}
