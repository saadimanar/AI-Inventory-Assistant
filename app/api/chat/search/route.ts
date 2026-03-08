import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getEmbedding } from "@/lib/embedding"
import { extractSearchParams } from "@/lib/chat-search-llm"
import type {
  ChatSearchResponse,
  ChatSearchResultItem,
  ExtractedFilters,
} from "@/lib/chat-search-types"

const TOP_N = 20

/** True when we can run a filter-only search (no semantic query required). */
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
    (typeof f.description_contains === "string" && f.description_contains.trim() !== "") ||
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

function dbRowToResultItem(row: Record<string, unknown>): ChatSearchResultItem {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    description: (row.description as string) ?? "",
    quantity: Number(row.quantity) ?? 0,
    minQuantity: Number(row.min_quantity) ?? 0,
    price: Number(row.price) ?? 0,
    sku: (row.sku as string) ?? "",
    folderId: (row.folder_id as string) ?? null,
    tags: (row.tags as string[]) ?? [],
    imageUrl: (row.image_url as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    score: typeof row.score === "number" ? row.score : undefined,
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { message?: string; appliedFilters?: ExtractedFilters | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    )
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
    const { data: itemRows } = await supabase
      .from("items")
      .select("quantity, min_quantity, price")
      .eq("user_id", user.id)
    const { count: folderCount } = await supabase
      .from("folders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    const items = itemRows ?? []
    const totalItems = items.reduce((sum, r) => sum + Number(r.quantity), 0)
    const totalValue = items.reduce(
      (sum, r) => sum + Number(r.quantity) * Number(r.price),
      0
    )
    const lowStockCount = items.filter(
      (r) => Number(r.quantity) <= Number(r.min_quantity)
    ).length
    const uniqueProductCount = items.length

    const parts: string[] = []
    parts.push(
      `You have ${totalItems} item${totalItems === 1 ? "" : "s"} in total (${uniqueProductCount} distinct product${uniqueProductCount === 1 ? "" : "s"}).`
    )
    parts.push(`${folderCount ?? 0} folder${folderCount === 1 ? "" : "s"}.`)
    parts.push(`Total value: $${totalValue.toFixed(2)}.`)
    if (lowStockCount > 0) {
      parts.push(
        `${lowStockCount} low-stock item${lowStockCount === 1 ? "" : "s"} need attention.`
      )
    } else {
      parts.push("No low-stock items.")
    }
    const answerMessage = parts.join(" ")

    const response: ChatSearchResponse = {
      type: "answer",
      message: answerMessage,
    }
    return NextResponse.json(response)
  }

  if (extraction.intent !== "search_items") {
    const response: ChatSearchResponse = {
      type: "clarify",
      question: "I can only help with searching your inventory or answering questions about it (e.g. how many items, total value). Try something like: items under $50, or how many items do I have?",
    }
    return NextResponse.json(response)
  }

  const semanticQuery = (extraction.semantic_query ?? "").trim()
  const f = extraction.filters || {}
  const strongFilters = hasStrongStructuredFilters(f)

  // Allow search with filter-only when user gave structured filters (SKU, tags, price, low stock) even without semantic query.
  if (semanticQuery.length < 2 && !strongFilters) {
    const response: ChatSearchResponse = {
      type: "clarify",
      question: "What item are you looking for? You can try: a name or description, SKU (e.g. SSD-6001), tags (e.g. electronics), price (e.g. under $30), or low stock items.",
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
  // Hybrid: pass both vector and FTS when we have both (RPC combines scores). When filter-only, pass neither.
  const ftsQueryForRpc =
    useFilterOnly ? null : (semanticQuery.length >= 2 ? semanticQuery : null)

  if (!useFilterOnly && !embeddingStr && !ftsQueryForRpc) {
    const response: ChatSearchResponse = {
      type: "results",
      items: [],
      appliedFilters: buildAppliedFilters(f),
    }
    return NextResponse.json(response)
  }

  const rpcParams = {
    p_user_id: user.id,
    p_query_embedding: embeddingStr,
    p_limit: TOP_N,
    p_name_ilike: f.name_contains ?? null,
    p_description_ilike: f.description_contains ?? null,
    p_sku_ilike: f.sku_contains ?? null,
    p_tags_contain: f.tags && f.tags.length > 0 ? f.tags : null,
    p_folder_id: f.folder_id ?? null,
    p_max_price: f.max_price ?? null,
    p_min_price: f.min_price ?? null,
    p_max_quantity: f.max_quantity ?? null,
    p_min_quantity: f.min_quantity ?? null,
    p_low_stock_only: f.low_stock_only ?? null,
    p_fts_query: ftsQueryForRpc,
    p_filter_only: useFilterOnly,
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "search_items_hybrid",
    rpcParams
  )

  let items: ChatSearchResultItem[]

  if (!rpcError && Array.isArray(rpcData)) {
    items = rpcData.map((row: Record<string, unknown>) =>
      dbRowToResultItem(row)
    )
  } else {
    // Fallback: no RPC (migration not run) or pgvector not available
    let q = supabase
      .from("items")
      .select("id, name, description, quantity, min_quantity, price, sku, folder_id, tags, image_url, created_at, updated_at")
      .eq("user_id", user.id)
      .limit(TOP_N)
      .order("updated_at", { ascending: false })

    if (f.name_contains) {
      q = q.ilike("name", `%${f.name_contains}%`)
    }
    if (f.description_contains) {
      q = q.ilike("description", `%${f.description_contains}%`)
    }
    // When we have semantic_query but no RPC, search name+description by words so descriptive queries still return results
    if (extraction.semantic_query && !f.name_contains && !f.description_contains) {
      const words = extraction.semantic_query.trim().split(/\s+/).filter(Boolean)
      if (words.length > 0) {
        const conditions: string[] = []
        for (const w of words) {
          conditions.push(`name.ilike.%${w}%`, `description.ilike.%${w}%`)
        }
        q = q.or(conditions.join(","))
      }
    }
    if (f.folder_id) {
      q = q.eq("folder_id", f.folder_id)
    }
    if (f.max_price != null) {
      q = q.lte("price", f.max_price)
    }
    if (f.min_price != null) {
      q = q.gte("price", f.min_price)
    }
    if (f.max_quantity != null) {
      q = q.lte("quantity", f.max_quantity)
    }
    if (f.min_quantity != null) {
      q = q.gte("quantity", f.min_quantity)
    }
    if (f.sku_contains) {
      q = q.ilike("sku", `%${f.sku_contains}%`)
    }
    if (f.tags && f.tags.length > 0) {
      q = q.overlaps("tags", f.tags)
    }

    const { data: rows, error } = await q
    if (error) {
      console.error("Fallback search error:", error)
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      )
    }
    let fallbackItems = (rows || []).map((row) =>
      dbRowToResultItem(row as Record<string, unknown>)
    )
    if (f.low_stock_only) {
      fallbackItems = fallbackItems.filter(
        (i) => i.quantity <= i.minQuantity
      )
    }
    items = fallbackItems
  }

  const appliedFilters = buildAppliedFilters(f)

  const response: ChatSearchResponse = {
    type: "results",
    items,
    appliedFilters,
  }
  return NextResponse.json(response)
}
