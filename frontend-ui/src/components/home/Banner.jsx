import { Link } from 'react-router-dom'
import './Banner.css'

const bannerSlides = [
  {
    id: 0,
    indicatorLabel: '網站介紹',
    image: '/img/banner1.jpg',
    title: '掌握全球財經脈動',
    description: '投資決策最佳夥伴，提供即時指數、新聞與專業分析',
    buttonText: '查看市場指數',
    buttonClass: 'btn-warning',
    href: '/market',
    visualClass: 'banner-slide-1',
  },
  {
    id: 1,
    indicatorLabel: '最新新聞',
    image: '/img/banner2.png',
    title: '時事新聞',
    description: '美股三大指數震盪，投資人關注聯準會政策動向。',
    buttonText: '更多新聞',
    buttonClass: 'btn-primary',
    href: '/news',
    visualClass: 'banner-slide-2',
  },
  {
    id: 2,
    indicatorLabel: '財經活動快訊',
    image: '/img/banner3.jpg',
    title: '市場觀點',
    description: '深度解析產業趨勢，華爾街分析師看法！',
    buttonText: '探索更多',
    buttonClass: 'btn-success',
    href: 'https://hao.cnyes.com/wall/recommend',
    visualClass: 'banner-slide-3',
  },
]

function Banner() {
  return (
    // 最外層維持滿版，不使用 container，讓 Banner 視覺可橫跨整個視窗。
    <section className="banner-section w-100" aria-label="首頁輪播Banner">
      <div
        id="bannerCarousel"
        className="carousel slide carousel-fade mb-0 w-100"
        data-bs-ride="carousel"
        data-bs-interval="3000"
        aria-live="polite"
      >
        {/* 輪播指示器：使用 bannerSlides 動態產生每一張投影片對應的切換按鈕。 */}
        <div className="carousel-indicators">
          {bannerSlides.map((slide) => (
            <button
              key={slide.id}
              type="button"
              data-bs-target="#bannerCarousel"
              data-bs-slide-to={slide.id}
              className={slide.id === 0 ? 'active' : undefined}
              aria-current={slide.id === 0 ? 'true' : undefined}
              aria-label={slide.indicatorLabel}
            />
          ))}
        </div>

        {/* 輪播內容：每張投影片包含背景圖片與 caption 文案。 */}
        <div className="carousel-inner">
          {bannerSlides.map((slide) => (
            <div
              key={slide.id}
              className={`carousel-item ${slide.id === 0 ? 'active' : ''}`}
            >
              <div className={`w-100 banner-visual ${slide.visualClass}`}>
                <img
                  src={slide.image}
                  className="d-block w-100 banner-image"
                  alt={slide.indicatorLabel}
                  loading="lazy"
                  onError={(event) => {
                    const img = event.currentTarget
                    if (img.dataset.fallbackApplied === 'true') return
                    img.dataset.fallbackApplied = 'true'
                    img.src = '/img/default.png'
                  }}
                />
              </div>
              <div className="text-center">
                <div className="carousel-caption mx-auto my-5 text-center banner-caption">
                  <h1 className="display-4 fw-bold mt-3 mb-3 text-white">{slide.title}</h1>
                  <p className="lead mb-4 text-white">{slide.description}</p>
                  <p>
                    {slide.href.startsWith('http') ? (
                      <a
                        className={`btn btn-lg ${slide.buttonClass}`}
                        href={slide.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {slide.buttonText}
                      </a>
                    ) : (
                      <Link className={`btn btn-lg ${slide.buttonClass}`} to={slide.href}>
                        {slide.buttonText}
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 左右控制按鈕：提供使用者手動切換上一張 / 下一張投影片。 */}
        <button
          className="carousel-control-prev"
          type="button"
          data-bs-target="#bannerCarousel"
          data-bs-slide="prev"
        >
          <span className="carousel-control-prev-icon" aria-hidden="true" />
          <span className="visually-hidden">上一張</span>
        </button>

        <button
          className="carousel-control-next"
          type="button"
          data-bs-target="#bannerCarousel"
          data-bs-slide="next"
        >
          <span className="carousel-control-next-icon" aria-hidden="true" />
          <span className="visually-hidden">下一張</span>
        </button>
      </div>
    </section>
  )
}

export default Banner