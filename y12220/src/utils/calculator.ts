import type {
  Segment,
  CalculationResult,
  AnomalyItem,
  CalculationDetail,
  MileageResult,
  CabinClass,
} from '../types';
import { getCabinName } from './mockData';

const generateId = () => crypto.randomUUID();

const sumTaxes = (taxes: Segment['taxes']): number => {
  return taxes.reduce((sum, t) => sum + t.amount, 0);
};

const calculateFareDifference = (original: Segment[], newSegments: Segment[]): number => {
  const originalTotal = original.reduce((sum, s) => sum + s.baseFare, 0);
  const newTotal = newSegments.reduce((sum, s) => sum + s.baseFare, 0);
  return newTotal - originalTotal;
};

const calculateTaxDifference = (original: Segment[], newSegments: Segment[]): number => {
  const originalTotal = original.reduce((sum, s) => sum + sumTaxes(s.taxes), 0);
  const newTotal = newSegments.reduce((sum, s) => sum + sumTaxes(s.taxes), 0);
  return newTotal - originalTotal;
};

const calculateMileageAdjustment = (
  originalMileage: number,
  newSegments: Segment[],
  mileageRate: number
): MileageResult => {
  const newBaseFare = newSegments.reduce((sum, s) => sum + s.baseFare, 0);
  const newMileage = Math.floor(newBaseFare / mileageRate * 0.5);
  const refund = originalMileage - newMileage;

  return {
    newMileage,
    refund,
    rate: mileageRate,
  };
};

const detectAnomalies = (
  original: Segment[],
  newSegments: Segment[],
  mileage: MileageResult
): AnomalyItem[] => {
  const anomalies: AnomalyItem[] = [];

  original.forEach((seg, idx) => {
    const newSeg = newSegments[idx];
    if (!newSeg) return;

    if (seg.cabinClass !== newSeg.cabinClass) {
      anomalies.push({
        id: generateId(),
        type: 'cabin_change',
        severity: 'warning',
        segmentIndex: idx,
        description: `第${idx + 1}航段舱位变更: ${getCabinName(seg.cabinClass)} → ${getCabinName(newSeg.cabinClass)}`,
        affectedResults: ['舱位差价', '税费计算'],
        amountImpact: newSeg.baseFare - seg.baseFare,
        ruleBasis: '航司舱位变更差价规则第3.2条',
      });
    }

    if (seg.country !== newSeg.country) {
      anomalies.push({
        id: generateId(),
        type: 'cross_country_tax',
        severity: 'warning',
        segmentIndex: idx,
        description: `第${idx + 1}航段国家变更: ${seg.country} → ${newSeg.country}`,
        affectedResults: ['税费计算', '税项明细'],
        amountImpact: sumTaxes(newSeg.taxes) - sumTaxes(seg.taxes),
        ruleBasis: '跨国税费重算规则第5.1条',
      });
    }

    if (seg.departureAirport !== newSeg.departureAirport || seg.arrivalAirport !== newSeg.arrivalAirport) {
      anomalies.push({
        id: generateId(),
        type: 'cross_country_tax',
        severity: 'warning',
        segmentIndex: idx,
        description: `第${idx + 1}航段航线变更: ${seg.departureAirport}-${seg.arrivalAirport} → ${newSeg.departureAirport}-${newSeg.arrivalAirport}`,
        affectedResults: ['舱位差价', '税费计算', '里程计算'],
        amountImpact: (newSeg.baseFare + sumTaxes(newSeg.taxes)) - (seg.baseFare + sumTaxes(seg.taxes)),
        ruleBasis: '航线变更票价重算规则第2.1条',
      });
    }
  });

  if (Math.abs(mileage.refund) > 0) {
    anomalies.push({
      id: generateId(),
      type: 'mileage_refund',
      severity: mileage.refund > 0 ? 'warning' : 'error',
      description: `里程${mileage.refund > 0 ? '退还' : '补扣'}: ${Math.abs(mileage.refund)} 里程`,
      affectedResults: ['总差价', '里程账户'],
      amountImpact: mileage.refund * mileage.rate,
      ruleBasis: '里程改签规则第7.3条',
    });
  }

  return anomalies;
};

