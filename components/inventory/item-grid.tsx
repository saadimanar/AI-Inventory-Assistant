"use client"

import { Package, MoreVertical, Edit2, Trash2, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { InventoryItem, ViewMode, Folder } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"

interface ItemGridProps {
  items: InventoryItem[]
  folders: Folder[]
  viewMode: ViewMode
  onSelectItem: (item: InventoryItem) => void
  onEditItem: (item: InventoryItem) => void
  onDeleteItem: (item: InventoryItem) => void
}

export function ItemGrid({ items, folders, viewMode, onSelectItem, onEditItem, onDeleteItem }: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-foreground">No items found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Add your first item to get started.</p>
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quantity
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Price
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                Folder
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const folder = folders.find((f) => f.id === item.folderId)
              const isLowStock = item.quantity <= item.minQuantity
              return (
                <tr
                  key={item.id}
                  className="bg-card transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectItem(item)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl || "/placeholder.svg"}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-sm text-muted-foreground">{item.sku}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", isLowStock ? "text-destructive" : "text-foreground")}>
                        {item.quantity}
                      </span>
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-sm text-foreground">${item.price.toFixed(2)}</span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {folder && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded" style={{ backgroundColor: folder.color }} />
                        <span className="text-sm text-muted-foreground">{folder.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditItem(item)
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteItem(item)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const folder = folders.find((f) => f.id === item.folderId)
        const isLowStock = item.quantity <= item.minQuantity
        return (
          <Card
            key={item.id}
            className="group cursor-pointer overflow-hidden border-border transition-all hover:shadow-lg"
            onClick={() => onSelectItem(item)}
          >
            <div className="relative aspect-[4/3] bg-muted">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl || "/placeholder.svg"}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {isLowStock && (
                <div className="absolute left-2 top-2">
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                  </Badge>
                </div>
              )}
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditItem(item)
                      }}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteItem(item)
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.sku}</p>
                </div>
                <p className="text-lg font-bold text-foreground">${item.price.toFixed(2)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-medium", isLowStock ? "text-destructive" : "text-muted-foreground")}>
                    Qty: {item.quantity}
                  </span>
                </div>
                {folder && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded" style={{ backgroundColor: folder.color }} />
                    <span className="text-xs text-muted-foreground">{folder.name}</span>
                  </div>
                )}
              </div>
              {item.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
