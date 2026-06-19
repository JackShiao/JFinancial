import axiosClient from './axiosClient'

// PUT /api/member/profile — 更新顯示名稱
export async function updateDisplayNameAPI(displayName) {
  const response = await axiosClient.put('/member/profile', { displayName })
  return response.data
}

// DELETE /api/member/profile — 刪除帳號
export async function deleteAccountAPI() {
  const response = await axiosClient.delete('/member/profile')
  return response.data
}

// PUT /api/member/password — 修改密碼
export async function changePasswordAPI(currentPassword, newPassword) {
  const response = await axiosClient.put('/member/password', { currentPassword, newPassword })
  return response.data
}
