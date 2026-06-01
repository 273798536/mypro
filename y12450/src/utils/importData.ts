import { Bond, Coupon, PutOption, DefaultEvent, SourceInfo, SourceType, ImportResult } from '../types';
import * as XLSX from 'xlsx';

export interface RawBondData {
  name: string;
  code: string;
  faceValue: number;
  issueDate: string;
  maturityDate: string;
  couponRate: number;
  couponFrequency: number;
  hasPutOption: boolean;
  putDate?: string;
}

export interface RawCouponData {
  bondCode: string;
  paymentDate: string;
  amount: number;
  period: number;
  isDeferred?: boolean;
  deferredTo?: string;
  deferralReason?: string;
}

export interface RawPutData {
  bondCode: string;
  exerciseDate: string;
  strikePrice: number;
}

export interface RawDefaultData {
  bondCode: string;
  eventDate: string;
  eventType: 'coupon_miss' | 'principal_miss' | 'bankruptcy' | 'restructuring';
  severity: 'warning' | 'mild' | 'severe';
  description: string;
  impactDetails: string[];
}

const createSourceInfo = (type: SourceType, provider: string): SourceInfo => ({
  id: `src-${type}-${Date.now()}`,
  type,
  provider,
  providedAt: new Date(),
  rawData: {}
});

export const parseBondData = (
  rawData: RawBondData,
  provider: string
): ImportResult<Bond> => {
  const errors: string[] = [];
  const source = createSourceInfo('bond', provider);

  if (!rawData.name) errors.push('债券名称不能为空');
  if (!rawData.code) errors.push('债券代码不能为空');
  if (!rawData.faceValue || rawData.faceValue <= 0) errors.push('面值必须大于0');
  if (!rawData.issueDate) errors.push('发行日期不能为空');
  if (!rawData.maturityDate) errors.push('到期日期不能为空');

  if (errors.length > 0) {
    return { success: false, data: [], errors, sourceId: source.id };
  }

  const bond: Bond = {
    id: `bond-${rawData.code}`,
    name: rawData.name,
    code: rawData.code,
    faceValue: rawData.faceValue,
    issueDate: new Date(rawData.issueDate),
    maturityDate: new Date(rawData.maturityDate),
    couponRate: rawData.couponRate,
    couponFrequency: rawData.couponFrequency || 1,
    hasPutOption: rawData.hasPutOption || false,
    putDate: rawData.putDate ? new Date(rawData.putDate) : undefined,
    sourceId: source.id
  };

  return { success: true, data: [bond], errors: [], sourceId: source.id };
};

export const parseCouponData = (
  rawDataList: RawCouponData[],
  bondId: string,
  provider: string
): ImportResult<Coupon> => {
  const errors: string[] = [];
  const source = createSourceInfo('coupon', provider);
  const coupons: Coupon[] = [];

  rawDataList.forEach((raw, index) => {
    if (!raw.bondCode) {
      errors.push(`第${index + 1}行: 债券代码不能为空`);
      return;
    }
    if (!raw.paymentDate) {
      errors.push(`第${index + 1}行: 支付日期不能为空`);
      return;
    }
    if (!raw.amount || raw.amount <= 0) {
      errors.push(`第${index + 1}行: 金额必须大于0`);
      return;
    }

    coupons.push({
      id: `coupon-${bondId}-${raw.period}`,
      bondId,
      paymentDate: new Date(raw.paymentDate),
      amount: raw.amount,
      period: raw.period,
      isDeferred: raw.isDeferred || false,
      deferredTo: raw.deferredTo ? new Date(raw.deferredTo) : undefined,
      deferralReason: raw.deferralReason,
      isProcessed: false,
      sourceId: source.id
    });
  });

  return {
    success: errors.length === 0,
    data: coupons,
    errors,
    sourceId: source.id
  };
};

export const parsePutData = (
  rawData: RawPutData,
  bondId: string,
  provider: string
): ImportResult<PutOption> => {
  const errors: string[] = [];
  const source = createSourceInfo('put', provider);

  if (!rawData.exerciseDate) errors.push('行权日期不能为空');
  if (!rawData.strikePrice || rawData.strikePrice <= 0) errors.push('行权价格必须大于0');

  if (errors.length > 0) {
    return { success: false, data: [], errors, sourceId: source.id };
  }

  const putOption: PutOption = {
    id: `put-${bondId}`,
    bondId,
    exerciseDate: new Date(rawData.exerciseDate),
    strikePrice: rawData.strikePrice,
    isExercised: false,
    isSelected: false,
    sourceId: source.id
  };

  return { success: true, data: [putOption], errors: [], sourceId: source.id };
};

export const parseDefaultData = (
  rawData: RawDefaultData,
  bondId: string,
  provider: string
): ImportResult<DefaultEvent> => {
  const errors: string[] = [];
  const source = createSourceInfo('default', provider);

  if (!rawData.eventDate) errors.push('事件日期不能为空');
  if (!rawData.eventType) errors.push('事件类型不能为空');
  if (!rawData.description) errors.push('事件描述不能为空');

  if (errors.length > 0) {
    return { success: false, data: [], errors, sourceId: source.id };
  }

  const defaultEvent: DefaultEvent = {
    id: `default-${bondId}-${Date.now()}`,
    bondId,
    eventDate: new Date(rawData.eventDate),
    eventType: rawData.eventType,
    severity: rawData.severity,
    description: rawData.description,
    isResolved: false,
    impactDetails: rawData.impactDetails || [],
    sourceId: source.id,
    isBackfilled: true,
    backfilledAt: new Date()
  };

  return { success: true, data: [defaultEvent], errors: [], sourceId: source.id };
};

export const importFromExcel = async (
  file: File,
  type: SourceType,
  provider: string
): Promise<ImportResult<unknown>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const source = createSourceInfo(type, provider);

        resolve({
          success: true,
          data: jsonData,
          errors: [],
          sourceId: source.id
        });
      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`文件解析失败: ${(error as Error).message}`],
          sourceId: ''
        });
      }
    };
    reader.readAsBinaryString(file);
  });
};
