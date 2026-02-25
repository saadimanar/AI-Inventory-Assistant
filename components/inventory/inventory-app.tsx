"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppShell } from "./app-shell"
import { Sidebar } from "./sidebar"
import { Dashboard } from "./dashboard"
import { Toolbar, ToolbarListActions } from "./toolbar"
import { SetFoldersIcon } from "./dashboard"
import { ContentWindow } from "./content-window"
import { ItemGrid } from "./item-grid"
import { LoadingSkeleton } from "./loading-skeleton"
import { ItemFormDialog } from "./item-form-dialog"
import { FolderFormDialog } from "./folder-form-dialog"
import { ItemDetailPanel } from "./item-detail-panel"
import { DeleteDialog } from "./delete-dialog"
import { Settings } from "./settings"
import { ChatSearchPanel } from "./chat-search-panel"
import { Button } from "@/components/ui/button"
import type { InventoryItem, Folder, ViewMode, SortField, SortDirection } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"
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
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed"

export function InventoryApp() {
  const router = useRouter()
  const { isSidebarCollapsed, toggleSidebar } = useSidebarCollapsed()
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
  const [chatSearchOpen, setChatSearchOpen] = useState(false)

  // Data state
  const [items, setItems] = useState<InventoryItem[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStockItems: 0, totalFolders: 0 })
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [userDisplayName, setUserDisplayName] = useState("User")
  const [isLoading, setIsLoading] = useState(true)

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
        toast.error("Failed to delete item")
      }
    }
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const handleSaveItem = async (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      let savedId: string
      if (editingItem) {
        const updated = await updateItem(editingItem.id, data)
        if (updated && selectedItem?.id === editingItem.id) {
          setSelectedItem(updated)
        }
        savedId = editingItem.id
      } else {
        const created = await addItem(data)
        savedId = created.id
      }
      await loadData()
      // Update search index (embedding + search_text) in background
      fetch(`/api/items/${savedId}/embedding`, { method: "POST" }).catch(() => {})
    } catch (error) {
      console.error("Error saving item:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save item")
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
      toast.error(error instanceof Error ? error.message : "Failed to save folder")
    }
  }

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item)
  }

  const handleSelectItemFromChat = (item: { id: string }) => {
    const found = items.find((i) => i.id === item.id)
    if (found) {
      setSelectedItem(found)
      setChatSearchOpen(false)
    }
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
    return <LoadingSkeleton />
  }

  return (
    <AppShell>
      <Sidebar
        folders={folders}
        currentView={currentView}
        currentFolderId={currentFolderId}
        lowStockCount={lowStockItems.length}
        onViewChange={handleViewChange}
        onFolderSelect={setCurrentFolderId}
        onAddFolder={handleAddFolder}
        onOpenChatSearch={() => setChatSearchOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main Content - margin when sidebar visible (RTL: ms) */}
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-x-hidden pt-14 lg:pt-0 mac-transition",
          "lg:ms-64",
          isSidebarCollapsed && "lg:ms-16"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0 px-4 pb-4 pt-2 lg:px-6 lg:pb-6 lg:pt-6">
          {/* Same toolbar/header on every page */}
          <Toolbar
            title={title}
            subtitle={subtitle}
            children={
              currentView === "dashboard" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="ms-auto min-h-[44px] shrink-0 rounded-lg border-border hover:bg-accent mac-transition sm:min-h-0"
                >
                  <SetFoldersIcon className="me-2 h-5 w-5" />
                  Set Folders
                </Button>
              ) : currentView === "all-items" || currentView === "low-stock" || currentView === "folder" ? (
                <ToolbarListActions
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                  onAddItem={handleAddItem}
                />
              ) : undefined
            }
          />

          {currentView === "dashboard" && (
            <ContentWindow className="overflow-y-auto">
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
            </ContentWindow>
          )}
          {currentView === "settings" && (
            <ContentWindow>
              <Settings />
            </ContentWindow>
          )}
          {(currentView === "all-items" || currentView === "low-stock" || currentView === "folder") && (
            <div className={cn("flex min-w-0 flex-1 gap-0", selectedItem && "flex-col lg:flex-row")}>
              <ContentWindow noPadding className={cn("min-h-0 flex-1", selectedItem && "hidden lg:block")}>
                <ItemGrid
                  items={displayedItems}
                  folders={folders}
                  viewMode={viewMode}
                  onSelectItem={handleSelectItem}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                />
              </ContentWindow>
              {selectedItem && (
                <div className="w-full min-w-0 flex-shrink-0 lg:w-96 lg:min-w-[24rem]">
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
          )}
        </div>
      </main>

      {/* Dialogs - outside main */}
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

      <ChatSearchPanel
        open={chatSearchOpen}
        onClose={() => setChatSearchOpen(false)}
        folders={folders}
        onSelectItem={handleSelectItemFromChat}
      />
    </AppShell>
  )
}
