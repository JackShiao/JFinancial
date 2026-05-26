import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Navbar from '../components/layout/Navbar'

// mock 外部依賴，讓測試只專注於 Navbar 本身的行為
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    isLoggedIn: false,
    userInfo: null,
    isPremium: false,
    openModal: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('../api/marketApi', () => ({
  searchMarketIndices: vi.fn().mockResolvedValue([
    { id: 1, symbol: 'TWII', name: '台股加權指數', currentPrice: 20000, changePoint: 100 },
  ]),
}))

// Bootstrap 的 collapse 元素不存在真實 JS，用 mock DOM 模擬「展開中」狀態
function setupExpandedNavbar() {
  const toggler = document.createElement('button')
  toggler.setAttribute('data-bs-target', '#mainNavbar')
  const togglerClick = vi.fn()
  toggler.addEventListener('click', togglerClick)
  document.body.appendChild(toggler)

  const navbar = document.createElement('div')
  navbar.id = 'mainNavbar'
  navbar.classList.add('show') // 模擬展開狀態
  document.body.appendChild(navbar)

  return { toggler, togglerClick, navbar }
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar — 點擊外部行為', () => {
  let outsideElement

  beforeEach(() => {
    vi.useFakeTimers()
    outsideElement = document.createElement('div')
    outsideElement.setAttribute('data-testid', 'outside')
    document.body.appendChild(outsideElement)
  })

  afterEach(() => {
    vi.useRealTimers()
    outsideElement?.remove()
    // 清除 setupExpandedNavbar 產生的元素
    document.getElementById('mainNavbar')?.remove()
    document.querySelector('[data-bs-target="#mainNavbar"]')?.remove()
    vi.clearAllMocks()
  })

  it('搜尋有結果時，點擊搜尋框外部應關閉 dropdown', async () => {
    const { searchMarketIndices } = await import('../api/marketApi')
    searchMarketIndices.mockResolvedValue([
      { id: 1, symbol: 'TWII', name: '台股加權指數', currentPrice: 20000, changePoint: 100 },
    ])

    renderNavbar()
    const input = screen.getByPlaceholderText('搜尋指數…')

    // 輸入觸發搜尋，推進虛擬時間超過 debounce 閾值
    await act(async () => {
      fireEvent.change(input, { target: { value: 'TW' } })
      vi.advanceTimersByTime(400)
    })

    expect(document.querySelector('.navbar-search-dropdown')).toBeInTheDocument()

    // 點擊外部
    fireEvent.mouseDown(outsideElement)
    expect(document.querySelector('.navbar-search-dropdown')).not.toBeInTheDocument()
  })

  it('點擊搜尋框內部不應關閉 dropdown', async () => {
    const { searchMarketIndices } = await import('../api/marketApi')
    searchMarketIndices.mockResolvedValue([
      { id: 1, symbol: 'TWII', name: '台股加權指數', currentPrice: 20000, changePoint: 100 },
    ])

    renderNavbar()
    const input = screen.getByPlaceholderText('搜尋指數…')

    await act(async () => {
      fireEvent.change(input, { target: { value: 'TW' } })
      vi.advanceTimersByTime(400)
    })

    // 點擊搜尋框內部（wrapper）
    fireEvent.mouseDown(input)
    expect(document.querySelector('.navbar-search-dropdown')).toBeInTheDocument()
  })

  it('navbar 展開時，點擊外部應觸發 toggler click 以收合', () => {
    const { togglerClick } = setupExpandedNavbar()
    renderNavbar()

    fireEvent.mouseDown(outsideElement)

    expect(togglerClick).toHaveBeenCalledTimes(1)
  })

  it('navbar 已收合時，點擊外部不應額外觸發 toggler click', () => {
    // 不加 'show' class → 已收合狀態
    const toggler = document.createElement('button')
    toggler.setAttribute('data-bs-target', '#mainNavbar')
    const togglerClick = vi.fn()
    toggler.addEventListener('click', togglerClick)
    document.body.appendChild(toggler)

    const navbar = document.createElement('div')
    navbar.id = 'mainNavbar'
    // 故意不加 show class
    document.body.appendChild(navbar)

    renderNavbar()
    fireEvent.mouseDown(outsideElement)

    expect(togglerClick).not.toHaveBeenCalled()
  })

  it('元件卸載後不應有殘留的 mousedown listener（無 memory leak）', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderNavbar()

    const added = addSpy.mock.calls.filter(([event]) => event === 'mousedown').length
    unmount()
    const removed = removeSpy.mock.calls.filter(([event]) => event === 'mousedown').length

    expect(removed).toBeGreaterThanOrEqual(added)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
