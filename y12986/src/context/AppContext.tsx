import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import type { ReplayTask, ExceptionRecord, FilterState } from '@/types';

interface AppState {
  tasks: ReplayTask[];
  exceptions: ExceptionRecord[];
  selectedTaskId: string | null;
  filters: FilterState;
  loading: boolean;
}

type Action =
  | { type: 'SET_TASKS'; payload: ReplayTask[] }
  | { type: 'SET_EXCEPTIONS'; payload: ExceptionRecord[] }
  | { type: 'SET_SELECTED_TASK'; payload: string | null }
  | { type: 'UPDATE_FILTERS'; payload: Partial<FilterState> }
  | { type: 'RESET_FILTERS' }
  | { type: 'UPDATE_EXCEPTION_STATUS'; payload: { id: string; status: ExceptionRecord['status'] } }
  | { type: 'SET_LOADING'; payload: boolean };

const defaultFilters: FilterState = {
  exceptionTypes: [],
  severities: [],
  statuses: [],
  searchKeyword: '',
};

const initialState: AppState = {
  tasks: [],
  exceptions: [],
  selectedTaskId: null,
  filters: defaultFilters,
  loading: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_EXCEPTIONS':
      return { ...state, exceptions: action.payload };
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTaskId: action.payload };
    case 'UPDATE_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: defaultFilters };
    case 'UPDATE_EXCEPTION_STATUS':
      return {
        ...state,
        exceptions: state.exceptions.map((e) =>
          e.id === action.payload.id ? { ...e, status: action.payload.status } : e
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  setSelectedTaskId: (id: string | null) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleExceptionStatus: (id: string, status: ExceptionRecord['status']) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setSelectedTaskId = (id: string | null) => dispatch({ type: 'SET_SELECTED_TASK', payload: id });
  const setFilters = (f: Partial<FilterState>) => dispatch({ type: 'UPDATE_FILTERS', payload: f });
  const resetFilters = () => dispatch({ type: 'RESET_FILTERS' });
  const toggleExceptionStatus = (id: string, status: ExceptionRecord['status']) =>
    dispatch({ type: 'UPDATE_EXCEPTION_STATUS', payload: { id, status } });

  return (
    <AppContext.Provider
      value={{ state, dispatch, setSelectedTaskId, setFilters, resetFilters, toggleExceptionStatus }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
