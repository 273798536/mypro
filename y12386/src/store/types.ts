export type InstrumentStatus = '正常' | '漏箱' | '待核对' | '已核对';

export type TransportStatus = '运输中' | '已到达' | '延误';

export type ScheduleStatus = '按计划' | '晚到' | '错配';

export type TraceSource = 'INSTRUMENT' | 'TRANSPORT' | 'CITY';

export type TraceEventType =
  | 'IMPORT'
  | 'UPDATE'
  | 'LINK_TRANSPORT'
  | 'LINK_SCHEDULE'
  | 'CONFLICT'
  | 'INSURANCE_EXPIRED'
  | 'MISSING_BOX'
  | 'LATE_ARRIVAL'
  | 'CITY_MISMATCH'
  | 'CONFLICT_RESOLVED'
  | 'EXPORT';

export type TraceSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type ExportFormat = 'EXCEL' | 'PDF';

export type DataType = 'instrument' | 'transport' | 'schedule';

export interface Instrument {
  id: string;
  name: string;
  type: string;
  model: string;
  value: number;
  purchaseDate: string;
  serialNumber: string;
  owner: string;
  status: InstrumentStatus;
  insuranceExpiry: string;
  transportId: string | null;
  scheduleId: string | null;
  exportBatchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transport {
  id: string;
  instrumentId: string;
  carrier: string;
  boxNumber: string;
  departureTime: string;
  estimatedArrival: string;
  pieceCount: number;
  trackingNumber: string;
  notes: string;
  contents: { name: string; quantity: number }[];
  updatedAt: string;
  actualArrival: string | null;
  status: TransportStatus;
  insuranceExpiry: string;
  shipDate: string;
  fromCity: string;
  toCity: string;
  createdAt: string;
}

export interface CitySchedule {
  id: string;
  instrumentId: string;
  city: string;
  venue: string;
  scheduledArrival: string;
  actualArrival: string | null;
  status: ScheduleStatus;
  concertDate: string;
  performanceDate: string;
  performanceTime: string;
  program: string;
  departureDate: string;
  arrivalDate: string;
  rehearsalDate: string;
  notes: string;
  delayHours: number;
  contactPerson: string;
  contactPhone: string;
  updatedAt: string;
  createdAt: string;
}

export interface TraceRecord {
  id: string;
  instrumentId: string;
  source: TraceSource;
  eventType: TraceEventType;
  severity: TraceSeverity;
  description: string;
  beforeValue: string | null;
  afterValue: string | null;
  operator: string;
  eventTime: string;
  photoIds: string[];
  resolved?: boolean;
  resolution?: string;
}

export interface Photo {
  id: string;
  description: string;
  instrumentId: string;
  url: string;
  type: '装箱' | '运输凭证' | '现场';
  category: string;
  traceIds: string[];
  uploader: string;
  uploadTime: string;
  source: string;
}

export interface ExportBatch {
  id: string;
  name: string;
  format: ExportFormat;
  includeConflicts: boolean;
  includePhotos: boolean;
  operator: string;
  exportTime: string;
  filterCondition: string;
  itemCount: number;
  itemIds: string[];
  options: { includeConflicts: boolean; includePhotos: boolean; format: string };
}

export interface ExportItem {
  id: string;
  batchId: string;
  instrumentId: string;
  transportId: string | null;
  scheduleId: string | null;
  snapshot: string;
}

export interface ConflictInfo {
  instrumentId: string;
  source: TraceSource;
  type: TraceEventType;
  severity: TraceSeverity;
  description: string;
  eventTime: string;
  details: {
    field: string;
    expected: string;
    actual: string;
  };
}

export interface ImportConfig {
  type: DataType;
  file: File | null;
  data: any[];
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ExportConfig {
  name: string;
  format: ExportFormat;
  includeConflicts: boolean;
  includePhotos: boolean;
  filters: {
    status?: InstrumentStatus[];
    hasConflict?: boolean;
    dateRange?: [string, string];
  };
}

export interface AppState {
  instruments: Instrument[];
  transports: Transport[];
  citySchedules: CitySchedule[];
  traceRecords: TraceRecord[];
  photos: Photo[];
  exportBatches: ExportBatch[];
  exportItems: ExportItem[];

