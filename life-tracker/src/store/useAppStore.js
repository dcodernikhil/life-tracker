import { create } from "zustand";

export const useAppStore = create((set) => ({
  activeTimer: null,
  setActiveTimer: (activeTimer) => set({ activeTimer }),
  clearActiveTimer: () => set({ activeTimer: null }),
}));
