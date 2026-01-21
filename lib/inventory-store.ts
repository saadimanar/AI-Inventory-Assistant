import type { InventoryItem, Folder, InventoryStats } from "./inventory-types"

// Storage keys
const STORAGE_KEY_ITEMS = "inventory_items"
const STORAGE_KEY_FOLDERS = "inventory_folders"

// Sample data for demonstration (used as initial data if localStorage is empty)
const sampleFolders: Folder[] = [
  {
    id: "folder-1",
    name: "Electronics",
    parentId: null,
    color: "#4F46E5",
    itemCount: 8,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "folder-2",
    name: "Office Supplies",
    parentId: null,
    color: "#10B981",
    itemCount: 12,
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "folder-3",
    name: "Furniture",
    parentId: null,
    color: "#F59E0B",
    itemCount: 5,
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "folder-4",
    name: "Computers",
    parentId: "folder-1",
    color: "#6366F1",
    itemCount: 4,
    createdAt: new Date("2024-02-10"),
  },
]

const sampleItems: InventoryItem[] = [
  {
    id: "item-1",
    name: "MacBook Pro 16\"",
    description: "Apple MacBook Pro with M3 Max chip, 32GB RAM",
    quantity: 5,
    minQuantity: 3,
    price: 2499.99,
    sku: "ELEC-MBP-001",
    folderId: "folder-4",
    tags: ["laptop", "apple", "premium"],
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "item-2",
    name: "Dell UltraSharp Monitor 27\"",
    description: "4K USB-C Hub Monitor with 99% sRGB",
    quantity: 12,
    minQuantity: 5,
    price: 649.99,
    sku: "ELEC-MON-002",
    folderId: "folder-1",
    tags: ["monitor", "dell", "4k"],
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-03-08"),
  },
  {
    id: "item-3",
    name: "Ergonomic Office Chair",
    description: "Herman Miller Aeron Chair, Size B",
    quantity: 2,
    minQuantity: 5,
    price: 1395.0,
    sku: "FURN-CHR-001",
    folderId: "folder-3",
    tags: ["chair", "ergonomic", "premium"],
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=300&fit=crop",
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-03-05"),
  },
  {
    id: "item-4",
    name: "Wireless Keyboard",
    description: "Logitech MX Keys Advanced Wireless Keyboard",
    quantity: 25,
    minQuantity: 10,
    price: 119.99,
    sku: "ELEC-KEY-003",
    folderId: "folder-1",
    tags: ["keyboard", "wireless", "logitech"],
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=300&fit=crop",
    createdAt: new Date("2024-02-05"),
    updatedAt: new Date("2024-03-12"),
  },
  {
    id: "item-5",
    name: "Standing Desk",
    description: "Electric Height Adjustable Standing Desk 60x30",
    quantity: 3,
    minQuantity: 2,
    price: 599.99,
    sku: "FURN-DSK-002",
    folderId: "folder-3",
    tags: ["desk", "standing", "adjustable"],
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=300&fit=crop",
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "item-6",
    name: "Printer Paper (Case)",
    description: "Premium Copy Paper, 8.5x11, 5000 sheets",
    quantity: 8,
    minQuantity: 15,
    price: 49.99,
    sku: "OFFC-PPR-001",
    folderId: "folder-2",
    tags: ["paper", "office", "supplies"],
    imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=300&fit=crop",
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-03-14"),
  },
  {
    id: "item-7",
    name: "USB-C Hub",
    description: "7-in-1 USB-C Hub with HDMI, SD Card Reader",
    quantity: 18,
    minQuantity: 8,
    price: 79.99,
    sku: "ELEC-HUB-004",
    folderId: "folder-1",
    tags: ["usb", "hub", "accessories"],
    imageUrl: "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop",
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-03-11"),
  },
  {
    id: "item-8",
    name: "Sticky Notes Pack",
    description: "Post-it Super Sticky Notes, Assorted Colors, 24 Pads",
    quantity: 45,
    minQuantity: 20,
    price: 24.99,
    sku: "OFFC-STK-002",
    folderId: "folder-2",
    tags: ["notes", "sticky", "office"],
    imageUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
    createdAt: new Date("2024-02-25"),
    updatedAt: new Date("2024-03-09"),
  },
  {
    id: "item-9",
    name: "Webcam HD",
    description: "Logitech C920 Pro HD Webcam",
    quantity: 1,
    minQuantity: 5,
    price: 79.99,
    sku: "ELEC-CAM-005",
    folderId: "folder-1",
    tags: ["webcam", "video", "logitech"],
    imageUrl: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=300&fit=crop",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-13"),
  },
  {
    id: "item-10",
    name: "Filing Cabinet",
    description: "3-Drawer Vertical Filing Cabinet, Letter Size",
    quantity: 4,
    minQuantity: 2,
    price: 189.99,
    sku: "FURN-CAB-003",
    folderId: "folder-3",
    tags: ["cabinet", "storage", "filing"],
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-15"),
  },
]

