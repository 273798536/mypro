import { create } from 'zustand';
import {
  CloudBill,
  BillItem,
  ProjectTag,
  LedgerEntry,
  ExceptionRecord,
  AllocationResult,
  ImportFile,
  ExceptionStatus,
} from '../types';
import {
  mockCloudBills,
  mockBillItems,
  mockProjectTags,
  mockLedgerEntries,
  mockExceptions,
  mockAllocationResults,
  mockImportFiles,
} from '../data/mockData';

interface AppState {
  cloudBills: CloudBill[];
  billItems: BillItem[];
  projectTags: ProjectTag[];
  ledgerEntries: LedgerEntry[];
  exceptions: ExceptionRecord[];
  allocationResults: AllocationResult[];
  importFiles: ImportFile[];
  selectedPeriod: string;
  selectedBillId: string | null;
  currentBalance: number;

  setSelectedPeriod: (period: string) => void;
  setSelectedBillId: (billId: string | null) => void;
  updateExceptionStatus: (exceptionId: string, status: ExceptionStatus, note?: string) => void;
  addImportFile: (file: ImportFile) => void;
  updateImportFileStatus: (fileId: string, status: ImportFile['status'], conflictCount?: number) => void;
  allocateItem: (itemId: string, projectId: string, projectName: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  cloudBills: mockCloudBills,
  billItems: mockBillItems,
  projectTags: mockProjectTags,
  ledgerEntries: mockLedgerEntries,
  exceptions: mockExceptions,
  allocationResults: mockAllocationResults,
  importFiles: mockImportFiles,
  selectedPeriod: '2024-05',
  selectedBillId: null,
  currentBalance: 477808.40,

  setSelectedPeriod: (period: string) => set({ selectedPeriod: period }),
  setSelectedBillId: (billId: string | null) => set({ selectedBillId: billId }),

  updateExceptionStatus: (exceptionId: string, status: ExceptionStatus, note?: string) =>
    set((state) => ({
      exceptions: state.exceptions.map((ex) =>
        ex.exceptionId === exceptionId
          ? {
              ...ex,
              status,
              handlerNote: note || ex.handlerNote,
              handledAt: status !== 'pending' ? new Date().toISOString() : ex.handledAt,
              handledBy: status !== 'pending' ? '当前用户' : ex.handledBy,
            }
          : ex
      ),
    })),

  addImportFile: (file: ImportFile) =>
    set((state) => ({
      importFiles: [...state.importFiles, file],
    })),

  updateImportFileStatus: (fileId: string, status: ImportFile['status'], conflictCount?: number) =>
    set((state) => ({
      importFiles: state.importFiles.map((f) =>
        f.fileId === fileId
          ? { ...f, status, conflictCount: conflictCount ?? f.conflictCount }
          : f
      ),
    })),

  allocateItem: (itemId: string, projectId: string, projectName: string) =>
    set((state) => {
      const item = state.billItems.find((i) => i.itemId === itemId);
      if (!item) return state;

      const updatedAllocations = state.allocationResults.map((alloc) => {
        const itemIndex = alloc.items.findIndex((ai) => ai.itemId === itemId);
        if (itemIndex > -1) {
          return {
            ...alloc,
            totalAmount: alloc.totalAmount - item.amount,
            items: alloc.items.filter((ai) => ai.itemId !== itemId),
          };
        }
        return alloc;
      });

      const targetAlloc = updatedAllocations.find((a) => a.projectId === projectId);
      if (targetAlloc) {
        targetAlloc.items.push({
          itemId: item.itemId,
          resourceId: item.resourceId,
          resourceName: item.resourceName,
          amount: item.amount,
          tags: item.tags,
          allocationRule: 'manual',
        });
        targetAlloc.totalAmount += item.amount;
      }

      return { allocationResults: updatedAllocations };
    }),
}));
