export type ReceiptStatus = 'normal' | 'warning' | 'overload' | 'quality_fail' | 'delivery_soon';

export type QualityStatus = 'pass' | 'fail' | 'pending';

export type AlertType = 'duplicate' | 'overload' | 'quality_fail' | 'delivery_soon';

export type OperationType = 'create' | 'update' | 'delete' | 'export' | 'import';

export interface Warehouse {
  id: string;
  name: string;
  rows: number;
  cols: number;
  levels: number;
  coordinates: { x: number; y: number; z: number };
  dataSource: string;
}

export interface WarehouseReceipt {
  id: string;
  slotId: string;
  batchNumber: string;
  commodity: string;
  quantity: number;
  deliveryDate: string;
  qualityStatus: QualityStatus;
  dataSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageSlot {
  id: string;
  warehouseId: string;
  row: number;
  col: number;
  level: number;
  maxCapacity: number;
  usedCapacity: number;
  status: ReceiptStatus;
  receipts: WarehouseReceipt[];
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: 'warning' | 'error';
  message: string;
  receiptId?: string;
  slotId?: string;
  batchNumber?: string;
}

export interface OperationHistory {
  id: string;
  operationType: OperationType;
  operator: string;
  timestamp: string;
  description: string;
  dataSource?: string;
  beforeData?: string;
  afterData?: string;
}

export interface FilterOptions {
  batchNumbers: string[];
  warehouses: string[];
  qualityStatus: QualityStatus[];
  deliveryDateRange: { start: string; end: string } | null;
}

export interface DataVersion {
  version: string;
  timestamp: string;
  operator: string;
  description: string;
}
