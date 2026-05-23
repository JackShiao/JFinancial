import { useEffect, useState, useCallback } from 'react'
import { fetchMarketIndices } from '../../api/marketApi'
import { getWatchlistAPI, addToWatchlistAPI, removeFromWatchlistAPI } from '../../api/watchlistApi'
import { useAuthStore } from '../../store/authStore'
import { Link, useNavigate } from 'react-router-dom'
import './MarketSection.css'

function normalizeItems(payload) {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload
      .map((item, index) => ({
        id: item?.id,
        symbol: item?.symbol ?? '',
        name: item?.name ?? item?.indexName ?? item?.symbol ?? `指數 ${index + 1}`,
        value:
          item?.currentPrice ?? item?.value ?? item?.close ?? item?.price ?? item?.last ?? '--',
        change:
          item?.changePoint ??
          item?.change ??
          item?.changePercent ??
          item?.pctChange ??
          item?.change_rate ??
          '--',
      }))
      .filter((item) => item.name)
  }

  if (Array.isArray(payload?.indices)) return normalizeItems(payload.indices)
  if (Array.isArray(payload?.marketData)) return normalizeItems(payload.marketData)
  if (payload?.name || payload?.indexName || payload?.symbol) return normalizeItems([payload])

  return []
}

function getTrendStyle(changeValue) {
  const num = typeof changeValue === 'number' ? changeValue : parseFloat(changeValue)
  if (isNaN(num))
    return {
      icon: 'bi-dash',
      textColor: 'text-secondary',
      bgColor: 'bg-secondary',
      isPositive: null,
    }
  // 台股習慣：上漲紅、下跌綠
  if (num > 0)
    return {
      icon: 'bi-caret-up-fill',
      textColor: 'text-danger',
      bgColor: 'bg-danger',
      isPositive: true,
    }
  if (num < 0)
    return {
      icon: 'bi-caret-down-fill',
      textColor: 'text-success',
      bgColor: 'bg-success',
      isPositive: false,
    }
  return { icon: 'bi-dash', textColor: 'text-secondary', bgColor: 'bg-secondary', isPositive: null }
}

