import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../../../shared/types';

export type Dimension = 'sample' | 'version' | 'correction' | 'group';

interface AppState {
  user: User | null;
  token: string | null;
  currentRoute: string;
  activeDimension: Dimension;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setRoute: (route: string) => void;
  setDimension: (dimension: Dimension) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      currentRoute: '/dashboard',
      activeDimension: 'sample',
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
      setRoute: (route) => set({ currentRoute: route }),
      setDimension: (dimension) => set({ activeDimension: dimension }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
);
