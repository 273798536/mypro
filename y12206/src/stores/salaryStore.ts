import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SalaryRecord } from "@/types";
import { useChangeLogStore } from "./employeeStore";

interface SalaryState {
  salaryRecords: SalaryRecord[];
  setSalaryRecords: (records: SalaryRecord[]) => void;
  addSalaryRecord: (record: Omit<SalaryRecord, "id" | "createdAt" | "updatedAt">) => void;
  updateSalaryRecord: (id: string, updates: Partial<SalaryRecord>) => void;
  deleteSalaryRecord: (id: string) => void;
  getRecordsByMonth: (month: string) => SalaryRecord[];
  getRecordsByEmployee: (employeeId: string) => SalaryRecord[];
  getRecordsByEmployeeAndMonth: (employeeId: string, month: string) => SalaryRecord | undefined;
  getAvailableMonths: () => string[];
}

const initialSalaryRecords: SalaryRecord[] = [
  { id: "s1", employeeId: "1", month: "2024-10", baseSalary: 15000, bonus: 3000, totalSalary: 18000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s2", employeeId: "2", month: "2024-10", baseSalary: 18000, bonus: 2000, totalSalary: 20000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s3", employeeId: "3", month: "2024-10", baseSalary: 20000, bonus: 4000, totalSalary: 24000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s4", employeeId: "4", month: "2024-10", baseSalary: 12000, bonus: 1000, totalSalary: 13000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s5", employeeId: "6", month: "2024-10", baseSalary: 25000, bonus: 5000, totalSalary: 30000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s6", employeeId: "7", month: "2024-10", baseSalary: 14000, bonus: 2000, totalSalary: 16000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s7", employeeId: "8", month: "2024-10", baseSalary: 13000, bonus: 1500, totalSalary: 14500, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s8", employeeId: "9", month: "2024-10", baseSalary: 16000, bonus: 2500, totalSalary: 18500, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s9", employeeId: "10", month: "2024-10", baseSalary: 11000, bonus: 1000, totalSalary: 12000, isBackpay: false, createdAt: "2024-11-01T00:00:00Z", updatedAt: "2024-11-01T00:00:00Z" },
  { id: "s10", employeeId: "1", month: "2024-11", baseSalary: 15000, bonus: 3500, totalSalary: 18500, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s11", employeeId: "2", month: "2024-11", baseSalary: 18000, bonus: 2500, totalSalary: 20500, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s12", employeeId: "3", month: "2024-11", baseSalary: 20000, bonus: 4500, totalSalary: 24500, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s13", employeeId: "4", month: "2024-11", baseSalary: 12000, bonus: 0, totalSalary: 12000, isBackpay: true, backpayMonths: ["2024-11"], createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-05T00:00:00Z" },
  { id: "s14", employeeId: "6", month: "2024-11", baseSalary: 25000, bonus: 5500, totalSalary: 30500, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s15", employeeId: "7", month: "2024-11", baseSalary: 14000, bonus: 2000, totalSalary: 16000, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s16", employeeId: "8", month: "2024-11", baseSalary: 13000, bonus: 1500, totalSalary: 14500, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s17", employeeId: "9", month: "2024-11", baseSalary: 16000, bonus: 2500, totalSalary: 18500, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s18", employeeId: "10", month: "2024-11", baseSalary: 11000, bonus: 1200, totalSalary: 12200, isBackpay: false, createdAt: "2024-12-01T00:00:00Z", updatedAt: "2024-12-01T00:00:00Z" },
  { id: "s19", employeeId: "1", month: "2024-12", baseSalary: 15000, bonus: 4000, totalSalary: 19000, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s20", employeeId: "2", month: "2024-12", baseSalary: 18000, bonus: 3000, totalSalary: 21000, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s21", employeeId: "3", month: "2024-12", baseSalary: 20000, bonus: 5000, totalSalary: 25000, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s22", employeeId: "6", month: "2024-12", baseSalary: 25000, bonus: 6000, totalSalary: 31000, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s23", employeeId: "7", month: "2024-12", baseSalary: 14000, bonus: 2500, totalSalary: 16500, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s24", employeeId: "8", month: "2024-12", baseSalary: 13000, bonus: 2000, totalSalary: 15000, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s25", employeeId: "9", month: "2024-12", baseSalary: 16000, bonus: 3000, totalSalary: 19000, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
  { id: "s26", employeeId: "10", month: "2024-12", baseSalary: 11000, bonus: 1500, totalSalary: 12500, isBackpay: false, createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" },
];

export const useSalaryStore = create<SalaryState>()(
  persist(
    (set, get) => ({
      salaryRecords: initialSalaryRecords,
      setSalaryRecords: (records) => set({ salaryRecords: records }),
      addSalaryRecord: (record) => {
        const now = new Date().toISOString();
        const newRecord: SalaryRecord = {
          ...record,
          id: "s" + Date.now().toString(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ salaryRecords: [...state.salaryRecords, newRecord] }));
      },
      updateSalaryRecord: (id, updates) => {
        const oldRecord = get().salaryRecords.find((r) => r.id === id);
        if (!oldRecord) return;

        const now = new Date().toISOString();
        set((state) => ({
          salaryRecords: state.salaryRecords.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: now } : r
          ),
        }));

        Object.entries(updates).forEach(([field, newValue]) => {
          const oldValue = oldRecord[field as keyof SalaryRecord];
          if (oldValue !== newValue) {
            useChangeLogStore.getState().addChangeLog({
              entityType: "salary",
              entityId: id,
              field,
              oldValue: String(oldValue || ""),
              newValue: String(newValue || ""),
              operator: "当前用户",
            });
          }
        });
      },
      deleteSalaryRecord: (id) =>
        set((state) => ({
          salaryRecords: state.salaryRecords.filter((r) => r.id !== id),
        })),
      getRecordsByMonth: (month) =>
        get().salaryRecords.filter((r) => r.month === month),
      getRecordsByEmployee: (employeeId) =>
        get().salaryRecords.filter((r) => r.employeeId === employeeId),
      getRecordsByEmployeeAndMonth: (employeeId, month) =>
        get().salaryRecords.find(
          (r) => r.employeeId === employeeId && r.month === month
        ),
      getAvailableMonths: () => {
        const months = new Set(get().salaryRecords.map((r) => r.month));
        return Array.from(months).sort().reverse();
      },
    }),
    { name: "salary-store" }
  )
);
