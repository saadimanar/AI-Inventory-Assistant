"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FolderTree } from "./folder-tree"
import { buildFolderTree, filterFolderTree } from "@/lib/folder-tree"
import type { Folder } from "@/lib/inventory-types"

export interface DashboardFolderDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: Folder[]
  /** Currently applied selection: null = All Items, otherwise folder IDs. */
  appliedSelection: string[] | null
  /** Called when user clicks Apply with the new selection. */
  onApply: (folderIds: string[] | null) => void
}

export function DashboardFolderDrawer({
  open,
  onOpenChange,
  folders,
  appliedSelection,
  onApply,
}: DashboardFolderDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [tempSelection, setTempSelection] = useState<string[] | null>(null)

  // When drawer opens, sync temp selection to applied; when it closes, clear search
  useEffect(() => {
    if (open) {
      setTempSelection(appliedSelection)
      setSearchQuery("")
    }
  }, [open, appliedSelection])

  const tree = buildFolderTree(folders)
  const filteredTree = filterFolderTree(tree, searchQuery)

  // When drawer is open, show temp selection; otherwise show applied (for accessibility when closed).
  const selectionToShow = open ? tempSelection : appliedSelection

  const handleApply = () => {
    onApply(tempSelection)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="flex flex-col p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 pb-4 pt-6 pe-12">
          <SheetTitle>Folders</SheetTitle>
        </SheetHeader>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search
              className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search folders"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 ps-8 rounded-lg border-border bg-background"
              aria-label="Search folders"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="pb-4">
            <FolderTree
              nodes={filteredTree}
              selectedFolderIds={selectionToShow}
              onSelectionChange={setTempSelection}
            />
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 gap-2 border-t border-border px-4 py-4">
          <Button variant="outline" onClick={handleCancel} className="mac-transition">
            Cancel
          </Button>
          <Button onClick={handleApply} className="mac-transition">
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
