export type ChainStatus = 'PENDING' | 'PROCESSING' | 'EXCEPTION' | 'RECONCILING' | 'REVIEW_REQUIRED' | 'RECONCILED' | 'EXPORTED';

export type MaterialType = 'ORDER' | 'TRACK' | 'IOU' | 'STATEMENT' | 'EMAIL';

export type DirtyDataType = 'MISSING_FIELD' | 'CROSS_DATE' | 'NAME_CHANGE' | 'AMOUNT_CONFLICT' | 'QUANTITY_CONFLICT';

export type DirtyDataStatus = 'PENDING' | 'FIXED' | 'IGNORED';

export type HandleMode = 'OVERWRITE' | 'IGNORE';

export interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
}

export interface Material {
  id: string;
  type: MaterialType;
  sourceFile?: string;
  parsedData: Record<string, any>;
  batchKey: string;
  version: number;
  isLatest: boolean;
  handleMode?: HandleMode;
  createdBy: string;
  createdAt: string;
}

export interface TimelineEvent {
  timestamp: string;
  fromStatus?: ChainStatus;
  toStatus: ChainStatus;
  operator: string;
  reason: string;
}

export interface DirtyDataRecord {
  id: string;
  materialId: string;
  type: DirtyDataType;
  fieldName: string;
  originalValue: any;
  suggestedValue?: any;
  finalValue?: any;
  status: DirtyDataStatus;
  fixNote?: string;
  fixedAt?: string;
  createdAt: string;
  material?: Material;
}

export interface Chain {
  id: string;
  chainNo: string;
  storeName: string;
  businessDate: string;
  status: ChainStatus;
  totalAmount: number;
  materials: Material[];
  timeline: TimelineEvent[];
  dirtyData: DirtyDataRecord[];
  reconciliation?: {
    isPassed: boolean;
    differences: any[];
    confirmedAt?: string;
  };
  techView?: {
    httpRequests: HttpLog[];
    sqlStatements: SqlLog[];
    commands: CommandLog[];
  };
}

export interface ChainListItem {
  id: string;
  chainNo: string;
  storeName: string;
  businessDate: string;
  status: ChainStatus;
  totalAmount: number;
  _count: {
    materials: number;
  };
}

export interface HttpLog {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestBody?: string;
  responseBody?: string;
  createdAt: string;
}

export interface SqlLog {
  id: string;
  sql: string;
  params: any;
  duration: number;
  createdAt: string;
}

export interface CommandLog {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  createdAt: string;
}

export interface DashboardStats {
  totalChains: number;
  pendingChains: number;
  exceptionChains: number;
  reconciledChains: number;
  dirtyDataCount: number;
  recentChains: ChainListItem[];
}
