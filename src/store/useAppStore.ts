import { create } from 'zustand';

interface User {
  uid: string;
  email: string | null;
  role: 'admin' | 'staff' | 'customer';
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isInitialLoad: boolean;
  setInitialLoad: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  isInitialLoad: true,
  setInitialLoad: (val) => set({ isInitialLoad: val }),
}));