  selectedInstrumentId: string | null;
  activeTab: 'instrument' | 'transport' | 'schedule';
  filterStatus: string;
  conflictHighlight: boolean;
  searchKeyword: string;

  importData: (type: DataType, data: any[], operator: string) => void;
  updateInstrument: (id: string, updates: Partial<Instrument>, operator: string) => void;
  updateTransport: (id: string, updates: Partial<Transport>, operator: string) => void;
  updateSchedule: (id: string, updates: Partial<CitySchedule>, operator: string) => void;
  linkTransport: (instrumentId: string, transportId: string, operator: string) => void;
  linkSchedule: (instrumentId: string, scheduleId: string, operator: string) => void;
  addPhoto: (photo: Omit<Photo, 'id' | 'uploadTime'>) => void;
  resolveConflict: (traceId: string, resolution: string, operator: string) => void;
  runCheck: (instrumentId: string, operator: string) => ConflictInfo[];
  exportBatch: (config: ExportConfig, operator: string) => ExportBatch;
  selectInstrument: (id: string | null) => void;
  setActiveTab: (tab: 'instrument' | 'transport' | 'schedule') => void;
  setFilterStatus: (status: string) => void;
  setConflictHighlight: (highlight: boolean) => void;
  setSearchKeyword: (keyword: string) => void;
  setSelectedInstrumentId: (id: string | null) => void;
  markAsChecked: (id: string) => void;
  loadMockData: () => void;
  clearAllData: () => void;

  getInstrumentById: (id: string) => Instrument | undefined;
  getTransportByInstrumentId: (instrumentId: string) => Transport | undefined;
  getScheduleByInstrumentId: (instrumentId: string) => CitySchedule | undefined;
  getTracesByInstrumentId: (instrumentId: string) => TraceRecord[];
  getPhotosByInstrumentId: (instrumentId: string) => Photo[];
  getPhotosByTraceId: (traceId: string) => Photo[];
  resolveTrace: (traceId: string, resolution: string) => void;
  exportSingleToExcel: (instrumentId: string) => void;
  createExportBatch: (ids: string[], options: { includeConflicts: boolean; includePhotos: boolean; format: string }) => ExportBatch;
  batchImportInstruments: (data: any[]) => void;
  batchImportTransports: (data: any[]) => void;
  batchImportSchedules: (data: any[]) => void;
  getConflictsByInstrumentId: (instrumentId: string) => TraceRecord[];
  getExportItemsByBatchId: (batchId: string) => ExportItem[];
  getStatistics: () => {
    total: number;
    checked: number;
    hasConflict: number;
    pending: number;
    missingBox: number;
    insuranceExpired: number;
    lateArrival: number;
    cityMismatch: number;
  };
}

export type StoreAction =
  | { type: 'IMPORT_DATA'; payload: { dataType: DataType; data: any[]; operator: string } }
  | { type: 'UPDATE_INSTRUMENT'; payload: { id: string; updates: Partial<Instrument>; operator: string } }
  | { type: 'UPDATE_TRANSPORT'; payload: { id: string; updates: Partial<Transport>; operator: string } }
  | { type: 'UPDATE_SCHEDULE'; payload: { id: string; updates: Partial<CitySchedule>; operator: string } }
  | { type: 'ADD_TRACE'; payload: TraceRecord }
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'RESOLVE_CONFLICT'; payload: { traceId: string; resolution: string; operator: string } }
  | { type: 'EXPORT_BATCH'; payload: { batch: ExportBatch; items: ExportItem[] } }
  | { type: 'LOAD_MOCK'; payload: {
      instruments: Instrument[];
      transports: Transport[];
      citySchedules: CitySchedule[];
      traceRecords: TraceRecord[];
      photos: Photo[];
    } }
  | { type: 'CLEAR_ALL' };
