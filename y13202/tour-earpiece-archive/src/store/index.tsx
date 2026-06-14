import { createContext, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { AppState, ImportResult } from '../types';
import { loadState, saveState } from './storage';
import {
  addAnnotation,
  confirmItem,
  deleteItem,
  importItems,
  resetState,
  selectItem,
  updateItemField,
  withdrawItem,
} from './actions';

type Action =
  | { type: 'IMPORT'; payload: ImportResult }
  | { type: 'CONFIRM'; payload: string }
  | { type: 'WITHDRAW'; payload: string }
  | { type: 'ANNOTATE'; payload: { itemId: string; content: string; author?: string; isLateNote?: boolean } }
  | { type: 'UPDATE_FIELD'; payload: { itemId: string; field: keyof AppState['items'][number]; value: unknown } }
  | { type: 'DELETE'; payload: string }
  | { type: 'SELECT'; payload: string | null }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'IMPORT':
      return importItems(state, action.payload);
    case 'CONFIRM':
      return confirmItem(state, action.payload);
    case 'WITHDRAW':
      return withdrawItem(state, action.payload);
    case 'ANNOTATE':
      return addAnnotation(state, action.payload.itemId, action.payload.content, action.payload.author, action.payload.isLateNote);
    case 'UPDATE_FIELD':
      return updateItemField(state, action.payload.itemId, action.payload.field, action.payload.value);
    case 'DELETE':
      return deleteItem(state, action.payload);
    case 'SELECT':
      return selectItem(state, action.payload);
    case 'RESET':
      return resetState();
    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
