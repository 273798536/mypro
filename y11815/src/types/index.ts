
export interface BillItem {
  itemId: string;
  billId: string;
  itemName: string;
  departmentCode: string;
  amount: number;
  isRejected: boolean;
  remark?: string;
}

export interface PatientBill {
  billId: string;
  patientName: string;
  hospitalNumber: string;
  departmentId: string;
  departmentName: string;
  admissionDate: string;
  dischargeDate: string;
  totalAmount: number;
  insuranceAdvance: number;
  status: 'pending' | 'processing' | 'completed' | 'exception';
  items: BillItem[];
  settlementId?: string;
  refundIds: string[];
}

export interface InsuranceRejectItem {
  rejectId: string;
  settlementId: string;
  billItemId: string;
  reason: string;
  position: string;
  amount: number;
}

export interface InsuranceSettlement {
  settlementId: string;
  billId: string;
  patientName: string;
  submitDate: string;
  actualReceiveDate?: string;
  expectedAmount: number;
  actualAmount: number;
  status: 'submitted' | 'partial' | 'completed' | 'rejected';
  rejectItems: InsuranceRejectItem[];
}

export interface RefundRecord {
  refundId: string;
  billId: string;
  patientName: string;
  applyDate: string;
  actualDate?: string;
  amount: number;
  status: 'applied' | 'received' | 'delayed' | 'rollback';
  lateDays?: number;
}

export interface Department {
  deptId: string;
  deptName: string;
  deptCode: string;
  validCodes: string[];
}

export interface AdvanceLedger {
  ledgerId: string;
  departmentId: string;
  departmentName: string;
  totalAdvance: number;
  totalRecovered: number;
  pendingAmount: number;
  exceptionCount: number;
  updateTime: string;
}

export type ExceptionType = 'refund_delay' | 'insurance_reject' | 'code_error';

export interface ExceptionRecord {
  exceptionId: string;
  type: ExceptionType;
  relatedBillId: string;
  relatedSettlementId?: string;
  relatedItemId?: string;
  description: string;
  amount: number;
  position: string;
}

export interface AppState {
  patientBills: PatientBill[];
  settlements: InsuranceSettlement[];
  refunds: RefundRecord[];
  ledgers: AdvanceLedger[];
  departments: Department[];
  exceptions: ExceptionRecord[];
  lastUpdate: string;
}
