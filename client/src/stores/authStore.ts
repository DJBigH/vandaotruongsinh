import { create } from 'zustand';
import * as authApi from '../api/auth';
import type { UserInfo } from '../api/auth';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login({ username, password });
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ error: res.error || 'Đăng nhập thất bại', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Đăng nhập thất bại', isLoading: false });
      return false;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register({ username, email, password });
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true, isLoading: false });
        return true;
      }
      set({ error: res.error || 'Đăng ký thất bại', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Đăng ký thất bại', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
