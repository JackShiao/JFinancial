import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'

const axiosClient = axios.create({
  // 透過 Vite proxy 轉發到 http://localhost:8080
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // 允許跨域請求時攜帶 Cookie（OAuth2 HttpOnly Cookie 需要此設定）
  withCredentials: true,
})

axiosClient.interceptors.request.use(
  (config) => {
    // TODO: JWT 串接後可改由 Zustand/Context 或 localStorage 取 token
    const token = localStorage.getItem('access_token')

    if (token) {
      config.headers.Authorization = 'Bearer ' + token
    }

    return config
  },
  (error) => Promise.reject(error)
)

axiosClient.interceptors.response.use(
  (response) => {
    // 對齊後端統一格式: { code, message, data }
    const payload = response?.data

    if (payload && typeof payload.code !== 'undefined' && payload.code !== 200) {
      return Promise.reject({
        code: payload.code,
        message: payload.message || 'API business error',
        data: payload.data,
      })
    }

    return response
  },
  (error) => {
    const status = error?.response?.status

    // 登入/註冊本身若 401 代表帳密錯誤，由元件自行處理，不觸發過期提示
    const AUTH_PATHS = ['/auth/login', '/auth/register']
    const requestUrl = error?.config?.url ?? ''
    const isAuthEndpoint = AUTH_PATHS.some((p) => requestUrl.includes(p))

    if (status === 401 && !isAuthEndpoint) {
      useAuthStore.getState().logout(true)
      useToastStore.getState().addToast('登入已過期，請重新登入', 'warning')
    }

    return Promise.reject({
      status,
      code: error?.response?.data?.code,
      message: error?.response?.data?.message || error.message || 'Network Error',
      data: error?.response?.data,
    })
  }
)

export default axiosClient
