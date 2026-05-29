import type { CalculationSegment, ExemptionDetail, CalculationFlag } from '@shared/types.js';
import type { BerthRow, HandlingRow, ContractRow, WeatherRow } from '../db/types.js';

interface SegmentInput {
  berth: BerthRow;
  handlings: HandlingRow[];
  contract: ContractRow | null;
  weathers: WeatherRow[];
}

export function segmentAndCalculate(input: SegmentInput): {
  segments: CalculationSegment[];
  flags: CalculationFlag[];
  totalDemurrage: number;
  freePeriodHours: number;
  chargeableHours: number;
  exemptedHours: number;
} {
  const { berth, handlings, contract, weathers } = input;
  const flags: CalculationFlag[] = [];
  const segments: CalculationSegment[] = [];

  const berthStart = berth.berth_start ? new Date(berth.berth_start) : null;
  const berthEnd = berth.berth_end ? new Date(berth.berth_end) : null;
  const noticeTime = berth.notice_time ? new Date(berth.notice_time) : null;

  if (!berthStart && !noticeTime) {
    return { segments: [], flags: ['rate_missing'], totalDemurrage: 0, freePeriodHours: 0, chargeableHours: 0, exemptedHours: 0 };
  }

  const effectiveStart = berthStart || noticeTime!;
  const effectiveEnd = berthEnd || new Date();

  const handlingStart = handlings.length > 0 && handlings[0].handling_start
    ? new Date(handlings[0].handling_start)
    : effectiveStart;
  const handlingEnd = handlings.length > 0 && handlings[0].handling_end
    ? new Date(handlings[0].handling_end)
    : effectiveEnd;

  const freeHours = contract?.free_hours ?? 0;

  let freePeriodEnd: Date;
  if (berth.free_period_end) {
    freePeriodEnd = new Date(berth.free_period_end);
  } else {
    freePeriodEnd = new Date(effectiveStart.getTime() + freeHours * 3600000);
  }

  const totalHours = (effectiveEnd.getTime() - effectiveStart.getTime()) / 3600000;
  const freePeriodHours = Math.min(totalHours, (freePeriodEnd.getTime() - effectiveStart.getTime()) / 3600000);
  const chargeableHoursRaw = Math.max(0, totalHours - freePeriodHours);

  if (freePeriodHours > 0) {
    segments.push({
      id: crypto.randomUUID(),
      startTime: effectiveStart.toISOString(),
      endTime: freePeriodEnd.toISOString(),
      type: 'free',
      rateTier: '免费期',
      rate: 0,
      hours: Math.round(freePeriodHours * 100) / 100,
      amount: 0,
      exemptions: [],
      needsReview: false,
    });
  }

  const chargeableStart = freePeriodEnd;
  if (chargeableStart >= effectiveEnd) {
    return {
      segments,
      flags,
      totalDemurrage: 0,
      freePeriodHours: Math.round(freePeriodHours * 100) / 100,
      chargeableHours: 0,
      exemptedHours: 0,
    };
  }

  const pauseHours = handlings.reduce((sum, h) => sum + (h.pause_hours || 0), 0);
  if (pauseHours > 0) {
    flags.push('handling_pause');
  }

  const weatherExemptions = matchWeatherExemptions(effectiveStart, chargeableStart, effectiveEnd, weathers, flags);
  const totalExemptedHours = weatherExemptions.reduce((sum, e) => sum + e.hours, 0);
  const netChargeableHours = Math.max(0, chargeableHoursRaw - totalExemptedHours);

  const rateResult = applyRateTiers(chargeableStart, effectiveEnd, netChargeableHours, totalExemptedHours, contract, weatherExemptions, pauseHours > 0, flags);

  segments.push(...rateResult.segments);

  return {
    segments,
    flags,
    totalDemurrage: Math.round(rateResult.totalAmount * 100) / 100,
    freePeriodHours: Math.round(freePeriodHours * 100) / 100,
    chargeableHours: Math.round(netChargeableHours * 100) / 100,
    exemptedHours: Math.round(totalExemptedHours * 100) / 100,
  };
}

