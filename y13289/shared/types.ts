export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DataIssue {
  id: string;
  type: 'coordinate_offset' | 'location_inconsistent' | 'name_inconsistent' | 'missing_data' | 'time_conflict';
  severity: 'warning' | 'error';
  description: string;
  suggestion: string;
  resolved: boolean;
}

export interface MergeEvidence {
  id: string;
  mergedIds: string[];
  mergedNames: string[];
  operator: string;
  operateTime: string;
  reason: string;
}

export interface DeliveryRecord {
  id: string;
  recordId: string;
  marketName: string;
  marketNameRaw: string;
  location: string;
  locationRaw: string;
  coordinates: Coordinates;
  coordinatesRaw: Coordinates;
  deliveryTime: string;
  deliveryTimeRaw: string;
  truckNumber: string;
  truckNumberRaw: string;
  goodsType: string;
  goodsTypeRaw: string;
  status: 'pending' | 'cleaned' | 'conflict' | 'merged';
  source: 'excel' | 'manual';
  sourceFile?: string;
  mergeEvidence?: MergeEvidence;
  issues: DataIssue[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryRecord {
  id: string;
  recordId: string;
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operateTime: string;
  note?: string;
}

export interface FilterCriteria {
  status?: string;
  source?: string;
  hasIssues?: boolean;
  searchText?: string;
  goodsType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExportOptions {
  includeRawData: boolean;
  includeIssues: boolean;
  includeHistory: boolean;
  filterNote: string;
}
