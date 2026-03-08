/**
 * LLM extraction output: only use fields that exist on items table.
 * - name, description, tags, folder_id, quantity, min_quantity, price, sku
 */
export interface ExtractedFilters {
  name_contains?: string | null
  description_contains?: string | null
  tags?: string[] | null
  folder_id?: string | null
  max_price?: number | null
  min_price?: number | null
  max_quantity?: number | null
  min_quantity?: number | null
  sku_contains?: string | null
  /** When true, return only items where quantity <= min_quantity (low stock). */
  low_stock_only?: boolean | null
}

export interface ChatSearchExtraction {
  intent: "search_items" | "inventory_question" | "other"
  filters: ExtractedFilters
  semantic_query: string | null
  needs_clarification: boolean
  clarifying_question: string | null
}

export interface InventoryStatsSummary {
  totalItems: number
  totalValue: number
  lowStockCount: number
  folderCount: number
  uniqueProductCount: number
}

export interface ChatSearchResultItem {
  id: string
  name: string
  description: string
  quantity: number
  minQuantity: number
  price: number
  sku: string
  folderId: string | null
  tags: string[]
  imageUrl: string | null
  createdAt: string
  updatedAt: string
  score?: number
}

export type ChatSearchResponse =
  | { type: "clarify"; question: string }
  | { type: "results"; items: ChatSearchResultItem[]; appliedFilters: ExtractedFilters }
  | { type: "answer"; message: string }