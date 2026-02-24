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
  PanelLeftClose,
  PanelLeft,
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
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
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
  isSidebarCollapsed = false,
  onToggleSidebar,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [folderSearch, setFolderSearch] = useState("")
  const collapsed = isSidebarCollapsed

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
        className="fixed left-4 top-4 z-50 h-11 min-h-[44px] min-w-[44px] w-11 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-card transition-[width,transform] duration-200 ease-in-out lg:translate-x-0",
          "w-64",
          collapsed && "lg:w-16",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header: collapsed = toggle only; expanded = logo + title + toggle */}
        {collapsed ? (
          <div className="flex h-16 shrink-0 items-center justify-center border-b border-border">
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 max-md:hidden"
                onClick={onToggleSidebar}
                aria-label="Expand sidebar"
              >
                <span className="size-5 [color:currentColor] rtl:scale-x-[-1]" aria-hidden>
                  <PanelLeft className="size-5" aria-hidden />
                </span>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground truncate">Inventory</span>
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8 shrink-0 max-md:hidden"
                onClick={onToggleSidebar}
                aria-label="Collapse sidebar"
              >
                <span className="size-5 [color:currentColor] rtl:scale-x-[-1]" aria-hidden>
                  <PanelLeftClose className="size-5" aria-hidden />
                </span>
              </Button>
            )}
          </div>
        )}

        <ScrollArea className={cn("flex-1 py-4", collapsed ? "lg:px-2" : "px-3")}>
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
                    collapsed && "lg:justify-center lg:px-2",
                    !isAction && currentView === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn("flex-1 text-left", collapsed && "lg:sr-only lg:w-0 lg:overflow-hidden lg:opacity-0")}>
                    {item.label}
                  </span>
                  {"badge" in item && item.badge && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium shrink-0", item.badgeColor, collapsed && "lg:sr-only")}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Folders Section - hidden when collapsed on desktop */}
          <div className={cn("mt-8", collapsed && "lg:mt-4 lg:overflow-hidden")}>
            <div className={cn("mb-2 flex items-center justify-between px-3", collapsed && "lg:justify-center lg:px-0")}>
              <span className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", collapsed && "lg:sr-only lg:w-0 lg:overflow-hidden lg:opacity-0")}>
                Folders
              </span>
              <Button variant="ghost" size="icon" className={cn("h-6 w-6 shrink-0", collapsed && "lg:h-8 lg:w-8")} onClick={onAddFolder} title={collapsed ? "Add folder" : undefined}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {folders.length > 4 && !collapsed && (
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

            <div className={cn("space-y-0.5", collapsed && "lg:hidden")}>
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
        <div className={cn("border-t border-border p-3", collapsed && "lg:flex lg:justify-center lg:px-2")}>
          <button
            type="button"
            onClick={() => onViewChange("settings")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "lg:justify-center lg:px-2",
              currentView === "settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && "lg:sr-only lg:w-0 lg:overflow-hidden lg:opacity-0")}>Settings</span>
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
