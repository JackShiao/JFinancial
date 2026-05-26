import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import { fetchMarketHistory, fetchMarketIndices } from '../api/marketApi'
import { addToWatchlistAPI, getWatchlistAPI, removeFromWatchlistAPI } from '../api/watchlistApi'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import './Market.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// 前端顯示 key → 後端 symbol 的對應表（null 表示目前無後端資料來源）
const marketConfigs = {
  twii: {
    title: '台灣加權指數',
    chartLabel: '加權指數',
    color: '#0d6efd',
    type: 'stock',
    tableKey: 'twii',
    symbol: 'TWII',
  },
  spx: {
    title: 'S&P 500 指數',
    chartLabel: 'S&P 500',
    color: '#dc3545',
    type: 'stock',
    tableKey: 'spx',
    symbol: 'SPX',
  },
  ixic: {
    title: '納斯達克指數',
    chartLabel: 'NASDAQ',
    color: '#fd7e14',
    type: 'stock',
    tableKey: 'ixic',
    symbol: 'IXIC',
  },
  dji: {
    title: '道瓊工業指數',
    chartLabel: 'Dow Jones',
    color: '#198754',
    type: 'stock',
    tableKey: 'dji',
    symbol: 'DJI',
  },
  eur: {
    title: '歐洲市場',
    chartLabel: 'Euro Stoxx 50',
    color: '#20c997',
    type: 'stock',
    tableKey: 'eur',
    symbol: 'EUR',
  },
  n225: {
    title: '日本市場',
    chartLabel: 'Nikkei 225',
    color: '#6f42c1',
    type: 'stock',
    tableKey: 'n225',
    symbol: 'N225',
  },
  usb2: {
    title: '美國-2年期公債殖利率',
    chartLabel: 'US 2-Year',
    color: '#0dcaf0',
    type: 'bond',
    tableKey: 'usb2',
    symbol: 'US2Y',
  },
  usb10: {
    title: '美國-10年期公債殖利率',
    chartLabel: 'US 10-Year',
    color: '#dc3545',
    type: 'bond',
    tableKey: 'usb10',
    symbol: 'US10Y',
  },
  usb20: {
    title: '美國-20年期公債殖利率',
    chartLabel: 'US 20-Year',
    color: '#6610f2',
    type: 'bond',
    tableKey: 'usb20',
    symbol: 'US20Y',
  },
  jpb10: {
    title: '日本-10年期公債殖利率',
    chartLabel: 'JP 10-Year',
    color: '#ffc107',
    type: 'bond',
    tableKey: 'jpb10',
    symbol: 'JP10Y',
  },
  usd_twd: {
    title: '美元/台幣即期匯率',
    chartLabel: 'USD/TWD',
    color: '#e63946',
    type: 'fx',
    tableKey: 'usd_twd',
    symbol: 'USDTWD',
  },
  jpy_twd: {
    title: '日圓/台幣即期匯率',
    chartLabel: 'JPY/TWD',
    color: '#ff6b6b',
    type: 'fx',
    tableKey: 'jpy_twd',
    symbol: 'JPYTWD',
  },
  cny_twd: {
    title: '人民幣/台幣即期匯率',
    chartLabel: 'CNY/TWD',
    color: '#f72585',
    type: 'fx',
    tableKey: 'cny_twd',
    symbol: 'CNYTWD',
  },
}

