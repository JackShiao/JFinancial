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

# 預設後端 URL（本機 Docker Compose 使用）
# Cloud Run 部署時由環境變數 NGINX_BACKEND_URL 覆蓋
ENV NGINX_BACKEND_URL=http://backend:8080

# nginx:alpine 的 entrypoint 會對 /etc/nginx/templates/*.conf.template
# 執行 envsubst，將 ${NGINX_BACKEND_URL} 替換為實際值，
# 並輸出到 /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 從 build stage 複製打包好的靜態資源
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
