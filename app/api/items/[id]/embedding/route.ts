import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { buildSearchText, getEmbedding } from "@/lib/embedding"

/**
 * POST /api/items/[id]/embedding
 * Updates search_text and embedding for the given item (user must own it).
 * Call after create/update item to keep semantic search in sync.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing item id" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: item, error: fetchError } = await supabase
    .from("items")
    .select("id, name, description, tags")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const searchText = buildSearchText({
    name: item.name ?? "",
    description: item.description ?? "",
    tags: (item.tags as string[]) ?? [],
  })

  let embedding: number[] | null = null
  if (process.env.OPENAI_API_KEY && searchText) {
    try {
      embedding = await getEmbedding(searchText)
    } catch (e) {
      console.error("Embedding generation failed:", e)
      // Still update search_text so FTS works
    }
  }

  const updates: { search_text: string; embedding?: string } = {
    search_text: searchText,
  }
  if (embedding) {
    updates.embedding = `[${embedding.join(",")}]`
  }

  const { error: updateError } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)

  if (updateError) {
    console.error("Update embedding failed:", updateError)
    return NextResponse.json(
      { error: "Failed to update search index" },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
