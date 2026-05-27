export interface Tag {
  key: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  owner: string;
  tags: Tag[];
  createdAt: string;
}

export interface ReservedInstance {
  id: string;
  instanceType: string;
  region: string;
  count: number;
  totalCost: number;
  effectiveDate: string;
  expirationDate: string;
}

export interface SharedGateway {
  id: string;
  name: string;
  type: string;
  totalCost: number;
  allocationRule: string;
  projects: string[];
}

export interface BillItem {
  productName: string;
  amount: number;
  tags: Tag[];
}

export interface CloudBill {
  id: string;
  billDate: string;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  provider: string;
  status: string;
  items: BillItem[];
}

export interface Anomaly {
  id: string;
  type: 'missing_tag' | 'deduction_error' | 'peak_cost';
  severity: 'warning' | 'error' | 'info';
  projectId: string;
  amortizationId?: string;
  billId?: string;
  description: string;
  amount?: number;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface AmortizationRecord {
  id: string;
  period: string;
  projectId: string;
  totalAmount: number;
  reservedDeduction: number;
  sharedAllocation: number;
  directCost: number;
  sources: {
    reservedInstanceId?: string;
    sharedGatewayId?: string;
  };
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Correction {
  id: string;
  targetType: 'amortization' | 'anomaly' | 'bill';
  targetId: string;
  operator: string;
  reason: string;
  changeSummary: string;
  createdAt: string;
}

export interface ImportLog {
  id: string;
  type: 'bill' | 'reservation' | 'gateway';
  fileName: string;
  recordCount: number;
  successCount: number;
  errorCount: number;
  operator: string;
  status: 'success' | 'partial' | 'failed';
  createdAt: string;
}
