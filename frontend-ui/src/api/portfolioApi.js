import axiosClient from './axiosClient'

// GET /api/portfolio — 取得所有持倉
export async function getHoldingsAPI() {
  const response = await axiosClient.get('/portfolio')
  return response.data
}

// POST /api/portfolio — 新增持倉
export async function addHoldingAPI(payload) {
  // payload: { symbol, quantity, buyPrice, buyDate, note? }
  const response = await axiosClient.post('/portfolio', payload)
  return response.data
}

// DELETE /api/portfolio/:id — 刪除持倉
export async function deleteHoldingAPI(id) {
  const response = await axiosClient.delete(`/portfolio/${id}`)
  return response.data
}

// PUT /api/portfolio/:id — 編輯持倉（數量 / 買入均價 / 買入日期 / 備註）
export async function updateHoldingAPI(id, payload) {
  // payload: { quantity, buyPrice, buyDate, note? }
  const response = await axiosClient.put(`/portfolio/${id}`, payload)
  return response.data
}
