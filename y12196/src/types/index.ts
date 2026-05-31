export type BoxStatus = 'pending' | 'transit' | 'arrived' | 'signed';
export type CityStatus = 'scheduled' | 'in-progress' | 'completed';
export type ShipmentStatus = 'pending' | 'transit' | 'arrived' | 'signed';
export type SourceType = 'material-admin' | 'city-coordinator' | 'tour-executive' | 'system';
export type ConflictStatus = 'pending' | 'resolved-material' | 'resolved-city' | 'resolved-custom';
export type AlertType = 'duplicate-box' | 'missing-signature' | 'insurance-expiring' | 'shipment-delay';
export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'dismissed' | 'resolved';
export type UserRole = 'tour-executive' | 'material-admin' | 'city-coordinator' | 'read-only';

export interface Insurance {
  id: string;
  policyNumber: string;
  insurer: string;
  expireDate: Date;
  coverageAmount: number;
}

export interface Box {
  id: string;
  boxNumber: string;
  description: string;
  weight: number;
  volume: number;
  status: BoxStatus;
  insurance?: Insurance;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface City {
  id: string;
  name: string;
  performanceDate: Date;
  venue: string;
  status: CityStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shipment {
  id: string;
  boxId: string;
  cityId: string;
  arrivalDate?: Date;
  signatureDate?: Date;
  signaturePhoto?: string;
  receivedBy?: string;
  status: ShipmentStatus;
}

export interface ChangeRecord {
  id: string;
  entityType: 'box' | 'city' | 'shipment';
  entityId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  source: SourceType;
  operator: string;
  timestamp: Date;
}

export interface Conflict {
  id: string;
  entityType: 'box' | 'city';
  entityId: string;
  fieldName: string;
  materialVersion: {
    value: unknown;
    source: string;
    operator: string;
    timestamp: Date;
  };
  cityVersion: {
    value: unknown;
    source: string;
    operator: string;
    timestamp: Date;
  };
  status: ConflictStatus;
  resolvedValue?: unknown;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  entityType: 'box' | 'city' | 'shipment';
  entityId: string;
  message: string;
  recordLink: string;
  status: AlertStatus;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  source: SourceType;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  cityIds?: string[];
  boxIds?: string[];
  statuses?: string[];
}