const generateCalculationDetails = (
  fareDiff: number,
  taxDiff: number,
  mileage: MileageResult,
  originalSegments: Segment[],
  newSegments: Segment[],
  originalMileage: number
): CalculationDetail[] => {
  const details: CalculationDetail[] = [];

  details.push({
    id: generateId(),
    item: '舱位差价',
    originalAmount: originalSegments.reduce((s, seg) => s + seg.baseFare, 0),
    newAmount: newSegments.reduce((s, seg) => s + seg.baseFare, 0),
    difference: fareDiff,
    remark: '各航段舱位价格差额',
  });

  originalSegments.forEach((seg, idx) => {
    const newSeg = newSegments[idx];
    if (newSeg && seg.baseFare !== newSeg.baseFare) {
      details.push({
        id: generateId(),
        item: `  - 第${idx + 1}航段 ${seg.flightNo}`,
        originalAmount: seg.baseFare,
        newAmount: newSeg.baseFare,
        difference: newSeg.baseFare - seg.baseFare,
        remark: `${getCabinName(seg.cabinClass)} → ${getCabinName(newSeg.cabinClass)}`,
      });
    }
  });

  details.push({
    id: generateId(),
    item: '税费差价',
    originalAmount: originalSegments.reduce((s, seg) => s + sumTaxes(seg.taxes), 0),
    newAmount: newSegments.reduce((s, seg) => s + sumTaxes(seg.taxes), 0),
    difference: taxDiff,
    remark: '各航段税费重算差额',
  });

  originalSegments.forEach((seg, idx) => {
    const newSeg = newSegments[idx];
    if (newSeg) {
      const origTax = sumTaxes(seg.taxes);
      const newTax = sumTaxes(newSeg.taxes);
      if (origTax !== newTax) {
        details.push({
          id: generateId(),
          item: `  - 第${idx + 1}航段税费`,
          originalAmount: origTax,
          newAmount: newTax,
          difference: newTax - origTax,
          remark: `${seg.country} → ${newSeg.country} 税费标准变更`,
        });
      }
    }
  });

  details.push({
    id: generateId(),
    item: '里程调整',
    originalAmount: originalMileage * mileage.rate,
    newAmount: mileage.newMileage * mileage.rate,
    difference: mileage.refund * mileage.rate,
    remark: `里程抵扣${mileage.refund > 0 ? '退还' : '补扣'}（1里程=${mileage.rate}元）`,
  });

  details.push({
    id: generateId(),
    item: '应收差价合计',
    originalAmount: originalSegments.reduce((s, seg) => s + seg.baseFare + sumTaxes(seg.taxes), 0) + originalMileage * mileage.rate,
    newAmount: newSegments.reduce((s, seg) => s + seg.baseFare + sumTaxes(seg.taxes), 0) + mileage.newMileage * mileage.rate,
    difference: fareDiff + taxDiff + mileage.refund * mileage.rate,
    remark: '舱位差价 + 税费差价 + 里程调整',
  });

  return details;
};

export const calculateRebookDifference = (
  originalSegments: Segment[],
  newSegments: Segment[],
  originalMileage: number,
  mileageRate: number = 0.01
): CalculationResult => {
  if (originalSegments.length !== newSegments.length) {
    throw new Error('原航段与新航段数量不一致');
  }

  const fareDiff = calculateFareDifference(originalSegments, newSegments);
  const taxDiff = calculateTaxDifference(originalSegments, newSegments);
  const mileageResult = calculateMileageAdjustment(originalMileage, newSegments, mileageRate);
  const anomalies = detectAnomalies(originalSegments, newSegments, mileageResult);
  const details = generateCalculationDetails(
    fareDiff,
    taxDiff,
    mileageResult,
    originalSegments,
    newSegments,
    originalMileage
  );

  return {
    fareDifference: fareDiff,
    taxDifference: taxDiff,
    mileageRefund: mileageResult.refund * mileageRate,
    totalDifference: fareDiff + taxDiff + mileageResult.refund * mileageRate,
    anomalies,
    details,
  };
};

export const formatCurrency = (amount: number, currency: string = 'CNY'): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatMileage = (mileage: number): string => {
  return new Intl.NumberFormat('zh-CN').format(mileage) + ' 里程';
};

export const getAnomalyTypeLabel = (type: AnomalyItem['type']): string => {
  const labels: Record<AnomalyItem['type'], string> = {
    cabin_change: '舱位变更',
    cross_country_tax: '跨国税费',
    mileage_refund: '里程调整',
  };
  return labels[type] || type;
};

export const getAnomalySeverityColor = (severity: AnomalyItem['severity']): string => {
  return severity === 'error' ? 'text-accent-red-600' : 'text-accent-amber-600';
};

export const getAnomalySeverityBgColor = (severity: AnomalyItem['severity']): string => {
  return severity === 'error' ? 'bg-accent-red-50 border-accent-red-500' : 'bg-accent-amber-50 border-accent-amber-500';
};

export const recalculateSegmentTaxes = (
  segment: Segment,
  country: string,
  taxRules: Array<{ country: string; taxCode: string; taxName: string; rate: number; isFixed: boolean; fixedAmount?: number }>
): Segment => {
  const applicableRules = taxRules.filter(r => r.country === country);
  const taxes = applicableRules.map(rule => ({
    code: rule.taxCode,
    name: rule.taxName,
    amount: rule.isFixed ? (rule.fixedAmount || 0) : segment.baseFare * rule.rate,
    country,
    rate: rule.rate,
  }));

  return {
    ...segment,
    country,
    taxes,
  };
};

export const getCabinPriceFromBenchmark = (
  flightNo: string,
  cabinClass: CabinClass,
  cabinPrices: Array<{ flightNo: string; cabinClass: CabinClass; basePrice: number }>
): number | null => {
  const price = cabinPrices.find(p => p.flightNo === flightNo && p.cabinClass === cabinClass);
  return price ? price.basePrice : null;
};

export default calculateRebookDifference;
