import {
  dbFolderToFolder,
  dbItemToItem,
  type DbFolder,
  type DbItem,
} from "@/lib/inventory-mappers"
import { getSupabaseAccessToken, signOutSupabase } from "@/lib/supabase-session"
import type {
  ChatSearchResponse,
  ExtractedFilters,
} from "@/lib/chat-search-types"
import type { Folder, InventoryItem } from "@/lib/inventory-types"

const USER_ID_STORAGE_KEY = "app_user_id"

function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim()
  return url ? url.replace(/\/$/, "") : "http://localhost:8000"
}

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(USER_ID_STORAGE_KEY)?.trim() || null
}

function setStoredUserId(userId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(USER_ID_STORAGE_KEY, userId)
}

function clearStoredUserId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(USER_ID_STORAGE_KEY)
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function apiFetch<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  const token = await getSupabaseAccessToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const errBody = (await res.json()) as { detail?: string; error?: string }
      detail = errBody.detail ?? errBody.error ?? detail
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status)
  }

  return res.json() as Promise<T>
}

export async function fetchSessionUserId(): Promise<string | null> {
  const data = await apiFetch<{ userId: string }>("/api/session")
  setStoredUserId(data.userId)
  return data.userId
}

export async function getCurrentUserDisplayName(): Promise<string> {
  const data = await apiFetch<{ displayName: string }>("/api/session")
  return data.displayName
}

export async function getItems(): Promise<InventoryItem[]> {
  const data = await apiFetch<{ items: DbItem[] }>("/api/items")
  return data.items.map(dbItemToItem)
}

export async function getFolders(): Promise<Folder[]> {
  const data = await apiFetch<{ folders: DbFolder[] }>("/api/folders")
  return data.folders.map(dbFolderToFolder)
}

export async function getLowStockItems(): Promise<InventoryItem[]> {
  const items = await getItems()
  return items.filter((item) => item.quantity <= item.minQuantity)
}

export async function addItem(
  item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
): Promise<InventoryItem> {
  const data = await apiFetch<{ item: DbItem }>("/api/items", {
    method: "POST",
    body: {
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      min_quantity: item.minQuantity,
      price: item.price,
      sku: item.sku,
      folder_id: item.folderId,
      tags: item.tags ?? [],
      image_url: item.imageUrl,
    },
  })
  return dbItemToItem(data.item)
}

export async function updateItem(
  id: string,
  updates: Partial<InventoryItem>
): Promise<InventoryItem | null> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.description !== undefined) payload.description = updates.description
  if (updates.quantity !== undefined) payload.quantity = updates.quantity
  if (updates.minQuantity !== undefined) payload.min_quantity = updates.minQuantity
  if (updates.price !== undefined) payload.price = updates.price
  if (updates.sku !== undefined) payload.sku = updates.sku
  if (updates.folderId !== undefined) payload.folder_id = updates.folderId
  if (updates.tags !== undefined) payload.tags = updates.tags
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl

  const data = await apiFetch<{ item: DbItem }>(`/api/items/${id}`, {
    method: "PATCH",
    body: payload,
  })
  return data.item ? dbItemToItem(data.item) : null
}

export async function deleteItem(id: string): Promise<boolean> {
  const data = await apiFetch<{ ok: boolean }>(`/api/items/${id}`, {
    method: "DELETE",
  })
  return data.ok
}

export async function refreshItemEmbedding(itemId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/items/${itemId}/embedding`, {
    method: "POST",
  })
}

export async function addFolder(
  folder: Omit<Folder, "id" | "createdAt" | "itemCount">
): Promise<Folder> {
  const data = await apiFetch<{ folder: DbFolder }>("/api/folders", {
    method: "POST",
    body: {
      name: folder.name,
      parent_id: folder.parentId,
      color: folder.color,
    },
  })
  return dbFolderToFolder(data.folder)
}

export async function updateFolder(
  id: string,
  updates: Partial<Folder>
): Promise<Folder | null> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.parentId !== undefined) payload.parent_id = updates.parentId
  if (updates.color !== undefined) payload.color = updates.color

  const data = await apiFetch<{ folder: DbFolder }>(`/api/folders/${id}`, {
    method: "PATCH",
    body: payload,
  })
  return data.folder ? dbFolderToFolder(data.folder) : null
}

export async function deleteFolder(id: string): Promise<boolean> {
  const data = await apiFetch<{ ok: boolean }>(`/api/folders/${id}`, {
    method: "DELETE",
  })
  return data.ok
}

export async function chatSearch(params: {
  message: string
  appliedFilters?: ExtractedFilters | null
}): Promise<ChatSearchResponse | { error: string }> {
  try {
    return await apiFetch<ChatSearchResponse>("/api/chat/search", {
      method: "POST",
      body: {
        message: params.message,
        applied_filters: params.appliedFilters ?? null,
      },
    })
  } catch (e) {
    if (e instanceof ApiError) {
      return { error: e.message }
    }
    throw e
  }
}

export async function clearSession(): Promise<void> {
  clearStoredUserId()
  await signOutSupabase()
}
