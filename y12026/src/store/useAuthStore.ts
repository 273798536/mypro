import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const mockUsers: User[] = [
  {
    id: '1',
    username: 'finance',
    name: '财务管理员',
    role: 'finance',
    phone: '13800138001',
  },
  {
    id: '2',
    username: 'admin',
    name: '系统管理员',
    role: 'admin',
    phone: '13800138002',
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (username: string, password: string) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        const user = mockUsers.find((u) => u.username === username);
        
        if (user && password === '123456') {
          set({ user, isAuthenticated: true });
          return true;
        }
        
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: STORAGE_KEYS.AUTH,
    }
  )
);
