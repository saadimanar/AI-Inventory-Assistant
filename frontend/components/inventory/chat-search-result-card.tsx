"use client"

import { Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ChatSearchResultItem } from "@/lib/chat-search-types"
import type { Folder } from "@/lib/inventory-types"

export interface ChatSearchResultCardProps {
  item: ChatSearchResultItem
  folders: Folder[]
  onSelect: () => void
}

export function ChatSearchResultCard({
  item,
  folders,
  onSelect,
}: ChatSearchResultCardProps) {
  const folder = folders.find((f) => f.id === item.folderId)
  const isLowStock = item.quantity <= item.minQuantity

  return (
    <Card
      className="cursor-pointer border-border transition-colors hover:bg-muted/50"
      onClick={onSelect}
    >
      <div className="flex gap-3 p-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardContent className="min-w-0 flex-1 p-0">
          <p className="truncate font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.sku}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">
              ${item.price.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              Qty: {item.quantity}
            </span>
            {isLowStock && (
              <Badge variant="destructive" className="text-xs">
                Low stock
              </Badge>
            )}
            {folder && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded"
                  style={{ backgroundColor: folder.color }}
                />
                {folder.name}
              </span>
            )}
          </div>
          {item.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
