export type VehicleType = 'private' | 'commercial' | 'temporary';
export type PlateStatus = 'active' | 'expired' | 'suspended' | 'transferred';
export type BindingStatus = 'pending' | 'success' | 'failed';
export type BindingFailStep = 'validation' | 'approval' | 'system' | 'data';
export type ParkingType = 'temporary' | 'monthly';
export type RevenueStatus = 'normal' | 'warning' | 'error';
export type EventType = 'plate_change' | 'refund' | 'deduction' | 'calculation' | 'binding';
export type ProblemType = 'cross_month_refund' | 'binding_failure' | 'deduction_mismatch' | 'data_inconsistency';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ChainNodeType = 'archive' | 'flow' | 'binding' | 'revenue' | 'problem';

export interface PlateArchive {
  id: string;
  plateNumber: string;
  ownerName: string;
  vehicleType: VehicleType;
  effectiveDate: string;
  expiryDate: string;
  status: PlateStatus;
  parkingLot: string;
  monthlyFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface BindingRecord {
  id: string;
  plateId: string;
  oldPlate: string;
  newPlate: string;
  bindTime: string;
  operator: string;
  status: BindingStatus;
  failReason?: string;
  failStep?: BindingFailStep;
}

export interface ParkingFlow {
  id: string;
  plateId: string;
  plateNumber: string;
  entryTime: string;
  exitTime: string;
  parkingType: ParkingType;
  duration: number;
  amount: number;
  paymentMethod: string;
  isDeducted: boolean;
  deductionSource?: string;
}

export interface DeferredRevenue {
  id: string;
  plateId: string;
  plateNumber: string;
  period: string;
  totalAmount: number;
  recognizedAmount: number;
  deferredAmount: number;
  calculationDate: string;
  status: RevenueStatus;
  warnings: string[];
  errors: string[];
}

export interface EventTrace {
  id: string;
  eventType: EventType;
  eventTime: string;
  relatedPlateIds: string[];
  relatedRecordIds: string[];
  description: string;
  sourceModule: string;
  operator?: string;
}

export interface ProblemMark {
  id: string;
  traceId: string;
  problemType: ProblemType;
  severity: Severity;
  description: string;
  triggerSource: string;
  stuckPoint: string;
  missingMaterial: string[];
  nextSteps: string[];
  responsibleParty: string;
  isResolved: boolean;
}

export interface ChainNode {
  id: string;
  type: ChainNodeType;
  title: string;
  status: RevenueStatus;
  data: any;
  prevNodeId?: string;
  nextNodeId?: string;
}

export interface StatusChange {
  id: string;
  plateId: string;
  oldStatus: PlateStatus;
  newStatus: PlateStatus;
  changeTime: string;
  reason: string;
  operator: string;
}

export interface ValidationStep {
  id: string;
  stepName: string;
  status: 'passed' | 'failed' | 'skipped';
  description: string;
  detail?: string;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: EventType;
  status: RevenueStatus;
  relatedData: any;
}

export interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    plates: PlateArchive[];
    bindings: BindingRecord[];
    flows: ParkingFlow[];
  };
  errors: string[];
  warnings: string[];
}

export interface ScenarioConfig {
  id: string;
  name: string;
  description: string;
  type: 'normal' | 'binding_failure' | 'refund' | 'deduction';
  dataKeys: string[];
}
