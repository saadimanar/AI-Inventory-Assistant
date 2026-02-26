"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/inventory/app-shell"
import { Sidebar } from "@/components/inventory/sidebar"
import { AiSearchPage } from "@/components/inventory/ai-search-page"
import { LoadingSkeleton } from "@/components/inventory/loading-skeleton"
import { getFolders, getLowStockItems } from "@/lib/inventory-store"
import { useSidebarCollapsed } from "@/lib/use-sidebar-collapsed"
import type { Folder } from "@/lib/inventory-types"
import { cn } from "@/lib/utils"

export default function AiSearchRoute() {
  const router = useRouter()
  const { isSidebarCollapsed, toggleSidebar } = useSidebarCollapsed()
  const [folders, setFolders] = useState<Folder[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getFolders(), getLowStockItems()]).then(
      ([foldersData, lowStockItems]) => {
        if (!cancelled) {
          setFolders(foldersData)
          setLowStockCount(lowStockItems.length)
        }
      }
    ).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleViewChange = (view: string) => {
    if (view === "ai-search") return
    if (view === "folder") {
      router.push("/?view=folder")
      return
    }
    router.push(`/?view=${view}`)
  }

  const handleFolderSelect = (folderId: string | null) => {
    if (folderId) {
      router.push(`/?view=folder&folderId=${encodeURIComponent(folderId)}`)
    } else {
      router.push("/?view=all-items")
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <AppShell>
      <Sidebar
        folders={folders}
        currentView="ai-search"
        currentFolderId={null}
        lowStockCount={lowStockCount}
        onViewChange={handleViewChange}
        onFolderSelect={handleFolderSelect}
        onAddFolder={() => router.push("/?view=dashboard")}
        aiSearchHref="/ai-search"
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-x-hidden pt-14 lg:pt-0 mac-transition",
          "lg:ms-64",
          isSidebarCollapsed && "lg:ms-16"
        )}
      >
        <AiSearchPage folders={folders} />
      </main>
    </AppShell>
  )
}
