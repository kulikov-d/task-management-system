import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  currentView: string;
  modalOpen: string | null;
  toasts: Toast[];

  toggleSidebar: () => void;
  setView: (view: string) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: "success" | "error" | "info";
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentView: "dashboard",
  modalOpen: null,
  toasts: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setView: (view) => set({ currentView: view }),
  openModal: (modal) => set({ modalOpen: modal }),
  closeModal: () => set({ modalOpen: null }),
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
