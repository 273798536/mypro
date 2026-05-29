import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LicensePlate,
  MonthlyCard,
  TempParkingRecord,
  Discount,
  RenewalRecord,
  BadRow,
  ImportSession,
  ExportRecord,
} from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { generateId, generateTraceCode } from '@/utils/format';

interface DataState {
  licensePlates: LicensePlate[];
  monthlyCards: MonthlyCard[];
  tempParkingRecords: TempParkingRecord[];
  discounts: Discount[];
  renewalRecords: RenewalRecord[];
  badRows: BadRow[];
  importSessions: ImportSession[];
  exportRecords: ExportRecord[];
  isLoading: boolean;
  
  setLicensePlates: (plates: LicensePlate[]) => void;
  addLicensePlate: (plate: Omit<LicensePlate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLicensePlate: (id: string, updates: Partial<LicensePlate>) => void;
  
  setMonthlyCards: (cards: MonthlyCard[]) => void;
  addMonthlyCard: (card: Omit<MonthlyCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMonthlyCard: (id: string, updates: Partial<MonthlyCard>) => void;
  
  setTempParkingRecords: (records: TempParkingRecord[]) => void;
  addTempParkingRecord: (record: Omit<TempParkingRecord, 'id' | 'createdAt'>) => void;
  markTempParkingAsDeducted: (ids: string[]) => void;
  
  setDiscounts: (discounts: Discount[]) => void;
  addDiscount: (discount: Omit<Discount, 'id' | 'createdAt'>) => void;
  updateDiscount: (id: string, updates: Partial<Discount>) => void;
  
  setRenewalRecords: (records: RenewalRecord[]) => void;
  addRenewalRecord: (record: Omit<RenewalRecord, 'id' | 'createdAt' | 'traceCode'>) => void;
  updateRenewalRecord: (id: string, updates: Partial<RenewalRecord>) => void;
  batchUpdateRenewalStatus: (ids: string[], status: RenewalRecord['status']) => void;
  batchUpdateReviewStatus: (ids: string[], reviewStatus: RenewalRecord['reviewStatus']) => void;
  deleteRenewalRecord: (id: string) => void;
  
  addBadRow: (badRow: Omit<BadRow, 'id' | 'createdAt'>) => void;
  setBadRows: (badRows: BadRow[]) => void;
  clearBadRows: (sessionId?: string) => void;
  
  addImportSession: (session: Omit<ImportSession, 'id' | 'createdAt'>) => void;
  updateImportSession: (id: string, updates: Partial<ImportSession>) => void;
  
  addExportRecord: (record: Omit<ExportRecord, 'id' | 'createdAt'>) => void;
  
  clearAllData: () => void;
  setLoading: (loading: boolean) => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      licensePlates: [],
      monthlyCards: [],
      tempParkingRecords: [],
      discounts: [],
      renewalRecords: [],
      badRows: [],
      importSessions: [],
      exportRecords: [],
      isLoading: false,

      setLicensePlates: (plates) => set({ licensePlates: plates }),
      addLicensePlate: (plate) =>
        set((state) => ({
          licensePlates: [
            ...state.licensePlates,
            {
              ...plate,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),
      updateLicensePlate: (id, updates) =>
        set((state) => ({
          licensePlates: state.licensePlates.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      setMonthlyCards: (cards) => set({ monthlyCards: cards }),
      addMonthlyCard: (card) =>
        set((state) => ({
          monthlyCards: [
            ...state.monthlyCards,
            {
              ...card,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),
      updateMonthlyCard: (id, updates) =>
        set((state) => ({
          monthlyCards: state.monthlyCards.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),

      setTempParkingRecords: (records) => set({ tempParkingRecords: records }),
      addTempParkingRecord: (record) =>
        set((state) => ({
          tempParkingRecords: [
            ...state.tempParkingRecords,
            {
              ...record,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      markTempParkingAsDeducted: (ids) =>
        set((state) => ({
          tempParkingRecords: state.tempParkingRecords.map((r) =>
            ids.includes(r.id) ? { ...r, isDeducted: true } : r
          ),
        })),

      setDiscounts: (discounts) => set({ discounts }),
      addDiscount: (discount) =>
        set((state) => ({
          discounts: [
            ...state.discounts,
            {
              ...discount,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateDiscount: (id, updates) =>
        set((state) => ({
          discounts: state.discounts.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      setRenewalRecords: (records) => set({ renewalRecords: records }),
      addRenewalRecord: (record) =>
        set((state) => ({
          renewalRecords: [
            ...state.renewalRecords,
            {
              ...record,
              id: generateId(),
              createdAt: new Date().toISOString(),
              traceCode: generateTraceCode(),
            },
          ],
        })),
      updateRenewalRecord: (id, updates) =>
        set((state) => ({
          renewalRecords: state.renewalRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      batchUpdateRenewalStatus: (ids, status) =>
        set((state) => ({
          renewalRecords: state.renewalRecords.map((r) =>
            ids.includes(r.id) ? { ...r, status } : r
          ),
        })),
      batchUpdateReviewStatus: (ids, reviewStatus) =>
        set((state) => ({
          renewalRecords: state.renewalRecords.map((r) =>
            ids.includes(r.id) ? { ...r, reviewStatus } : r
          ),
        })),
      deleteRenewalRecord: (id) =>
        set((state) => ({
          renewalRecords: state.renewalRecords.filter((r) => r.id !== id),
        })),

      addBadRow: (badRow) =>
        set((state) => ({
          badRows: [
            ...state.badRows,
            {
              ...badRow,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      setBadRows: (badRows) => set({ badRows }),
      clearBadRows: (sessionId) =>
        set((state) => ({
          badRows: sessionId
            ? state.badRows.filter((b) => b.importSessionId !== sessionId)
            : [],
        })),

      addImportSession: (session) =>
        set((state) => ({
          importSessions: [
            ...state.importSessions,
            {
              ...session,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateImportSession: (id, updates) =>
        set((state) => ({
          importSessions: state.importSessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      addExportRecord: (record) =>
        set((state) => ({
          exportRecords: [
            ...state.exportRecords,
            {
              ...record,
              id: generateId(),
              createdAt: new Date().toISOString(),
              traceCode: generateTraceCode(),
            },
          ],
        })),

      clearAllData: () =>
        set({
          licensePlates: [],
          monthlyCards: [],
          tempParkingRecords: [],
          discounts: [],
          renewalRecords: [],
          badRows: [],
          importSessions: [],
          exportRecords: [],
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: STORAGE_KEYS.LICENSE_PLATES,
      partialize: (state) => ({
        licensePlates: state.licensePlates,
        monthlyCards: state.monthlyCards,
        tempParkingRecords: state.tempParkingRecords,
        discounts: state.discounts,
        renewalRecords: state.renewalRecords,
        badRows: state.badRows,
        importSessions: state.importSessions,
        exportRecords: state.exportRecords,
      }),
    }
  )
);
