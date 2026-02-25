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
      {/* Mobile Menu Button - RTL: fixed to start side */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed start-4 top-4 z-50 h-11 min-h-[44px] min-w-[44px] w-11 rounded-lg lg:hidden mac-transition"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay - blurred when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--mac-overlay)] backdrop-blur-[var(--mac-blur-sm)] lg:hidden mac-transition"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar - RTL: inset-inline-start, width transition, slide from start when mobile */}
      <aside
        className={cn(
          "fixed start-0 inset-y-0 z-40 flex h-full flex-col border-border bg-[var(--mac-sidebar-bg)] lg:bg-sidebar",
          "border-e shadow-[var(--mac-shadow-sm)]",
          "transition-[width,transform] duration-[var(--mac-duration-slow)] ease-[var(--mac-ease)] lg:translate-x-0",
          "w-[var(--mac-sidebar-width)]",
          collapsed && "lg:w-[var(--mac-sidebar-collapsed)]",
          isOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        {/* Sidebar header: collapsed = toggle only; expanded = logo + title + toggle */}
        {collapsed ? (
          <div className="flex h-[var(--mac-toolbar-height)] shrink-0 items-center justify-center border-b border-border">
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 max-md:hidden rounded-lg mac-transition"
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
          <div className="flex h-[var(--mac-toolbar-height)] shrink-0 items-center gap-2 border-b border-border px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="truncate text-lg font-semibold text-foreground">Inventory</span>
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="icon"
                className="ms-auto h-8 w-8 shrink-0 max-md:hidden rounded-lg mac-transition"
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
          <nav className="space-y-0.5" aria-label="Main navigation">
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
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium mac-transition",
                    collapsed && "lg:justify-center lg:px-2",
                    !isAction && currentView === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className={cn("flex-1 text-start", collapsed && "lg:sr-only lg:w-0 lg:overflow-hidden lg:opacity-0")}>
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
              <Button variant="ghost" size="icon" className={cn("h-6 w-6 shrink-0 rounded-lg", collapsed && "lg:h-8 lg:w-8")} onClick={onAddFolder} title={collapsed ? "Add folder" : undefined} aria-label="Add folder">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {folders.length > 4 && !collapsed && (
              <div className="mb-2 px-1">
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
                  <Input
                    placeholder="Search folders..."
                    value={folderSearch}
                    onChange={(e) => setFolderSearch(e.target.value)}
                    className="h-8 ps-8 pe-3 text-sm rounded-lg border-border"
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
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium mac-transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed && "lg:justify-center lg:px-2",
              currentView === "settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm mac-transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        {hasChildren && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="rounded p-0.5 hover:bg-accent"
            aria-expanded={isExpanded}
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", isExpanded && "rotate-90")} />
          </button>
        )}
        <div className="h-3 w-3 shrink-0 rounded" style={{ backgroundColor: folder.color }} />
        <span className="min-w-0 flex-1 truncate text-start">{folder.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{folder.itemCount}</span>
      </button>

      {hasChildren && isExpanded && (
        <div className="ms-4 mt-0.5 space-y-0.5">
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
