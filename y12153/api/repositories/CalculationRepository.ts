import { getDatabase } from '../db/database';
import type { CalculateRequest, CalculateResult, AnomalyInfo, TraceInfo, HistoryListItem, HistoryDetail } from '../../shared/types';
import crypto from 'crypto';

export interface CalculationRecord {
  id: string;
  ship_name: string;
  displacement: number;
  GM: number;
  roll_radius: number;
  ship_length: number;
  ship_width: number;
  significant_height: number | null;
  wave_period: number | null;
  wave_direction: number | null;
  speed: number;
  heading_angle: number;
  longitudinal_pos: number;
  vertical_pos: number;
  deck: number;
  roll_frequency: number | null;
  roll_amplitude: number | null;
  comfort_score: number | null;
  comfort_level: string | null;
  applicable_scope: string | null;
  failure_reason: string | null;
  calculation_success: number;
  is_duplicate: number;
  duplicate_of: string | null;
  params_hash: string;
  created_at: string;
}

export function calculateParamsHash(request: CalculateRequest): string {
  const hashable = {
    shipName: request.shipName,
    displacement: request.hullParams.displacement,
    GM: request.hullParams.GM,
    rollRadius: request.hullParams.rollRadius,
    shipLength: request.hullParams.shipLength,
    shipWidth: request.hullParams.shipWidth,
    significantHeight: request.waveParams.significantHeight,
    wavePeriod: request.waveParams.wavePeriod,
    waveDirection: request.waveParams.waveDirection,
    speed: request.navigationParams.speed,
    headingAngle: request.navigationParams.headingAngle,
    longitudinalPos: request.cabinParams.longitudinalPos,
    verticalPos: request.cabinParams.verticalPos,
    deck: request.cabinParams.deck,
  };
  return crypto.createHash('sha256').update(JSON.stringify(hashable)).digest('hex');
}

export function findDuplicate(paramsHash: string): CalculationRecord | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT * FROM calculation_results 
    WHERE params_hash = ? AND is_duplicate = 0
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(paramsHash) as CalculationRecord | undefined;
  return result || null;
}

export function insertCalculation(
  request: CalculateRequest,
  result: CalculateResult,
  paramsHash: string,
  isDuplicate: boolean,
  duplicateOf: string | null
): string {
  const db = getDatabase();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO calculation_results (
      id, ship_name, displacement, GM, roll_radius, ship_length, ship_width,
      significant_height, wave_period, wave_direction, speed, heading_angle,
      longitudinal_pos, vertical_pos, deck, roll_frequency, roll_amplitude,
      comfort_score, comfort_level, applicable_scope, failure_reason,
      calculation_success, is_duplicate, duplicate_of, params_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    request.shipName,
    request.hullParams.displacement,
    request.hullParams.GM,
    request.hullParams.rollRadius,
    request.hullParams.shipLength,
    request.hullParams.shipWidth,
    request.waveParams.significantHeight,
    request.waveParams.wavePeriod,
    request.waveParams.waveDirection,
    request.navigationParams.speed,
    request.navigationParams.headingAngle,
    request.cabinParams.longitudinalPos,
    request.cabinParams.verticalPos,
    request.cabinParams.deck,
    result.rollFrequency,
    result.rollAmplitude,
    result.comfortScore,
    result.comfortLevel,
    result.applicableScope,
    result.failureReason || null,
    result.calculationSuccess ? 1 : 0,
    isDuplicate ? 1 : 0,
    duplicateOf,
    paramsHash
  );

  return id;
}

export function insertAnomalies(calculationId: string, anomalies: AnomalyInfo[]): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO anomaly_records (
      id, calculation_id, anomaly_type, severity, message,
      affected_field, raw_value, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const anomaly of anomalies) {
    stmt.run(
      crypto.randomUUID(),
      calculationId,
      anomaly.type,
      anomaly.severity,
      anomaly.message,
      anomaly.affectedField,
      JSON.stringify(anomaly.rawValue),
      anomaly.source
    );
  }
}

export function insertTraceInfo(calculationId: string, traceability: TraceInfo[]): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO trace_info (
      id, calculation_id, field_name, value, unit, source, formula, standard
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const trace of traceability) {
    stmt.run(
      crypto.randomUUID(),
      calculationId,
      trace.field,
      trace.value,
      trace.unit,
      trace.source,
      trace.formula,
      trace.standard
    );
  }
}

