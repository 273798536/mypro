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

export interface OrderData {
  orderNo: string;
  storeName: string;
  orderDate: string;
  items: OrderItem[];
  totalAmount: number;
  salesman?: string;
}

export interface IouData {
  iouNo: string;
  storeName: string;
  signDate: string;
  driver?: string;
  truckNo?: string;
  items: OrderItem[];
  totalAmount: number;
  signature?: string;
  remark?: string;
}

export interface TrackPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  location?: string;
}

export interface TrackData {
  trackNo: string;
  driver: string;
  truckNo: string;
  points: TrackPoint[];
  startTime: string;
  endTime: string;
}

export interface StatementItem {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
}

export interface StatementData {
  statementNo: string;
  supplierName: string;
  statementDate: string;
  items: StatementItem[];
  totalAmount: number;
}

export interface EmailData {
  emailId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  content: string;
  attachments?: string[];
}
