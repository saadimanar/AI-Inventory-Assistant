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

interface HeaderProps {
  title: string
  subtitle?: string
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

export function Header({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortField,
  sortDirection,
  onSortChange,
  onAddItem,
  showAddButton = true,
}: HeaderProps) {
  const sortOptions: { field: SortField; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "quantity", label: "Quantity" },
    { field: "price", label: "Price" },
    { field: "updatedAt", label: "Last Updated" },
  ]

  return (
    <div className="min-w-0 space-y-4">
      {/* Title Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground md:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {showAddButton && (
          <Button onClick={onAddItem} className="min-h-[44px] shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Search & Filters Row */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items by name, SKU, or tag..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full min-w-0 pl-10 pr-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "min-h-[44px] min-w-[44px] rounded-md p-2 transition-colors md:min-h-0 md:min-w-0",
                viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "min-h-[44px] min-w-[44px] rounded-md p-2 transition-colors md:min-h-0 md:min-w-0",
                viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] md:h-8 md:w-8 md:min-h-0 md:min-w-0">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
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
                  className={cn(sortField === option.field && "bg-accent")}
                >
                  <span className="flex-1">{option.label}</span>
                  {sortField === option.field && (
                    <span className="text-xs text-muted-foreground">{sortDirection === "asc" ? "A-Z" : "Z-A"}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
