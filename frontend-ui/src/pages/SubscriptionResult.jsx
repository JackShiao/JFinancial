import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSubscriptionStatus } from '../api/subscriptionApi'
import { useAuthStore } from '../store/authStore'

/**
 * ECPay 付款結果頁
 *
 * ECPay 前台回跳（OrderResultURL）時會帶上 RtnCode、RtnMsg 等 query 參數。
 * 頁面同時呼叫後端確認實際訂閱狀態，避免只信任前台參數。
 */
export default function SubscriptionResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const setIsPremium = useAuthStore((s) => s.setIsPremium)
  const [loading, setLoading] = useState(isLoggedIn)
  const [hasError, setHasError] = useState(false)
  const [countdown, setCountdown] = useState(5) // 初始值即為 5，effect 只負責遞減
  const rtnMsg = searchParams.get('RtnMsg')
  // ECPay 失敗時偶爾回傳 "Succeeded" 等無意義英文訊息，過濾後才顯示
  const displayRtnMsg = rtnMsg && !/^succeeded$/i.test(rtnMsg.trim()) ? rtnMsg : null

  useEffect(() => {
    if (!isLoggedIn) return
    getSubscriptionStatus()
      .then((res) => {
        setStatus(res.data)
        if (res.data?.active) setIsPremium(true)
      })
      .catch(() => {
        setHasError(true)
      })
      .finally(() => setLoading(false))
  }, [isLoggedIn, setIsPremium])

  // 付款結果確認後，倒數 5 秒自動跳轉
  useEffect(() => {
    if (loading || !isLoggedIn || hasError) return
    const target = status?.active ? '/market' : '/subscription'
    let count = 5
    const timer = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(timer)
        navigate(target, { replace: true })
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [loading, status, isLoggedIn, hasError, navigate])

  const isPaid = status?.active

  if (!loading && hasError) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: '560px' }}>
        <div className="display-1 mb-3">⚠️</div>
        <h2 className="fw-bold">訂閱狀態驗證失敗</h2>
        <p className="text-muted mt-2">無法確認付款結果，請稍後重新整理頁面，或前往訂閱頁面查看狀態。</p>
        <Link to="/subscription" className="btn btn-outline-primary mt-3">
          前往訂閱頁面
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-5 text-center" style={{ maxWidth: '560px' }}>
      {loading ? (
        <div className="spinner-border text-primary" role="status" />
      ) : !isLoggedIn ? (
        <>
          <div className="display-1 mb-3">🔒</div>
          <h2 className="fw-bold">請先登入</h2>
          <p className="text-muted mt-2">請登入後才能確認您的訂閱狀態。</p>
          <Link to="/" className="btn btn-outline-primary mt-3">
            回首頁
          </Link>
        </>
      ) : isPaid ? (
        <>
          <div className="display-1 mb-3">🎉</div>
          <h2 className="fw-bold text-success">付款成功！</h2>
          <p className="text-muted mt-2">
            你的 Premium 訂閱已啟用。
            {status?.expireAt && (
              <> 有效期至：<strong>{new Date(status.expireAt).toLocaleDateString('zh-TW')}</strong></>
            )}
          </p>
          <Link to="/market" className="btn btn-primary mt-3">
            前往市場頁查看進階圖表
          </Link>
          <p className="text-muted small mt-3">{countdown} 秒後自動跳轉…</p>
        </>
      ) : (
        <>
          <div className="display-1 mb-3">❌</div>
          <h2 className="fw-bold text-danger">付款未完成</h2>
          <p className="text-muted mt-2">
            {displayRtnMsg || '交易已取消或發生錯誤，請重新嘗試。'}
          </p>
          <p className="text-muted small">若金額已扣款，請聯絡客服處理。</p>
          <Link to="/subscription" className="btn btn-outline-primary mt-3">
            返回訂閱頁面
          </Link>
          <p className="text-muted small mt-3">{countdown} 秒後自動跳轉…</p>
        </>
      )}
    </div>
  )
}
