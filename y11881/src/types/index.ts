export interface Denomination {
  id: string;
  value: number;
  name: string;
  currency: string;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface Inventory {
  id: string;
  denominationId: string;
  quantity: number;
  lastUpdated: Date;
  shiftId: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  operator: string;
  status: 'active' | 'completed' | 'scheduled';
}

export interface ChangeDetail {
  denominationId: string;
  quantity: number;
  value: number;
}

export interface SourceTrace {
  algorithm: string;
  inventorySnapshot: Record<string, number>;
  timestamp: Date;
  operator: string;
}

export interface ChangePlan {
  id: string;
  transactionId: string;
  denominationBreakdown: ChangeDetail[];
  totalCoins: number;
  isOptimal: boolean;
  rank: number;
  algorithm: string;
}

export interface Transaction {
  id: string;
  shiftId: string;
  receivableAmount: number;
  receivedAmount: number;
  changeAmount: number;
  timestamp: Date;
  operator: string;
  status: 'success' | 'warning' | 'failed';
  changeDetails: ChangeDetail[];
  sourceTrace: SourceTrace;
}

export interface SupplySuggestion {
  id: string;
  denominationId: string;
  suggestedQuantity: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  generatedAt: Date;
}

export interface NextAction {
  action: string;
  target: string;
  description: string;
  priority: number;
}

export interface ChangeResult {
  success: boolean;
  plans: ChangePlan[];
  warnings: string[];
  errors: string[];
  nextActions: NextAction[];
}

export interface InventoryShortage {
  denominationId: string;
  needed: number;
  available: number;
}

export interface InventoryValidation {
  valid: boolean;
  shortages: InventoryShortage[];
}

export type InventoryStatus = 'normal' | 'warning' | 'critical';

export interface DenominationWithInventory extends Denomination {
  quantity: number;
  status: InventoryStatus;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeTrace: boolean;
}
