export type RentalStatus = 'PENDING' | 'ACTIVE' | 'ENDED';
export type AlertType = 'DEPOSIT_MISMATCH' | 'INSTRUMENT_CHANGE' | 'REPAIR_DISPUTE' | 'DATA_MISMATCH';
export type AlertSeverity = 'ERROR' | 'WARNING';

export interface RentalContract {
  id: string;
  contractNo: string;
  instrumentNo: string;
  customerName: string;
  startDate: string;
  endDate: string | null;
  depositAmount: number;
  monthlyRent: number;
  actualDepositReceived: number | null;
  status: RentalStatus;
  instrumentChangeHistory: InstrumentChangeRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentChangeRecord {
  id: string;
  contractId: string;
  oldInstrumentNo: string;
  newInstrumentNo: string;
  relatedWorkOrderId: string | null;
  relatedWorkOrderNo?: string;
  reason: string;
  operator: string;
  operatedAt: string;
}

export interface RepairWorkOrder {
  id: string;
  workOrderNo: string;
  contractId: string;
  contractNo?: string;
  instrumentNo: string;
  repairItems: RepairItem[];
  totalCost: number;
  hasDispute: boolean;
  disputeNote: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface RepairItem {
  id: string;
  name: string;
  cost: number;
  isDisputed: boolean;
}

export interface ReconciliationStatement {
  id: string;
  period: string;
  contractNo: string;
  instrumentNo: string;
  rentAmount: number;
  repairCost: number;
  depositDeduction: number;
  actualReceived: number;
  createdAt: string;
}

export interface DiscrepancyAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  relatedContractNo: string;
  relatedWorkOrderNo?: string;
  relatedField?: string;
  contractValue?: number | string;
  statementValue?: number | string;
  resolved: boolean;
  createdAt: string;
}

export interface RepairSummaryItem {
  contractNo: string;
  customerName: string;
  workOrders: {
    workOrderNo: string;
    instrumentNo: string;
    totalCost: number;
    hasDispute: boolean;
    createdAt: string;
  }[];
  totalRepairCost: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
