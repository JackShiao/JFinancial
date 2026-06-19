import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSubscriptionStatus } from '../api/subscriptionApi'
import { useAuthStore } from '../store/authStore'

/**
 * ECPay 付款結果頁
 *
 * 設計原則：
 * - RtnCode=1 → ECPay 前台確認付款完成，樂觀顯示「付款成功」
 * - 同時背景輪詢後端確認訂閱是否已啟用（S2S Notify 可能延遲數分鐘）
 * - 訂閱啟用後更新 isPremium 狀態；若 30 秒內仍未啟用，顯示「稍後確認」提示
 */
export default function SubscriptionResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const setIsPremium = useAuthStore((s) => s.setIsPremium)
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const rtnCode = searchParams.get('RtnCode')
  const rtnMsg = searchParams.get('RtnMsg')
  // ECPay RtnCode=1 代表前台付款成功
  const ecpaySuccess = rtnCode === '1'
  // ECPay 失敗時偶爾回傳 "Succeeded" 等無意義英文訊息，過濾後才顯示
  const displayRtnMsg = rtnMsg && !/^succeeded$/i.test(rtnMsg.trim()) ? rtnMsg : null

  // 背景輪詢後端：確認 S2S Notify 是否已處理（最多 10 次 × 5 秒 = 50 秒）
  useEffect(() => {
    if (!isLoggedIn || !ecpaySuccess) return

    let attempts = 0
    const MAX_ATTEMPTS = 10
    const INTERVAL_MS = 5000

    const poll = () => {
      getSubscriptionStatus()
        .then((res) => {
          attempts += 1
          if (res.data?.active) {
            setStatus(res.data)
            setIsPremium(true)
            setSubscriptionConfirmed(true)
          } else if (attempts < MAX_ATTEMPTS) {
            setTimeout(poll, INTERVAL_MS)
          }
          // 超過次數就不再輪詢，畫面仍顯示「付款成功，稍後生效」
        })
        .catch(() => {
          // 輪詢失敗不影響主畫面，靜默忽略
        })
    }

    poll()
  }, [isLoggedIn, ecpaySuccess, setIsPremium])

  // 付款成功後倒數自動跳轉
  useEffect(() => {
    if (!ecpaySuccess || !isLoggedIn) return
    const target = '/market'
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
  }, [ecpaySuccess, isLoggedIn, navigate])

  // ── 付款失敗 ───────────────────────────────────────────────
  if (!ecpaySuccess) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: '560px' }}>
        <div className="display-1 mb-3">❌</div>
        <h2 className="fw-bold text-danger">付款未完成</h2>
        <p className="text-muted mt-2">
          {displayRtnMsg || '交易已取消或發生錯誤，請重新嘗試。'}
        </p>
        <p className="text-muted small">若金額已扣款，請聯絡客服處理。</p>
        <Link to="/subscription" className="btn btn-outline-primary mt-3">
          返回訂閱頁面
        </Link>
      </div>
    )
  }

  // ── 未登入 ────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: '560px' }}>
        <div className="display-1 mb-3">🔒</div>
        <h2 className="fw-bold">請先登入</h2>
        <p className="text-muted mt-2">請登入後才能確認您的訂閱狀態。</p>
        <Link to="/" className="btn btn-outline-primary mt-3">
          回首頁
        </Link>
      </div>
    )
  }

  // ── 付款成功（RtnCode=1）─────────────────────────────────
  return (
    <div className="container py-5 text-center" style={{ maxWidth: '560px' }}>
      <div className="display-1 mb-3">🎉</div>
      <h2 className="fw-bold text-success">付款成功！</h2>
      {subscriptionConfirmed ? (
        <p className="text-muted mt-2">
          你的 Premium 訂閱已啟用。
          {status?.expireAt && (
            <> 有效期至：<strong>{new Date(status.expireAt).toLocaleDateString('zh-TW')}</strong></>
          )}
        </p>
      ) : (
        <p className="text-muted mt-2">
          訂閱權益正在啟用中，通常需要 1～2 分鐘生效。
          <br />
          <span className="small">若長時間未更新，請重新整理頁面查看狀態。</span>
        </p>
      )}
      <Link to="/market" className="btn btn-primary mt-3">
        前往市場頁
      </Link>
      <p className="text-muted small mt-3">{countdown} 秒後自動跳轉…</p>
    </div>
  )
}