function MarketSection() {
  const [marketData, setMarketData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState(new Set())
  const [watchlistLoading, setWatchlistLoading] = useState(new Set())
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchMarketIndices()
      const items = normalizeItems(response?.data ?? response)
      setMarketData(items.slice(0, 6)) // 取前 6 筆顯示在首頁
    } catch (err) {
      console.error('Failed to fetch market data:', err)
      setError('無法取得最新市場動態，請檢查網路連線後重試。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 登入狀態變更時重新載入追蹤清單
  useEffect(() => {
    if (!isLoggedIn) {
      setWatchlist(new Set())
      return
    }
    getWatchlistAPI()
      .then((res) => {
        const symbols = new Set((res?.data ?? []).map((item) => item.symbol))
        setWatchlist(symbols)
      })
      .catch(() => {}) // 靜默失敗，不影響主要功能
  }, [isLoggedIn])

  async function toggleWatchlist(symbol) {
    if (!symbol) return
    setWatchlistLoading((prev) => new Set(prev).add(symbol))
    try {
      if (watchlist.has(symbol)) {
        await removeFromWatchlistAPI(symbol)
        setWatchlist((prev) => {
          const next = new Set(prev)
          next.delete(symbol)
          return next
        })
      } else {
        await addToWatchlistAPI(symbol)
        setWatchlist((prev) => new Set(prev).add(symbol))
      }
    } catch {
      // 靜默失敗
    } finally {
      setWatchlistLoading((prev) => {
        const next = new Set(prev)
        next.delete(symbol)
        return next
      })
    }
  }

  return (
    <section className="market-section py-5 bg-light">
      <div className="container">
        {/* 標題與更新區塊 */}
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="fw-bold mb-2">全球市場指數</h2>
          </div>
          <Link
            to="/market"
            className="text-decoration-none text-primary fw-semibold d-none d-md-block"
          >
            查看更多 <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        <div className="market-container">
          {error ? (
            // 友善的錯誤狀態卡片
            <div className="p-5 text-center bg-white rounded-4 border border-danger border-opacity-25">
              <i className="bi bi-exclamation-triangle text-danger display-4 mb-3 d-block"></i>
              <h5 className="text-danger fw-bold mb-3">{error}</h5>
              <button onClick={loadData} className="btn btn-outline-danger rounded-pill px-4">
                <i className="bi bi-arrow-repeat me-2"></i>點擊重試
              </button>
            </div>
          ) : loading && marketData.length === 0 ? (
            // 骨架屏 Loading
            <div className="row g-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-12 col-md-6 col-xl-4">
                  <div className="market-card p-4 placeholder-glow">
                    <div className="d-flex justify-content-between mb-3">
                      <div>
                        <span className="placeholder col-8 mb-2 rounded"></span>
                        <span className="placeholder col-6 h5 d-block rounded"></span>
                      </div>
                      <span className="placeholder col-3 rounded-pill"></span>
                    </div>
                    <span className="placeholder col-7 display-6 mt-2 rounded"></span>
                  </div>
                </div>
              ))}
            </div>
          ) : marketData.length === 0 ? (
            <div className="text-center py-5 text-muted bg-white rounded-4 border">
              目前沒有可顯示的市場指數資料。
            </div>
          ) : (
            <div className="row g-4">
              {marketData.map((item, index) => {
                const trend = getTrendStyle(item.change)
                const changeNum = parseFloat(item.change)
                const isValidChange = !isNaN(changeNum)
                const changePrefix = isValidChange && changeNum > 0 ? '+' : ''
                const changeDisplay = isValidChange
                  ? `${changePrefix}${changeNum.toFixed(2)}`
                  : '--'

                const valueNum = parseFloat(item.value)
                const valueDisplay = !isNaN(valueNum)
                  ? valueNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : (item.value ?? '--')

                return (
                  <div
                    key={item.id ?? `${item.name}-${index}`}
                    className="col-12 col-md-6 col-xl-4"
                  >
                    <article
                      className="market-card p-4 position-relative overflow-hidden h-100"
                      style={item.symbol ? { cursor: 'pointer' } : undefined}
                      onClick={item.symbol ? () => navigate(`/market?symbol=${item.symbol}`) : undefined}
                      role={item.symbol ? 'button' : undefined}
                      aria-label={item.symbol ? `查看 ${item.name} 詳細資料` : undefined}
                    >
                      {/* 背景微型趨勢線 (Sparkline) */}
                      {trend.isPositive !== null && (
                        <div
                          className="position-absolute bottom-0 start-0 w-100"
                          style={{ height: '45px', opacity: 0.15, pointerEvents: 'none' }}
                        >
                          <svg
                            viewBox="0 0 100 45"
                            preserveAspectRatio="none"
                            className="w-100 h-100"
                          >
                            {trend.isPositive ? (
                              <polyline
                                points="0,45 20,30 40,35 60,15 80,20 100,5"
                                fill="none"
                                stroke="#dc3545"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : (
                              <polyline
                                points="0,5 20,15 40,10 60,30 80,25 100,45"
                                fill="none"
                                stroke="#198754"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                          </svg>
                        </div>
                      )}

                      <div className="position-relative z-1 d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <p className="text-muted small fw-semibold mb-1">市場指數</p>
                          <h4 className="h5 fw-bold mb-0 text-dark">{item.name}</h4>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          {isLoggedIn && item.symbol && (
                            <button
                              className="btn btn-sm btn-link p-0 border-0"
                              title={watchlist.has(item.symbol) ? '移除追蹤' : '加入追蹤'}
                              disabled={watchlistLoading.has(item.symbol)}
                              onClick={() => toggleWatchlist(item.symbol)}
                            >
                              <i
                                className={`bi ${
                                  watchlist.has(item.symbol)
                                    ? 'bi-star-fill text-warning'
                                    : 'bi-star text-muted'
                                } fs-5`}
                              />
                            </button>
                          )}
                          <span
                            className={`market-badge ${trend.textColor} ${trend.bgColor} bg-opacity-10 rounded-pill px-2 py-1 small fw-bold`}
                          >
                            <i className={trend.icon} aria-hidden="true" /> {changeDisplay}
                          </span>
                        </div>
                      </div>
                      <div className="mt-auto position-relative z-1">
                        <p className="market-value display-6 fw-bold mb-0 text-dark">
                          {valueDisplay}
                        </p>
                      </div>
                    </article>
                  </div>
                )
              })}
            </div>
          )}

          {/* 手機版額外顯示的底部查看按鈕 */}
          <div className="mt-5 text-center d-md-none">
            <Link
              to="/market"
              className="btn btn-outline-primary btn-more-market w-100 rounded-pill fw-bold py-2"
            >
              查看全部市場
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MarketSection
