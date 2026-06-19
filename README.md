# J's Financial — 財經資訊網站

個人全端練習專案，提供市場指數、財經新聞瀏覽，以及登入後的觀察名單與投資組合管理功能。

🔗 **線上網址：[https://jfinancial-frontend-gghtso4rrq-de.a.run.app](https://jfinancial-frontend-gghtso4rrq-de.a.run.app)**

> 部署於 Google Cloud Run（前端 + 後端），資料庫使用 Cloud SQL MySQL 8。

---

## 技術棧

| 層次 | 技術 |
|------|------|
| 前端 | React 19 (Vite)、Bootstrap 5、Chart.js、Zustand、React Router v7 |
| 後端 | Java 21、Spring Boot 4、Spring Security (JWT + OAuth2 Client)、Spring Data JPA、Lombok |
| 資料庫 | MySQL 8.4 |
| 容器 | Docker / Docker Compose |

---

## 功能

- **首頁** — 市場指數快覽、最新財經新聞摘要
- **市場** — 股市／債市／匯市即時指數與歷史折線圖（Navbar 搜尋可直接跳轉）
- **新聞** — Google News RSS 多分類，點擊開啟詳情 Modal
- **關於我** — 專案介紹
- **登入 / 註冊** — JWT 無狀態驗證，支援 Google / GitHub OAuth2 第三方登入
- **個人資料** — 修改顯示名稱
- **觀察名單** — 追蹤 / 移除指數
- **投資組合** — 新增／刪除持倉、成本 vs 現值損益長條圖
- **訂閱付費** — 透過綠界 ECPay 金流進行付款，升級 Premium 後可查看完整 365 天市場走勢圖
---

## 本地開發環境建置

### 前置需求

- Docker Desktop
- JDK 21+
- Node.js 20+
- Maven（或使用專案內的 `mvnw`）

### 1. 啟動 MySQL（Docker）

```bash
docker compose up -d
```

MySQL 會在 `localhost:3306`，資料庫名稱 `jfinancial`，並自動執行 `docker/mysql/init/init_jfinancial_schema.sql` 初始化 Schema。

### 2. 設定後端敏感設定

複製範本並填入實際值：

```bash
cp backend-api/src/main/resources/application-local.properties.example \
   backend-api/src/main/resources/application-local.properties
```

> `application-local.properties` 已加入 `.gitignore`，請勿提交至版本庫。

需填寫的設定項：

```properties
# FRED API Key（取得美國公債殖利率）
fred.api.key=YOUR_FRED_API_KEY

# Fugle API Key（台股加權指數即時資料，至 https://developer.fugle.tw/ 申請）
fugle.api.key=YOUR_FUGLE_API_KEY

# JWT Secret（建議 256-bit 以上隨機字串）
jwt.secret=YOUR_JWT_SECRET

# Google OAuth2（至 Google Cloud Console 建立 OAuth 2.0 用戶端）
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET

# GitHub OAuth2（至 GitHub → Settings → Developer settings → OAuth Apps 建立）
spring.security.oauth2.client.registration.github.client-id=YOUR_GITHUB_CLIENT_ID
spring.security.oauth2.client.registration.github.client-secret=YOUR_GITHUB_CLIENT_SECRET

# ECPay 綠界付款通知 URL（本機開發請使用 ngrok 等工具暴露本機，填入 ngrok HTTPS URL）
# 格式：https://<your-ngrok-domain>/api/payment/ecpay/notify
ecpay.notify-url=YOUR_NGROK_URL/api/payment/ecpay/notify
```

FRED API Key 可至 [https://fred.stlouisfed.org/](https://fred.stlouisfed.org/) 免費申請。

> Fugle API Key 如未設定，後端會指印 `warn` 並跳過台股即時更新（不影響其他指數）。

> **OAuth2 Callback URL 設定**：在 Google / GitHub 後台，Authorized redirect URI 填入
> `http://localhost:8080/login/oauth2/code/google`（Google）
> `http://localhost:8080/login/oauth2/code/github`（GitHub）

### 3. 啟動後端

```bash
cd backend-api
./mvnw spring-boot:run
```

後端預設監聽 `http://localhost:8080`。

### 4. 啟動前端

```bash
cd frontend-ui
npm install
npm run dev
```

前端預設於 `http://localhost:5173`。開發環境已設定 Vite Proxy：

| Proxy 規則 | 說明 |
|-----------|------|
| `/api` | REST API，轉發至後端 |
| `/oauth2/authorization` | OAuth2 登入觸發端點，轉發至後端啟動認證流程 |
| `/login/oauth2` | OAuth2 callback（後端接收），轉發至後端 |

> ⚠️ 注意：`/oauth2/callback` 是**前端 React Route**（`OAuthCallback.jsx`），不在 Proxy 規則內，不可設為 `/oauth2`（會攔截前端路由造成 redirect 到後端 `/login`）。

---

## 認證機制

本專案採用「**雙軌 JWT**」策略，依登入方式不同採用不同的 token 儲存方式：

| 登入方式 | Token 儲存位置 | 傳遞方式 |
|---------|--------------|---------|
| 帳號密碼登入 | `localStorage` | `Authorization: Bearer <token>` header |
| Google / GitHub OAuth2 | **HttpOnly Cookie**（`access_token`） | 瀏覽器自動帶入，JS 無法讀取 |

**OAuth2 登入流程：**

1. 使用者點擊「Google / GitHub 登入」→ 前端導向 `/oauth2/authorization/{provider}`（由 Vite Proxy 轉發後端）
2. Spring Security 完成 OAuth2 認證後呼叫 `OAuth2SuccessHandler`
3. 後端產生 JWT，以 `Set-Cookie: access_token=...; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` 寫入 Response，**不將 token 放在 URL**
4. Redirect 至前端 `/oauth2/callback?displayName=...&email=...`（URL 僅帶顯示用資訊）
5. `OAuthCallback.jsx` 呼叫 `/api/auth/me` 確認身份，恢復 Zustand 登入狀態

**`JwtAuthFilter` 驗證順序：**
1. 優先讀取 `Authorization: Bearer` header（帳密登入）
2. fallback：讀取 `access_token` HttpOnly Cookie（OAuth2 登入）

**登出：** 同時清除 `localStorage` 與後端 Cookie（`POST /api/auth/logout` 回傳 `Max-Age=0` 使 Cookie 失效）

> 正式環境部署時，Cookie 的 `secure` 屬性應改為 `true`（HTTPS only），目前開發環境設為 `false`。

---

## 專案結構

```
J-Financial-Workspace/
├── backend-api/          # Spring Boot 後端
│   └── src/main/java/com/jackshiao/financial/
│       ├── controller/   # REST API 端點
│       ├── service/      # 業務邏輯
│       ├── repository/   # Spring Data JPA
│       ├── entity/       # JPA 實體
│       ├── dto/          # 資料傳輸物件
│       ├── config/       # Security / CORS 設定
│       ├── oauth2/       # OAuth2 Principal 介面與實作（Google OIDC / GitHub）
│       ├── runner/       # 啟動時資料補齊（MarketDataSeeder）
│       ├── util/         # 工具類別（EcpayUtil 等）
│       └── common/       # 統一回應格式、全域例外處理
├── frontend-ui/          # React 前端
│   └── src/
│       ├── api/          # Axios API 模組
│       ├── assets/       # 靜態資源（圖片等）
│       ├── components/   # 共用元件
│       │   ├── auth/     # AuthModals（登入 / 註冊）、OAuthCallback
│       │   ├── home/     # Banner、MarketOverview、NewsSection
│       │   └── layout/   # Navbar、Footer、Toast
│       ├── pages/        # 頁面元件
│       ├── store/        # Zustand 狀態管理（authStore、toastStore）
│       └── test/         # Vitest 單元測試（Navbar、Market）
├── docker/
│   └── mysql/init/       # MySQL Schema 初始化 SQL
├── .ecpay-skill/         # ECPay API 技能文件（綠界金流整合參考）
├── .vscode/              # VS Code 工作區設定與延伸套件建議
├── legacy_reference/     # 舊版靜態 HTML 原型與開發筆記（僅供參考）
├── docker-compose.yml    # MySQL 容器定義
└── README.md
```

---

## API 回應格式

所有 API 均回傳統一結構：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

---

## 排程任務

後端每 30 分鐘自動更新以下資料：

| 資料 | 來源 |
|------|------|
| 台股加權指數（TWII） | Fugle API（即時）/ TWSE Open API（歷史補齊） |
| 美股指數（SPX / IXIC / DJI） | FRED API |
| 日股指數（N225） | FRED API |
| 歐洲股指（Euro Stoxx 50） | Yahoo Finance |
| 美國公債殖利率（2Y / 10Y / 20Y） | FRED API |
| 日本公債殖利率（10Y） | FRED API |
| 匯率（USD/TWD、JPY/TWD、CNY/TWD） | Frankfurter API |
