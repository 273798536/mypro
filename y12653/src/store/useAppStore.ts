import { create } from 'zustand';
import type { ReactorPart, RiskNote, FinalConclusion } from '../types';
import { loadLS, saveLS } from '../utils/storage';

interface AppState {
  isFirstRun: boolean;
  toasts: { id: string; type: 'info' | 'success' | 'warning' | 'error'; msg: string }[];
}

interface AppActions {
  bootstrapIfFirstRun: (
    parts: ReactorPart[],
    notes: RiskNote[],
    conclusions: FinalConclusion[]
  ) => void;
  pushToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
}

const initialState = loadLS<{ isFirstRun: boolean; toasts: AppState['toasts'] }>('app_state', {
  isFirstRun: true,
  toasts: [],
});

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  isFirstRun: initialState.isFirstRun,
  toasts: initialState.toasts,
  bootstrapIfFirstRun: (parts, notes, conclusions) => {
    if (!get().isFirstRun) return;
    saveLS('parts', parts);
    saveLS('risk_notes', notes);
    saveLS('conclusions', conclusions);
    const next = { isFirstRun: false, toasts: get().toasts };
    saveLS('app_state', next);
    set(next);
  },
  pushToast: (msg, type = 'info') => {
    const id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const next = {
      isFirstRun: get().isFirstRun,
      toasts: [...get().toasts, { id, type, msg }],
    };
    saveLS('app_state', next);
    set(next);
    setTimeout(() => {
      get().dismissToast(id);
    }, 3000);
  },
  dismissToast: (id) => {
    const next = {
      isFirstRun: get().isFirstRun,
      toasts: get().toasts.filter((t) => t.id !== id),
    };
    saveLS('app_state', next);
    set(next);
  },
}));
