import axiosClient from './axiosClient'

// GET /api/subscription/plans — 取得所有訂閱方案（公開）
export async function getSubscriptionPlans() {
  const response = await axiosClient.get('/subscription/plans')
  return response.data
}

// POST /api/subscription/checkout — 建立 ECPay 付款訂單（需登入）
export async function createCheckout(planCode) {
  const response = await axiosClient.post('/subscription/checkout', { planCode })
  return response.data
}

// GET /api/subscription/status — 查詢當前訂閱狀態（需登入）
export async function getSubscriptionStatus() {
  const response = await axiosClient.get('/subscription/status')
  return response.data
}
