import axiosClient from './axiosClient'

// GET /api/watchlist — 取得目前登入者的追蹤清單
export async function getWatchlistAPI() {
  const response = await axiosClient.get('/watchlist')
  return response.data
}

// POST /api/watchlist/:symbol — 新增指數到追蹤清單
export async function addToWatchlistAPI(symbol) {
  const response = await axiosClient.post(`/watchlist/${encodeURIComponent(symbol)}`)
  return response.data
}

// DELETE /api/watchlist/:symbol — 從追蹤清單移除指數
export async function removeFromWatchlistAPI(symbol) {
  const response = await axiosClient.delete(`/watchlist/${encodeURIComponent(symbol)}`)
  return response.data
}
