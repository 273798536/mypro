import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  Equipment,
  Contract,
  Maintenance,
  Repurchase,
  DepreciationLog,
  AuditLog,
  ExportRecord,
} from "../types";

const uid = () => Math.random().toString(36).slice(2, 10);

const now = () => new Date().toISOString();

const initialEquipments: Equipment[] = [
  {
    id: "eq-001",
    equipmentNo: "EQ-2023-001",
    name: "数控加工中心 VMC850",
    originalValue: 850000,
    residualRate: 0.05,
    depreciationMethod: "straight",
    depreciationMonths: 120,
    startDate: "2023-01-15",
    status: "active",
  },
  {
    id: "eq-002",
    equipmentNo: "EQ-2022-008",
    name: "激光切割机 LC-6000",
    originalValue: 1200000,
    residualRate: 0.05,
    depreciationMethod: "doubleDeclining",
    depreciationMonths: 120,
    startDate: "2022-06-01",
    status: "active",
  },
  {
    id: "eq-003",
    equipmentNo: "EQ-2021-015",
    name: "注塑机 IM-280T",
    originalValue: 450000,
    residualRate: 0.05,
    depreciationMethod: "straight",
    depreciationMonths: 120,
    startDate: "2021-03-20",
    status: "maintenance",
  },
  {
    id: "eq-004",
    equipmentNo: "EQ-2020-022",
    name: "自动化焊接线 AWL-2020",
    originalValue: 2100000,
    residualRate: 0.05,
    depreciationMethod: "sumOfYears",
    depreciationMonths: 120,
    startDate: "2020-09-10",
    status: "active",
  },
  {
    id: "eq-005",
    equipmentNo: "EQ-2023-007",
    name: "三坐标测量机 CMM-Global",
    originalValue: 680000,
    residualRate: 0.05,
    depreciationMethod: "straight",
    depreciationMonths: 120,
    startDate: "2023-05-01",
    status: "active",
  },
];

const initialContracts: Contract[] = [
  {
    id: "ct-001",
    equipmentId: "eq-001",
    version: "V1.0",
    signDate: "2023-01-10",
    depreciationClause: "直线法，10年，残值率5%",
    repurchaseClause: "到期回购价为残值金额，即原值的5%",
    isCurrent: true,
  },
  {
    id: "ct-002",
    equipmentId: "eq-002",
    version: "V1.0",
    signDate: "2022-05-20",
    depreciationClause: "双倍余额递减法，10年，残值率5%",
    repurchaseClause: "到期回购价为残值金额，即原值的5%",
    isCurrent: true,
  },
  {
    id: "ct-003",
    equipmentId: "eq-002",
    version: "V1.1",
    signDate: "2023-08-15",
    depreciationClause: "双倍余额递减法，10年，残值率5%，维修增值部分单独计提",
    repurchaseClause: "到期回购价为残值金额，即原值的5%；提前回购需支付剩余本金+3%违约金",
    isCurrent: true,
  },
  {
    id: "ct-004",
    equipmentId: "eq-003",
    version: "V1.0",
    signDate: "2021-03-15",
    depreciationClause: "直线法，10年，残值率5%",
    repurchaseClause: "到期回购价为残值金额，即原值的5%",
    isCurrent: true,
  },
  {
    id: "ct-005",
    equipmentId: "eq-004",
    version: "V1.0",
    signDate: "2020-09-05",
    depreciationClause: "年数总和法，10年，残值率5%",
    repurchaseClause: "到期回购价为残值金额，即原值的5%；租赁期满前可按账面净值的120%提前回购",
    isCurrent: true,
  },
  {
    id: "ct-006",
    equipmentId: "eq-005",
    version: "V1.0",
    signDate: "2023-04-25",
    depreciationClause: "直线法，10年，残值率5%",
    repurchaseClause: "到期回购价为残值金额，即原值的5%",
    isCurrent: true,
  },
];

const initialMaintenances: Maintenance[] = [
  {
    id: "mt-001",
    equipmentId: "eq-003",
    maintenanceDate: "2024-11-20",
    description: "液压系统大修，更换主油泵和密封组件",
    cost: 45000,
    valueAdjustment: 25000,
    source: "维修工单 WO-2024-1108",
    operator: "李工",
    createdAt: "2024-11-25T10:30:00.000Z",
  },
  {
    id: "mt-002",
    equipmentId: "eq-002",
    maintenanceDate: "2024-06-15",
    description: "激光发生器更换，功率升级",
    cost: 120000,
    valueAdjustment: 80000,
    source: "维修工单 WO-2024-0612",
    operator: "王工",
    createdAt: "2024-06-18T14:00:00.000Z",
  },
  {
    id: "mt-003",
    equipmentId: "eq-001",
    maintenanceDate: "2024-09-10",
    description: "定期保养，更换切削液和过滤器",
    cost: 8000,
    valueAdjustment: 0,
    source: "维修工单 WO-2024-0905",
    operator: "张工",
    createdAt: "2024-09-12T09:00:00.000Z",
  },
];