function Market() {
  const [searchParams, setSearchParams] = useSearchParams()

  // 從 URL ?symbol= 初始化 activeKey，避免 mount 時寫入 effect 蓋掉來源頁帶入的 symbol
  const [activeKey, setActiveKey] = useState(() => {
    const sym = searchParams.get('symbol')?.toUpperCase()
    if (sym) {
      const matchKey = Object.keys(marketConfigs).find((k) => marketConfigs[k].symbol === sym)
      if (matchKey) return matchKey
    }
    return 'twii'
  })

  // URL 變動時（例如瀏覽器上一頁/下一頁）同步更新側欄
  useEffect(() => {
    const sym = searchParams.get('symbol')?.toUpperCase()
    if (!sym) return
    const matchKey = Object.keys(marketConfigs).find(
      (k) => marketConfigs[k].symbol === sym
    )
    if (matchKey) setActiveKey(matchKey)
  }, [searchParams])

  // 側欄切換時同步更新 URL（方便書籤、分享、瀏覽器上一頁）
  useEffect(() => {
    const symbol = marketConfigs[activeKey]?.symbol
    if (!symbol) return
    // 避免與讀取 URL 的 effect 互相觸發：URL 已是目標值時略過
    if (searchParams.get('symbol')?.toUpperCase() === symbol) return
    setSearchParams({ symbol }, { replace: false })
  }, [activeKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // 所有市場的即時價格（keyed by symbol）
  const [liveData, setLiveData] = useState({})
  // 當前選取市場的折線圖歷史資料
  // chartData.key 記錄「目前圖表對應的 activeKey」，key 不符即視為 loading
  const [chartData, setChartData] = useState({ key: '', labels: [], prices: [] })
  const [loadingPrices, setLoadingPrices] = useState(true)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const isPremium = useAuthStore((state) => state.isPremium)
  const [watchlist, setWatchlist] = useState(new Set())
  const [watchlistLoading, setWatchlistLoading] = useState(new Set())
  const addToast = useToastStore((state) => state.addToast)

  const current = marketConfigs[activeKey]
  const hasSymbol = !!current.symbol
  const loadingChart = hasSymbol && chartData.key !== activeKey

  // 元件載入時，一次性取回所有指數的即時價格
  useEffect(() => {
    fetchMarketIndices()
      .then((list) => {
        if (!list) return
        const map = {}
        list.forEach((item) => {
          map[item.symbol] = item
        })
        setLiveData(map)
      })
      .catch(() => {
        addToast('無法取得即時市場資料，請稍後再試', 'warning')
      })
      .finally(() => setLoadingPrices(false))
  }, [])

  // 切換市場時，載入對應的歷史價格折線數據
  useEffect(() => {
    const symbol = marketConfigs[activeKey]?.symbol
    if (!symbol) return

    let cancelled = false

    fetchMarketHistory(symbol, isPremium ? 365 : 30)
      .then((data) => {
        if (cancelled) return
        setChartData({
          key: activeKey,
          labels: data?.length ? data.map((d) => d.priceDate) : [],
          prices: data?.length ? data.map((d) => parseFloat(d.price)) : [],
        })
      })
      .catch(() => {
        if (!cancelled) setChartData({ key: activeKey, labels: [], prices: [] })
      })

    return () => { cancelled = true }
  }, [activeKey, isPremium])

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
      .catch(() => {
        addToast('追蹤清單載入失敗，請稍後再試', 'warning')
      })
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
      addToast('操作失敗，請稍後再試', 'danger')
      setWatchlist((prev) => {
        const next = new Set(prev)
        if (watchlist.has(symbol)) next.add(symbol)
        else next.delete(symbol)
        return next
      })
    } finally {
      setWatchlistLoading((prev) => {
        const next = new Set(prev)
        next.delete(symbol)
        return next
      })
    }
  }

  const liveEntry = current.symbol ? liveData[current.symbol] : null

  const lineData = useMemo(() => {
    const prices = [...chartData.prices]
    const labels = [...chartData.labels]

    // 用即時價格取代（或補上）圖表最後一個點，確保終點與側欄數字一致
    if (liveEntry) {
      const livePrice = parseFloat(liveEntry.currentPrice)
      if (prices.length > 0) {
        prices[prices.length - 1] = livePrice
      } else {
        prices.push(livePrice)
        labels.push('今日')
      }
    }

    return {
      labels,
      datasets: [
        {
          label: current.chartLabel,
          data: prices,
          borderColor: current.color,
          backgroundColor: `${current.color}22`,
          tension: 0.3,
          fill: true,
        },
      ],
    }
  }, [chartData, current, liveEntry])

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: false } },
    }),
    []
  )

  return (
    <main className="market-page container py-3">
      <div className="row g-3">
        <aside className="col-lg-3">
          <div className="market-sidebar border rounded bg-body-tertiary p-3">
            <h2 className="fs-5 mb-3">功能選單</h2>

            <h3 className="fs-6 text-muted">全球股市</h3>
            <div className="d-flex flex-column gap-1 mb-3">
              {[
                { key: 'twii', label: '台灣市場' },
                { key: 'spx', label: 'S&P 500' },
                { key: 'ixic', label: '納斯達克' },
                { key: 'dji', label: '道瓊工業' },
                { key: 'eur', label: '歐洲市場' },
                { key: 'n225', label: '日本市場' },
              ].map(({ key, label }) => (
                <div key={key} className="d-flex align-items-center gap-1">
                  <button type="button" className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={() => setActiveKey(key)}>{label}</button>
                  {isLoggedIn && marketConfigs[key].symbol && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 border-0"
                      title={watchlist.has(marketConfigs[key].symbol) ? '移除追蹤' : '加入追蹤'}
                      disabled={watchlistLoading.has(marketConfigs[key].symbol)}
                      onClick={() => toggleWatchlist(marketConfigs[key].symbol)}
                    >
                      <i className={`bi ${watchlist.has(marketConfigs[key].symbol) ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-5`} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <h3 className="fs-6 text-muted">債券市場</h3>
            <div className="d-flex flex-column gap-1 mb-3">
              {[
                { key: 'usb2',  label: '美國公債-2年' },
                { key: 'usb10', label: '美國公債-10年' },
                { key: 'usb20', label: '美國公債-20年' },
                { key: 'jpb10', label: '日本公債-10年' },
              ].map(({ key, label }) => (
                <div key={key} className="d-flex align-items-center gap-1">
                  <button type="button" className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={() => setActiveKey(key)}>{label}</button>
                  {isLoggedIn && marketConfigs[key].symbol && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 border-0"
                      title={watchlist.has(marketConfigs[key].symbol) ? '移除追蹤' : '加入追蹤'}
                      disabled={watchlistLoading.has(marketConfigs[key].symbol)}
                      onClick={() => toggleWatchlist(marketConfigs[key].symbol)}
                    >
                      <i className={`bi ${watchlist.has(marketConfigs[key].symbol) ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-5`} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <h3 className="fs-6 text-muted">匯市</h3>
            <div className="d-flex flex-column gap-1">
              {[
                { key: 'usd_twd', label: '美元/台幣' },
                { key: 'jpy_twd', label: '日圓/台幣' },
                { key: 'cny_twd', label: '人民幣/台幣' },
              ].map(({ key, label }) => (
                <div key={key} className="d-flex align-items-center gap-1">
                  <button type="button" className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={() => setActiveKey(key)}>{label}</button>
                  {isLoggedIn && marketConfigs[key].symbol && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 border-0"
                      title={watchlist.has(marketConfigs[key].symbol) ? '移除追蹤' : '加入追蹤'}
                      disabled={watchlistLoading.has(marketConfigs[key].symbol)}
                      onClick={() => toggleWatchlist(marketConfigs[key].symbol)}
                    >
                      <i className={`bi ${watchlist.has(marketConfigs[key].symbol) ? 'bi-star-fill text-warning' : 'bi-star text-muted'} fs-5`} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="col-lg-9">
          <div className="d-flex justify-content-between flex-wrap align-items-center pb-2 mb-3 border-bottom">
            <h1 className="h2 mb-0">市場指數</h1>
            {!loadingPrices && liveEntry && (
              <div className="text-end">
                <span className="fs-5 fw-bold me-2">
                  {Number(liveEntry.currentPrice).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                <span className={parseFloat(liveEntry.changePoint) >= 0 ? 'text-danger' : 'text-success'}>
                  <i
                    className={`bi bi-caret-${parseFloat(liveEntry.changePoint) >= 0 ? 'up' : 'down'}-fill`}
                  />{' '}
                  {parseFloat(liveEntry.changePoint) >= 0 ? '+' : ''}
                  {Number(liveEntry.changePoint).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <h2 className="h4 mb-3">{current.title}</h2>
          <div className="position-relative mb-4">
            <div className="market-chart-wrap">
              {loadingChart ? (
                <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  載入中…
                </div>
              ) : chartData.labels.length === 0 ? (
                <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                  <i className="bi bi-bar-chart me-2" />暫無歷史數據
                </div>
              ) : (
                <Line data={lineData} options={lineOptions} />
              )}
            </div>

            {/* Premium 付費牆 overlay */}
            {!isPremium && !loadingChart && chartData.labels.length > 0 && hasSymbol && (
              <div className="market-premium-overlay" aria-hidden="true">
                <div className="market-premium-fade" />
                <div className="market-premium-cta">
                  <i className="bi bi-lock-fill fs-2 mb-2 d-block text-secondary" />
                  <p className="mb-3 small fw-semibold">升級 Premium 查看完整 365 天走勢</p>
                  <Link to="/subscription" className="btn btn-primary btn-sm">
                    <i className="bi bi-stars me-1" />立即升級
                  </Link>
                </div>
              </div>
            )}
          </div>

          {current.type === 'stock' && (() => {
            if (!current.symbol) {
              return (
                <div className="alert alert-secondary mb-4" role="status">
                  <i className="bi bi-info-circle me-2" aria-hidden="true" />
                  此市場目前尚無免費公開資料來源，此項目暫時停用。
                </div>
              )
            }
            if (loadingPrices) {
              return (
                <div className="d-flex align-items-center gap-2 text-muted mb-4">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  載入即時資料中…
                </div>
              )
            }
            if (!liveEntry) {
              return (
                <div className="alert alert-warning mb-4" role="status">
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
                  目前無法取得即時資料，請稍後再試。
                </div>
              )
            }
            const price = Number(liveEntry.currentPrice)
            const change = parseFloat(liveEntry.changePoint)
            const isUp = change > 0
            const isDown = change < 0
            const changeClass = isUp ? 'text-danger' : isDown ? 'text-success' : 'text-muted'
            const changePrefix = isUp ? '+' : ''
            const prevPrice = price - change
            const changePct = prevPrice !== 0 ? ((change / prevPrice) * 100).toFixed(2) : '0.00'
            const updatedAt = liveEntry.updatedAt
              ? new Date(liveEntry.updatedAt).toLocaleString('zh-TW', { hour12: false })
              : null

            return (
              <div className="card mb-4">
                <div className="card-body text-center">
                  <h3 className="card-title fs-6 text-muted mb-3">
                    <span className="badge bg-secondary me-2">{liveEntry.symbol}</span>
                    {liveEntry.name}
                  </h3>
                  <div className="d-flex justify-content-center align-items-end gap-3 flex-wrap">
                    <span className="fs-2 fw-bold font-monospace">
                      {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`fs-5 font-monospace ${changeClass}`}>
                      {!isUp && !isDown ? null : (
                        <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill me-1`} aria-hidden="true" />
                      )}
                      {changePrefix}{change.toFixed(2)}
                    </span>
                    <span className={`fs-5 font-monospace ${changeClass}`}>
                      ({changePrefix}{changePct}%)
                    </span>
                  </div>
                  {updatedAt && (
                    <p className="text-muted small mt-2 mb-0">
                      <i className="bi bi-clock me-1" aria-hidden="true" />
                      資料更新時間：{updatedAt}（每 30 分鐘更新）
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {current.type === 'bond' && (() => {
            if (!current.symbol) {
              return (
                <div className="alert alert-secondary mb-4" role="status">
                  <i className="bi bi-info-circle me-2" aria-hidden="true" />
                  台灣公債殖利率尚無免費公開 API，此項目目前停用。
                </div>
              )
            }
            if (loadingPrices) {
              return (
                <div className="d-flex align-items-center gap-2 text-muted mb-4">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  載入即時資料中…
                </div>
              )
            }
            if (!liveEntry) {
              return (
                <div className="alert alert-warning mb-4" role="status">
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
                  目前無法取得即時資料，請稍後再試。
                </div>
              )
            }
            const yieldVal = parseFloat(liveEntry.currentPrice)
            const change = parseFloat(liveEntry.changePoint)
            const isUp = change > 0
            const isDown = change < 0
            const changeClass = isUp ? 'text-danger' : isDown ? 'text-success' : 'text-muted'
            const changePrefix = isUp ? '+' : ''
            const updatedAt = liveEntry.updatedAt
              ? new Date(liveEntry.updatedAt).toLocaleString('zh-TW', { hour12: false })
              : null
            return (
              <div className="card mb-4">
                <div className="card-body text-center">
                  <h3 className="card-title fs-6 text-muted mb-3">
                    <span className="badge bg-secondary me-2">{liveEntry.symbol}</span>
                    {liveEntry.name}
                  </h3>
                  <div className="d-flex justify-content-center align-items-end gap-3 flex-wrap">
                    <span className="fs-2 fw-bold font-monospace">
                      {yieldVal.toFixed(2)}%
                    </span>
                    <span className={`fs-5 font-monospace ${changeClass}`}>
                      {!isUp && !isDown ? null : (
                        <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill me-1`} aria-hidden="true" />
                      )}
                      {changePrefix}{change.toFixed(2)}%
                    </span>
                  </div>
                  {updatedAt && (
                    <p className="text-muted small mt-2 mb-0">
                      <i className="bi bi-clock me-1" aria-hidden="true" />
                      資料更新時間：{updatedAt}（每 30 分鐘更新，來源：FRED API）
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {current.type === 'fx' && (() => {
            if (loadingPrices) {
              return (
                <div className="d-flex align-items-center gap-2 text-muted mb-4">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  載入即時資料中…
                </div>
              )
            }
            if (!liveEntry) {
              return (
                <div className="alert alert-warning mb-4" role="status">
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
                  目前無法取得即時資料，請稍後再試。
                </div>
              )
            }
            const rate = Number(liveEntry.currentPrice)
            const change = parseFloat(liveEntry.changePoint)
            const isUp = change > 0
            const isDown = change < 0
            const changeClass = isUp ? 'text-danger' : isDown ? 'text-success' : 'text-muted'
            const changePrefix = isUp ? '+' : ''
            const updatedAt = liveEntry.updatedAt
              ? new Date(liveEntry.updatedAt).toLocaleString('zh-TW', { hour12: false })
              : null
            return (
              <div className="card mb-4">
                <div className="card-body text-center">
                  <h3 className="card-title fs-6 text-muted mb-3">
                    <span className="badge bg-secondary me-2">{liveEntry.symbol}</span>
                    {liveEntry.name}
                  </h3>
                  <div className="d-flex justify-content-center align-items-end gap-3 flex-wrap">
                    <span className="fs-2 fw-bold font-monospace">
                      {rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                    <span className={`fs-5 font-monospace ${changeClass}`}>
                      {!isUp && !isDown ? null : (
                        <i className={`bi bi-caret-${isUp ? 'up' : 'down'}-fill me-1`} aria-hidden="true" />
                      )}
                      {changePrefix}{change.toFixed(4)}
                    </span>
                  </div>
                  {updatedAt && (
                    <p className="text-muted small mt-2 mb-0">
                      <i className="bi bi-clock me-1" aria-hidden="true" />
                      資料更新時間：{updatedAt}（每 30 分鐘更新，來源：Frankfurter API）
                    </p>
                  )}
                </div>
              </div>
            )
          })()}
        </section>
      </div>
    </main>
  )
}

export default Market
