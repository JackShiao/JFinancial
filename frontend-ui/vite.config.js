import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // OAuth2 redirect 無法走 axios，需透過 proxy 轉發瀏覽器直接跳轉
      // OAuth2 登入觸發端點：/oauth2/authorization/google、/oauth2/authorization/github
      // ⚠️ 只代理 /oauth2/authorization，不可用 /oauth2（會把 /oauth2/callback 也攔截送到後端）
      '/oauth2/authorization': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
