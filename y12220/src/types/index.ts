export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export type RebookStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'settled';

export type AnomalyType = 'cabin_change' | 'cross_country_tax' | 'mileage_refund';

export type AnomalySeverity = 'warning' | 'error';

export type UserRole = 'settlement' | 'reviewer' | 'admin';

export interface TaxItem {
  code: string;
  name: string;
  amount: number;
  country: string;
  rate: number;
}

export interface Segment {
  id: string;
  ticketId?: string;
  flightNo: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  cabinClass: CabinClass;
  cabinCode: string;
  baseFare: number;
  taxes: TaxItem[];
  country: string;
}

export interface DataSource {
  source: string;
  file?: string;
  importedAt: string;
  importedBy: string;
}

export interface TicketOrder {
  id: string;
  orderNo: string;
  passengerName: string;
  passengerId: string;
  contactPhone: string;
  originalSegments: Segment[];
  mileageUsed: number;
  totalOriginalAmount: number;
  dataSource: DataSource;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AnomalyItem {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  segmentIndex?: number;
  description: string;
  affectedResults: string[];
  amountImpact: number;
  ruleBasis: string;
}

export interface Explanation {
  id: string;
  anomalyId: string;
  content: string;
  explainedBy: string;
  createdAt: string;
}

export interface CalculationDetail {
  id: string;
  item: string;
  originalAmount: number;
  newAmount: number;
  difference: number;
  remark: string;
}

export interface RebookRecord {
  id: string;
  ticketId: string;
  orderNo: string;
  status: RebookStatus;
  originalSegments: Segment[];
  newSegments: Segment[];
  originalMileageUsed: number;
  newMileageUsed: number;
  mileageRefund: number;
  fareDifference: number;
  taxDifference: number;
  totalDifference: number;
  anomalies: AnomalyItem[];
  explanations: Explanation[];
  calculationDetails: CalculationDetail[];
  createdBy: string;
  reviewedBy?: string;
  reviewComment?: string;
  dataSource: DataSource;
  version: number;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  settledAt?: string;
}

export interface CabinPrice {
  id: string;
  flightNo: string;
  cabinClass: CabinClass;
  basePrice: number;
  effectiveDate: string;
}

export interface TaxRule {
  id: string;
  country: string;
  countryName: string;
  taxCode: string;
  taxName: string;
  rate: number;
  isFixed: boolean;
  fixedAmount?: number;
}

export interface AuditLog {
  id: string;
  recordId: string;
  recordType: 'ticket' | 'rebook' | 'segment' | 'user';
  action: string;
  operator: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
}

export interface CalculationResult {
  fareDifference: number;
  taxDifference: number;
  mileageRefund: number;
  totalDifference: number;
  anomalies: AnomalyItem[];
  details: CalculationDetail[];
}

export interface MileageResult {
  newMileage: number;
  refund: number;
  rate: number;
}

export interface SystemSettings {
  mileageRate: number;
  anomalyThreshold: number;
  autoDetectAnomalies: boolean;
  requireExplanationForWarnings: boolean;
}
