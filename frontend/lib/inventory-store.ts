/**
 * Client-side inventory API. All persistence is handled by the Python backend.
 */
export {
  fetchSessionUserId,
  getCurrentUserDisplayName,
  getItems,
  getFolders,
  getLowStockItems,
  addItem,
  updateItem,
  deleteItem,
  addFolder,
  updateFolder,
  deleteFolder,
  refreshItemEmbedding,
  clearSession,
} from "@/lib/api-client"
