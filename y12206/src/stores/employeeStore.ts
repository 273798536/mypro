import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Employee, ChangeLog } from "@/types";

interface EmployeeState {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Omit<Employee, "id" | "createdAt" | "updatedAt">) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  getEmployeeById: (id: string) => Employee | undefined;
}

const initialEmployees: Employee[] = [
  {
    id: "1",
    employeeNo: "EMP001",
    name: "张三",
    department: "技术部",
    status: "active",
    baseInfo: { position: "高级工程师", entryDate: "2021-03-15" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    employeeNo: "EMP002",
    name: "李四",
    department: "财务部",
    status: "active",
    baseInfo: { position: "财务主管", entryDate: "2020-06-20" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    employeeNo: "EMP003",
    name: "王五",
    department: "人力资源部",
    status: "active",
    baseInfo: { position: "HR经理", entryDate: "2019-09-01" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "4",
    employeeNo: "EMP004",
    name: "赵六",
    department: "市场部",
    status: "resigned",
    resignDate: "2024-10-15",
    baseInfo: { position: "市场专员", entryDate: "2022-02-10" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-10-16T00:00:00Z",
  },
  {
    id: "5",
    employeeNo: "EMP005",
    name: "孙七",
    department: "技术部",
    status: "resigned",
    resignDate: "2024-08-31",
    baseInfo: { position: "前端工程师", entryDate: "2021-11-05" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-09-01T00:00:00Z",
  },
  {
    id: "6",
    employeeNo: "EMP006",
    name: "周八",
    department: "运营部",
    status: "active",
    baseInfo: { position: "运营总监", entryDate: "2018-04-12" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "7",
    employeeNo: "EMP007",
    name: "吴九",
    department: "技术部",
    status: "active",
    baseInfo: { position: "后端工程师", entryDate: "2023-01-18" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "8",
    employeeNo: "EMP008",
    name: "郑十",
    department: "财务部",
    status: "active",
    baseInfo: { position: "会计", entryDate: "2022-07-25" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "9",
    employeeNo: "EMP009",
    name: "冯十一",
    department: "市场部",
    status: "active",
    baseInfo: { position: "品牌经理", entryDate: "2021-05-30" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "10",
    employeeNo: "EMP010",
    name: "陈十二",
    department: "人力资源部",
    status: "active",
    baseInfo: { position: "招聘专员", entryDate: "2023-06-14" },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

export const useEmployeeStore = create<EmployeeState>()(
  persist(
    (set, get) => ({
      employees: initialEmployees,
      setEmployees: (employees) => set({ employees }),
      addEmployee: (employee) => {
        const now = new Date().toISOString();
        const newEmployee: Employee = {
          ...employee,
          id: Date.now().toString(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ employees: [...state.employees, newEmployee] }));
      },
      updateEmployee: (id, updates) => {
        const oldEmployee = get().employees.find((e) => e.id === id);
        if (!oldEmployee) return;

        const now = new Date().toISOString();
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: now } : e
          ),
        }));

        Object.entries(updates).forEach(([field, newValue]) => {
          const oldValue = oldEmployee[field as keyof Employee];
          if (oldValue !== newValue) {
            useChangeLogStore.getState().addChangeLog({
              entityType: "employee",
              entityId: id,
              field,
              oldValue: String(oldValue || ""),
              newValue: String(newValue || ""),
              operator: "当前用户",
            });
          }
        });
      },
      deleteEmployee: (id) =>
        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
        })),
      getEmployeeById: (id) => get().employees.find((e) => e.id === id),
    }),
    { name: "employee-store" }
  )
);

interface ChangeLogState {
  changeLogs: ChangeLog[];
  addChangeLog: (log: Omit<ChangeLog, "id" | "timestamp">) => void;
  getLogsByEntity: (
    entityType: "employee" | "salary" | "ratio",
    entityId: string
  ) => ChangeLog[];
  getLogsByValidation: (validationId: string) => ChangeLog[];
}

export const useChangeLogStore = create<ChangeLogState>()(
  persist(
    (set, get) => ({
      changeLogs: [],
      addChangeLog: (log) => {
        const newLog: ChangeLog = {
          ...log,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ changeLogs: [newLog, ...state.changeLogs] }));
      },
      getLogsByEntity: (entityType, entityId) =>
        get().changeLogs.filter(
          (log) => log.entityType === entityType && log.entityId === entityId
        ),
      getLogsByValidation: (validationId) =>
        get().changeLogs.filter(
          (log) => log.relatedValidationId === validationId
        ),
    }),
    { name: "changelog-store" }
  )
);
