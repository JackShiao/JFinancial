# =====================================================
# Stage 1 — BUILD
# 使用 Node.js 20 編譯 Vite 前端
# =====================================================
FROM node:20-alpine AS build

WORKDIR /app

# 先複製 package 檔案，讓 npm install 被 Docker layer 快取
# 只要 package-lock.json 沒變，下次 build 跳過重新安裝
COPY package.json package-lock.json ./

# ci 模式：嚴格依照 package-lock.json，確保可重現的 build
RUN npm ci

# 複製程式碼並打包
COPY . .
RUN npm run build
# 產出位於 /app/dist/

# =====================================================
# Stage 2 — RUNTIME
# 使用 Nginx 服務靜態檔案，大小僅 ~25MB
# =====================================================
FROM nginx:1.27-alpine

# 複製自訂 Nginx 設定（含 API proxy 與 React Router fallback）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 從 build stage 複製打包好的靜態資源
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
