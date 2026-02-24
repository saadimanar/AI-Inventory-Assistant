"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Settings,
  Plus,
  ChevronRight,
  Search,
  Menu,
  X,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Folder } from "@/lib/inventory-types"

interface SidebarProps {
  folders: Folder[]
  currentView: string
  currentFolderId: string | null
  lowStockCount: number
  onViewChange: (view: string) => void
  onFolderSelect: (folderId: string | null) => void
  onAddFolder: () => void
  onOpenChatSearch?: () => void
}

export function Sidebar({
  folders,
  currentView,
  currentFolderId,
  lowStockCount,
  onViewChange,
  onFolderSelect,
  onAddFolder,
  onOpenChatSearch,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [folderSearch, setFolderSearch] = useState("")

  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase()))

  const rootFolders = filteredFolders.filter((f) => !f.parentId)

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "all-items", label: "All Items", icon: Package },
    {
      id: "low-stock",
      label: "Low Stock",
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: "bg-destructive text-destructive-foreground",
    },
    ...(onOpenChatSearch
      ? [{ id: "chat-search", label: "AI Search", icon: MessageCircle, isAction: true as const }]
      : []),
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">Inventory</span>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          {/* Main Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isAction = "isAction" in item && item.isAction
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isAction && item.id === "chat-search" && onOpenChatSearch) {
                      onOpenChatSearch()
                      setIsOpen(false)
                    } else if (!isAction) {
                      onViewChange(item.id)
                      setIsOpen(false)
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    !isAction && currentView === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", item.badgeColor)}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Folders Section */}
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddFolder}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {folders.length > 4 && (
              <div className="mb-2 px-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search folders..."
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {rootFolders.map((folder) => {
                const children = filteredFolders.filter((f) => f.parentId === folder.id)
                return (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    children={children}
                    isSelected={currentFolderId === folder.id}
                    selectedFolderId={currentFolderId}
                    onSelect={(id) => {
                      onFolderSelect(id)
                      onViewChange("folder")
                      setIsOpen(false)
                    }}
                  />
                )
              })}
            </div>
          </div>
        </ScrollArea>

        {/* Settings */}
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => onViewChange("settings")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              currentView === "settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  )
}

interface FolderItemProps {
  folder: Folder
  children: Folder[]
  isSelected: boolean
  selectedFolderId: string | null
  onSelect: (id: string) => void
}

function FolderItem({ folder, children, isSelected, selectedFolderId, onSelect }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = children.length > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(folder.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="rounded p-0.5 hover:bg-secondary"
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
          </button>
        )}
        <div className="h-3 w-3 rounded" style={{ backgroundColor: folder.color }} />
        <span className="flex-1 truncate text-left">{folder.name}</span>
        <span className="text-xs text-muted-foreground">{folder.itemCount}</span>
      </button>

      {hasChildren && isExpanded && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              children={[]}
              isSelected={selectedFolderId === child.id}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
