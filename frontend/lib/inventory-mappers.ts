import type { InventoryItem, Folder } from "./inventory-types"

export interface DbItem {
  id: string
  name: string
  description: string
  quantity: number
  min_quantity: number
  price: number
  sku: string
  folder_id: string | null
  tags: string[]
  image_url: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  color: string
  item_count: number
  created_at: string
  user_id: string
}

export function dbItemToItem(dbItem: DbItem): InventoryItem {
  return {
    id: dbItem.id,
    name: dbItem.name,
    description: dbItem.description,
    quantity: dbItem.quantity,
    minQuantity: dbItem.min_quantity,
    price: Number(dbItem.price),
    sku: dbItem.sku,
    folderId: dbItem.folder_id,
    tags: dbItem.tags || [],
    imageUrl: dbItem.image_url,
    createdAt: new Date(dbItem.created_at),
    updatedAt: new Date(dbItem.updated_at),
  }
}

export function dbFolderToFolder(dbFolder: DbFolder): Folder {
  return {
    id: dbFolder.id,
    name: dbFolder.name,
    parentId: dbFolder.parent_id,
    color: dbFolder.color,
    itemCount: dbFolder.item_count,
    createdAt: new Date(dbFolder.created_at),
  }
}
