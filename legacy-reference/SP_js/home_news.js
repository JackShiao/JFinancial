// Google News RSS 取得主新聞（CORS 限制下用 rss2json 代理）
document.addEventListener('DOMContentLoaded', function () {

    // 正確的新聞時間格式化函式
    function formatAdd8Hours(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const forced = new Date(date.getTime() + 8 * 60 * 60 * 1000);
        const y = forced.getFullYear();
        const m = (forced.getMonth() + 1).toString().padStart(2, '0');
        const d = forced.getDate().toString().padStart(2, '0');
        const h = forced.getHours().toString().padStart(2, '0');
        const min = forced.getMinutes().toString().padStart(2, '0');
        const s = forced.getSeconds().toString().padStart(2, '0');
        return `${y}/${m}/${d} ${h}:${min}:${s}`;
    }

    // 取得新聞資料（含快取判斷）
    function fetchWithCache({ apiUrl, cacheKey, cacheTimeKey, cacheInterval, renderFn, logTag }) {
        const now = Date.now();
        const cacheTime = parseInt(localStorage.getItem(cacheTimeKey) || '0', 10);
        const cacheData = localStorage.getItem(cacheKey);
        if (cacheData && (now - cacheTime < cacheInterval)) {
            try {
                const data = JSON.parse(cacheData);
                console.log(`[${logTag}] 使用快取資料`);
                renderFn(data);
                return;
            } catch (e) {
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(cacheTimeKey);
            }
        }
        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                console.log(`[${logTag}] 使用 API 資料`);
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(cacheTimeKey, now.toString());
                renderFn(data);
            })
            .catch(() => {
                renderFn({ items: [] });
            });
    }

    // 國際新聞
    // 連結 rss 轉 api 再 fetch
    const intlrssUrl = 'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx1YlY4U0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant';
    const intlapiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(intlrssUrl);

    // fetch 國際新聞並使用快取機制
    fetchWithCache({
        apiUrl: intlapiUrl,
        cacheKey: 'intlNewsCache',
        cacheTimeKey: 'intlNewsCacheTime',
        cacheInterval: 10 * 60 * 1000,
        renderFn: renderIntlNews,
        logTag: '國際新聞'
    });

    // 快取鍵
    const INTL_CACHE_KEY = 'intlNewsCache';
    const INTL_CACHE_TIME_KEY = 'intlNewsCacheTime';

    // 事件代理：重整按鈕
    document.getElementById('intl-news-main-link').addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('reload-btn')) {
            e.preventDefault();
            // 強制清除快取並重新載入
            localStorage.removeItem(INTL_CACHE_KEY);
            localStorage.removeItem(INTL_CACHE_TIME_KEY);
            location.reload();
        }
    });

    // 渲染國際新聞資料
    function renderIntlNews(data) {
        if (!data.items || data.items.length < 1) {
            document.getElementById('intl-news-main-link').href = '#';
            document.getElementById('intl-news-main-link').target = '';
            document.getElementById('intl-news-main-link').innerHTML =
                '<div class="mt-3 btn btn-primary d-flex align-items-center justify-content-center reload-btn">重新整理</div>';
            document.getElementById('intl-news-main-time').textContent = '';
            document.getElementById('intl-news-main-img').src = './SP_img/news1.png';
            for (let i = 2; i <= 4; i++) {
                const a = document.getElementById('intl-news-link-' + i);
                const t = document.getElementById('intl-news-time-' + i);
                if (a) a.textContent = '';
                if (t) t.textContent = '';
            }
            const intlNews = document.getElementById('intl-news');
            if (intlNews) {
                intlNews.innerHTML =
                    '<div class="d-flex justify-content-center align-items-center text-muted" style="height: 200px;">暫無新聞</div>';
            }
            return;
        }
        // 主新聞
        const item = data.items[0];
        document.getElementById('intl-news-main-link').href = item.link;
        document.getElementById('intl-news-main-link').textContent = item.title;
        document.getElementById('intl-news-main-time').textContent = formatAdd8Hours(item.pubDate);
        // 主新聞圖片
        let img = item.enclosure && item.enclosure.link ? item.enclosure.link : '';
        if (!img && item.thumbnail) img = item.thumbnail;
        if (!img && item.description) {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) img = match[1];
        }
        if (img) {
            document.getElementById('intl-news-main-img').src = img;
            const imgLink = document.querySelector('#intl-news-main-img').closest('a');
            if (imgLink) imgLink.href = item.link;
        }
        // 2~4條
        for (let i = 1; i <= 3; i++) {
            const news = data.items[i];
            const a = document.getElementById('intl-news-link-' + (i + 1));
            const t = document.getElementById('intl-news-time-' + (i + 1));
            if (a && news) {
                a.href = news.link;
                a.textContent = news.title;
                if (t) t.textContent = formatAdd8Hours(news.pubDate);
            } else if (a) {
                a.textContent = '';
                if (t) t.textContent = '';
            }
        }
    }


    // 台灣新聞
    // 連結 rss 轉 api 再 fetch
    const twrssUrl = 'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRFptTXpJU0JYcG9MVlJYS0FBUAE?hl=zh-TW&gl=TW&ceid=TW:zh-Hant';
    const twapiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(twrssUrl);

    // fetch 台灣新聞並使用快取機制
    fetchWithCache({
        apiUrl: twapiUrl,
        cacheKey: 'twNewsCache',
        cacheTimeKey: 'twNewsCacheTime',
        cacheInterval: 10 * 60 * 1000,
        renderFn: renderTwNews,
        logTag: '台灣新聞'
    });

    // 快取鍵
    const TW_CACHE_KEY = 'twNewsCache';
    const TW_CACHE_TIME_KEY = 'twNewsCacheTime';

    // 事件代理：重整按鈕
    document.getElementById('tw-news-main-link').addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('reload-btn')) {
            e.preventDefault();
            // 強制清除快取並重新載入
            localStorage.removeItem(TW_CACHE_KEY);
            localStorage.removeItem(TW_CACHE_TIME_KEY);
            location.reload();
        }
    });

    // 渲染台灣新聞資料
    function renderTwNews(data) {
        if (!data.items || data.items.length < 1) {
            document.getElementById('tw-news-main-link').href = '#';
            document.getElementById('tw-news-main-link').target = '';
            document.getElementById('tw-news-main-link').innerHTML =
                '<div class="mt-3 btn btn-primary d-flex align-items-center justify-content-center reload-btn">重新整理</div>';
            document.getElementById('tw-news-main-time').textContent = '';
            document.getElementById('tw-news-main-img').src = './SP_img/news2.png';
            for (let i = 2; i <= 4; i++) {
                const a = document.getElementById('tw-news-link-' + i);
                const t = document.getElementById('tw-news-time-' + i);
                if (a) a.textContent = '';
                if (t) t.textContent = '';
            }
            const twNews = document.getElementById('news-tw');
            if (twNews) {
                twNews.innerHTML =
                    '<div class="d-flex justify-content-center align-items-center text-muted" style="height: 200px;">暫無新聞</div>';
            }
            return;
        }
        // 主新聞
        const item = data.items[0];
        document.getElementById('tw-news-main-link').href = item.link;
        document.getElementById('tw-news-main-link').textContent = item.title;
        document.getElementById('tw-news-main-time').textContent = formatAdd8Hours(item.pubDate);
        // 主新聞圖片
        let img = item.enclosure && item.enclosure.link ? item.enclosure.link : '';
        if (!img && item.thumbnail) img = item.thumbnail;
        if (!img && item.description) {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) img = match[1];
        }
        if (img) {
            document.getElementById('tw-news-main-img').src = img;
            const imgLink = document.querySelector('#tw-news-main-img').closest('a');
            if (imgLink) imgLink.href = item.link;
        }
        // 2~4條
        for (let i = 1; i <= 3; i++) {
            const news = data.items[i];
            const a = document.getElementById('tw-news-link-' + (i + 1));
            const t = document.getElementById('tw-news-time-' + (i + 1));
            if (a && news) {
                a.href = news.link;
                a.textContent = news.title;
                if (t) t.textContent = formatAdd8Hours(news.pubDate);
            } else if (a) {
                a.textContent = '';
                if (t) t.textContent = '';
            }
        }
    }

    // 商業新聞
    // // 連結 rss 轉 api 再 fetch
    const businessrssUrl = 'https://news.google.com/rss/topics/CAAqKggKIiRDQkFTRlFvSUwyMHZNRGx6TVdZU0JYcG9MVlJYR2dKVVZ5Z0FQAQ?hl=zh-TW&gl=TW&ceid=TW:zh-Hant';
    const businessapiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(businessrssUrl);

    // fetch 商業新聞並使用快取機制
    fetchWithCache({
        apiUrl: businessapiUrl,
        cacheKey: 'businessNewsCache',
        cacheTimeKey: 'businessNewsCacheTime',
        cacheInterval: 10 * 60 * 1000,
        renderFn: renderBusinessNews,
        logTag: '商業新聞'
    });

    // 快取鍵
    const BUSINESS_CACHE_KEY = 'businessNewsCache';
    const BUSINESS_CACHE_TIME_KEY = 'businessNewsCacheTime';

    // 事件代理：重整按鈕
    document.getElementById('business-news-main-link').addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('reload-btn')) {
            e.preventDefault();
            // 強制清除快取並重新載入
            localStorage.removeItem(BUSINESS_CACHE_KEY);
            localStorage.removeItem(BUSINESS_CACHE_TIME_KEY);
            location.reload();
        }
    });

    // 渲染商業新聞資料
    function renderBusinessNews(data) {
        if (!data.items || data.items.length < 1) {
            document.getElementById('business-news-main-link').href = '#';
            document.getElementById('business-news-main-link').target = '';
            document.getElementById('business-news-main-link').innerHTML =
                '<div class="mt-3 btn btn-primary d-flex align-items-center justify-content-center reload-btn">重新整理</div>';
            document.getElementById('business-news-main-time').textContent = '';
            document.getElementById('business-news-main-img').src = './SP_img/news3.png';
            for (let i = 2; i <= 4; i++) {
                const a = document.getElementById('business-news-link-' + i);
                const t = document.getElementById('business-news-time-' + i);
                if (a) a.textContent = '';
                if (t) t.textContent = '';
            }
            const businessNews = document.getElementById('business-news');
            if (businessNews) {
                businessNews.innerHTML =
                    '<div class="d-flex justify-content-center align-items-center text-muted" style="height: 200px;">暫無新聞</div>';
            }
            return;
        }
        // 主新聞
        const item = data.items[0];
        document.getElementById('business-news-main-link').href = item.link;
        document.getElementById('business-news-main-link').textContent = item.title;
        document.getElementById('business-news-main-time').textContent = formatAdd8Hours(item.pubDate);
        // 主新聞圖片
        let img = item.enclosure && item.enclosure.link ? item.enclosure.link : '';
        if (!img && item.thumbnail) img = item.thumbnail;
        if (!img && item.description) {
            const match = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
            if (match) img = match[1];
        }
        if (img) {
            document.getElementById('business-news-main-img').src = img;
            const imgLink = document.querySelector('#business-news-main-img').closest('a');
            if (imgLink) imgLink.href = item.link;
        }
        // 2~4條
        for (let i = 1; i <= 3; i++) {
            const news = data.items[i];
            const a = document.getElementById('business-news-link-' + (i + 1));
            const t = document.getElementById('business-news-time-' + (i + 1));
            if (a && news) {
                a.href = news.link;
                a.textContent = news.title;
                if (t) t.textContent = formatAdd8Hours(news.pubDate);
            } else if (a) {
                a.textContent = '';
                if (t) t.textContent = '';
            }
        }
    }

});