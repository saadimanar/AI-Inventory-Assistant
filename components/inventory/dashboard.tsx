"use client"

import { Package, DollarSign, AlertTriangle, FolderOpen, TrendingUp, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { InventoryStats, InventoryItem, Folder } from "@/lib/inventory-types"

interface DashboardProps {
  stats: InventoryStats
  lowStockItems: InventoryItem[]
  recentItems: InventoryItem[]
  folders: Folder[]
  onViewLowStock: () => void
  onViewAllItems: () => void
  onSelectItem: (item: InventoryItem) => void
}

export function Dashboard({
  stats,
  lowStockItems,
  recentItems,
  folders,
  onViewLowStock,
  onViewAllItems,
  onSelectItem,
}: DashboardProps) {
  const statCards = [
    {
      title: "Total Items",
      value: stats.totalItems.toLocaleString(),
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Value",
      value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Low Stock Alerts",
      value: stats.lowStockItems.toString(),
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Total Folders",
      value: stats.totalFolders.toString(),
      icon: FolderOpen,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock Alert
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewLowStock} className="text-primary">
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">All stocked up!</p>
                <p className="text-sm text-muted-foreground">No items are running low.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
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
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-destructive">{item.quantity} left</p>
                      <p className="text-xs text-muted-foreground">Min: {item.minQuantity}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Updated */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recently Updated</CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewAllItems} className="text-primary">
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentItems.slice(0, 4).map((item) => {
                const folder = folders.find((f) => f.id === item.folderId)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
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
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <div className="flex items-center gap-2">
                        {folder && (
                          <>
                            <div className="h-2 w-2 rounded" style={{ backgroundColor: folder.color }} />
                            <span className="text-xs text-muted-foreground">{folder.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{item.quantity}</p>
                      <p className="text-xs text-muted-foreground">in stock</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Folders Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {folders
              .filter((f) => !f.parentId)
              .slice(0, 4)
              .map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary"
                >
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${folder.color}20` }}>
                    <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{folder.name}</p>
                    <p className="text-sm text-muted-foreground">{folder.itemCount} items</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
