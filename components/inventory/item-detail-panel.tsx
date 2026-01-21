"use client"

import { X, Edit2, Trash2, Package, AlertTriangle, Calendar, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { InventoryItem, Folder } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"

interface ItemDetailPanelProps {
  item: InventoryItem
  folder: Folder | undefined
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ItemDetailPanel({ item, folder, onClose, onEdit, onDelete }: ItemDetailPanelProps) {
  const isLowStock = item.quantity <= item.minQuantity

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold text-foreground">Item Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Image */}
        <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          {item.imageUrl ? (
            <img src={item.imageUrl || "/placeholder.svg"} alt={item.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Title & Price */}
        <div className="mt-4">
          <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
          <p className="mt-1 text-2xl font-bold text-primary">${item.price.toFixed(2)}</p>
        </div>

        {/* Low Stock Warning */}
        {isLowStock && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Low stock alert - only {item.quantity} left</span>
          </div>
        )}

        <Separator className="my-4" />

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">SKU</span>
            <span className="font-medium text-foreground">{item.sku}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <span className={cn("font-medium", isLowStock ? "text-destructive" : "text-foreground")}>
              {item.quantity} units
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Min. Quantity</span>
            <span className="font-medium text-foreground">{item.minQuantity} units</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="font-medium text-foreground">${(item.quantity * item.price).toFixed(2)}</span>
          </div>
          {folder && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Folder</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded" style={{ backgroundColor: folder.color }} />
                <span className="font-medium text-foreground">{folder.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm font-medium text-foreground">Description</h4>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Tag className="h-4 w-4" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Timestamps */}
        <Separator className="my-4" />
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Created: {item.createdAt.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Updated: {item.updatedAt.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border p-4">
        <div className="flex gap-3">
          <Button onClick={onEdit} className="flex-1">
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={onDelete} className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
