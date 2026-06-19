import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import axiosClient from '../api/axiosClient'

/**
 * OAuth2 登入成功後，後端設定 HttpOnly Cookie 並重導至此頁面。
 * URL 格式：/oauth2/callback?displayName=xxx&email=xxx（不含 token）
 *
 * 流程：
 * 1. 從 URL query 取得 displayName、email（僅供顯示，非安全依據）
 * 2. 呼叫 GET /api/auth/me 確認 Cookie 有效並取得 isPremium 狀態
 * 3. 更新 Zustand store，跳轉至首頁
 */
function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setOAuthAuth = useAuthStore((state) => state.setOAuthAuth)
  const addToast = useToastStore((state) => state.addToast)

  // 在 effect 外部提取為 primitive 字串，避免 effect 捕捉到 searchParams 物件快照
  const email = searchParams.get('email')
  const displayName = searchParams.get('displayName')

  useEffect(() => {
    if (!email) {
      addToast('第三方登入失敗，請再試一次', 'danger', 4000)
      navigate('/', { replace: true })
      return
    }

    // 呼叫後端確認 Cookie 有效，並取得最新 isPremium 狀態
    axiosClient.get('/auth/me')
      .then((res) => {
        const { isPremium } = res.data.data
        setOAuthAuth({ email, displayName: displayName ?? email, isPremium })
        addToast(`歡迎回來，${displayName ?? email}！`, 'success', 3000)
        navigate('/', { replace: true })
      })
      .catch(() => {
        addToast('第三方登入驗證失敗，請再試一次', 'danger', 4000)
        navigate('/', { replace: true })
      })
  }, [email, displayName, addToast, navigate, setOAuthAuth])

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">登入中，請稍候...</span>
        </div>
        <p className="text-muted" aria-hidden="true">登入中，請稍候...</p>
      </div>
    </div>
  )
}

export default OAuthCallback