function matchWeatherExemptions(
  effectiveStart: Date,
  chargeableStart: Date,
  chargeableEnd: Date,
  weathers: WeatherRow[],
  flags: CalculationFlag[]
): ExemptionDetail[] {
  const exemptions: ExemptionDetail[] = [];

  for (const w of weathers) {
    if (!w.weather_start || !w.weather_end) continue;

    const wStart = new Date(w.weather_start);
    const wEnd = new Date(w.weather_end);

    const overlapStart = new Date(Math.max(wStart.getTime(), chargeableStart.getTime()));
    const overlapEnd = new Date(Math.min(wEnd.getTime(), chargeableEnd.getTime()));

    const overlapHours = overlapStart < overlapEnd
      ? (overlapEnd.getTime() - overlapStart.getTime()) / 3600000
      : 0;

    const crossPeriodBoundary = wStart < chargeableStart || wEnd > chargeableEnd;
    const fullyInFreePeriod = wEnd <= chargeableStart && wStart >= effectiveStart;

    let stuckAt: string | undefined;
    if (crossPeriodBoundary && overlapHours > 0) {
      if (wStart < chargeableStart) {
        stuckAt = `豁免开始时间 ${wStart.toISOString()} 早于计费期开始 ${chargeableStart.toISOString()}，豁免跨入免费期`;
      }
      if (wEnd > chargeableEnd) {
        stuckAt = `豁免结束时间 ${wEnd.toISOString()} 晚于计费期结束 ${chargeableEnd.toISOString()}，豁免跨出计费期`;
      }
      flags.push('weather_cross_period');
    } else if (fullyInFreePeriod) {
      stuckAt = `天气豁免 (${wStart.toISOString()} ~ ${wEnd.toISOString()}) 完全在免费期内，不影响计费`;
      flags.push('weather_cross_period');
    } else if (wEnd <= chargeableStart && wStart < effectiveStart) {
      stuckAt = `天气豁免 (${wStart.toISOString()} ~ ${wEnd.toISOString()}) 在靠泊前已结束，不影响计费`;
    }

    if (overlapHours > 0 || stuckAt) {
      exemptions.push({
        type: 'weather',
        hours: Math.round(overlapHours * 100) / 100,
        detail: `${w.weather_type || '天气豁免'}: ${wStart.toISOString()} ~ ${wEnd.toISOString()}`,
        crossPeriodBoundary: crossPeriodBoundary || fullyInFreePeriod,
        stuckAt,
      });
    }
  }

  return exemptions;
}

function applyRateTiers(
  chargeableStart: Date,
  chargeableEnd: Date,
  netChargeableHours: number,
  totalExemptedHours: number,
  contract: ContractRow | null,
  exemptions: ExemptionDetail[],
  hasPause: boolean,
  flags: CalculationFlag[]
): { segments: CalculationSegment[]; totalAmount: number } {
  const segments: CalculationSegment[] = [];
  let totalAmount = 0;

  if (!contract || (contract.rate_tier1 == null && contract.rate_tier2 == null && contract.rate_tier3 == null)) {
    flags.push('rate_missing');
    segments.push({
      id: crypto.randomUUID(),
      startTime: chargeableStart.toISOString(),
      endTime: chargeableEnd.toISOString(),
      type: 'chargeable',
      rateTier: '费率缺失',
      rate: 0,
      hours: Math.round(netChargeableHours * 100) / 100,
      amount: 0,
      exemptions,
      needsReview: true,
      reviewReason: '合同费率缺失，请补充费率后重新试算。当前以 0 计费，结果不可用于结算',
    });
    return { segments, totalAmount: 0 };
  }

  const tiers: Array<{ name: string; rate: number; maxDays: number | null }> = [];
  if (contract.rate_tier1 != null) {
    tiers.push({ name: '第一档', rate: contract.rate_tier1, maxDays: contract.rate_tier1_max_days ?? null });
  }
  if (contract.rate_tier2 != null) {
    tiers.push({ name: '第二档', rate: contract.rate_tier2, maxDays: contract.rate_tier2_max_days ?? null });
  }
  if (contract.rate_tier3 != null) {
    tiers.push({ name: '第三档', rate: contract.rate_tier3, maxDays: null });
  }

  if (tiers.length >= 2) {
    flags.push('rate_step_review');
  }

  let remainingHours = netChargeableHours;
  let currentOffset = 0;

  for (let i = 0; i < tiers.length; i++) {
    if (remainingHours <= 0) break;

    const tier = tiers[i];
    const tierMaxHours = tier.maxDays ? tier.maxDays * 24 : remainingHours;
    const tierHours = Math.min(remainingHours, tierMaxHours);
    const amount = Math.round(tierHours * tier.rate * 100) / 100;

    const segStart = new Date(chargeableStart.getTime() + (currentOffset + totalExemptedHours) * 3600000);
    const segEnd = new Date(segStart.getTime() + tierHours * 3600000);

    segments.push({
      id: crypto.randomUUID(),
      startTime: segStart.toISOString(),
      endTime: segEnd.toISOString(),
      type: 'chargeable',
      rateTier: tier.name,
      rate: tier.rate,
      hours: Math.round(tierHours * 100) / 100,
      amount,
      exemptions: i === 0 ? exemptions : [],
      needsReview: hasPause || (tiers.length >= 2 && i > 0),
      reviewReason: hasPause ? '存在装卸暂停时段，请复核暂停时间是否合理扣除' : (tiers.length >= 2 && i > 0 ? '涉及多档费率阶梯，请复核阶梯切分是否正确' : undefined),
    });

    totalAmount += amount;
    remainingHours -= tierHours;
    currentOffset += tierHours;
  }

  return { segments, totalAmount };
}
