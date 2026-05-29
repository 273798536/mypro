import { getAllBerths, getBerthsByVesselAndPort } from '../db/repositories/berthRepo.js';
import { getHandlingsByBerthId } from '../db/repositories/handlingRepo.js';
import { getContractByVesselAndPort } from '../db/repositories/contractRepo.js';
import { getWeathersByVesselAndPort, getWeathersByBerthId } from '../db/repositories/weatherRepo.js';
import { insertCalculation, insertSegment, getCalculationById, getSegmentsByCalculationId, listCalculations, deleteAllCalculations } from '../db/repositories/calculationRepo.js';
import { segmentAndCalculate } from '../engine/segmenter.js';
import { buildAuditTrail } from '../engine/trailBuilder.js';
import type { CalculationResult, CalculationSegment, CalculationFlag, ExemptionDetail } from '@shared/types.js';

export function runCalculation(filters?: { vesselName?: string; port?: string }): CalculationResult[] {
  deleteAllCalculations();

  const berths = filters?.vesselName && filters?.port
    ? getBerthsByVesselAndPort(filters.vesselName, filters.port)
    : getAllBerths();

  const results: CalculationResult[] = [];

  for (const berth of berths) {
    const handlings = getHandlingsByBerthId(berth.id);
    const contract = getContractByVesselAndPort(berth.vessel_name, berth.port);
    const weathers = berth.id
      ? [...getWeathersByBerthId(berth.id), ...getWeathersByVesselAndPort(berth.vessel_name, berth.port)]
      : getWeathersByVesselAndPort(berth.vessel_name, berth.port);

    const calcResult = segmentAndCalculate({ berth, handlings, contract, weathers });

    const trail = buildAuditTrail({
      berth,
      handlings,
      contract,
      weathers,
      segmentCount: calcResult.segments.length,
      totalDemurrage: calcResult.totalDemurrage,
      freePeriodHours: calcResult.freePeriodHours,
      chargeableHours: calcResult.chargeableHours,
      exemptedHours: calcResult.exemptedHours,
      flags: calcResult.flags,
    });

    const calcId = crypto.randomUUID();

    insertCalculation({
      id: calcId,
      berth_id: berth.id,
      total_demurrage: calcResult.totalDemurrage,
      free_hours: calcResult.freePeriodHours,
      chargeable_hours: calcResult.chargeableHours,
      exempted_hours: calcResult.exemptedHours,
      currency: contract?.currency || 'USD',
      flags: JSON.stringify(calcResult.flags),
    });

    for (const seg of calcResult.segments) {
      insertSegment({
        id: seg.id,
        calculation_id: calcId,
        start_time: seg.startTime,
        end_time: seg.endTime,
        segment_type: seg.type,
        rate_tier: seg.rateTier,
        rate: seg.rate,
        hours: seg.hours,
        amount: seg.amount,
        exempted_hours: seg.exemptions.reduce((s, e) => s + e.hours, 0),
        needs_review: seg.needsReview ? 1 : 0,
        review_reason: seg.reviewReason || null,
        exemptions: seg.exemptions,
      });
    }

    results.push({
      id: calcId,
      vesselName: berth.vessel_name,
      port: berth.port,
      berthTime: berth.berth_start || berth.notice_time || '',
      berthEnd: berth.berth_end || '',
      totalDemurrage: calcResult.totalDemurrage,
      freePeriodHours: calcResult.freePeriodHours,
      chargeableHours: calcResult.chargeableHours,
      exemptedHours: calcResult.exemptedHours,
      currency: contract?.currency || 'USD',
      flags: calcResult.flags,
      segments: calcResult.segments,
      auditTrail: trail,
    });
  }

  return results;
}

export function getCalculationDetail(id: string): CalculationResult | null {
  const calc = getCalculationById(id);
  if (!calc) return null;

  const segs = getSegmentsByCalculationId(id);
  const berth = getAllBerths().find(b => b.id === calc.berth_id);
  if (!berth) return null;

  const handlings = getHandlingsByBerthId(berth.id);
  const contract = getContractByVesselAndPort(berth.vessel_name, berth.port);
  const weathers = [...getWeathersByBerthId(berth.id), ...getWeathersByVesselAndPort(berth.vessel_name, berth.port)];

  const segments: CalculationSegment[] = segs.map(seg => {
    let exemptions: ExemptionDetail[] = [];
    try {
      exemptions = JSON.parse(seg.exemptions_json || '[]');
    } catch {}

    return {
      id: seg.id,
      startTime: seg.start_time,
      endTime: seg.end_time,
      type: seg.segment_type as 'free' | 'chargeable',
      rateTier: seg.rate_tier || '',
      rate: seg.rate,
      hours: seg.hours,
      amount: seg.amount,
      exemptions,
      needsReview: seg.needs_review === 1,
      reviewReason: seg.review_reason || undefined,
    };
  });

  const flags: CalculationFlag[] = JSON.parse(calc.flags || '[]');

  const trail = buildAuditTrail({
    berth,
    handlings,
    contract,
    weathers,
    segmentCount: segments.length,
    totalDemurrage: calc.total_demurrage,
    freePeriodHours: calc.free_hours,
    chargeableHours: calc.chargeable_hours,
    exemptedHours: calc.exempted_hours,
    flags,
  });

  return {
    id: calc.id,
    vesselName: berth.vessel_name,
    port: berth.port,
    berthTime: berth.berth_start || berth.notice_time || '',
    berthEnd: berth.berth_end || '',
    totalDemurrage: calc.total_demurrage,
    freePeriodHours: calc.free_hours,
    chargeableHours: calc.chargeable_hours,
    exemptedHours: calc.exempted_hours,
    currency: calc.currency,
    flags,
    segments,
    auditTrail: trail,
  };
}

export function listCalcResults(filters: { vesselName?: string; port?: string; dateFrom?: string; dateTo?: string; flag?: string }) {
  return listCalculations(filters);
}
