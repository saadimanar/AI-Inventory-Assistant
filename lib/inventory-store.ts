/**
 * Client-safe entry points for inventory data access.
 * All persistence runs in Server Actions (`lib/inventory-actions.ts`).
 */
export {
  fetchSessionUserId,
  getCurrentUserDisplayName,
  getItems,
  getFolders,
  getStats,
  getItemsByFolder,
  getLowStockItems,
  searchItems,
  addItem,
  updateItem,
  deleteItem,
  addFolder,
  updateFolder,
  deleteFolder,
} from "@/lib/inventory-actions"
