import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer mt-auto py-4 text-bg-dark">
      <div className="container">
        <div className="row gy-4">

          {/* 左欄：品牌說明 */}
          <div className="col-md-4">
            <h5 className="fw-bold mb-2">J 財經</h5>
            <p className="text-secondary small mb-0">
              提供全球市場指數、財經新聞與個人投資組合管理的一站式財經資訊平台。
            </p>
          </div>

          {/* 中欄：快速連結 */}
          <div className="col-md-4 col-6">
            <h6 className="fw-semibold mb-3">快速連結</h6>
            <ul className="list-unstyled mb-0 small">
              <li className="mb-1"><Link to="/" className="footer-link">首頁</Link></li>
              <li className="mb-1"><Link to="/market" className="footer-link">市場指數</Link></li>
              <li className="mb-1"><Link to="/news" className="footer-link">財經新聞</Link></li>
              <li className="mb-1"><Link to="/about" className="footer-link">關於網站</Link></li>
            </ul>
          </div>

          {/* 右欄：會員服務 */}
          <div className="col-md-4 col-6">
            <h6 className="fw-semibold mb-3">會員服務</h6>
            <ul className="list-unstyled mb-0 small">
              <li className="mb-1"><Link to="/watchlist" className="footer-link">追蹤清單</Link></li>
              <li className="mb-1"><Link to="/portfolio" className="footer-link">投資組合</Link></li>
              <li className="mb-1"><Link to="/subscription" className="footer-link">Premium 訂閱</Link></li>
            </ul>
          </div>
        </div>

        <hr className="border-secondary mt-4 mb-3" />
        <div className="text-center text-secondary small">
          Copyright © 2025 傑的財經資訊網站
        </div>
      </div>
    </footer>
  )
}

export default Footer