export function getHistoryList(limit: number = 50): HistoryListItem[] {
  const db = getDatabase();
  const records = db.prepare(`
    SELECT 
      cr.id, 
      cr.ship_name, 
      cr.comfort_score, 
      cr.comfort_level, 
      cr.created_at, 
      cr.is_duplicate,
      CASE WHEN EXISTS (
        SELECT 1 FROM anomaly_records ar WHERE ar.calculation_id = cr.id
      ) THEN 1 ELSE 0 END as has_anomalies
    FROM calculation_results cr
    ORDER BY cr.created_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    id: string;
    ship_name: string;
    comfort_score: number | null;
    comfort_level: string | null;
    created_at: string;
    is_duplicate: number;
    has_anomalies: number;
  }>;

  return records.map(r => ({
    id: r.id,
    shipName: r.ship_name,
    comfortScore: r.comfort_score || 0,
    comfortLevel: r.comfort_level || '未知',
    createdAt: r.created_at,
    isDuplicate: r.is_duplicate === 1,
    hasAnomalies: r.has_anomalies === 1,
  }));
}

export function getHistoryDetail(id: string): HistoryDetail | null {
  const db = getDatabase();

  const calcRecord = db.prepare(`
    SELECT * FROM calculation_results WHERE id = ?
  `).get(id) as CalculationRecord | undefined;

  if (!calcRecord) return null;

  const anomalies = db.prepare(`
    SELECT * FROM anomaly_records WHERE calculation_id = ?
  `).all(id) as Array<{
    anomaly_type: string;
    severity: string;
    message: string;
    affected_field: string;
    raw_value: string | null;
    source: string | null;
  }>;

  const traceability = db.prepare(`
    SELECT * FROM trace_info WHERE calculation_id = ?
  `).all(id) as Array<{
    field_name: string;
    value: number;
    unit: string;
    source: string;
    formula: string;
    standard: string | null;
  }>;

  return {
    id: calcRecord.id,
    shipName: calcRecord.ship_name,
    rollFrequency: calcRecord.roll_frequency || 0,
    rollAmplitude: calcRecord.roll_amplitude || 0,
    comfortScore: calcRecord.comfort_score || 0,
    comfortLevel: calcRecord.comfort_level || '',
    rollFrequencyUnit: 'rad/s',
    rollAmplitudeUnit: '°',
    comfortScoreUnit: '级',
    applicableScope: calcRecord.applicable_scope || '',
    failureReason: calcRecord.failure_reason || undefined,
    calculationSuccess: calcRecord.calculation_success === 1,
    anomalies: anomalies.map(a => ({
      type: a.anomaly_type as any,
      severity: a.severity as any,
      message: a.message,
      affectedField: a.affected_field,
      rawValue: a.raw_value ? JSON.parse(a.raw_value) : null,
      source: a.source || '',
    })),
    traceability: traceability.map(t => ({
      field: t.field_name,
      value: t.value,
      unit: t.unit,
      source: t.source,
      formula: t.formula,
      standard: t.standard || '',
    })),
    isDuplicate: calcRecord.is_duplicate === 1,
    duplicateOf: calcRecord.duplicate_of || undefined,
    createdAt: calcRecord.created_at,
    hullParams: {
      displacement: calcRecord.displacement,
      GM: calcRecord.GM,
      rollRadius: calcRecord.roll_radius,
      shipLength: calcRecord.ship_length,
      shipWidth: calcRecord.ship_width,
      source: { name: '历史记录', timestamp: calcRecord.created_at },
    },
    waveParams: {
      significantHeight: calcRecord.significant_height,
      wavePeriod: calcRecord.wave_period,
      waveDirection: calcRecord.wave_direction,
      source: { name: '历史记录', timestamp: calcRecord.created_at },
    },
    navigationParams: {
      speed: calcRecord.speed,
      headingAngle: calcRecord.heading_angle,
      source: { name: '历史记录', timestamp: calcRecord.created_at },
    },
    cabinParams: {
      longitudinalPos: calcRecord.longitudinal_pos,
      verticalPos: calcRecord.vertical_pos,
      deck: calcRecord.deck,
      source: { name: '历史记录', timestamp: calcRecord.created_at },
    },
  };
}

export function deleteHistoryRecord(id: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`DELETE FROM calculation_results WHERE id = ?`).run(id);
  return result.changes > 0;
}
