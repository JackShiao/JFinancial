import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Market from '../pages/Market'

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector) =>
    selector({ isLoggedIn: false, isPremium: false }),
}))

vi.mock('../store/toastStore', () => ({
  useToastStore: (selector) => selector({ addToast: vi.fn() }),
}))

vi.mock('../api/marketApi', () => ({
  fetchMarketIndices: vi.fn().mockResolvedValue([]),
  fetchMarketHistory: vi.fn().mockResolvedValue([]),
  searchMarketIndices: vi.fn().mockResolvedValue([]),
}))

vi.mock('../api/watchlistApi', () => ({
  getWatchlistAPI: vi.fn().mockResolvedValue({ data: [] }),
  addToWatchlistAPI: vi.fn(),
  removeFromWatchlistAPI: vi.fn(),
}))

// Chart.js 在 jsdom 環境無法渲染，用空元件取代
vi.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="line-chart" />,
}))

function renderMarket(initialPath = '/market') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Market />
    </MemoryRouter>
  )
}

describe('Market — 側欄收合行為', () => {
  let outsideElement

  beforeEach(() => {
    outsideElement = document.createElement('div')
    outsideElement.setAttribute('data-testid', 'outside')
    document.body.appendChild(outsideElement)
  })

  afterEach(() => {
    outsideElement?.remove()
    vi.clearAllMocks()
  })

  it('初始狀態下側欄應為收合（有 market-sidebar-collapsed class）', async () => {
    await act(async () => { renderMarket() })

    const sidebarBody = document.getElementById('market-sidebar-body')
    expect(sidebarBody).toHaveClass('market-sidebar-collapsed')
  })

  it('點擊「功能選單」按鈕應展開側欄', async () => {
    await act(async () => { renderMarket() })

    const toggleBtn = screen.getByRole('button', { name: /功能選單/i })
    await act(async () => { fireEvent.click(toggleBtn) })

    const sidebarBody = document.getElementById('market-sidebar-body')
    expect(sidebarBody).not.toHaveClass('market-sidebar-collapsed')
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
  })

  it('再次點擊「功能選單」按鈕應收合側欄', async () => {
    await act(async () => { renderMarket() })

    const toggleBtn = screen.getByRole('button', { name: /功能選單/i })
    await act(async () => { fireEvent.click(toggleBtn) }) // 展開
    await act(async () => { fireEvent.click(toggleBtn) }) // 收合

    const sidebarBody = document.getElementById('market-sidebar-body')
    expect(sidebarBody).toHaveClass('market-sidebar-collapsed')
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('展開後選擇市場項目，側欄應自動收合', async () => {
    await act(async () => { renderMarket() })

    const toggleBtn = screen.getByRole('button', { name: /功能選單/i })
    await act(async () => { fireEvent.click(toggleBtn) }) // 展開

    // 點擊任一市場按鈕
    const spxBtn = screen.getByRole('button', { name: 'S&P 500' })
    await act(async () => { fireEvent.click(spxBtn) })

    const sidebarBody = document.getElementById('market-sidebar-body')
    expect(sidebarBody).toHaveClass('market-sidebar-collapsed')
  })

  it('展開後點擊側欄外部，側欄應自動收合', async () => {
    await act(async () => { renderMarket() })

    const toggleBtn = screen.getByRole('button', { name: /功能選單/i })
    await act(async () => { fireEvent.click(toggleBtn) }) // 展開

    await act(async () => { fireEvent.mouseDown(outsideElement) })

    const sidebarBody = document.getElementById('market-sidebar-body')
    expect(sidebarBody).toHaveClass('market-sidebar-collapsed')
  })

  it('收合狀態下點擊側欄外部，側欄應保持收合', async () => {
    await act(async () => { renderMarket() })

    await act(async () => { fireEvent.mouseDown(outsideElement) })

    const sidebarBody = document.getElementById('market-sidebar-body')
    expect(sidebarBody).toHaveClass('market-sidebar-collapsed')
  })
})
