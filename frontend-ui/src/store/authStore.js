import { create } from 'zustand';
import { useToastStore } from './toastStore';

const TOKEN_KEY = 'access_token';

export const useAuthStore = create((set) => ({
  isModalOpen: false,
  modalType: 'login',
  isLoggedIn: false,
  userInfo: null,
  isPremium: false,

  openModal: (type) =>
    set({
      isModalOpen: true,
      modalType: type,
    }),

  closeModal: () =>
    set({
      isModalOpen: false,
    }),

  loginSuccess: (userData, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({
      isLoggedIn: true,
      userInfo: userData,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      isLoggedIn: false,
      userInfo: null,
      isPremium: false,
    });
    useToastStore.getState().addToast('已成功登出', 'info', 3000);
  },

  // 修改顯示名稱後同步更新 store，讓 Navbar 即時反映新名稱
  updateDisplayName: (newDisplayName) => {
    set((state) => ({
      userInfo: state.userInfo ? { ...state.userInfo, displayName: newDisplayName } : state.userInfo,
    }));
  },

  // 付款成功後同步 Premium 狀態（不需重新登入）
  setIsPremium: (value) => set({ isPremium: value }),

  // 頁面重整後從 localStorage 恢復登入狀態
  initAuth: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    // 簡單解析 JWT payload（不驗簽，只取資料）
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
        )
      );
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
        localStorage.removeItem(TOKEN_KEY);
        return;
      }
      set({
        isLoggedIn: true,
        userInfo: {
          email: payload.sub,
          displayName: payload.displayName ?? payload.sub,
        },
        isPremium: Array.isArray(payload.roles) && payload.roles.includes('ROLE_PREMIUM'),
      });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
}));
