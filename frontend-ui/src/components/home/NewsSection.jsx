import { useEffect, useMemo, useState } from 'react'
import { getGoogleNewsByTopic } from '../../api/newsApi'
import { Link } from 'react-router-dom'
import './NewsSection.css'

const NEWS_CATEGORIES = [
  {
    key: 'international',
    title: '國際新聞',
    fallbackImage: '/img/news1.png',
    topicUrl:
      'https://news.google.com/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx1YlY4U0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant',
  },
  {
    key: 'taiwan',
    title: '台灣新聞',
    fallbackImage: '/img/news2.png',
    topicUrl:
      'https://news.google.com/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFptTXpJU0JYcG9MVlJYS0FBUAE?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant',
  },
  {
    key: 'business',
    title: '商業新聞',
    fallbackImage: '/img/news3.png',
    topicUrl:
      'https://news.google.com/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx6TVdZU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW%3Azh-Hant',
  },
]

function parseNewsTitle(rawTitle) {
  const title = String(rawTitle ?? '').trim()
  if (!title) {
    return { headline: '', source: '' }
  }

  const match = title.match(/^(.*?)(?:\s[-｜|]\s?)([^-｜|]+)$/)
  if (match) {
    return {
      headline: match[1].trim(),
      source: match[2].trim(),
    }
  }

  return { headline: title, source: '' }
}

function formatNewsDate(dateStr) {
  if (!dateStr) {
    return ''
  }

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
  if (diffMinutes >= 0 && diffMinutes < 60) {
    return `${Math.max(diffMinutes, 1)} 分鐘前`
  }

  if (diffMinutes >= 60 && diffMinutes < 24 * 60) {
    return `${Math.floor(diffMinutes / 60)} 小時前`
  }

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function pickImageUrl(item) {
  if (!item) {
    return ''
  }

  if (item?.enclosure?.link) {
    return item.enclosure.link
  }

  if (item?.thumbnail) {
    return item.thumbnail
  }

  if (item?.description) {
    const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match) {
      return match[1]
    }
  }

  return ''
}

function NewsCard({ title, topicUrl, items, isLoading, fallbackImage, hasError = false }) {
  const main = items[0]
  const subItems = items.slice(1, 4)
  const mainImage = pickImageUrl(main)
  const mainTitle = parseNewsTitle(main?.title)

  if (isLoading) {
    return (
      <div className="news-card border rounded shadow-sm h-100 p-3 bg-white">
        <div className="placeholder-glow mb-3">
          <span className="placeholder col-5" />
        </div>
        {[0, 1, 2].map((index) => (
          <div key={index} className="news-skeleton-item mb-3">
            <div className="placeholder-glow mb-2">
              <span className="placeholder news-skeleton-image col-12" />
            </div>
            <div className="placeholder-glow mb-2">
              <span className="placeholder col-10" />
            </div>
            <div className="placeholder-glow mb-2">
              <span className="placeholder col-8" />
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!main) {
    return (
      <div className="news-card border rounded shadow-sm h-100 p-3 bg-white">
        <a
          href={topicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none text-dark"
        >
          <h4 className="news-header mb-3 border-bottom pb-2">
            {title}
            <i className="bi bi-caret-right-fill" />
          </h4>
        </a>
        <div className="text-muted py-5 text-center">
          {hasError
            ? (
              <>
                <i className="bi bi-wifi-off fs-2 d-block mb-2" aria-hidden="true" />
                <p className="mb-1">新聞資料載入失敗</p>
                <p className="small mb-0">請稍後重新整理</p>
              </>
            )
            : '目前暫無新聞資料'}
        </div>
      </div>
    )
  }

  return (
    <div className="news-card border rounded shadow-sm h-100 p-3 bg-white">
      <a
        href={topicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-decoration-none text-dark"
      >
        <h4 className="news-header mb-3 border-bottom pb-2">
          {title}
          <i className="bi bi-caret-right-fill" />
        </h4>
      </a>

      <a href={main.link || topicUrl} target="_blank" rel="noopener noreferrer">
        {mainImage || fallbackImage ? (
          <img
            src={mainImage || fallbackImage}
            className="news-image"
            loading="lazy"
            alt={`${title}預覽圖`}
            onError={(event) => {
              const img = event.currentTarget
              if (img.dataset.fallbackApplied === 'true') return
              img.dataset.fallbackApplied = 'true'
              img.src = fallbackImage || '/img/default.png'
            }}
          />
        ) : (
          <div className="news-image-placeholder">暫無圖片</div>
        )}
      </a>
      <div className="fw-bold mt-2 mb-1 border-bottom pb-2">
        <a
          className="news-link"
          href={main.link || topicUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {mainTitle.headline}
        </a>
        {mainTitle.source && <div className="news-source">來源：{mainTitle.source}</div>}
        <div className="news-main-time">{formatNewsDate(main.pubDate)}</div>
      </div>

      <ul className="list-unstyled mb-0">
        {subItems.map((item) => {
          const parsed = parseNewsTitle(item.title)

          return (
            <li key={item.guid || item.link || item.title} className="my-2 border-bottom pb-2">
              <a
                className="news-link"
                href={item.link || topicUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {parsed.headline}
              </a>
              {parsed.source && <div className="news-source">來源：{parsed.source}</div>}
              <div className="news-time">{formatNewsDate(item.pubDate)}</div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NewsSection() {
  const [newsMap, setNewsMap] = useState({
    international: [],
    taiwan: [],
    business: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadNews() {
      try {
        const results = await Promise.all(
          NEWS_CATEGORIES.map(async (category) => {
            const payload = await getGoogleNewsByTopic(category.key)
            return [category.key, Array.isArray(payload?.items) ? payload.items : []]
          })
        )

        if (!isMounted) {
          return
        }

        setNewsMap(Object.fromEntries(results))
      } catch {
        if (!isMounted) {
          return
        }

        setHasError(true)
        setNewsMap({
          international: [],
          taiwan: [],
          business: [],
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadNews()

    return () => {
      isMounted = false
    }
  }, [])

  const categories = useMemo(() => NEWS_CATEGORIES, [])

  return (
    <section className="news-section py-5">
      <div className="container">
        <div className="row g-3">
          {categories.map((category) => (
            <div key={category.key} className="col-lg-4">
              <NewsCard
                title={category.title}
                topicUrl={category.topicUrl}
                items={newsMap[category.key] || []}
                isLoading={isLoading}
                fallbackImage={category.fallbackImage}
                hasError={hasError}
              />
            </div>
          ))}
        </div>

        <div className="mt-3">
          <Link to="/news" className="btn btn-warning w-100">
            查看更多新聞
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NewsSection