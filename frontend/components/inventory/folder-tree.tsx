"use client"

import { FolderOpen } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { FolderTreeNode as FolderTreeNodeType } from "@/lib/folder-tree"

export interface FolderTreeProps {
  /** Root nodes (after building + optional search filter). */
  nodes: FolderTreeNodeType[]
  /** Current selection: null = "All Items", otherwise list of folder IDs. */
  selectedFolderIds: string[] | null
  /** Called when selection changes (temporary state in drawer). */
  onSelectionChange: (folderIds: string[] | null) => void
}

export function FolderTree({
  nodes,
  selectedFolderIds,
  onSelectionChange,
}: FolderTreeProps) {
  const isAllItems = selectedFolderIds === null
  const set = selectedFolderIds ? new Set(selectedFolderIds) : new Set<string>()

  const handleAllItemsChange = (checked: boolean) => {
    if (checked) {
      onSelectionChange(null)
    }
  }

  const handleFolderChange = (folderId: string, checked: boolean) => {
    if (checked) {
      const next = set.size === 0 ? [folderId] : [...set, folderId]
      onSelectionChange(next)
    } else {
      const nextSet = new Set(set)
      nextSet.delete(folderId)
      onSelectionChange(nextSet.size === 0 ? null : Array.from(nextSet))
    }
  }

  return (
    <div className="space-y-0.5">
      <FolderTreeNode
        id="all-items"
        label="All Items"
        depth={0}
        isVirtualRoot
        checked={isAllItems}
        onCheckedChange={handleAllItemsChange}
      />
      <div className="mt-0.5">
        {nodes.map((node) => (
          <FolderTreeNode
            key={node.id}
            id={node.id}
            label={node.name}
            color={node.color}
            depth={1}
            children={node.children}
            checked={!isAllItems && set.has(node.id)}
            onCheckedChange={(checked) => handleFolderChange(node.id, checked)}
            selectedFolderIds={selectedFolderIds}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </div>
  )
}

interface FolderTreeNodeProps {
  id: string
  label: string
  color?: string
  depth: number
  isVirtualRoot?: boolean
  children?: FolderTreeNodeType[]
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  selectedFolderIds?: string[] | null
  onSelectionChange?: (folderIds: string[] | null) => void
}

function FolderTreeNode({
  id,
  label,
  color,
  depth,
  isVirtualRoot,
  children = [],
  checked,
  onCheckedChange,
  selectedFolderIds,
  onSelectionChange,
}: FolderTreeNodeProps) {
  const set = selectedFolderIds ? new Set(selectedFolderIds) : new Set<string>()

  const handleChildChange = (folderId: string, checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      const next = set.size === 0 ? [folderId] : [...set, folderId]
      onSelectionChange(next)
    } else {
      const nextSet = new Set(set)
      nextSet.delete(folderId)
      onSelectionChange(nextSet.size === 0 ? null : Array.from(nextSet))
    }
  }

  const indentPx = 12 + depth * 28

  return (
    <div className="flex flex-col">
      <label
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm mac-transition hover:bg-accent/80",
          depth > 0 && "border-inline-start-2 border-border/50",
          isVirtualRoot && "font-medium"
        )}
        style={{ paddingInlineStart: `${indentPx}px`, marginInlineStart: depth > 0 ? "4px" : 0 }}
      >
        {isVirtualRoot ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <div
            className="h-3 w-3 shrink-0 rounded"
            style={{ backgroundColor: color ?? "var(--muted-foreground)" }}
          />
        )}
        <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          onClick={(e) => e.stopPropagation()}
          aria-label={isVirtualRoot ? "All Items" : label}
        />
      </label>
      {children.length > 0 && (
        <div className="mt-0.5">
          {children.map((child) => (
            <FolderTreeNode
              key={child.id}
              id={child.id}
              label={child.name}
              color={child.color}
              depth={depth + 1}
              children={child.children}
              checked={selectedFolderIds != null && set.has(child.id)}
              onCheckedChange={(checked) => handleChildChange(child.id, checked)}
              selectedFolderIds={selectedFolderIds}
              onSelectionChange={onSelectionChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}
