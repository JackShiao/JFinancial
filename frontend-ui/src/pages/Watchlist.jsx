import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getWatchlistAPI, removeFromWatchlistAPI } from '../api/watchlistApi'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

function Watchlist() {
  const { isLoggedIn } = useAuthStore()
  const navigate = useNavigate()
  const addToast = useToastStore((state) => state.addToast)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(new Set())

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [isLoggedIn, navigate])

  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    getWatchlistAPI()
      .then((res) => {
        const data = res?.data ?? []
        // 後端回傳 Set<MarketIndex>，轉成陣列後依 symbol 排序
        const arr = Array.isArray(data) ? data : Array.from(data)
        arr.sort((a, b) => a.symbol.localeCompare(b.symbol))
        setItems(arr)
      })
      .catch(() => addToast('載入追蹤清單失敗，請稍後再試', 'danger'))
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  async function handleRemove(symbol) {
    setRemoving((prev) => new Set(prev).add(symbol))
    try {
      await removeFromWatchlistAPI(symbol)
      setItems((prev) => prev.filter((item) => item.symbol !== symbol))
      addToast(`已移除追蹤 ${symbol}`, 'success')
    } catch {
      addToast(`移除 ${symbol} 失敗，請稍後再試`, 'danger')
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev)
        next.delete(symbol)
        return next
      })
    }
  }

  if (!isLoggedIn) return null

  return (
    <main className="container py-4" style={{ maxWidth: '800px' }}>
      <h1 className="h3 mb-4">
        <i className="bi bi-star-fill text-warning me-2" aria-hidden="true" />
        追蹤清單
      </h1>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">載入中…</span>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-star fs-1 d-block mb-3" aria-hidden="true" />
          <p className="mb-3">尚未追蹤任何指數</p>
          <Link to="/market" className="btn btn-primary">
            前往市場頁面新增追蹤
          </Link>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>名稱</th>
                <th>代碼</th>
                <th className="text-end">即時價格</th>
                <th className="text-end">漲跌點</th>
                <th className="text-end">漲跌幅</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const change = item.changePoint ?? item.change_point ?? 0
                const price = item.currentPrice ?? item.current_price ?? 0
                const isUp = change > 0
                const isDown = change < 0
                const changeClass = isUp ? 'text-danger' : isDown ? 'text-success' : 'text-muted'
                const changePrefix = isUp ? '+' : ''
                const changePct = price > 0
                  ? ((change / (price - change)) * 100).toFixed(2)
                  : '0.00'

                return (
                  <tr key={item.symbol}>
                    <td
                      className="fw-semibold"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/market?symbol=${item.symbol}`)}
                      title="點擊查看詳細圖表"
                    >
                      {item.name}
                      <i className="bi bi-box-arrow-up-right ms-1 text-muted" style={{ fontSize: '0.75rem' }} aria-hidden="true" />
                    </td>
                    <td>
                      <span
                        className="badge bg-secondary"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/market?symbol=${item.symbol}`)}
                      >{item.symbol}</span>
                    </td>
                    <td className="text-end font-monospace">
                      {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`text-end font-monospace ${changeClass}`}>
                      {changePrefix}{change.toFixed(2)}
                    </td>
                    <td className={`text-end font-monospace ${changeClass}`}>
                      {changePrefix}{changePct}%
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemove(item.symbol)}
                        disabled={removing.has(item.symbol)}
                        aria-label={`移除 ${item.name}`}
                      >
                        {removing.has(item.symbol)
                          ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                          : <i className="bi bi-trash" aria-hidden="true" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-muted small text-end mb-0">
            共 {items.length} 筆，價格資料由後端排程每 30 分鐘更新
          </p>
        </div>
      )}
    </main>
  )
}

export default Watchlist
