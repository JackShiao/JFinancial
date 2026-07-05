# 2025/12/19 協作 Prompts 紀錄

## RWD 與互動體驗
- 如何讓 Bootstrap 側邊欄（offcanvas）在小畫面點擊功能選單自動收合，群組展開（+/-）不收合：只針對 a.nav-link 綁定收合事件，群組 toggle 用 div 或不加 nav-link class。
- 側邊欄群組展開/收合連結從 a 改成 div，JS 只抓 a.nav-link，確保 UX 正確。

## Google 搜尋欄客製化
- 如何讓 Google CSE 搜尋欄寬高與登入按鈕一致：調整 .gsc-control-cse、.gsc-input-box、.gsc-search-box table、.gsc-search-button-v2、.gsc-clear-button 的寬高與 padding。
- 讓放大鏡、搜尋框、X 都在同一行且不超出：table-layout: fixed，所有元素設固定寬高與 box-sizing。

## 其他重點
- 圖片載入失敗時自動顯示 default.png，新聞圖片抓取依 RSS 來源內容而定

---
> 本紀錄由 GitHub Copilot 於 2025/12/19 協作產生。