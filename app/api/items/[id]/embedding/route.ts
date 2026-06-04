import { NextResponse } from "next/server"
import { requireSessionUserId } from "@/lib/auth-session"
import { query } from "@/lib/db"
import { buildSearchText, getEmbedding } from "@/lib/embedding"

/**
 * POST /api/items/[id]/embedding
 * Updates search_text and embedding for the given item (user must own it).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 })
  }

  let userId: string
  try {
    userId = await requireSessionUserId()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { rows } = await query<{
    id: string
    name: string
    description: string
    tags: string[]
  }>(
    `SELECT id, name, description, tags FROM items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )

  const item = rows[0]
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const searchText = buildSearchText({
    name: item.name ?? "",
    description: item.description ?? "",
    tags: item.tags ?? [],
  })

  let embedding: number[] | null = null
  if (process.env.OPENAI_API_KEY && searchText) {
    try {
      embedding = await getEmbedding(searchText)
    } catch (e) {
      console.error("Embedding generation failed:", e)
    }
  }

  if (embedding) {
    const embeddingStr = `[${embedding.join(",")}]`
    await query(
      `UPDATE items SET search_text = $1, embedding = $2::vector(1536)
       WHERE id = $3 AND user_id = $4`,
      [searchText, embeddingStr, id, userId]
    )
  } else {
    await query(
      `UPDATE items SET search_text = $1 WHERE id = $2 AND user_id = $3`,
      [searchText, id, userId]
    )
  }

  return NextResponse.json({ ok: true })
}
