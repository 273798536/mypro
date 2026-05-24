import { BaseEntity, ImportSource } from './common';

export type FabricTransactionType = 'in' | 'out' | 'return' | 'adjust' | 'inventory';

export type FabricStatus = 'available' | 'reserved' | 'used' | 'returned' | 'lost';

export interface FabricRecord extends BaseEntity {
  fabricCode: string;
  fabricName: string;
  color: string;
  width?: number;
  weight?: number;
  unit: string;
  
  supplier?: string;
  purchaseOrderNo?: string;
  
  importSource: ImportSource;
  sourceRowNumber: number;
}

export interface FabricTransaction extends BaseEntity {
  transactionNo: string;
  fabricCode: string;
  type: FabricTransactionType;
  
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalAmount?: number;
  
  relatedSampleNo?: string;
  relatedStyleNo?: string;
  relatedDepartment?: string;
  
  operator: string;
  transactionTime: string;
  warehouse: string;
  location?: string;
  
  remarks?: string;
  referenceNo?: string;
  
  importSource: ImportSource;
  sourceRowNumber: number;
  version: number;
  isLatest: boolean;
}

export interface FabricInventory extends BaseEntity {
  fabricCode: string;
  warehouse: string;
  location?: string;
  
  openingQuantity: number;
  inQuantity: number;
  outQuantity: number;
  closingQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  
  unit: string;
  inventoryDate: string;
  
  checkedBy?: string;
  checkedAt?: string;
  remarks?: string;
}

export interface FabricVersion {
  transactionNo: string;
  version: number;
  changedAt: string;
  changedBy: string;
  changes: Record<string, {
    old: unknown;
    new: unknown;
  }>;
}
