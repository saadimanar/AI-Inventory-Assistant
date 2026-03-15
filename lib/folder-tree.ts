import type { Folder } from "./inventory-types"

/** Node in the folder tree (nested structure). */
export interface FolderTreeNode {
  id: string
  name: string
  color: string
  children: FolderTreeNode[]
}

/**
 * Build a tree from flat folders using parentId.
 * Returns only root nodes (parentId === null); children are nested.
 */
export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const byId = new Map<string, FolderTreeNode>()

  folders.forEach((f) => {
    byId.set(f.id, {
      id: f.id,
      name: f.name,
      color: f.color,
      children: [],
    })
  })

  const roots: FolderTreeNode[] = []

  folders.forEach((f) => {
    const node = byId.get(f.id)!
    if (f.parentId == null) {
      roots.push(node)
    } else {
      const parent = byId.get(f.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }
  })

  // Sort roots and children by name for consistent display
  const sortNodes = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(roots)

  return roots
}

/**
 * Check if a node or any descendant matches the search query (case-insensitive).
 */
function nodeMatchesSearch(node: FolderTreeNode, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase().trim()
  if (node.name.toLowerCase().includes(q)) return true
  return node.children.some((c) => nodeMatchesSearch(c, q))
}

/**
 * Filter tree so that only nodes matching the search (or ancestors of matching nodes) remain.
 * Preserves parent chain when a nested child matches.
 */
export function filterFolderTree(
  nodes: FolderTreeNode[],
  query: string
): FolderTreeNode[] {
  if (!query.trim()) return nodes

  const q = query.toLowerCase().trim()

  function filter(nodes: FolderTreeNode[]): FolderTreeNode[] {
    return nodes
      .map((node) => {
        const matchingChildren = filter(node.children)
        const selfMatches = node.name.toLowerCase().includes(q)
        if (selfMatches || matchingChildren.length > 0) {
          return {
            ...node,
            children: selfMatches ? node.children : matchingChildren,
          }
        }
        return null
      })
      .filter((n): n is FolderTreeNode => n !== null)
  }

  return filter(nodes)
}
