import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const setIsPremium = useAuthStore((s) => s.setIsPremium)
  const rtnCode = searchParams.get('RtnCode')  // ECPay: "1" = 成功
  const rtnMsg = searchParams.get('RtnMsg')

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    getSubscriptionStatus()
      .then((res) => {
        setStatus(res.data)
        if (res.data?.active) setIsPremium(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoggedIn, setIsPremium])

  const isPaid = rtnCode === '1' || status?.active

  return (
    <div className="container py-5 text-center" style={{ maxWidth: '560px' }}>
      {loading ? (
        <div className="spinner-border text-primary" role="status" />
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
        </>
      ) : (
        <>
          <div className="display-1 mb-3">❌</div>
          <h2 className="fw-bold text-danger">付款未完成</h2>
          <p className="text-muted mt-2">{rtnMsg || '交易取消或發生錯誤，請重新嘗試。'}</p>
          <Link to="/subscription" className="btn btn-outline-primary mt-3">
            返回訂閱頁面
          </Link>
        </>
      )}
    </div>
  )
}
