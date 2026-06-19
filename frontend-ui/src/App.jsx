import { useEffect } from 'react'
import Footer from './components/layout/Footer'
import AuthModals from './components/auth/AuthModals'
import Navbar from './components/layout/Navbar'
import ToastContainer from './components/layout/ToastContainer'
import Home from './pages/Home'
import Market from './pages/Market'
import News from './pages/News'
import About from './pages/About'
import Profile from './pages/Profile'
import Watchlist from './pages/Watchlist'
import Portfolio from './pages/Portfolio'
import Subscription from './pages/Subscription'
import SubscriptionResult from './pages/SubscriptionResult'
import OAuthCallback from './pages/OAuthCallback'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { getSubscriptionStatus } from './api/subscriptionApi'
import axiosClient from './api/axiosClient'
import BackToTopButton from './components/layout/BackToTopButton'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  const initAuth = useAuthStore((state) => state.initAuth)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const setIsPremium = useAuthStore((state) => state.setIsPremium)
  const setOAuthAuth = useAuthStore((state) => state.setOAuthAuth)

  // 頁面載入時從 localStorage 恢復登入狀態（一般帳密登入）
  useEffect(() => {
    initAuth()
  }, [initAuth])

  // 若 localStorage 沒有 token，嘗試從 HttpOnly Cookie 恢復（OAuth2 登入的使用者）
  useEffect(() => {
    if (isLoggedIn) return
    axiosClient.get('/auth/me')
      .then((res) => {
        const { email, displayName, isPremium } = res.data.data
        setOAuthAuth({ email, displayName, isPremium })
      })
      .catch(() => {}) // 未登入時 401，靜默忽略
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 登入後呼叫 API 同步 Premium 狀態（JWT 發行後取得訂閱時不需重新登入）
  useEffect(() => {
    if (!isLoggedIn) return
    getSubscriptionStatus()
      .then((res) => setIsPremium(res.data?.active ?? false))
      .catch(() => {})
  }, [isLoggedIn, setIsPremium])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/market" element={<Market />} />
        <Route path="/news" element={<News />} />
        <Route path="/about" element={<About />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/subscription/result" element={<SubscriptionResult />} />
        <Route path="/oauth2/callback" element={<OAuthCallback />} />
      </Routes>
      <Footer />
      <AuthModals />
      <ToastContainer />
      <BackToTopButton />
    </BrowserRouter>
  )
}

export default App
