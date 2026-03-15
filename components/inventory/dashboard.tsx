"use client"

import { useMemo, useState } from "react"
import { Package, AlertTriangle, FolderOpen, TrendingUp, ArrowRight, Filter, FileText, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { InventoryStats, InventoryItem, Folder } from "@/lib/inventory-types"

export type ActivityFilter = "all" | "items" | "folders"

interface ActivityEntry {
  id: string
  type: "item" | "folder"
  action: "created"
  targetName: string
  locationName: string
  date: Date
}

interface DashboardProps {
  stats: InventoryStats
  lowStockItems: InventoryItem[]
  recentItems: InventoryItem[]
  items: InventoryItem[]
  folders: Folder[]
  userDisplayName: string
  onViewLowStock: () => void
  onViewAllItems: () => void
  onSelectItem: (item: InventoryItem) => void
  /** When set, dashboard is filtered to these folders; used to show "Showing: ..." label. */
  selectedFolderIds?: string[] | null
  /** All folders (for resolving names when showing selected). */
  allFolders?: Folder[]
}

function formatActivityDate(date: Date): string {
  const d = date.getDate()
  const m = date.getMonth() + 1
  const y = date.getFullYear()
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
}

function MoneyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="11 12 17 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M12.8 13a.79.79 0 0 0-.8.78v7.78c0 .43.36.77.8.77h14.4a.79.79 0 0 0 .8-.77v-7.78a.79.79 0 0 0-.8-.78H12.8zm1.53 1.56h11.34c.12.33.39.59.73.7v4.8c-.34.13-.6.39-.73.72H14.33a1.18 1.18 0 0 0-.73-.71v-4.8c.34-.12.6-.38.73-.71zm5.67.77a2.37 2.37 0 0 0-2.4 2.34c0 1.28 1.07 2.33 2.4 2.33s2.4-1.04 2.4-2.33a2.37 2.37 0 0 0-2.4-2.34zm-4 1.56c-.44 0-.8.35-.8.78 0 .43.36.77.8.77.44 0 .8-.34.8-.77a.79.79 0 0 0-.8-.78zm8 0c-.44 0-.8.35-.8.78 0 .43.36.77.8.77.44 0 .8-.34.8-.77a.79.79 0 0 0-.8-.78zM12 23.1v1.56h16V23.1H12zm0 2.33V27h16v-1.56H12z"
      />
    </svg>
  )
}

export function SetFoldersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={1.5}
        d="M15.86 8.513c.97 0 1.757-.786 1.757-1.756S16.83 5 15.86 5c-.97 0-1.756.787-1.756 1.757 0 .97.786 1.756 1.756 1.756zM20.25 6.756h-2.195M13.662 6.756H4M14.98 19.494c.97 0 1.756-.787 1.756-1.757 0-.97-.786-1.756-1.757-1.756-.97 0-1.756.786-1.756 1.756s.786 1.757 1.756 1.757zM4 17.738h8.784M17.176 17.738h3.074M8.392 14.004c.97 0 1.756-.787 1.756-1.757 0-.97-.786-1.757-1.756-1.757s-1.757.787-1.757 1.757c0 .97.786 1.757 1.757 1.757zM4 12.248h2.196M10.588 12.248h9.662"
      />
    </svg>
  )
}

