import { query } from "@/lib/db"
import type { ChatSearchResultItem, ExtractedFilters } from "@/lib/chat-search-types"
import { dbItemToItem, type DbItem } from "@/lib/inventory-mappers"

export interface HybridSearchParams {
  userId: string
  queryEmbedding: string | null
  ftsQuery: string | null
  limit: number
  filters: ExtractedFilters | Record<string, unknown>
  filterOnly: boolean
}

function dbRowToResultItem(row: Record<string, unknown>): ChatSearchResultItem {
  const item = dbItemToItem(row as unknown as DbItem)
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    minQuantity: item.minQuantity,
    price: item.price,
    sku: item.sku,
    folderId: item.folderId,
    tags: item.tags,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    score: typeof row.score === "number" ? row.score : undefined,
  }
}

export async function getInventorySummaryForUser(userId: string) {
  const itemsResult = await query<{
    quantity: number
    min_quantity: number
    price: number
  }>(
    `SELECT quantity, min_quantity, price FROM items WHERE user_id = $1`,
    [userId]
  )
  const foldersResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM folders WHERE user_id = $1`,
    [userId]
  )

  const items = itemsResult.rows
  const totalItems = items.reduce((sum, r) => sum + Number(r.quantity), 0)
  const totalValue = items.reduce(
    (sum, r) => sum + Number(r.quantity) * Number(r.price),
    0
  )
  const lowStockCount = items.filter(
    (r) => Number(r.quantity) <= Number(r.min_quantity)
  ).length
  const folderCount = Number(foldersResult.rows[0]?.count ?? 0)

  return {
    totalItems,
    totalValue,
    lowStockCount,
    uniqueProductCount: items.length,
    folderCount,
  }
}

export async function searchItemsHybrid(
  params: HybridSearchParams
): Promise<ChatSearchResultItem[]> {
  const f = params.filters

  if (params.filterOnly || (!params.queryEmbedding && !params.ftsQuery)) {
    return searchItemsStructured({
      userId: params.userId,
      limit: params.limit,
      filters: f,
    })
  }

  try {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM search_items_hybrid(
        $1::uuid,
        $2::vector(1536),
        $3::int,
        $4::text,
        $5::text,
        $6::text[],
        $7::uuid,
        $8::decimal,
        $9::decimal,
        $10::int,
        $11::int,
        $12::text
      )`,
      [
        params.userId,
        params.queryEmbedding,
        params.limit,
        (f.name_contains as string) ?? null,
        (f.description_contains as string) ?? null,
        f.tags && (f.tags as string[]).length > 0 ? f.tags : null,
        (f.folder_id as string) ?? null,
        (f.max_price as number) ?? null,
        (f.min_price as number) ?? null,
        (f.max_quantity as number) ?? null,
        (f.min_quantity as number) ?? null,
        params.ftsQuery,
      ]
    )

    let items = rows.map(dbRowToResultItem)
    if (f.sku_contains) {
      const sku = String(f.sku_contains).toLowerCase()
      items = items.filter((i) => i.sku.toLowerCase().includes(sku))
    }
    if (f.low_stock_only) {
      items = items.filter((i) => i.quantity <= i.minQuantity)
    }
    return items
  } catch (error) {
    console.error("search_items_hybrid RPC failed, using fallback:", error)
    return searchItemsStructured({
      userId: params.userId,
      limit: params.limit,
      filters: f,
      semanticQuery: params.ftsQuery ?? undefined,
    })
  }
}

async function searchItemsStructured(options: {
  userId: string
  limit: number
  filters: ExtractedFilters | Record<string, unknown>
  semanticQuery?: string
}): Promise<ChatSearchResultItem[]> {
  const f = options.filters
  const conditions = ["user_id = $1"]
  const values: unknown[] = [options.userId]
  let paramIndex = 2

  const addIlike = (column: string, value: string | null | undefined) => {
    if (!value?.trim()) return
    conditions.push(`${column} ILIKE $${paramIndex}`)
    values.push(`%${value.trim()}%`)
    paramIndex++
  }

  addIlike("name", f.name_contains as string | undefined)
  addIlike("description", f.description_contains as string | undefined)
  addIlike("sku", f.sku_contains as string | undefined)

  if (f.folder_id) {
    conditions.push(`folder_id = $${paramIndex}`)
    values.push(f.folder_id)
    paramIndex++
  }
  if (f.max_price != null) {
    conditions.push(`price <= $${paramIndex}`)
    values.push(f.max_price)
    paramIndex++
  }
  if (f.min_price != null) {
    conditions.push(`price >= $${paramIndex}`)
    values.push(f.min_price)
    paramIndex++
  }
  if (f.max_quantity != null) {
    conditions.push(`quantity <= $${paramIndex}`)
    values.push(f.max_quantity)
    paramIndex++
  }
  if (f.min_quantity != null) {
    conditions.push(`quantity >= $${paramIndex}`)
    values.push(f.min_quantity)
    paramIndex++
  }
  if (Array.isArray(f.tags) && f.tags.length > 0) {
    conditions.push(`tags && $${paramIndex}::text[]`)
    values.push(f.tags)
    paramIndex++
  }

  if (options.semanticQuery?.trim()) {
    const words = options.semanticQuery.trim().split(/\s+/).filter(Boolean)
    for (const word of words) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      )
      values.push(`%${word}%`)
      paramIndex++
    }
  }

  values.push(options.limit)
  const limitParam = paramIndex

  const { rows } = await query<Record<string, unknown>>(
    `SELECT id, name, description, quantity, min_quantity, price, sku, folder_id, tags, image_url, created_at, updated_at
     FROM items
     WHERE ${conditions.join(" AND ")}
     ORDER BY updated_at DESC
     LIMIT $${limitParam}`,
    values
  )

  let items = rows.map(dbRowToResultItem)
  if (f.low_stock_only) {
    items = items.filter((i) => i.quantity <= i.minQuantity)
  }
  return items
}
