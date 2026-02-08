"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Dashboard } from "./dashboard"
import { Header } from "./header"
import { ItemGrid } from "./item-grid"
import { ItemFormDialog } from "./item-form-dialog"
import { FolderFormDialog } from "./folder-form-dialog"
import { ItemDetailPanel } from "./item-detail-panel"
import { DeleteDialog } from "./delete-dialog"
import { OnboardingModal, hasCompletedOnboarding } from "./onboarding-modal"
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
  getCurrentUserDisplayName,
} from "@/lib/inventory-store"

export function InventoryApp() {
  const router = useRouter()
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

  // Data state
  const [items, setItems] = useState<InventoryItem[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStockItems: 0, totalFolders: 0 })
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [userDisplayName, setUserDisplayName] = useState("User")
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [itemsData, foldersData, statsData, lowStockData, displayName] = await Promise.all([
        getItems(),
        getFolders(),
        getStats(),
        getLowStockItems(),
        getCurrentUserDisplayName(),
      ])
      setItems(itemsData)
      setFolders(foldersData)
      setStats(statsData)
      setLowStockItems(lowStockData)
      setUserDisplayName(displayName)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Show onboarding for first-time users after data (and display name) is loaded
  useEffect(() => {
    if (!isLoading && !hasCompletedOnboarding()) {
      setShowOnboarding(true)
    }
  }, [isLoading])

  // Get displayed items based on current view
  const displayedItems = useMemo(() => {
    let result: InventoryItem[]

    if (currentView === "low-stock") {
      result = lowStockItems
    } else if (currentView === "folder" && currentFolderId) {
      result = items.filter((item) => item.folderId === currentFolderId)
    } else if (currentView === "all-items") {
      result = items
    } else {
      result = []
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.description.toLowerCase().includes(lowerQuery) ||
          item.sku.toLowerCase().includes(lowerQuery) ||
          item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      )
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

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteItem(itemToDelete.id)
        if (selectedItem?.id === itemToDelete.id) {
          setSelectedItem(null)
        }
        await loadData()
      } catch (error) {
        console.error("Error deleting item:", error)
        alert("Failed to delete item")
      }
    }
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const handleSaveItem = async (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (editingItem) {
        const updated = await updateItem(editingItem.id, data)
        if (updated && selectedItem?.id === editingItem.id) {
          setSelectedItem(updated)
        }
      } else {
        await addItem(data)
      }
      await loadData()
    } catch (error) {
      console.error("Error saving item:", error)
      alert(error instanceof Error ? error.message : "Failed to save item")
    }
  }

  const handleAddFolder = () => {
    setEditingFolder(null)
    setFolderFormOpen(true)
  }

  const handleSaveFolder = async (data: Omit<Folder, "id" | "createdAt" | "itemCount">) => {
    try {
      if (editingFolder) {
        await updateFolder(editingFolder.id, data)
      } else {
        await addFolder(data)
      }
      await loadData()
    } catch (error) {
      console.error("Error saving folder:", error)
      alert(error instanceof Error ? error.message : "Failed to save folder")
    }
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    )
  }

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
                items={items}
                folders={folders}
                userDisplayName={userDisplayName}
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

      <OnboardingModal
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onStartSetup={() => router.push("/setup")}
        onExploreOnMyOwn={() => {}}
      />
    </div>
  )
}
