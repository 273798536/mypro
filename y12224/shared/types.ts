export interface Resident {
  id: string;
  name: string;
  gender: '男' | '女';
  birthDate: string;
  idCard: string;
  nursingLevel: '自理' | '半护理' | '全护理' | '特护';
  bedId: string;
  admitDate: string;
  emergencyContact: string;
  emergencyPhone: string;
  status: '在住' | '退住';
  createdAt: string;
  updatedAt: string;
}

export interface Deposit {
  id: string;
  residentId: string;
  residentName: string;
  bedLabel: string;
  totalAmount: number;
  currentBalance: number;
  status: '待收' | '已收' | '部分退' | '已退';
  transactions: DepositTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface DepositTransaction {
  id: string;
  depositId: string;
  type: '收取' | '退还' | '补差收取' | '补差退还' | '费用抵扣';
  amount: number;
  reason: string;
  triggerSource: string;
  triggerEventId?: string;
  createdAt: string;
}

export interface Bed {
  id: string;
  roomNumber: string;
  bedNumber: string;
  floor: number;
  roomType: '单人间' | '双人间' | '三人间' | '特护间';
  status: '空' | '已住' | '待转出' | '待转入';
  residentId?: string;
  residentName?: string;
  dailyRate: number;
}

export interface Event {
  id: string;
  type: '转房补差' | '短住退押' | '护理变更';
  residentId: string;
  residentName: string;
  status: '申请' | '试算' | '待确认' | '已完成';
  triggerSource: string;
  currentStep: string;
  nextStep: string;
  details: EventDetail;
  feeCalculation?: FeeCalculation;
  createdAt: string;
  updatedAt: string;
}

export interface EventDetail {
  originalBedId?: string;
  targetBedId?: string;
  originalBedLabel?: string;
  targetBedLabel?: string;
  originalNursingLevel?: string;
  targetNursingLevel?: string;
  reason: string;
  admitDate?: string;
  daysStaying?: number;
}

export interface FeeCalculation {
  items: FeeItem[];
  totalDue: number;
  totalRefund: number;
  netAmount: number;
}

export interface FeeItem {
  name: string;
  amount: number;
  calculationBasis: string;
}

export interface Settlement {
  id: string;
  eventId: string;
  residentId: string;
  residentName: string;
  type: '转房补差' | '短住退押' | '护理变更';
  depositSnapshot: Deposit;
  feeCalculation: FeeCalculation;
  generatedAt: string;
}

export interface FeeRate {
  id: string;
  roomType: string;
  nursingLevel: string;
  dailyRate: number;
  depositAmount: number;
}
