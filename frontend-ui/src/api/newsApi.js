const CACHE_INTERVAL_MS = 10 * 60 * 1000

const TOPIC_RSS_URLS = {
  headline:
    'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRFZxYUdjU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  finance:
    'https://news.google.com/rss/search?q=%E5%8F%B0%E8%82%A1+%E6%8A%95%E8%B3%87+%E8%B2%A1%E7%B6%93&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  international:
    'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx1YlY4U0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  taiwan:
    'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFptTXpJU0JYcG9MVlJYS0FBUAE?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  business:
    'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx6TVdZU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  entertainment:
    'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNREpxYW5RU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  sports:
    'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRFp1ZEdvU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
  scitech:
    'https://news.google.com/rss/topics/CAAqLAgKIiZDQkFTRmdvSkwyMHZNR1ptZHpWbUVnVjZhQzFVVnhvQ1ZGY29BQVAB?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
}

function getCacheValue(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCacheValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore cache write failures (private mode, quota, etc.)
  }
}

/**
 * 透過自家後端 /api/news/rss 代理抓取 Google News RSS XML
 * 避免依賴不穩定的第三方 CORS proxy
 */
async function fetchRssXml(rssUrl) {
  const params = new URLSearchParams({ url: rssUrl })
  const response = await fetch(`/api/news/rss?${params.toString()}`, {
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) {
    throw new Error(`RSS proxy responded with ${response.status}`)
  }
  const text = await response.text()
  if (!text.includes('<rss') && !text.includes('<channel')) {
    throw new Error('Response is not RSS XML')
  }
  return text
}

/**
 * 將 RSS XML 字串解析成與原 rss2json 相容的格式
 * { status: 'ok', items: [...] }
 */
function parseRssXml(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  // 檢查解析錯誤
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Failed to parse RSS XML')
  }

  const items = Array.from(doc.querySelectorAll('item')).map((item) => {
    const getText = (tag) => item.querySelector(tag)?.textContent?.trim() ?? ''

    // 嘗試從 media:content 或 enclosure 取得圖片
    const mediaContent = item.querySelector('content')
    const enclosureEl = item.querySelector('enclosure')

    let enclosure = null
    if (enclosureEl) {
      enclosure = {
        link: enclosureEl.getAttribute('url') || '',
        type: enclosureEl.getAttribute('type') || '',
      }
    } else if (mediaContent?.getAttribute('url')) {
      enclosure = {
        link: mediaContent.getAttribute('url'),
        type: mediaContent.getAttribute('type') || 'image/jpeg',
      }
    }

    return {
      title: getText('title'),
      pubDate: getText('pubDate'),
      link: getText('link'),
      guid: getText('guid') || getText('link'),
      author: getText('author') || getText('dc\\:creator'),
      thumbnail: mediaContent?.getAttribute('url') || '',
      description: getText('description'),
      enclosure,
    }
  })

  return { status: 'ok', items }
}

export async function getGoogleNewsByTopic(topicKey) {
  const rssUrl = TOPIC_RSS_URLS[topicKey]

  if (!rssUrl) {
    throw new Error(`Unknown news topic: ${topicKey}`)
  }

  const cacheKey = `news_cache_${topicKey}`
  const cacheTimeKey = `news_cache_time_${topicKey}`
  const now = Date.now()
  const cachedData = getCacheValue(cacheKey)
  const cachedTime = Number(localStorage.getItem(cacheTimeKey) || 0)

  if (cachedData && now - cachedTime < CACHE_INTERVAL_MS) {
    return cachedData
  }

  const xmlText = await fetchRssXml(rssUrl)
  const payload = parseRssXml(xmlText)

  setCacheValue(cacheKey, payload)
  localStorage.setItem(cacheTimeKey, String(now))
  return payload
}

export { TOPIC_RSS_URLS }