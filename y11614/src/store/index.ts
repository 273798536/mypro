import { create } from 'zustand';
import { 
  Employee, 
  SalaryItem, 
  SpecialDeduction, 
  BackPay, 
  Resignation, 
  TaxPeriod, 
  SalaryCalculation, 
  Exception, 
  AuditLog,
  ImportFile
} from '../types';
import {
  mockEmployees,
  mockSalaryItems,
  mockSpecialDeductions,
  mockBackPayRecords,
  mockResignations,
  mockTaxPeriods,
  mockSalaryCalculations,
  mockExceptions,
  mockAuditLogs
} from '../data/mockData';

interface AppState {
  employees: Employee[];
  salaryItems: SalaryItem[];
  specialDeductions: SpecialDeduction[];
  backPayRecords: BackPay[];
  resignations: Resignation[];
  taxPeriods: TaxPeriod[];
  salaryCalculations: SalaryCalculation[];
  exceptions: Exception[];
  auditLogs: AuditLog[];
  importFiles: ImportFile[];
  currentTaxPeriodId: string;
  
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  
  setSalaryItems: (items: SalaryItem[]) => void;
  addSalaryItem: (item: SalaryItem) => void;
  updateSalaryItem: (id: string, data: Partial<SalaryItem>) => void;
  
  setSpecialDeductions: (deductions: SpecialDeduction[]) => void;
  addSpecialDeduction: (deduction: SpecialDeduction) => void;
  updateSpecialDeduction: (id: string, data: Partial<SpecialDeduction>) => void;
  lockDeduction: (id: string) => void;
  unlockDeduction: (id: string) => void;
  
  setBackPayRecords: (records: BackPay[]) => void;
  addBackPayRecord: (record: BackPay) => void;
  
  setResignations: (resignations: Resignation[]) => void;
  addResignation: (resignation: Resignation) => void;
  
  setTaxPeriods: (periods: TaxPeriod[]) => void;
  setCurrentTaxPeriod: (id: string) => void;
  lockTaxPeriod: (id: string) => void;
  unlockTaxPeriod: (id: string) => void;
  
  setSalaryCalculations: (calculations: SalaryCalculation[]) => void;
  addSalaryCalculation: (calculation: SalaryCalculation) => void;
  updateSalaryCalculation: (id: string, data: Partial<SalaryCalculation>) => void;
  
  setExceptions: (exceptions: Exception[]) => void;
  resolveException: (id: string, resolvedBy: string) => void;
  ignoreException: (id: string) => void;
  
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  
  addImportFile: (file: ImportFile) => void;
  updateImportFile: (id: string, data: Partial<ImportFile>) => void;
  removeImportFile: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  employees: mockEmployees,
  salaryItems: mockSalaryItems,
  specialDeductions: mockSpecialDeductions,
  backPayRecords: mockBackPayRecords,
  resignations: mockResignations,
  taxPeriods: mockTaxPeriods,
  salaryCalculations: mockSalaryCalculations,
  exceptions: mockExceptions,
  auditLogs: mockAuditLogs,
  importFiles: [],
  currentTaxPeriodId: 'period-202605',
  
  setEmployees: (employees) => set({ employees }),
  addEmployee: (employee) => set((state) => ({ 
    employees: [...state.employees, employee] 
  })),
  updateEmployee: (id, data) => set((state) => ({
    employees: state.employees.map(e => 
      e.id === id ? { ...e, ...data } : e
    )
  })),
  
  setSalaryItems: (salaryItems) => set({ salaryItems }),
  addSalaryItem: (item) => set((state) => ({
    salaryItems: [...state.salaryItems, item]
  })),
  updateSalaryItem: (id, data) => set((state) => ({
    salaryItems: state.salaryItems.map(item =>
      item.id === id ? { ...item, ...data } : item
    )
  })),
  
  setSpecialDeductions: (specialDeductions) => set({ specialDeductions }),
  addSpecialDeduction: (deduction) => set((state) => ({
    specialDeductions: [...state.specialDeductions, deduction]
  })),
  updateSpecialDeduction: (id, data) => set((state) => ({
    specialDeductions: state.specialDeductions.map(d =>
      d.id === id ? { ...d, ...data } : d
    )
  })),
  lockDeduction: (id) => set((state) => ({
    specialDeductions: state.specialDeductions.map(d =>
      d.id === id ? { ...d, isLocked: true } : d
    )
  })),
  unlockDeduction: (id) => set((state) => ({
    specialDeductions: state.specialDeductions.map(d =>
      d.id === id ? { ...d, isLocked: false } : d
    )
  })),
  
  setBackPayRecords: (backPayRecords) => set({ backPayRecords }),
  addBackPayRecord: (record) => set((state) => ({
    backPayRecords: [...state.backPayRecords, record]
  })),
  
  setResignations: (resignations) => set({ resignations }),
  addResignation: (resignation) => set((state) => ({
    resignations: [...state.resignations, resignation]
  })),
  
  setTaxPeriods: (taxPeriods) => set({ taxPeriods }),
  setCurrentTaxPeriod: (id) => set({ currentTaxPeriodId: id }),
  lockTaxPeriod: (id) => set((state) => ({
    taxPeriods: state.taxPeriods.map(p =>
      p.id === id ? { ...p, isLocked: true, status: 'locked' } : p
    )
  })),
  unlockTaxPeriod: (id) => set((state) => ({
    taxPeriods: state.taxPeriods.map(p =>
      p.id === id ? { ...p, isLocked: false, status: 'in_progress' } : p
    )
  })),
  
  setSalaryCalculations: (salaryCalculations) => set({ salaryCalculations }),
  addSalaryCalculation: (calculation) => set((state) => ({
    salaryCalculations: [...state.salaryCalculations, calculation]
  })),
  updateSalaryCalculation: (id, data) => set((state) => ({
    salaryCalculations: state.salaryCalculations.map(c =>
      c.id === id ? { ...c, ...data } : c
    )
  })),
  
  setExceptions: (exceptions) => set({ exceptions }),
  resolveException: (id, resolvedBy) => set((state) => ({
    exceptions: state.exceptions.map(e =>
      e.id === id ? { 
        ...e, 
        status: 'resolved', 
        resolvedAt: new Date().toISOString(),
        resolvedBy 
      } : e
    )
  })),
  ignoreException: (id) => set((state) => ({
    exceptions: state.exceptions.map(e =>
      e.id === id ? { ...e, status: 'ignored' } : e
    )
  })),
  
  addAuditLog: (log) => set((state) => ({
    auditLogs: [{
      ...log,
      id: `log-${Date.now()}`
    }, ...state.auditLogs]
  })),
  
  addImportFile: (file) => set((state) => ({
    importFiles: [...state.importFiles, file]
  })),
  updateImportFile: (id, data) => set((state) => ({
    importFiles: state.importFiles.map(f =>
      f.id === id ? { ...f, ...data } : f
    )
  })),
  removeImportFile: (id) => set((state) => ({
    importFiles: state.importFiles.filter(f => f.id !== id)
  }))
}));
