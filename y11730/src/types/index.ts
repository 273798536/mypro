export type DepreciationMethod = "straight" | "doubleDeclining" | "sumOfYears";

export type EquipmentStatus = "active" | "maintenance" | "repurchased" | "disposed";

export type RepurchaseStatus = "none" | "pending" | "completed" | "cancelled";

export interface Equipment {
  id: string;
  equipmentNo: string;
  name: string;
  originalValue: number;
  residualRate: number;
  depreciationMethod: DepreciationMethod;
  depreciationMonths: number;
  startDate: string;
  status: EquipmentStatus;
}

export interface Contract {
  id: string;
  equipmentId: string;
  version: string;
  signDate: string;
  depreciationClause: string;
  repurchaseClause: string;
  isCurrent: boolean;
}

export interface Maintenance {
  id: string;
  equipmentId: string;
  maintenanceDate: string;
  description: string;
  cost: number;
  valueAdjustment: number;
  source: string;
  operator: string;
  createdAt: string;
  _applied?: boolean;
}

export interface Repurchase {
  id: string;
  equipmentId: string;
  status: RepurchaseStatus;
  repurchasePrice: number;
  plannedDate: string;
  actualDate?: string;
  isEarlyRepurchase: boolean;
  priceDifference?: number;
}

export interface DepreciationLog {
  id: string;
  equipmentId: string;
  month: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  isAbnormal: boolean;
  abnormalReason?: string;
}

export interface AuditLog {
  id: string;
  equipmentId: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
  source: string;
  operator: string;
  timestamp: string;
}

export interface ExportRecord {
  id: string;
  equipmentIds: string[];
  format: "pdf" | "excel";
  generatedAt: string;
  operator: string;
  filename: string;
}

export interface AppState {
  equipments: Equipment[];
  contracts: Contract[];
  maintenances: Maintenance[];
  repurchases: Repurchase[];
  depreciationLogs: DepreciationLog[];
  auditLogs: AuditLog[];
  exportRecords: ExportRecord[];
  selectedEquipmentId: string | null;
  setSelectedEquipment: (id: string | null) => void;
  addEquipment: (equipment: Omit<Equipment, "id">) => string;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  addContract: (contract: Omit<Contract, "id">) => string;
  setCurrentContract: (equipmentId: string, contractId: string) => void;
  addMaintenance: (maintenance: Omit<Maintenance, "id" | "createdAt">) => string;
  updateRepurchase: (equipmentId: string, updates: Partial<Repurchase>) => void;
  setDepreciationLogs: (equipmentId: string, logs: DepreciationLog[]) => void;
  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
  addExportRecord: (record: Omit<ExportRecord, "id" | "generatedAt">) => string;
  resetAll: () => void;
}
