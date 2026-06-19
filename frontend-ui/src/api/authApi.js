import axiosClient from './axiosClient'

// 預期回傳格式為專案統一的 ApiResponse<T>: { code, message, data }
export async function loginAPI(data) {
  const response = await axiosClient.post('/auth/login', data)
  return response.data
}

// 預期回傳格式為專案統一的 ApiResponse<T>: { code, message, data }
export async function registerAPI(data) {
  const response = await axiosClient.post('/auth/register', data)
  return response.data
}