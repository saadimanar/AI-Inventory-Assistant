/**
 * Build a single searchable text blob from an item (for embedding and FTS).
 * Uses only existing schema fields: name, description, tags.
 */
export function buildSearchText(params: {
  name: string
  description: string
  tags: string[]
}): string {
  const parts = [
    params.name.trim(),
    params.description.trim(),
    ...(params.tags || []),
  ].filter(Boolean)
  return parts.join(" ").replace(/\s+/g, " ").trim() || ""
}

const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIM = 1536

export async function getEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) {
    return new Array(EMBEDDING_DIM).fill(0)
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set")
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`)
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] }
  const embedding = data.data?.[0]?.embedding
  if (!embedding || embedding.length !== EMBEDDING_DIM) {
    throw new Error("Invalid embedding response")
  }
  return embedding
}
