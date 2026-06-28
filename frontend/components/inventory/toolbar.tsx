"use client"

import { Search, Plus, Grid3X3, List, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ViewMode, SortField, SortDirection } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"

export interface ToolbarProps {
  title: string
  subtitle?: string
  /** Optional: right-side (or center+right) content. Same bar UI on every page. */
  children?: React.ReactNode
}

/**
 * Shared toolbar/header for all platform pages: title (start), optional actions (end).
 * Same sticky bar styling everywhere. RTL-safe.
 */
export function Toolbar({ title, subtitle, children }: ToolbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex min-w-0 flex-col gap-3 border-b border-border bg-[var(--mac-toolbar-bg)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4 md:px-5 md:py-3.5",
        "backdrop-blur-[var(--mac-blur-sm)] sm:backdrop-blur-[var(--mac-blur-md)]"
      )}
    >
      <div className="min-w-0 shrink-0 sm:mr-2">
        <h1 className="truncate text-lg font-semibold text-foreground md:text-xl">{title}</h1>
        {subtitle != null && subtitle !== "" && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">{subtitle}</p>
        )}
      </div>
      {children != null && (
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {children}
        </div>
      )}
    </header>
  )
}

export interface ToolbarListActionsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField, direction: SortDirection) => void
  onAddItem: () => void
  showAddButton?: boolean
}

/** Search + view toggle + sort + Add Item for list views. Pass as Toolbar children. */
export function ToolbarListActions({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortField,
  sortDirection,
  onSortChange,
  onAddItem,
  showAddButton = true,
}: ToolbarListActionsProps) {
  const sortOptions: { field: SortField; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "quantity", label: "Quantity" },
    { field: "price", label: "Price" },
    { field: "updatedAt", label: "Last Updated" },
  ]

  return (
    <>
      <div className="relative min-w-0 flex-1">
        <Search
          className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search items by name, SKU, or tag..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full min-w-0 rounded-lg border-border bg-background/80 pl-9 pr-9 text-sm mac-transition focus-visible:ring-2"
          aria-label="Search items"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "rounded-md p-2 transition-colors mac-transition-fast min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5",
              viewMode === "grid"
                ? "bg-card text-foreground shadow-[var(--mac-shadow-xs)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={viewMode === "grid"}
            aria-label="Grid view"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={cn(
              "rounded-md p-2 transition-colors mac-transition-fast min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1.5",
              viewMode === "list"
                ? "bg-card text-foreground shadow-[var(--mac-shadow-xs)]"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={viewMode === "list"}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg border-border min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              aria-label="Sort options"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl border-border shadow-[var(--mac-shadow-md)]">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.field}
                onClick={() =>
                  onSortChange(
                    option.field,
                    sortField === option.field && sortDirection === "asc" ? "desc" : "asc"
                  )
                }
                className={cn("rounded-lg", sortField === option.field && "bg-accent")}
              >
                <span className="flex-1">{option.label}</span>
                {sortField === option.field && (
                  <span className="text-xs text-muted-foreground">
                    {sortDirection === "asc" ? "A–Z" : "Z–A"}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {showAddButton && (
          <Button
            onClick={onAddItem}
            className="h-9 shrink-0 rounded-lg min-h-[44px] px-4 sm:min-h-0 mac-transition"
          >
            <Plus className="me-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>
    </>
  )
}
