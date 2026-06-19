const RSS_TO_JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json'
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

function buildNewsApiUrl(rssUrl) {
  const params = new URLSearchParams({ rss_url: rssUrl })
  return `${RSS_TO_JSON_ENDPOINT}?${params.toString()}`
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

  const response = await fetch(buildNewsApiUrl(rssUrl))
  if (!response.ok) {
    throw new Error(`News request failed (${response.status})`)
  }

  const payload = await response.json()
  setCacheValue(cacheKey, payload)
  localStorage.setItem(cacheTimeKey, String(now))
  return payload
}

export { TOPIC_RSS_URLS }