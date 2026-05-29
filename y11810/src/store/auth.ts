import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setOperatorInfo } from '../api/client';

interface AuthState {
  operatorId: string;
  operatorName: string;
  isLoggedIn: boolean;
  login: (operatorId: string, operatorName: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      operatorId: '',
      operatorName: '',
      isLoggedIn: false,
      login: (operatorId, operatorName) => {
        setOperatorInfo({ operatorId, operatorName });
        set({ operatorId, operatorName, isLoggedIn: true });
      },
      logout: () => {
        setOperatorInfo(null);
        set({ operatorId: '', operatorName: '', isLoggedIn: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        operatorId: state.operatorId,
        operatorName: state.operatorName,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.isLoggedIn && state.operatorId && state.operatorName) {
          setOperatorInfo({
            operatorId: state.operatorId,
            operatorName: state.operatorName,
          });
        }
      },
    }
  )
);
