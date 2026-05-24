import { useEffect, useState } from 'react'
import { getSubscriptionPlans, createCheckout, getSubscriptionStatus } from '../api/subscriptionApi'
import { useAuthStore } from '../store/authStore'

export default function Subscription() {
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(null) // 哪個方案正在處理
  const [error, setError] = useState('')

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const openModal = useAuthStore((s) => s.openModal)

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, statusRes] = await Promise.all([
          getSubscriptionPlans(),
          isLoggedIn ? getSubscriptionStatus() : Promise.resolve(null),
        ])
        setPlans(plansRes.data ?? [])
        if (statusRes) setStatus(statusRes.data)
      } catch {
        setError('資料載入失敗，請稍後再試。')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isLoggedIn])

  async function handleCheckout(planCode) {
    if (!isLoggedIn) {
      openModal('login')
      return
    }
    setCheckoutLoading(planCode)
    setError('')
    try {
      const res = await createCheckout(planCode)
      const { formHtml } = res.data

      // 將後端回傳的 HTML form 插入 DOM 並自動 submit → 跳轉 ECPay 付款頁
      const container = document.createElement('div')
      container.innerHTML = formHtml
      document.body.appendChild(container)
      const form = container.querySelector('form')
      if (form) {
        form.submit()
      } else {
        setError('無法建立付款表單，請稍後再試。')
        document.body.removeChild(container)
      }
    } catch {
      setError('建立訂單失敗，請稍後再試。')
    } finally {
      setCheckoutLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    )
  }

  return (
    <div className="container py-5" style={{ maxWidth: '860px' }}>
      <div className="text-center mb-5">
        <h1 className="fw-bold">升級 Premium</h1>
        <p className="text-muted">解鎖進階市場圖表，查看更長的歷史走勢</p>

        {/* 現有訂閱狀態 */}
        {status?.active && (
          <div className="alert alert-success d-inline-block mt-2">
            ✅ 你的 Premium 訂閱有效期至：
            <strong> {new Date(status.expireAt).toLocaleDateString('zh-TW')}</strong>
            （續購將自動延長）
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-4 justify-content-center">
        {plans.map((plan) => (
          <div key={plan.code} className="col-sm-6">
            <div className={`card h-100 shadow-sm border-2 ${plan.code === 'ANNUAL' ? 'border-primary' : ''}`}>
              {plan.code === 'ANNUAL' && (
                <div className="card-header bg-primary text-white text-center fw-bold">
                  推薦方案
                </div>
              )}
              <div className="card-body d-flex flex-column text-center p-4">
                <h3 className="card-title fw-bold">{plan.name}</h3>
                <div className="my-3">
                  <span className="display-5 fw-bold">NT${plan.priceTwd.toLocaleString()}</span>
                  <span className="text-muted"> / {plan.durationDays} 天</span>
                </div>

                <ul className="list-unstyled text-start mb-4">
                  <li className="mb-2">✅ 市場歷史資料 365 筆</li>
                  <li className="mb-2">✅ 所有指數完整走勢圖</li>
                  <li className="mb-2">✅ 無廣告體驗</li>
                </ul>

                <button
                  className={`btn mt-auto ${plan.code === 'ANNUAL' ? 'btn-primary' : 'btn-outline-primary'}`}
                  disabled={checkoutLoading !== null}
                  onClick={() => handleCheckout(plan.code)}
                >
                  {checkoutLoading === plan.code ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : null}
                  {isLoggedIn ? '立即訂閱' : '登入後訂閱'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 免費方案說明 */}
      <div className="text-center mt-5 text-muted small">
        免費方案：市場歷史資料 30 筆 · 基本指數瀏覽
      </div>
    </div>
  )
}
