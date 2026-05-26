import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { AppState, AppAction, Customer, User } from '../types';
import { getAllSampleData } from '../data/sampleData';
import { calculateLoanStatus } from '../utils/statusMachine';
import { detectAnomalies } from '../utils/anomalyDetector';

const STORAGE_KEY = 'micro_loan_app_state';

const defaultUsers: User[] = [
  { id: 'user_001', username: 'manager', role: 'manager', displayName: '张经理' },
  { id: 'user_002', username: 'executive', role: 'executive', displayName: '李总' }
];

const initialState: AppState = {
  currentUser: null,
  customers: [],
  repayments: [],
  guarantees: [],
  approvals: [],
  reminders: [],
  auditLogs: [],
  selectedCustomerId: null,
  filters: {
    status: 'all',
    search: '',
    sortBy: 'expiryDate',
    sortOrder: 'asc'
  }
};

function processCustomerAnomalies(customer: Customer, state: AppState): Customer {
  const customerGuarantees = state.guarantees.filter(g => g.customerId === customer.id);
  const customerRepayments = state.repayments.filter(r => r.customerId === customer.id);
  const customerApprovals = state.approvals.filter(a => a.customerId === customer.id);
  
  const newStatus = calculateLoanStatus(customer, customerGuarantees, customerRepayments, customerApprovals);
  const newAnomalies = detectAnomalies(customer, customerGuarantees, customerRepayments, customerApprovals);
  
  return {
    ...customer,
    status: newStatus,
    anomalies: newAnomalies,
    updatedAt: new Date().toISOString()
  };
}

function processAllCustomers(state: AppState): AppState {
  return {
    ...state,
    customers: state.customers.map(c => processCustomerAnomalies(c, state))
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_CUSTOMERS': {
      const newState = { ...state, customers: action.payload };
      return processAllCustomers(newState);
    }
    
    case 'ADD_CUSTOMER': {
      const newState = { ...state, customers: [...state.customers, action.payload] };
      return processAllCustomers(newState);
    }
    
    case 'UPDATE_CUSTOMER': {
      const newState = {
        ...state,
        customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c)
      };
      return processAllCustomers(newState);
    }
    
    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter(c => c.id !== action.payload),
        repayments: state.repayments.filter(r => r.customerId !== action.payload),
        guarantees: state.guarantees.filter(g => g.customerId !== action.payload),
        approvals: state.approvals.filter(a => a.customerId !== action.payload),
        reminders: state.reminders.filter(r => r.customerId !== action.payload),
        auditLogs: state.auditLogs.filter(l => l.customerId !== action.payload)
      };
    
    case 'SET_REPAYMENTS': {
      const newState = { ...state, repayments: action.payload };
      return processAllCustomers(newState);
    }
    
    case 'ADD_REPAYMENT': {
      const newState = { ...state, repayments: [...state.repayments, action.payload] };
      return processAllCustomers(newState);
    }
    
    case 'SET_GUARANTEES': {
      const newState = { ...state, guarantees: action.payload };
      return processAllCustomers(newState);
    }
    
    case 'ADD_GUARANTEE': {
      const newState = { ...state, guarantees: [...state.guarantees, action.payload] };
      return processAllCustomers(newState);
    }
    
    case 'SET_APPROVALS': {
      const newState = { ...state, approvals: action.payload };
      return processAllCustomers(newState);
    }
    
    case 'ADD_APPROVAL': {
      const newState = { ...state, approvals: [...state.approvals, action.payload] };
      return processAllCustomers(newState);
    }
    
    case 'SET_REMINDERS':
      return { ...state, reminders: action.payload };
    
    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.payload] };
    
    case 'SET_AUDIT_LOGS':
      return { ...state, auditLogs: action.payload };
    
    case 'ADD_AUDIT_LOG':
      return { ...state, auditLogs: [...state.auditLogs, action.payload] };
    
    case 'SET_SELECTED_CUSTOMER':
      return { ...state, selectedCustomerId: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    
    case 'LOAD_SAMPLE_DATA': {
      const sampleData = getAllSampleData();
      const newState = {
        ...state,
        ...sampleData
      };
      newState.customers = sampleData.customers.map(c => processCustomerAnomalies(c, newState));
      return newState;
    }
    
    case 'IMPORT_MULTI_SOURCE': {
      const newState = {
        ...state,
        customers: [...state.customers, ...action.payload.customers],
        repayments: [...state.repayments, ...action.payload.repayments],
        guarantees: [...state.guarantees, ...action.payload.guarantees],
        approvals: [...state.approvals, ...action.payload.approvals]
      };
      return processAllCustomers(newState);
    }
    
    case 'CLEAR_ALL_DATA':
      return { ...initialState, currentUser: state.currentUser };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  login: (username: string, role?: 'manager' | 'executive') => boolean;
  logout: () => void;
  isManager: () => boolean;
  isExecutive: () => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, (initial) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load state from localStorage:', e);
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [state]);

  const login = (username: string, role?: 'manager' | 'executive'): boolean => {
    let user = defaultUsers.find(u => u.username === username);
    
    if (!user && role) {
      user = {
        id: `user_${Date.now()}`,
        username,
        role,
        displayName: role === 'manager' ? `${username}经理` : `${username}总`
      };
    }
    
    if (!user) return false;
    
    dispatch({ type: 'SET_USER', payload: user });
    return true;
  };

  const logout = () => {
    dispatch({ type: 'SET_USER', payload: null });
  };

  const isManager = () => state.currentUser?.role === 'manager';
  const isExecutive = () => state.currentUser?.role === 'executive';

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout, isManager, isExecutive }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
