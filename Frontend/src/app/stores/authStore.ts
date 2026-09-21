import { create } from "zustand";
import { authApi, setAccessToken, getAccessToken } from "../api/client";
import type { User } from "../types/api";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    try {
      set({ error: null, isLoading: true });
      const data = await authApi.login(email, password);
      setAccessToken(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    try {
      set({ error: null, isLoading: true });
      const data = await authApi.register(email, password, name);
      setAccessToken(data.accessToken);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    authApi.logout().catch(() => {});
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = getAccessToken();

    if (token && !isTokenExpired(token)) {
      try {
        const user = await authApi.me();
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      } catch {}
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        const user = await authApi.me();
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      }
    } catch {}

    setAccessToken(null);
    set({ isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
