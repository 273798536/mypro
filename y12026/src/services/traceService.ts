import type { TraceData, RenewalRecord, MonthlyCard, LicensePlate, TempParkingRecord, Discount, PlateBinding } from '@/types';

export const generateTraceLink = (renewalId: string, traceCode: string): string => {
  const params = new URLSearchParams({
    id: renewalId,
    code: traceCode,
  });
  return `${window.location.origin}/trace?${params.toString()}`;
};

export const parseTraceLink = (): { id: string | null; code: string | null } => {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get('id'),
    code: params.get('code'),
  };
};

export const encodeTraceData = (data: Partial<TraceData>): string => {
  try {
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
};

export const decodeTraceData = (encoded: string): Partial<TraceData> | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const buildTraceData = (
  renewalRecord: RenewalRecord,
  monthlyCard: MonthlyCard | undefined,
  licensePlate: LicensePlate | undefined,
  tempParkingRecords: TempParkingRecord[],
  allDiscounts: Discount[],
  bindingHistory: PlateBinding[]
): TraceData | null => {
  if (!monthlyCard || !licensePlate) {
    return null;
  }

  const appliedDiscounts = allDiscounts.filter((d) =>
    renewalRecord.appliedDiscountIds.includes(d.id)
  );

  const relevantTempParking = tempParkingRecords.filter(
    (r) => r.plateNumber === renewalRecord.plateNumber && !r.isDeducted
  );

  return {
    renewalRecord,
    monthlyCard,
    licensePlate,
    tempParkingRecords: relevantTempParking,
    appliedDiscounts,
    bindingHistory,
  };
};

export const generateTraceSummary = (traceData: TraceData): string => {
  const { renewalRecord, monthlyCard, licensePlate, appliedDiscounts, tempParkingRecords } = traceData;
  
  const lines = [
    `【追溯报告】追溯码: ${renewalRecord.traceCode}`,
    `车牌号: ${renewalRecord.plateNumber}`,
    `业主: ${licensePlate.ownerName} (${licensePlate.building} ${licensePlate.roomNumber})`,
    `月卡类型: ${monthlyCard.cardType === 'standard' ? '标准卡' : monthlyCard.cardType === 'vip' ? 'VIP卡' : '员工卡'}`,
    `续费月数: ${renewalRecord.renewalMonths}个月`,
    `基础费用: ¥${renewalRecord.baseFee.toFixed(2)}`,
    `临停抵扣: ¥${renewalRecord.tempParkingDeduction.toFixed(2)} (${tempParkingRecords.length}条记录)`,
    `优惠减免: ¥${renewalRecord.discountAmount.toFixed(2)} (${appliedDiscounts.length}项优惠)`,
    `实付金额: ¥${renewalRecord.totalAmount.toFixed(2)}`,
    `状态: ${renewalRecord.reviewStatus === 'normal' ? '正常' : renewalRecord.reviewStatus === 'warning' ? '待关注' : '异常'}`,
  ];

  return lines.join('\n');
};
