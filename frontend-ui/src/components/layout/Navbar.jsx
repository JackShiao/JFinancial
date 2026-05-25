import './Navbar.css'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { searchMarketIndices } from '../../api/marketApi'
import { useState, useRef, useEffect, useCallback } from 'react'

const SEARCH_DEBOUNCE_MS = 400

const navItems = [
  { label: '首頁', to: '/', end: true },
  { label: '市場指數', to: '/market' },
  { label: '新聞專區', to: '/news' },
  { label: '關於', to: '/about' },
]

function Navbar() {
  const { isLoggedIn, userInfo, isPremium, openModal, logout } = useAuthStore()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  const runSearch = useCallback(async (keyword) => {
    if (!keyword.trim()) {
      setResults([])
      setDropdownOpen(false)
      return
    }
    setSearching(true)
    try {
      const data = await searchMarketIndices(keyword)
      setResults(data ?? [])
      setDropdownOpen(true)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  function handleQueryChange(e) {
    const val = e.target.value.slice(0, 50) // 限制最長 50 字，防止超長查詢
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val), SEARCH_DEBOUNCE_MS)
  }

  function handleSelectResult(item) {
    setQuery('')
    setDropdownOpen(false)
    navigate(`/market${item?.symbol ? `?symbol=${encodeURIComponent(item.symbol)}` : ''}`)
  }

  // 點擊外部關閉 dropdown
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <header className="sticky-top">
      <nav
        className="p-2 navbar navbar-expand-lg navbar-dark bg-dark"
        aria-label="主導覽列"
      >
        <div className="container">
          <Link
            to="/"
            className="navbar-brand fs-5 mx-lg-0 me-lg-4 text-decoration-none text-white d-flex align-items-center gap-3"
          >
            <img
              className="brand-logo"
              src="/img/Jlogo.png"
              alt="J 財經網 Logo"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavbar"
            aria-controls="mainNavbar"
            aria-expanded="false"
            aria-label="切換選單"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {navItems.map((item) => (
                <li key={item.label} className="nav-item">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `nav-link px-2 ${isActive ? 'text-secondary active' : 'text-white'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="navbar-search-wrapper position-relative me-2" ref={wrapperRef}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-secondary border-secondary text-white">
                  {searching
                    ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    : <i className="bi bi-search" aria-hidden="true" />
                  }
                </span>
                <input
                  type="text"
                  className="form-control form-control-sm bg-secondary border-secondary text-white navbar-search-input"
                  placeholder="搜尋指數…"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => results.length > 0 && setDropdownOpen(true)}
                  aria-label="搜尋市場指數"
                />
              </div>
              {dropdownOpen && (
                <ul className="navbar-search-dropdown list-unstyled position-absolute bg-white border rounded shadow mt-1 w-100 z-3 mb-0">
                  {results.length === 0 ? (
                    <li className="px-3 py-2 text-muted small">找不到符合的指數</li>
                  ) : (
                    <>
                      {results.slice(0, 8).map((item) => {
                        const change = Number(item.changePoint ?? item.change_point ?? 0)
                        const price = Number(item.currentPrice ?? item.current_price ?? 0)
                        const isUp = change > 0
                        const isDown = change < 0
                        const changeClass = isUp ? 'text-danger' : isDown ? 'text-success' : 'text-muted'
                        const changePrefix = isUp ? '+' : ''
                        return (
                          <li key={item.id ?? item.symbol}>
                            <button
                              type="button"
                              className="btn btn-link text-dark text-decoration-none w-100 text-start px-3 py-2 small navbar-search-result-item"
                              onClick={() => handleSelectResult(item)}
                            >
                              <span className="navbar-search-result-info">
                                <span className="fw-bold navbar-search-result-symbol">{item.symbol}</span>
                                <span className="text-muted navbar-search-result-name">{item.name}</span>
                              </span>
                              <span className="navbar-search-result-price">
                                <span className="font-monospace">
                                  {price > 0
                                    ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : '—'}
                                </span>
                                <span className={`font-monospace ms-2 ${changeClass}`}>
                                  {changePrefix}{change.toFixed(2)}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                      <li className="navbar-search-result-footer">
                        {results.length > 8
                          ? `顯示前 8 筆，共 ${results.length} 筆符合`
                          : `共 ${results.length} 筆符合`}
                      </li>
                    </>
                  )}
                </ul>
              )}
            </div>

            <div className="d-flex flex-lg-row flex-column align-items-center gap-2">
              {isLoggedIn ? (
                <div className="dropdown">
                  <button
                    type="button"
                    className="btn btn-outline-light dropdown-toggle text-nowrap"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className={`bi ${isPremium ? 'bi-gem' : 'bi-person-circle'} me-1`}
                       style={isPremium ? { color: '#ffc107' } : {}}
                       aria-hidden="true" />
                    {userInfo?.displayName || userInfo?.email || '會員'}
                    {isPremium && (
                      <span
                        className="badge ms-1 text-dark"
                        style={{ backgroundColor: '#ffc107', fontSize: '0.65em', verticalAlign: 'middle' }}
                      >
                        PRO
                      </span>
                    )}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <Link className="dropdown-item" to="/watchlist">
                        <i className="bi bi-star me-2" aria-hidden="true" />
                        追蹤清單
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/portfolio">
                        <i className="bi bi-briefcase me-2" aria-hidden="true" />
                        投資組合
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/subscription">
                        <i className={`bi ${isPremium ? 'bi-star-fill text-warning' : 'bi-star'} me-2`} aria-hidden="true" />
                        {isPremium ? '訂閱管理' : '升級 Premium'}
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-gear me-2" aria-hidden="true" />
                        個人設定
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button type="button" className="dropdown-item text-danger" onClick={() => logout()}>
                        <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                        登出
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-light w-100 w-lg-auto"
                    onClick={() => openModal('login')}
                  >
                    登入
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning w-100 w-lg-auto text-nowrap"
                    onClick={() => openModal('register')}
                  >
                    註冊會員
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Navbar