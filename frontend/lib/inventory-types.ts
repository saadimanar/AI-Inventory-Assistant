export interface InventoryItem {
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
  createdAt: Date
  updatedAt: Date
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  color: string
  itemCount: number
  createdAt: Date
}

export interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  totalFolders: number
}

export type ViewMode = "grid" | "list"
export type SortField = "name" | "quantity" | "price" | "updatedAt"
export type SortDirection = "asc" | "desc"
