export type DeviceStatus = 'in_stock' | 'borrowed' | 'damaged' | 'anomaly';

export type AnomalyType = 'duplicate_borrow' | 'damage_unrecorded' | 'overdue_return' | 'inventory_mismatch';

export type EvidenceType = 'device_note' | 'borrow_record' | 'return_record' | 'damage_photo' | 'inventory_snapshot';

export type AnomalySeverity = 'high' | 'medium' | 'low';

export type AnomalyStatus = 'open' | 'resolved';

export type RecordStatus = 'borrowed' | 'returned' | 'overdue';

export type InventoryStatus = 'draft' | 'completed';

export interface NoteVersion {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  version: number;
}

export interface Device {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  status: DeviceStatus;
  currentBorrower: string | null;
  notes: NoteVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface RecordVersion {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  author: string;
  timestamp: string;
  reason: string;
}

export interface BorrowRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  borrower: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: RecordStatus;
  damageNote: string | null;
  damagePhotoUrl: string | null;
  versions: RecordVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: string;
  content: string;
  timestamp: string;
  photoUrl: string | null;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  deviceId: string;
  recordIds: string[];
  evidenceChain: Evidence[];
  status: AnomalyStatus;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface InventoryItem {
  deviceId: string;
  deviceName: string;
  expectedStatus: DeviceStatus;
  actualStatus: DeviceStatus;
  isMatch: boolean;
  note: string;
}

export interface InventoryCheck {
  id: string;
  checkDate: string;
  items: InventoryItem[];
  status: InventoryStatus;
  createdAt: string;
}

export interface ExportData {
  exportDate: string;
  summary: {
    totalDevices: number;
    inStock: number;
    borrowed: number;
    damaged: number;
    anomalies: number;
    overdue: number;
  };
  devices: Device[];
  records: BorrowRecord[];
  anomalies: Anomaly[];
  conclusions: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
