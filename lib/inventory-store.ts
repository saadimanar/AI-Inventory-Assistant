import type { InventoryItem, Folder, InventoryStats } from "./inventory-types"
import { createClient } from "@/utils/supabase/client"

// Database schema types (snake_case)
interface DbItem {
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

interface DbFolder {
  id: string
  name: string
  parent_id: string | null
  color: string
  item_count: number
  created_at: string
  user_id: string
}

// Helper functions to convert between DB and app types
function dbItemToItem(dbItem: DbItem): InventoryItem {
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

function itemToDbItem(item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">, userId: string): Omit<DbItem, "id" | "created_at" | "updated_at" | "user_id"> {
  return {
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    min_quantity: item.minQuantity,
    price: item.price,
    sku: item.sku,
    folder_id: item.folderId,
    tags: item.tags || [],
    image_url: item.imageUrl,
  }
}

function dbFolderToFolder(dbFolder: DbFolder): Folder {
  return {
    id: dbFolder.id,
    name: dbFolder.name,
    parentId: dbFolder.parent_id,
    color: dbFolder.color,
    itemCount: dbFolder.item_count,
    createdAt: new Date(dbFolder.created_at),
  }
}

function folderToDbFolder(folder: Omit<Folder, "id" | "createdAt" | "itemCount">, userId: string): Omit<DbFolder, "id" | "created_at" | "item_count" | "user_id"> {
  return {
    name: folder.name,
    parent_id: folder.parentId,
    color: folder.color,
  }
}

// Get current user ID
async function getUserId(): Promise<string> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error("User not authenticated")
  }
  return user.id
}

// Get current user display name for activity feed
export async function getCurrentUserDisplayName(): Promise<string> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return "User"
  const name = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string)
  if (name) return name
  if (user.email) return user.email.split("@")[0]
  return "User"
}

// Inventory operations
export async function getItems(): Promise<InventoryItem[]> {
  const supabase = createClient()
  const userId = await getUserId()

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching items:", error)
    return []
  }

  return (data || []).map(dbItemToItem)
}

export async function getFolders(): Promise<Folder[]> {
  const supabase = createClient()
  const userId = await getUserId()

  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching folders:", error)
    return []
  }

  return (data || []).map(dbFolderToFolder)
}

export async function getStats(): Promise<InventoryStats> {
  const items = await getItems()
  const folders = await getFolders()

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const lowStockItems = items.filter((item) => item.quantity <= item.minQuantity).length

  return {
    totalItems,
    totalValue,
    lowStockItems,
    totalFolders: folders.length,
  }
}

export async function getItemsByFolder(folderId: string | null): Promise<InventoryItem[]> {
  const items = await getItems()
  return items.filter((item) => item.folderId === folderId)
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getItems()
  return items.filter((item) => item.quantity <= item.minQuantity)
}

export async function searchItems(query: string): Promise<InventoryItem[]> {
  const items = await getItems()
  const lowerQuery = query.toLowerCase()
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

export async function addItem(item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">): Promise<InventoryItem> {
  const supabase = createClient()
  const userId = await getUserId()

  const dbItem = itemToDbItem(item, userId)

  const { data, error } = await supabase
    .from("items")
    .insert({ ...dbItem, user_id: userId })
    .select()
    .single()

  if (error) {
    console.error("Error adding item:", error)
    throw new Error(`Failed to add item: ${error.message}`)
  }

  return dbItemToItem(data)
}

export async function updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
  const supabase = createClient()
  const userId = await getUserId()

  // Convert updates to DB format
  const dbUpdates: any = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity
  if (updates.minQuantity !== undefined) dbUpdates.min_quantity = updates.minQuantity
  if (updates.price !== undefined) dbUpdates.price = updates.price
  if (updates.sku !== undefined) dbUpdates.sku = updates.sku
  if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl

  const { data, error } = await supabase
    .from("items")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    console.error("Error updating item:", error)
    return null
  }

  return data ? dbItemToItem(data) : null
}

export async function deleteItem(id: string): Promise<boolean> {
  const supabase = createClient()
  const userId = await getUserId()

  // Get item to delete image if exists
  const { data: item } = await supabase
    .from("items")
    .select("image_url")
    .eq("id", id)
    .eq("user_id", userId)
    .single()

  // Delete the item
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting item:", error)
    return false
  }

  // Delete image from storage if it exists
  if (item?.image_url) {
    try {
      // Extract path from URL (format: /storage/v1/object/public/item-images/path)
      const url = new URL(item.image_url)
      const pathParts = url.pathname.split("/")
      const pathIndex = pathParts.indexOf("item-images")
      if (pathIndex !== -1) {
        const imagePath = pathParts.slice(pathIndex + 1).join("/")
        await supabase.storage.from("item-images").remove([imagePath])
      }
    } catch (err) {
      console.error("Error deleting image:", err)
      // Don't fail the item deletion if image deletion fails
    }
  }

  return true
}

export async function addFolder(folder: Omit<Folder, "id" | "createdAt" | "itemCount">): Promise<Folder> {
  const supabase = createClient()
  const userId = await getUserId()

  const dbFolder = folderToDbFolder(folder, userId)

  const { data, error } = await supabase
    .from("folders")
    .insert({ ...dbFolder, user_id: userId })
    .select()
    .single()

  if (error) {
    console.error("Error adding folder:", error)
    throw new Error(`Failed to add folder: ${error.message}`)
  }

  return dbFolderToFolder(data)
}

export async function updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | null> {
  const supabase = createClient()
  const userId = await getUserId()

  // Convert updates to DB format
  const dbUpdates: any = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId
  if (updates.color !== undefined) dbUpdates.color = updates.color

  const { data, error } = await supabase
    .from("folders")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) {
    console.error("Error updating folder:", error)
    return null
  }

  return data ? dbFolderToFolder(data) : null
}

export async function deleteFolder(id: string): Promise<boolean> {
  const supabase = createClient()
  const userId = await getUserId()

  // Move items to root (set folder_id to null)
  await supabase
    .from("items")
    .update({ folder_id: null })
    .eq("folder_id", id)
    .eq("user_id", userId)

  // Delete the folder
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) {
    console.error("Error deleting folder:", error)
    return false
  }

  return true
}