export function Dashboard({
  stats,
  lowStockItems,
  recentItems,
  items,
  folders,
  userDisplayName,
  onViewLowStock,
  onViewAllItems,
  onSelectItem,
  selectedFolderIds = null,
  allFolders = [],
}: DashboardProps) {
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all")

  const showingLabel =
    selectedFolderIds == null || selectedFolderIds.length === 0
      ? "All Items"
      : selectedFolderIds
          .map((id) => allFolders.find((f) => f.id === id)?.name ?? id)
          .filter(Boolean)
          .join(", ")

  const activities = useMemo(() => {
    const entries: ActivityEntry[] = []
    items.forEach((item) => {
      const folder = folders.find((f) => f.id === item.folderId)
      entries.push({
        id: `item-${item.id}`,
        type: "item",
        action: "created",
        targetName: item.name,
        locationName: folder?.name ?? "Items",
        date: item.createdAt,
      })
    })
    folders.forEach((folder) => {
      const parent = folder.parentId ? folders.find((f) => f.id === folder.parentId) : null
      entries.push({
        id: `folder-${folder.id}`,
        type: "folder",
        action: "created",
        targetName: folder.name,
        locationName: parent?.name ?? "Items",
        date: folder.createdAt,
      })
    })
    entries.sort((a, b) => b.date.getTime() - a.date.getTime())
    return entries
  }, [items, folders])

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") return activities.slice(0, 5)
    if (activityFilter === "items") return activities.filter((a) => a.type === "item").slice(0, 5)
    return activities.filter((a) => a.type === "folder").slice(0, 5)
  }, [activities, activityFilter])

  const summaryCards = [
    {
      title: "Items",
      value: items.length.toString(),
      icon: FileText,
      color: "text-stat-primary",
      bgColor: "bg-stat-primary/15",
    },
    {
      title: "Folders",
      value: stats.totalFolders.toString(),
      icon: FolderOpen,
      color: "text-stat-folders",
      bgColor: "bg-stat-folders/15",
    },
    {
      title: "Total Quantity",
      value: stats.totalItems.toLocaleString(),
      icon: Layers,
      color: "text-stat-quantity",
      bgColor: "bg-stat-quantity/15",
    },
    {
      title: "Total Value",
      value: `₪${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: MoneyIcon,
      color: "text-stat-value",
      bgColor: "bg-stat-value/15",
    },
  ]

  return (
    <div className="min-w-0 space-y-6 md:space-y-8">
      {selectedFolderIds != null && selectedFolderIds.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing: <span className="font-medium text-foreground">{showingLabel}</span>
        </p>
      )}
      {/* Inventory Summary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Inventory Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((stat) => (
            <Card key={stat.title} className="rounded-xl border-border shadow-[var(--mac-shadow-sm)] mac-transition">
              <CardContent className="flex flex-col items-center p-6">
                <div className="mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Items that need restocking */}
        <Card className="rounded-xl border-border shadow-[var(--mac-shadow-sm)] mac-transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Items that need restocking
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewLowStock} className="text-primary mac-transition rounded-lg">
              View All
              <ArrowRight className="ms-1 h-3 w-3 rtl:rotate-180" />
            </Button>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-stat-accent/10 p-3">
                  <TrendingUp className="h-6 w-6 text-stat-accent" />
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
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-start mac-transition hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        <Card className="rounded-xl border-border shadow-[var(--mac-shadow-sm)] mac-transition">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recently Updated</CardTitle>
            <Button variant="ghost" size="sm" onClick={onViewAllItems} className="text-primary mac-transition rounded-lg">
              View All
              <ArrowRight className="ms-1 h-3 w-3 rtl:rotate-180" />
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
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-start mac-transition hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      {/* Folders Overview */}
      <Card className="rounded-xl border-border shadow-[var(--mac-shadow-sm)] mac-transition">
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
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 mac-transition hover:bg-accent/80"
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

      {/* Recent Activity */}
      <Card className="rounded-xl border-border shadow-[var(--mac-shadow-sm)] mac-transition">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
                {activityFilter === "all" ? "All Activity" : activityFilter === "items" ? "Items" : "Folders"}
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActivityFilter("all")}>All Activity</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivityFilter("items")}>Items</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivityFilter("folders")}>Folders</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity yet.</p>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
              >
                <p className="text-sm text-foreground">
                  <span className="font-normal">{userDisplayName} created {activity.type} </span>
                  <span className="font-semibold">{activity.targetName}</span>
                  <span className="font-normal"> in </span>
                  <span className="font-semibold">{activity.locationName}</span>
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatActivityDate(activity.date)}
                </span>
              </div>
            ))
          )}
          {activities.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className="text-sm font-medium text-foreground hover:underline"
              >
                View all activity
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
