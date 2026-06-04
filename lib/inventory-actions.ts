"use server"

import { query } from "@/lib/db"
import {
  requireSessionUserId,
  getSessionUserDisplayName,
  getSessionUserId,
} from "@/lib/auth-session"
import {
  dbItemToItem,
  dbFolderToFolder,
  type DbItem,
  type DbFolder,
} from "@/lib/inventory-mappers"
import type { InventoryItem, Folder, InventoryStats } from "./inventory-types"

// Re-export for client components that need the session user id (never accept id from client input).
export async function fetchSessionUserId(): Promise<string | null> {
  return getSessionUserId()
}

export async function getCurrentUserDisplayName(): Promise<string> {
  return getSessionUserDisplayName()
}

export async function getItems(): Promise<InventoryItem[]> {
  const userId = await requireSessionUserId()
  const { rows } = await query<DbItem>(
    `SELECT * FROM items WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  )
  return rows.map(dbItemToItem)
}

export async function getFolders(): Promise<Folder[]> {
  const userId = await requireSessionUserId()
  const { rows } = await query<DbFolder>(
    `SELECT * FROM folders WHERE user_id = $1 ORDER BY created_at ASC`,
    [userId]
  )
  return rows.map(dbFolderToFolder)
}

export async function getStats(): Promise<InventoryStats> {
  const items = await getItems()
  const folders = await getFolders()
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  )
  const lowStockItems = items.filter(
    (item) => item.quantity <= item.minQuantity
  ).length

  return {
    totalItems,
    totalValue,
    lowStockItems,
    totalFolders: folders.length,
  }
}

export async function getItemsByFolder(
  folderId: string | null
): Promise<InventoryItem[]> {
  const items = await getItems()
  return items.filter((item) => item.folderId === folderId)
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getItems()
  return items.filter((item) => item.quantity <= item.minQuantity)
}

export async function searchItems(queryText: string): Promise<InventoryItem[]> {
  const items = await getItems()
  const lowerQuery = queryText.toLowerCase()
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

export async function addItem(
  item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
): Promise<InventoryItem> {
  const userId = await requireSessionUserId()

  const { rows } = await query<DbItem>(
    `INSERT INTO items (
      name, description, quantity, min_quantity, price, sku,
      folder_id, tags, image_url, user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      item.name,
      item.description,
      item.quantity,
      item.minQuantity,
      item.price,
      item.sku,
      item.folderId,
      item.tags ?? [],
      item.imageUrl,
      userId,
    ]
  )

  if (!rows[0]) {
    throw new Error("Failed to add item")
  }
  return dbItemToItem(rows[0])
}

export async function updateItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem | null> {
  const userId = await requireSessionUserId()

  const sets: string[] = []
  const values: unknown[] = []
  let i = 1

  if (updates.name !== undefined) {
    sets.push(`name = $${i++}`)
    values.push(updates.name)
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${i++}`)
    values.push(updates.description)
  }
  if (updates.quantity !== undefined) {
    sets.push(`quantity = $${i++}`)
    values.push(updates.quantity)
  }
  if (updates.minQuantity !== undefined) {
    sets.push(`min_quantity = $${i++}`)
    values.push(updates.minQuantity)
  }
  if (updates.price !== undefined) {
    sets.push(`price = $${i++}`)
    values.push(updates.price)
  }
  if (updates.sku !== undefined) {
    sets.push(`sku = $${i++}`)
    values.push(updates.sku)
  }
  if (updates.folderId !== undefined) {
    sets.push(`folder_id = $${i++}`)
    values.push(updates.folderId)
  }
  if (updates.tags !== undefined) {
    sets.push(`tags = $${i++}`)
    values.push(updates.tags)
  }
  if (updates.imageUrl !== undefined) {
    sets.push(`image_url = $${i++}`)
    values.push(updates.imageUrl)
  }

  if (sets.length === 0) {
    const { rows } = await query<DbItem>(
      `SELECT * FROM items WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return rows[0] ? dbItemToItem(rows[0]) : null
  }

  values.push(id, userId)
  const { rows } = await query<DbItem>(
    `UPDATE items SET ${sets.join(", ")}
     WHERE id = $${i} AND user_id = $${i + 1}
     RETURNING *`,
    values
  )

  return rows[0] ? dbItemToItem(rows[0]) : null
}

export async function deleteItem(id: string): Promise<boolean> {
  const userId = await requireSessionUserId()

  const { rowCount } = await query(
    `DELETE FROM items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return (rowCount ?? 0) > 0
}

export async function addFolder(
  folder: Omit<Folder, "id" | "createdAt" | "itemCount">
): Promise<Folder> {
  const userId = await requireSessionUserId()

  const { rows } = await query<DbFolder>(
    `INSERT INTO folders (name, parent_id, color, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [folder.name, folder.parentId, folder.color, userId]
  )

  if (!rows[0]) {
    throw new Error("Failed to add folder")
  }
  return dbFolderToFolder(rows[0])
}

export async function updateFolder(
  id: string,
  updates: Partial<Folder>
): Promise<Folder | null> {
  const userId = await requireSessionUserId()

  const sets: string[] = []
  const values: unknown[] = []
  let i = 1

  if (updates.name !== undefined) {
    sets.push(`name = $${i++}`)
    values.push(updates.name)
  }
  if (updates.parentId !== undefined) {
    sets.push(`parent_id = $${i++}`)
    values.push(updates.parentId)
  }
  if (updates.color !== undefined) {
    sets.push(`color = $${i++}`)
    values.push(updates.color)
  }

  if (sets.length === 0) {
    const { rows } = await query<DbFolder>(
      `SELECT * FROM folders WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return rows[0] ? dbFolderToFolder(rows[0]) : null
  }

  values.push(id, userId)
  const { rows } = await query<DbFolder>(
    `UPDATE folders SET ${sets.join(", ")}
     WHERE id = $${i} AND user_id = $${i + 1}
     RETURNING *`,
    values
  )

  return rows[0] ? dbFolderToFolder(rows[0]) : null
}

export async function deleteFolder(id: string): Promise<boolean> {
  const userId = await requireSessionUserId()

  await query(
    `UPDATE items SET folder_id = NULL WHERE folder_id = $1 AND user_id = $2`,
    [id, userId]
  )

  const { rowCount } = await query(
    `DELETE FROM folders WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return (rowCount ?? 0) > 0
}
