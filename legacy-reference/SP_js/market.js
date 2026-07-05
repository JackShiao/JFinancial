// 主內容互動邏輯
document.addEventListener('DOMContentLoaded', function () {

    const chartTitle = document.getElementById('chart-title');
    const ctx = document.getElementById('myChart').getContext('2d');
    const sectionTitle = document.getElementById('section-title');
    const stockTableWrap = document.getElementById('stock-table-wrap');
    const bondTableWrap = document.getElementById('bond-table-wrap');
    const fxTableWrap = document.getElementById('fx-table-wrap');
    const stockTableBody = document.querySelector('#stock-table tbody');
    const bondTableBody = document.querySelector('#bond-table tbody');
    const fxTableBody = document.querySelector('#fx-table tbody');
    const sidebarOffcanvas = document.getElementById('sidebarOffcanvas');


    // 控制側邊欄 collapse 圖示 +/− 切換（點擊立即切換，動畫結束再同步）
    function updateCollapseIcons() {
        document.querySelectorAll('.group-toggle').forEach(function (toggle) {
            let icon = toggle.querySelector('.bi');
            let collapseTarget = document.querySelector(toggle.getAttribute('href'));
            if (!collapseTarget || !icon) return;
            if (collapseTarget.classList.contains('show')) {
                icon.classList.remove('bi-plus-circle');
                icon.classList.add('bi-dash-circle');
            } else {
                icon.classList.remove('bi-dash-circle');
                icon.classList.add('bi-plus-circle');
            }
        });
    }
    // 初始狀態
    updateCollapseIcons();
    // 點擊群組時立即切換圖示
    document.querySelectorAll('.group-toggle').forEach(function (toggle) {
        toggle.addEventListener('click', function (e) {
            let icon = toggle.querySelector('.bi');
            let collapseTarget = document.querySelector(toggle.getAttribute('href'));
            if (!collapseTarget || !icon) return;
            let willShow = !collapseTarget.classList.contains('show');
            if (willShow) {
                icon.classList.remove('bi-plus-circle');
                icon.classList.add('bi-dash-circle');
            } else {
                icon.classList.remove('bi-dash-circle');
                icon.classList.add('bi-plus-circle');
            }
        });
    });
    // 監聽所有 collapse 展開/收合事件（事件冒泡，動畫結束再同步）
    document.getElementById('index-list').addEventListener('shown.bs.collapse', updateCollapseIcons);
    document.getElementById('index-list').addEventListener('hidden.bs.collapse', updateCollapseIcons);
    // 讓 offcanvas 側邊欄 collapse 也能同步圖示
    document.getElementById('index-list-offcanvas').addEventListener('shown.bs.collapse', updateCollapseIcons);
    document.getElementById('index-list-offcanvas').addEventListener('hidden.bs.collapse', updateCollapseIcons);

    // 小畫面：點 offcanvas 側邊欄選單自動收合
    if (sidebarOffcanvas) {
        sidebarOffcanvas.addEventListener('click', function (e) {
            // 只在小螢幕且點到 a.nav-link 時觸發
            if (window.innerWidth < 992 && e.target.matches('a.nav-link')) {
                const offcanvasInstance = bootstrap.Offcanvas.getOrCreateInstance(sidebarOffcanvas);
                offcanvasInstance.hide();
            }
        });
    }

    // 產生近6日日期陣列（全域共用）
    window.getRecentDates = function (n) {
        const arr = [];
        const today = new Date();
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            arr.push(d.toISOString().slice(0, 10));
        }
        return arr;
    };
    const dateLabels = window.getRecentDates(6);


    // 指數、債券、匯市圖表資料（共用 dateLabels）
    const indexData = {
        // 股市指數（模擬資料）
        twii: {
            title: '台灣加權指數',
            label: '加權指數',
            labels: dateLabels,
            data: [27980, 28303, 28182, 28400, 28024, 28198],
            color: '#007bff'
        },
        dji: {
            title: '道瓊工業指數',
            label: 'Dow Jones',
            labels: dateLabels,
            data: [47954, 47739, 47560, 48057, 48704, 48458],
            color: '#28a745'
        },
        spx: {
            title: 'S&P 500 指數',
            label: 'S&P 500',
            labels: dateLabels,
            data: [6870, 6846, 6840, 6886, 6901, 6827],
            color: '#dc3545'
        },
        ixic: {
            title: 'NASDAQ 指數',
            label: 'NASDAQ',
            labels: dateLabels,
            data: [23578, 23545, 23576, 23654, 23593, 23195],
            color: '#fd7e14'
        },
        n225: {
            title: '日經225指數',
            label: 'Nikkei 225',
            labels: dateLabels,
            data: [50491, 50581, 50655, 50602, 50148, 50836],
            color: '#6f42c1'
        },
        eur: {
            title: 'Euro Stoxx 50指數',
            label: 'Euro Stoxx 50',
            labels: dateLabels,
            data: [5723, 5725, 5718, 5708, 5753, 5720],
            color: '#20c997'
        },
        // 債券殖利率（模擬資料）
        twb20: {
            title: '台灣-20年期公債殖利率',
            label: '20年期殖利率',
            labels: dateLabels,
            data: [1.35, 1.36, 1.37, 1.38, 1.36, 1.37],
            color: '#0d6efd'
        },
        twb10: {
            title: '台灣-10年期公債殖利率',
            label: '10年期殖利率',
            labels: dateLabels,
            data: [1.12, 1.13, 1.14, 1.13, 1.12, 1.13],
            color: '#6610f2'
        },
        twb5: {
            title: '台灣-5年期公債殖利率',
            label: '5年期殖利率',
            labels: dateLabels,
            data: [0.98, 0.99, 1.00, 0.99, 0.98, 0.99],
            color: '#20c997'
        },
        usb20: {
            title: '美國-20年期公債殖利率',
            label: '20年期殖利率',
            labels: dateLabels,
            data: [4.35, 4.36, 4.37, 4.38, 4.36, 4.37],
            color: '#fd7e14'
        },
        usb10: {
            title: '美國-10年期公債殖利率',
            label: '10年期殖利率',
            labels: dateLabels,
            data: [4.12, 4.13, 4.14, 4.13, 4.12, 4.13],
            color: '#dc3545'
        },
        usb2: {
            title: '美國-2年期公債殖利率',
            label: '2年期殖利率',
            labels: dateLabels,
            data: [4.98, 4.99, 5.00, 4.99, 4.98, 4.99],
            color: '#198754'
        },
        jpb30: {
            title: '日本-30年期公債殖利率',
            label: '30年期殖利率',
            labels: dateLabels,
            data: [3.30, 3.31, 3.32, 3.33, 3.31, 3.32],
            color: '#ffc107'
        },
        jpb10: {
            title: '日本-10年期公債殖利率',
            label: '10年期殖利率',
            labels: dateLabels,
            data: [1.90, 1.91, 1.92, 1.93, 1.91, 1.92],
            color: '#fd7e14'
        },
        jpb2: {
            title: '日本-2年期公債殖利率',
            label: '2年期殖利率',
            labels: dateLabels,
            data: [0.50, 0.51, 0.52, 0.53, 0.51, 0.52],
            color: '#0d6efd'
        },
        // 匯市資料（模擬資料）
        usd_twd: {
            title: '美元/台幣即期匯率',
            labels: dateLabels,
            buy: [31.142, 31.158, 31.148, 31.223, 31.138, 31.138],
            sell: [31.242, 31.258, 31.248, 31.323, 31.238, 31.238],
            buyLabel: '銀行即期買入',
            sellLabel: '銀行即期賣出',
            buyColor: '#ff0000',
            sellColor: '#0000ff'
        },
        jpy_twd: {
            title: '日圓/台幣即期匯率',
            labels: dateLabels,
            buy: [0.1987, 0.1978, 0.1972, 0.1984, 0.1983, 0.1983],
            sell: [0.2027, 0.2018, 0.2012, 0.2024, 0.2023, 0.2023],
            buyLabel: '銀行即期買入',
            sellLabel: '銀行即期賣出',
            buyColor: '#ff0000',
            sellColor: '#0000ff'
        },
        eur_twd: {
            title: '歐元/台幣即期匯率',
            labels: dateLabels,
            buy: [34.12, 34.10, 34.08, 34.05, 34.03, 33.98],
            sell: [34.22, 34.20, 34.18, 34.15, 34.13, 34.08],
            buyLabel: '銀行即期買入',
            sellLabel: '銀行即期賣出',
            buyColor: '#ff0000',
            sellColor: '#0000ff'
        },
        hkd_twd: {
            title: '港幣/台幣即期匯率',
            labels: dateLabels,
            buy: [3.99, 3.98, 3.97, 3.96, 3.95, 3.94],
            sell: [4.01, 4.00, 3.99, 3.98, 3.97, 3.96],
            buyLabel: '銀行即期買入',
            sellLabel: '銀行即期賣出',
            buyColor: '#ff0000',
            sellColor: '#0000ff'
        },
        krw_twd: {
            title: '韓元/台幣即期匯率',
            labels: dateLabels,
            buy: [0.0223, 0.0229, 0.0228, 0.0227, 0.0226, 0.0227],
            sell: [0.0225, 0.0231, 0.0230, 0.0229, 0.0228, 0.0228],
            buyLabel: '銀行即期買入',
            sellLabel: '銀行即期賣出',
            buyColor: '#ff0000',
            sellColor: '#0000ff'
        },
        cny_twd: {
            title: '人民幣/台幣即期匯率',
            labels: dateLabels,
            buy: [4.3877, 4.3897, 4.3943, 4.4054, 4.3966, 4.3966],
            sell: [4.4357, 4.4377, 4.4423, 4.4534, 4.4446, 4.4446],
            buyLabel: '銀行即期買入',
            sellLabel: '銀行即期賣出',
            buyColor: '#ff0000',
            sellColor: '#0000ff'
        },
    };

    // 各市場靜態資料（主要股票、債券、匯市表格資料）
    const marketTableData = {
        // 股票表格資料（模擬資料）
        twii: [
            ['^TWII', '台灣加權指數', 28198.00, 0.7],
            ['2330', '台積電', 620.00, 1.2],
            ['2317', '鴻海', 110.50, -0.8],
            ['2308', '台達電', 320.00, 0.5],
            ['2454', '聯發科', 1100.00, 2.1],
            ['2881', '富邦金', 70.20, -0.3],
            ['2382', '廣達', 220.00, 0.9],
            ['3711', '日月光投控', 120.00, 0.4],
            ['2412', '中華電', 120.50, -0.2],
            ['2882', '國泰金', 55.80, 0.6],
            ['2891', '中信金', 25.10, 0.3],
        ],
        n225: [
            ['^N225', '日經225指數', 50836.00, 0.9],
            ['7203', '豐田汽車', 2700.00, 1.1],
            ['6758', '索尼', 13000.00, -0.5],
            ['9984', '軟銀集團', 6500.00, 2.3],
            ['8306', '三菱UFJ', 1200.00, 0.7],
            ['9432', '日本電信電話', 170.00, -0.2],
            ['7267', '本田', 4000.00, 0.9],
            ['6861', '鍵山製作所', 7000.00, -1.0],
            ['8035', '東京電子', 25000.00, 1.8],
            ['4063', '信越化學', 6000.00, 0.4],
            ['6098', 'Recruit', 5000.00, -0.3],
        ],
        spx: [
            ['^SPX', '標普500指數', 6827.00, -0.5],
            ['AAPL', 'Apple', 195.00, 1.5],
            ['MSFT', 'Microsoft', 410.00, 0.8],
            ['AMZN', 'Amazon', 170.00, -0.6],
            ['GOOGL', 'Alphabet', 135.00, 2.2],
            ['META', 'Meta', 320.00, 1.1],
            ['BRK.B', 'Berkshire Hathaway', 410.00, -0.2],
            ['NVDA', 'NVIDIA', 650.00, 3.0],
            ['JPM', 'JPMorgan Chase', 160.00, 0.4],
            ['V', 'Visa', 250.00, 0.7],
            ['TSLA', 'Tesla', 250.00, -1.3],
        ],
        dji: [
            ['^DJI', '道瓊工業指數', 48458.00, -0.2],
            ['UNH', 'UnitedHealth', 520.00, 0.9],
            ['GS', 'Goldman Sachs', 390.00, -0.4],
            ['HD', 'Home Depot', 350.00, 1.2],
            ['MSFT', 'Microsoft', 410.00, 0.8],
            ['AAPL', 'Apple', 195.00, 1.5],
            ['V', 'Visa', 250.00, 0.7],
            ['JNJ', 'Johnson & Johnson', 160.00, -0.2],
            ['PG', 'Procter & Gamble', 150.00, 0.3],
            ['TRV', 'Travelers', 180.00, -0.5],
            ['IBM', 'IBM', 170.00, 0.6],
        ],
        ixic: [
            ['^IXIC', '納斯達克指數', 23195.00, -1.7],
            ['AAPL', 'Apple', 195.00, 1.5],
            ['MSFT', 'Microsoft', 410.00, 0.8],
            ['AMZN', 'Amazon', 170.00, -0.6],
            ['GOOGL', 'Alphabet', 135.00, 2.2],
            ['META', 'Meta', 320.00, 1.1],
            ['NVDA', 'NVIDIA', 650.00, 3.0],
            ['TSLA', 'Tesla', 250.00, -1.3],
            ['AVGO', 'Broadcom', 1200.00, 0.9],
            ['ADBE', 'Adobe', 600.00, 0.5],
            ['PEP', 'PepsiCo', 180.00, -0.2],
        ],
        eur: [
            ['^STOXX50E', 'Euro Stoxx 50指數', 5720.00, -0.6],
            ['SAP', 'SAP SE', 130.00, 1.0],
            ['ASML', 'ASML Holding', 700.00, -0.7],
            ['SAN', 'Sanofi', 90.00, 0.4],
            ['OR', 'L\'Oreal', 400.00, 1.8],
            ['RMS', 'Roche', 300.00, -0.3],
            ['SIE', 'Siemens', 140.00, 0.6],
            ['BAS', 'BASF', 60.00, -1.1],
            ['DTE', 'Deutsche Telekom', 20.00, 0.2],
            ['VOW3', 'Volkswagen', 200.00, 0.9],
            ['ALV', 'Allianz', 220.00, -0.4],
        ],
        // 債券表格資料（模擬資料）
        twb: [
            ['30年期', '台灣-30年期公債殖利率', 1.54, 0.00],
            ['20年期', '台灣-20年期公債殖利率', 1.37, 0.01],
            ['10年期', '台灣-10年期公債殖利率', 1.13, -0.02],
            ['5年期', '台灣-5年期公債殖利率', 0.99, 0.00],
        ],
        usb: [
            ['30年期', '美國-30年期公債殖利率', 4.86, 0.07],
            ['20年期', '美國-20年期公債殖利率', 4.82, 0.06],
            ['10年期', '美國-10年期公債殖利率', 4.2, 0.06],
            ['5年期', '美國-5年期公債殖利率', 3.75, 0.03],
            ['3年期', '美國-3年期公債殖利率', 3.59, 0.02],
            ['2年期', '美國-2年期公債殖利率', 3.53, 0.00],
            ['1年期', '美國-1年期公債殖利率', 3.53, -0.02],
            ['6個月期', '美國-6個月期公債殖利率', 3.59, -0.04],
            ['3個月期', '美國-3個月期公債殖利率', 3.62, -0.04],
        ],
        jpb: [
            ['30年期', '日本-30年期公債殖利率', 3.36, 0.00],
            ['10年期', '日本-10年期公債殖利率', 1.95, 0.02],
            ['2年期', '日本-2年期公債殖利率', 1.07, 0.01],
            ['3個月期', '日本-3個月期公債殖利率', 0.65, 0.01],
        ],

        // 匯市表格資料（即期/現金匯率）
        usd_twd: null, // 先設null，稍後初始化
        jpy_twd: null,
        eur_twd: null,
        hkd_twd: null,
        krw_twd: null,
        cny_twd: null,
    };
    // 匯市資料自動日期產生共用函式（全域工具）
    function genFxRows(currency, spotBuyArr, spotSellArr, cashBuyArr, cashSellArr) {
        const today = new Date();
        function getDateStr(offset) {
            const d = new Date(today);
            d.setDate(today.getDate() - offset);
            return d.toISOString().slice(0, 10);
        }
        const rows = [];
        for (let i = 0; i < 6; i++) {
            rows.push({
                date: getDateStr(i),
                currency,
                spotBuy: spotBuyArr[i],
                spotSell: spotSellArr[i],
                cashBuy: cashBuyArr[i],
                cashSell: cashSellArr[i]
            });
        }
        return rows;
    }
    marketTableData.usd_twd = genFxRows(
        'USD/TWD',
        [31.138, 31.138, 31.223, 31.148, 31.158, 31.142],
        [31.238, 31.238, 31.323, 31.248, 31.258, 31.242],
        [31.01, 30.98, 30.95, 30.93, 30.90, 30.88],
        [30.91, 30.88, 30.85, 30.83, 30.80, 30.78]
    );
    marketTableData.jpy_twd = genFxRows(
        'JPY/TWD',
        [0.1983, 0.1983, 0.1984, 0.1972, 0.1978, 0.1979],
        [0.2023, 0.2023, 0.2024, 0.2012, 0.2018, 0.2019],
        [0.232, 0.231, 0.230, 0.229, 0.228, 0.227],
        [0.238, 0.237, 0.236, 0.235, 0.234, 0.233]
    );
    marketTableData.eur_twd = genFxRows(
        'EUR/TWD',
        [33.98, 34.03, 34.05, 34.08, 34.10, 34.12],
        [34.08, 34.13, 34.15, 34.18, 34.20, 34.22],
        [33.90, 33.88, 33.86, 33.83, 33.81, 33.76],
        [34.30, 34.28, 34.26, 34.23, 34.21, 34.16]
    );
    marketTableData.hkd_twd = genFxRows(
        'HKD/TWD',
        [3.94, 3.95, 3.96, 3.97, 3.99, 3.99],
        [3.96, 3.97, 3.98, 3.99, 4.01, 4.01],
        [3.97, 3.96, 3.95, 3.94, 3.93, 3.92],
        [4.03, 4.02, 4.01, 4.00, 3.99, 3.98]
    );
    marketTableData.krw_twd = genFxRows(
        'KRW/TWD',
        [0.0227, 0.0226, 0.0227, 0.0228, 0.0229, 0.023],
        [0.0228, 0.0228, 0.0229, 0.0230, 0.0231, 0.0232],
        [0.0228, 0.0227, 0.0226, 0.0225, 0.0224, 0.0223],
        [0.0234, 0.0233, 0.0232, 0.0231, 0.0230, 0.0229]
    );
    marketTableData.cny_twd = genFxRows(
        'CNY/TWD',
        [4.3966, 4.3966, 4.4054, 4.3943, 4.3897, 4.3877],
        [4.4446, 4.4446, 4.4534, 4.4423, 4.4377, 4.4357],
        [4.33, 4.32, 4.31, 4.30, 4.29, 4.28],
        [4.39, 4.38, 4.37, 4.36, 4.35, 4.34]
    );


    // 初始化圖表
    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: indexData.twii.labels,
            datasets: [{
                label: indexData.twii.label,
                data: indexData.twii.data,
                borderColor: indexData.twii.color,
                backgroundColor: 'rgba(0,123,255,0.1)',
                tension: 0.3,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: false } }
        }
    });

    // 更新圖表資料
    // 產生匯市表格內容（靜態資料）
    function renderFxTable(market) {
        const data = marketTableData[market] || [];
        let html = '';
        data.forEach(row => {
            html += `<tr>
                        <td>${row.date}</td>
                        <td>${row.currency}</td>
                        <td>${row.spotBuy}</td>
                        <td>${row.spotSell}</td>
                        <td>${row.cashBuy}</td>
                        <td>${row.cashSell}</td>
                    </tr>`;
        });
        fxTableBody.innerHTML = html;
    }

    // 產生表格內容
    function renderMarketTable(market) {
        // 匯市表格特殊處理
        if (["usd_twd", "jpy_twd", "eur_twd", "hkd_twd", "krw_twd", "cny_twd"].includes(market)) {
            stockTableWrap.classList.add('d-none');
            bondTableWrap.classList.add('d-none');
            fxTableWrap.classList.remove('d-none');
            renderFxTable(market);
            return;
        }
        const data = marketTableData[market] || [];
        if (market === 'twb' || market === 'usb' || market === 'jpb') {
            // 顯示債券表格，隱藏股票表格、匯市表格
            stockTableWrap.classList.add('d-none');
            bondTableWrap.classList.remove('d-none');
            fxTableWrap.classList.add('d-none');
            let html = '';
            data.forEach(row => {
                const [term, name, rate, change] = row;
                let changeCell = '';
                if (typeof change === 'number') {
                    const up = change > 0;
                    const cls = up ? 'text-danger' : (change < 0 ? 'text-success' : '');
                    const icon = up ? 'bi-caret-up-fill' : (change < 0 ? 'bi-caret-down-fill' : '');
                    const sign = up ? '+' : '';
                    changeCell = `<td class="${cls}">${icon ? `<i class='bi ${icon}'></i>` : ''} ${sign}${change}%</td>`;
                } else {
                    changeCell = '<td></td>';
                }
                html += `<tr><td>${term}</td><td>${name}</td><td>${rate}%</td>${changeCell}</tr>`;
            });
            bondTableBody.innerHTML = html;
        } else {
            // 顯示股票表格，隱藏債券表格、匯市表格
            bondTableWrap.classList.add('d-none');
            stockTableWrap.classList.remove('d-none');
            fxTableWrap.classList.add('d-none');
            let html = '';
            data.forEach(row => {
                const [code, name, price, change] = row;
                const up = change > 0;
                const cls = up ? 'text-danger' : 'text-success';
                const icon = up ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
                const sign = up ? '+' : '';
                html += `<tr><td>${code}</td><td>${name}</td><td>${price.toLocaleString()}</td><td class="${cls}"><i class="bi ${icon}"></i> ${sign}${change}%</td></tr>`;
            });
            stockTableBody.innerHTML = html;
        }
    }


    // 預設載入台灣市場
    renderMarketTable('twii');

    // 動態產生 offcanvas 側邊欄內容
    (function generateOffcanvasSidebar() {
        const staticList = document.getElementById('index-list');
        const offcanvasList = document.getElementById('index-list-offcanvas');
        if (!staticList || !offcanvasList) return;
        // 複製靜態側邊欄內容
        let html = staticList.innerHTML;
        // 將所有 id="xxx-list" 替換為 id="offcanvas-xxx-list"
        html = html.replace(/id="(\w+-market-list|\w+-bonds-list|\w+-list|tw-bonds-list|us-bonds-list|jp-bonds-list|to-twd-list)"/g, function (match, p1) {
            return 'id="offcanvas-' + p1 + '"';
        });
        // 將所有 href="#xxx-list" 替換為 href="#offcanvas-xxx-list"
        html = html.replace(/href="#(\w+-market-list|\w+-bonds-list|\w+-list|tw-bonds-list|us-bonds-list|jp-bonds-list|to-twd-list)"/g, function (match, p1) {
            return 'href="#offcanvas-' + p1 + '"';
        });
        // aria-controls="xxx-list" -> aria-controls="offcanvas-xxx-list"
        html = html.replace(/aria-controls="(\w+-market-list|\w+-bonds-list|\w+-list|tw-bonds-list|us-bonds-list|jp-bonds-list|to-twd-list)"/g, function (match, p1) {
            return 'aria-controls="offcanvas-' + p1 + '"';
        });
        // 填入 offcanvas 側邊欄
        offcanvasList.innerHTML = html;
    })();


    // 側邊欄切換（股票/債券/匯市）for 靜態側邊欄與 offcanvas
    function handleSidebarClick(e, listSelector) {
        if (e.target.tagName === 'A' && e.target.dataset.index !== undefined) {
            e.preventDefault();
            // 切換 active 樣式（只針對當前側邊欄）
            document.querySelectorAll(listSelector + ' .nav-link').forEach(link => link.classList.remove('active'));
            e.target.classList.add('active');
            const idx = e.target.dataset.index;
            // 股票/債券/匯市
            if (indexData[idx]) {
                const d = indexData[idx];
                // 匯市 chart 雙線圖表
                if (["usd_twd", "jpy_twd", "eur_twd", "hkd_twd", "krw_twd", "cny_twd"].includes(idx)) {
                    chartTitle.textContent = d.title;
                    chart.data.labels = d.labels;
                    chart.data.datasets = [
                        {
                            label: d.sellLabel,
                            data: d.sell,
                            borderColor: d.sellColor,
                            backgroundColor: 'rgba(0,0,255,0.05)',
                            tension: 0.3,
                            fill: false,
                        },
                        {
                            label: d.buyLabel,
                            data: d.buy,
                            borderColor: d.buyColor,
                            backgroundColor: 'rgba(255,0,0,0.05)',
                            tension: 0.3,
                            fill: false,
                        }
                    ];
                    chart.options.plugins.legend.display = true;
                    chart.update();
                    let fxTitleMap = {
                        usd_twd: '各天期美元/台幣即期匯率',
                        jpy_twd: '各天期日圓/台幣即期匯率',
                        eur_twd: '各天期歐元/台幣即期匯率',
                        hkd_twd: '各天期港幣/台幣即期匯率',
                        krw_twd: '各天期韓元/台幣即期匯率',
                        cny_twd: '各天期人民幣/台幣即期匯率'
                    };
                    sectionTitle.textContent = fxTitleMap[idx] || (d.title + '即期匯率');
                    renderMarketTable(idx);
                } else {
                    // 其他市場維持原本單線圖表
                    chartTitle.textContent = d.title;
                    chart.data.labels = d.labels;
                    chart.data.datasets = [{
                        label: d.label,
                        data: d.data,
                        borderColor: d.color,
                        backgroundColor: d.color + '22',
                        tension: 0.3,
                        fill: true,
                    }];
                    chart.options.plugins.legend.display = true;
                    chart.update();
                    const marketNames = {
                        twii: '台灣市場',
                        n225: '日本市場',
                        spx: 'S&P 500',
                        dji: '道瓊工業',
                        ixic: '納斯達克',
                        eur: '歐洲市場',
                        twb: '台灣公債',
                        usb: '美國公債',
                        jpb: '日本公債',
                        twb20: '台灣20年期',
                        twb10: '台灣10年期',
                        twb5: '台灣5年期',
                        usb20: '美國20年期',
                        usb10: '美國10年期',
                        usb2: '美國2年期'
                    };
                    // 若是債券年期，section-title 統一顯示各年期殖利率，並顯示債券表格
                    if (['twb20', 'twb10', 'twb5'].includes(idx)) {
                        sectionTitle.textContent = '台灣公債各年期殖利率';
                        renderMarketTable('twb');
                    } else if (['usb20', 'usb10', 'usb2'].includes(idx)) {
                        sectionTitle.textContent = '美國公債各年期殖利率';
                        renderMarketTable('usb');
                    } else if (['jpb30', 'jpb10', 'jpb2'].includes(idx)) {
                        sectionTitle.textContent = '日本公債各年期殖利率';
                        renderMarketTable('jpb');
                    }
                    else if (idx === 'twb' || idx === 'usb' || idx === 'jpb') {
                        sectionTitle.textContent = (marketNames[idx] || d.title) + '各年期殖利率';
                        renderMarketTable(idx);
                    } else {
                        sectionTitle.textContent = (marketNames[idx] || d.title) + '主要股票';
                        renderMarketTable(idx);
                    }
                }
            }
        }
    }
    document.getElementById('index-list').addEventListener('click', function (e) { handleSidebarClick(e, '#index-list'); });
    document.getElementById('index-list-offcanvas').addEventListener('click', function (e) { handleSidebarClick(e, '#index-list-offcanvas'); });
    // ...可擴充API串接等
});