const initialRepurchases: Repurchase[] = [
  {
    id: "rp-001",
    equipmentId: "eq-002",
    status: "pending",
    repurchasePrice: 60000,
    plannedDate: "2026-06-01",
    isEarlyRepurchase: false,
  },
  {
    id: "rp-002",
    equipmentId: "eq-004",
    status: "pending",
    repurchasePrice: 2500000,
    plannedDate: "2025-09-10",
    isEarlyRepurchase: true,
  },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      equipments: initialEquipments,
      contracts: initialContracts,
      maintenances: initialMaintenances,
      repurchases: initialRepurchases,
      depreciationLogs: [],
      auditLogs: [],
      exportRecords: [],
      selectedEquipmentId: null,

      setSelectedEquipment: (id: string | null) =>
        set({ selectedEquipmentId: id }),

      addEquipment: (equipment: Omit<Equipment, "id">) => {
        const id = uid();
        const newEq = { ...equipment, id };
        set((s) => ({ equipments: [...s.equipments, newEq] }));
        get().addAuditLog({
          equipmentId: id,
          action: "CREATE",
          field: "equipment",
          oldValue: "",
          newValue: JSON.stringify(newEq),
          source: "设备录入",
          operator: "当前用户",
        });
        return id;
      },

      updateEquipment: (id: string, updates: Partial<Equipment>) => {
        const old = get().equipments.find((e) => e.id === id);
        if (!old) return;
        set((s) => ({
          equipments: s.equipments.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }));
        Object.entries(updates).forEach(([field, newValue]) => {
          get().addAuditLog({
            equipmentId: id,
            action: "UPDATE",
            field,
            oldValue: String(old[field as keyof Equipment] ?? ""),
            newValue: String(newValue ?? ""),
            source: "参数修改",
            operator: "当前用户",
          });
        });
      },

      addContract: (contract: Omit<Contract, "id">) => {
        const id = uid();
        const newCt = { ...contract, id };
        set((s) => ({ contracts: [...s.contracts, newCt] }));
        get().addAuditLog({
          equipmentId: contract.equipmentId,
          action: "CREATE",
          field: "contract",
          oldValue: "",
          newValue: JSON.stringify(newCt),
          source: "合同录入",
          operator: "当前用户",
        });
        return id;
      },

      setCurrentContract: (equipmentId: string, contractId: string) => {
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.equipmentId === equipmentId
              ? { ...c, isCurrent: c.id === contractId }
              : c
          ),
        }));
        get().addAuditLog({
          equipmentId,
          action: "UPDATE",
          field: "currentContract",
          oldValue: "",
          newValue: contractId,
          source: "合同版本切换",
          operator: "当前用户",
        });
      },

      addMaintenance: (maintenance: Omit<Maintenance, "id" | "createdAt">) => {
        const id = uid();
        const newMt = { ...maintenance, id, createdAt: now() };
        set((s) => ({ maintenances: [...s.maintenances, newMt] }));
        get().addAuditLog({
          equipmentId: maintenance.equipmentId,
          action: "CREATE",
          field: "maintenance",
          oldValue: "",
          newValue: JSON.stringify(newMt),
          source: "维修记录录入",
          operator: maintenance.operator,
        });
        if (maintenance.valueAdjustment !== 0) {
          set((s) => ({
            equipments: s.equipments.map((e) =>
              e.id === maintenance.equipmentId
                ? { ...e, status: "maintenance" as const }
                : e
            ),
          }));
        }
        return id;
      },

      updateRepurchase: (equipmentId: string, updates: Partial<Repurchase>) => {
        const existing = get().repurchases.find(
          (r) => r.equipmentId === equipmentId
        );
        if (existing) {
          set((s) => ({
            repurchases: s.repurchases.map((r) =>
              r.equipmentId === equipmentId ? { ...r, ...updates } : r
            ),
          }));
          get().addAuditLog({
            equipmentId,
            action: "UPDATE",
            field: "repurchase",
            oldValue: JSON.stringify(existing),
            newValue: JSON.stringify({ ...existing, ...updates }),
            source: "回购状态更新",
            operator: "当前用户",
          });
        } else {
          const id = uid();
          const newRp = {
            id,
            equipmentId,
            status: "pending" as const,
            repurchasePrice: 0,
            plannedDate: "",
            isEarlyRepurchase: false,
            ...updates,
          };
          set((s) => ({ repurchases: [...s.repurchases, newRp] }));
          get().addAuditLog({
            equipmentId,
            action: "CREATE",
            field: "repurchase",
            oldValue: "",
            newValue: JSON.stringify(newRp),
            source: "回购记录创建",
            operator: "当前用户",
          });
        }
      },

      setDepreciationLogs: (equipmentId: string, logs: DepreciationLog[]) => {
        set((s) => ({
          depreciationLogs: [
            ...s.depreciationLogs.filter((l) => l.equipmentId !== equipmentId),
            ...logs,
          ],
        }));
      },

      addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => {
        const id = uid();
        const newLog = { ...log, id, timestamp: now() };
        set((s) => ({ auditLogs: [newLog, ...s.auditLogs].slice(0, 500) }));
      },

      addExportRecord: (record: Omit<ExportRecord, "id" | "generatedAt">) => {
        const id = uid();
        const newRec = { ...record, id, generatedAt: now() };
        set((s) => ({ exportRecords: [newRec, ...s.exportRecords] }));
        return id;
      },

      resetAll: () => {
        set({
          equipments: initialEquipments,
          contracts: initialContracts,
          maintenances: initialMaintenances,
          repurchases: initialRepurchases,
          depreciationLogs: [],
          auditLogs: [],
          exportRecords: [],
          selectedEquipmentId: null,
        });
      },
    }),
    {
      name: "leasing-residual-value-storage",
      partialize: (state) => ({
        equipments: state.equipments,
        contracts: state.contracts,
        maintenances: state.maintenances,
        repurchases: state.repurchases,
        depreciationLogs: state.depreciationLogs,
        auditLogs: state.auditLogs,
        exportRecords: state.exportRecords,
      }),
    }
  )
);
