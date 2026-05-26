import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { AppState, AppAction, Customer } from '../types';
import { getAllSampleData } from '../data/sampleData';
import { calculateLoanStatus } from '../utils/statusMachine';
import { detectAnomalies } from '../utils/anomalyDetector';

const STORAGE_KEY = 'micro_loan_app_state';

const initialState: AppState = {
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

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CUSTOMERS': {
      const processedCustomers = action.payload.map(c => processCustomerAnomalies(c, state));
      return { ...state, customers: processedCustomers };
    }
    
    case 'ADD_CUSTOMER': {
      const processed = processCustomerAnomalies(action.payload, state);
      return { ...state, customers: [...state.customers, processed] };
    }
    
    case 'UPDATE_CUSTOMER': {
      const processed = processCustomerAnomalies(action.payload, state);
      return {
        ...state,
        customers: state.customers.map(c => c.id === action.payload.id ? processed : c)
      };
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
      newState.customers = state.customers.map(c => processCustomerAnomalies(c, newState));
      return newState;
    }
    
    case 'SET_GUARANTEES': {
      const newState = { ...state, guarantees: action.payload };
      newState.customers = state.customers.map(c => processCustomerAnomalies(c, newState));
      return newState;
    }
    
    case 'SET_APPROVALS': {
      const newState = { ...state, approvals: action.payload };
      newState.customers = state.customers.map(c => processCustomerAnomalies(c, newState));
      return newState;
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
    
    case 'CLEAR_ALL_DATA':
      return { ...initialState };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
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

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
