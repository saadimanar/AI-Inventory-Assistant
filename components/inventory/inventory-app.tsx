"use client"

import { useState, useMemo, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { Dashboard } from "./dashboard"
import { Header } from "./header"
import { ItemGrid } from "./item-grid"
import { ItemFormDialog } from "./item-form-dialog"
import { FolderFormDialog } from "./folder-form-dialog"
import { ItemDetailPanel } from "./item-detail-panel"
import { DeleteDialog } from "./delete-dialog"
import { Settings } from "./settings"
import type { InventoryItem, Folder, ViewMode, SortField, SortDirection } from "@/lib/inventory-types"
import {
  getItems,
  getFolders,
  getStats,
  getLowStockItems,
  searchItems,
  addItem,
  updateItem,
  deleteItem,
  addFolder,
  updateFolder,
  deleteFolder,
  getItemsByFolder,
} from "@/lib/inventory-store"

export function InventoryApp() {
  // State
  const [currentView, setCurrentView] = useState("dashboard")
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [sortField, setSortField] = useState<SortField>("updatedAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Dialog states
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [folderFormOpen, setFolderFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)

  // Force re-render when data changes
  const [, setUpdateTrigger] = useState(0)
  const triggerUpdate = useCallback(() => setUpdateTrigger((n) => n + 1), [])

  // Data
  const items = useMemo(() => getItems(), [])
  const folders = useMemo(() => getFolders(), [])
  const stats = useMemo(() => getStats(), [])
  const lowStockItems = useMemo(() => getLowStockItems(), [])

  // Get displayed items based on current view
  const displayedItems = useMemo(() => {
    let result: InventoryItem[]

    if (currentView === "low-stock") {
      result = lowStockItems
    } else if (currentView === "folder" && currentFolderId) {
      result = getItemsByFolder(currentFolderId)
    } else if (currentView === "all-items") {
      result = items
    } else {
      result = []
    }

    // Apply search filter
    if (searchQuery) {
      result = searchItems(searchQuery).filter((item) => result.some((r) => r.id === item.id))
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "quantity":
          comparison = a.quantity - b.quantity
          break
        case "price":
          comparison = a.price - b.price
          break
        case "updatedAt":
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime()
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [currentView, currentFolderId, searchQuery, sortField, sortDirection, items, lowStockItems])

  // Get recently updated items for dashboard
  const recentItems = useMemo(() => {
    return [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5)
  }, [items])

  // Handlers
  const handleAddItem = () => {
    setEditingItem(null)
    setItemFormOpen(true)
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item)
    setItemFormOpen(true)
  }

  const handleDeleteItem = (item: InventoryItem) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete.id)
      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null)
      }
      triggerUpdate()
    }
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const handleSaveItem = (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    if (editingItem) {
      const updated = updateItem(editingItem.id, data)
      if (updated && selectedItem?.id === editingItem.id) {
        setSelectedItem(updated)
      }
    } else {
      addItem(data)
    }
    triggerUpdate()
  }

  const handleAddFolder = () => {
    setEditingFolder(null)
    setFolderFormOpen(true)
  }

  const handleSaveFolder = (data: Omit<Folder, "id" | "createdAt" | "itemCount">) => {
    if (editingFolder) {
      updateFolder(editingFolder.id, data)
    } else {
      addFolder(data)
    }
    triggerUpdate()
  }

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item)
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view)
    setSearchQuery("")
    if (view !== "folder") {
      setCurrentFolderId(null)
    }
  }

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
  }

  // Get page title and subtitle
  const getPageInfo = () => {
    switch (currentView) {
      case "dashboard":
        return { title: "Dashboard", subtitle: "Overview of your inventory" }
      case "all-items":
        return { title: "All Items", subtitle: `${items.length} total items` }
      case "low-stock":
        return { title: "Low Stock", subtitle: `${lowStockItems.length} items need attention` }
      case "folder":
        const folder = folders.find((f) => f.id === currentFolderId)
        return {
          title: folder?.name || "Folder",
          subtitle: `${displayedItems.length} items in this folder`,
        }
      case "settings":
        return { title: "Settings", subtitle: "Manage your preferences" }
      default:
        return { title: "Inventory", subtitle: "" }
    }
  }

  const { title, subtitle } = getPageInfo()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        folders={folders}
        currentView={currentView}
        currentFolderId={currentFolderId}
        lowStockCount={lowStockItems.length}
        onViewChange={handleViewChange}
        onFolderSelect={setCurrentFolderId}
        onAddFolder={handleAddFolder}
      />

      {/* Main Content */}
      <main className="flex flex-1 flex-col lg:ml-64">
        <div className="flex flex-1">
          <div className={`flex-1 p-4 pt-20 lg:p-8 lg:pt-8 ${selectedItem ? "hidden lg:block" : ""}`}>
            {currentView === "dashboard" ? (
              <Dashboard
                stats={stats}
                lowStockItems={lowStockItems}
                recentItems={recentItems}
                folders={folders}
                onViewLowStock={() => setCurrentView("low-stock")}
                onViewAllItems={() => setCurrentView("all-items")}
                onSelectItem={handleSelectItem}
              />
            ) : currentView === "settings" ? (
              <Settings />
            ) : (
              <div className="space-y-6">
                <Header
                  title={title}
                  subtitle={subtitle}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                  onAddItem={handleAddItem}
                />
                <ItemGrid
                  items={displayedItems}
                  folders={folders}
                  viewMode={viewMode}
                  onSelectItem={handleSelectItem}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedItem && (
            <div className="w-full lg:w-96 flex-shrink-0">
              <ItemDetailPanel
                item={selectedItem}
                folder={folders.find((f) => f.id === selectedItem.folderId)}
                onClose={() => setSelectedItem(null)}
                onEdit={() => handleEditItem(selectedItem)}
                onDelete={() => handleDeleteItem(selectedItem)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <ItemFormDialog
        open={itemFormOpen}
        onOpenChange={setItemFormOpen}
        item={editingItem}
        folders={folders}
        onSave={handleSaveItem}
      />

      <FolderFormDialog
        open={folderFormOpen}
        onOpenChange={setFolderFormOpen}
        folder={editingFolder}
        folders={folders}
        onSave={handleSaveFolder}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Item"
        description={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