// Helper functions for localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return defaultValue
    const parsed = JSON.parse(stored)
    // Convert date strings back to Date objects
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        const result: any = { ...item }
        if (item.createdAt) result.createdAt = new Date(item.createdAt)
        if (item.updatedAt) result.updatedAt = new Date(item.updatedAt)
        return result
      }) as T
    }
    return parsed
  } catch {
    return defaultValue
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
  }
}

// Initialize store state from localStorage or use sample data
function initializeItems(): InventoryItem[] {
  const stored = loadFromStorage<InventoryItem[]>(STORAGE_KEY_ITEMS, [])
  return stored.length > 0 ? stored : sampleItems
}

function initializeFolders(): Folder[] {
  const stored = loadFromStorage<Folder[]>(STORAGE_KEY_FOLDERS, [])
  return stored.length > 0 ? stored : sampleFolders
}

// Store state (initialized from localStorage or sample data)
let items: InventoryItem[] = initializeItems()
let folders: Folder[] = initializeFolders()

// Save initial data if localStorage was empty
if (typeof window !== "undefined") {
  if (!localStorage.getItem(STORAGE_KEY_ITEMS)) {
    saveToStorage(STORAGE_KEY_ITEMS, items)
  }
  if (!localStorage.getItem(STORAGE_KEY_FOLDERS)) {
    saveToStorage(STORAGE_KEY_FOLDERS, folders)
  }
}

// Inventory operations
export function getItems(): InventoryItem[] {
  return items
}

export function getFolders(): Folder[] {
  return folders
}

export function getStats(): InventoryStats {
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

export function getItemsByFolder(folderId: string | null): InventoryItem[] {
  return items.filter((item) => item.folderId === folderId)
}

export function getLowStockItems(): InventoryItem[] {
  return items.filter((item) => item.quantity <= item.minQuantity)
}

export function searchItems(query: string): InventoryItem[] {
  const lowerQuery = query.toLowerCase()
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

export function addItem(item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">): InventoryItem {
  const newItem: InventoryItem = {
    ...item,
    id: `item-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  items = [...items, newItem]
  updateFolderCount(item.folderId)
  saveToStorage(STORAGE_KEY_ITEMS, items)
  return newItem
}

export function updateItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return null

  const oldFolderId = items[index].folderId
  const updatedItem = {
    ...items[index],
    ...updates,
    updatedAt: new Date(),
  }
  items = [...items.slice(0, index), updatedItem, ...items.slice(index + 1)]

  if (updates.folderId !== undefined && updates.folderId !== oldFolderId) {
    updateFolderCount(oldFolderId)
    updateFolderCount(updates.folderId)
  }

  saveToStorage(STORAGE_KEY_ITEMS, items)
  return updatedItem
}

export function deleteItem(id: string): boolean {
  const item = items.find((i) => i.id === id)
  if (!item) return false

  items = items.filter((i) => i.id !== id)
  updateFolderCount(item.folderId)
  saveToStorage(STORAGE_KEY_ITEMS, items)
  return true
}

export function addFolder(folder: Omit<Folder, "id" | "createdAt" | "itemCount">): Folder {
  const newFolder: Folder = {
    ...folder,
    id: `folder-${Date.now()}`,
    itemCount: 0,
    createdAt: new Date(),
  }
  folders = [...folders, newFolder]
  saveToStorage(STORAGE_KEY_FOLDERS, folders)
  return newFolder
}

export function updateFolder(id: string, updates: Partial<Folder>): Folder | null {
  const index = folders.findIndex((f) => f.id === id)
  if (index === -1) return null

  const updatedFolder = { ...folders[index], ...updates }
  folders = [...folders.slice(0, index), updatedFolder, ...folders.slice(index + 1)]
  saveToStorage(STORAGE_KEY_FOLDERS, folders)
  return updatedFolder
}

export function deleteFolder(id: string): boolean {
  // Move items to root before deleting folder
  items = items.map((item) => (item.folderId === id ? { ...item, folderId: null } : item))
  folders = folders.filter((f) => f.id !== id)
  saveToStorage(STORAGE_KEY_ITEMS, items)
  saveToStorage(STORAGE_KEY_FOLDERS, folders)
  return true
}

function updateFolderCount(folderId: string | null) {
  if (!folderId) return
  const count = items.filter((item) => item.folderId === folderId).length
  const index = folders.findIndex((f) => f.id === folderId)
  if (index !== -1) {
    folders = [...folders.slice(0, index), { ...folders[index], itemCount: count }, ...folders.slice(index + 1)]
    saveToStorage(STORAGE_KEY_FOLDERS, folders)
  }
}

