import type { MotorTorqueRecord, JumpDiagnosisResult, TorqueUnit } from '../types';

const NORMAL_THRESHOLD_MULTIPLIER = 3;

export function detectOutliers(records: MotorTorqueRecord[]): MotorTorqueRecord[] {
  const values = records.map(r => r.torque_value).filter(v => !isNaN(v));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  );
  const upperBound = mean + NORMAL_THRESHOLD_MULTIPLIER * std;
  const lowerBound = mean - NORMAL_THRESHOLD_MULTIPLIER * std;

  return records.map(record => {
    const isOutlier = record.torque_value > upperBound || record.torque_value < lowerBound;
    let outlierReason: MotorTorqueRecord['outlier_reason'] = undefined;

    if (isOutlier) {
      outlierReason = record.torque_value > upperBound ? 'extreme_high' : 'extreme_low';
    }

    return {
      ...record,
      is_outlier: isOutlier,
      outlier_reason: outlierReason
    };
  });
}

export function markDuplicateDevices(records: MotorTorqueRecord[]): MotorTorqueRecord[] {
  const deviceIdMap = new Map<string, MotorTorqueRecord[]>();

  records.forEach(record => {
    const existing = deviceIdMap.get(record.device_id) || [];
    deviceIdMap.set(record.device_id, [...existing, record]);
  });

  return records.map(record => {
    const sameIdRecords = deviceIdMap.get(record.device_id) || [];
    const isDuplicate = sameIdRecords.length > 1;
    const duplicateIds = sameIdRecords
      .filter(r => r.id !== record.id)
      .map(r => r.id);

    return {
      ...record,
      is_device_duplicate: isDuplicate,
      duplicate_device_ids: isDuplicate ? duplicateIds : undefined
    };
  });
}

export function markDirtyData(records: MotorTorqueRecord[]): MotorTorqueRecord[] {
  return records.map(record => {
    const isDirty = detectDirtyData(record);
    const cleanedNote = isDirty ? cleanMaintenanceNote(record.maintenance_note_raw) : undefined;

    return {
      ...record,
      is_data_dirty: isDirty,
      maintenance_note_cleaned: cleanedNote
    };
  });
}

function detectDirtyData(record: MotorTorqueRecord): boolean {
  const note = record.maintenance_note_raw || '';
  const hasGarbageChars = /[^\u4e00-\u9fa5a-zA-Z0-9\s.,;:!?()（）【】\[\]、，。；：！？]/.test(note);
  const isEmpty = note.trim() === '';
  const hasOnlySpecialChars = /^[^a-zA-Z0-9\u4e00-\u9fa5]+$/.test(note);
  const hasInvalidValue = isNaN(record.torque_value) || isNaN(record.speed) || isNaN(record.current);

  return hasGarbageChars || isEmpty || hasOnlySpecialChars || hasInvalidValue;
}

function cleanMaintenanceNote(note: string): string {
  return note
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,;:!?()（）【】\[\]、，。；：！？]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

const UNIT_CONVERSION: Record<TorqueUnit, number> = {
  'N·m': 1,
  'kg·m': 9.80665,
  'lb·ft': 1.35582
};

export function convertToNm(value: number, unit: TorqueUnit): number {
  return value * UNIT_CONVERSION[unit];
}

const JUMP_THRESHOLD_PERCENTAGE = 50;

export function diagnoseJumps(records: MotorTorqueRecord[]): JumpDiagnosisResult[] {
  const sorted = [...records].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const results: JumpDiagnosisResult[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = sorted[i - 1];

    const currentNm = convertToNm(current.torque_value, current.torque_unit);
    const previousNm = convertToNm(previous.torque_value, previous.torque_unit);

    const jumpValue = Math.abs(currentNm - previousNm);
    const jumpPercentage = (jumpValue / Math.abs(previousNm + 0.001)) * 100;

    if (jumpPercentage >= JUMP_THRESHOLD_PERCENTAGE) {
      const diagnosis = diagnoseJumpCause(current, previous);
      results.push({
        record_id: current.id,
        timestamp: current.timestamp,
        jump_value: jumpValue,
        jump_percentage: jumpPercentage,
        cause: diagnosis.cause,
        cause_detail: diagnosis.detail,
        previous_record_id: previous.id,
        previous_value: previous.torque_value,
        previous_unit: previous.torque_unit,
        previous_name: previous.device_name
      });
    }
  }

  return results;
}

function diagnoseJumpCause(
  current: MotorTorqueRecord,
  previous: MotorTorqueRecord
): { cause: JumpDiagnosisResult['cause']; detail: string } {
  if (current.torque_unit !== previous.torque_unit) {
    return {
      cause: 'unit_change',
      detail: `单位从 ${previous.torque_unit} 变为 ${current.torque_unit}，换算后差异 ${current.torque_value * UNIT_CONVERSION[current.torque_unit] - previous.torque_value * UNIT_CONVERSION[previous.torque_unit]} N·m`
    };
  }

  if (current.device_name !== previous.device_name) {
    return {
      cause: 'name_mismatch',
      detail: `设备名称从 "${previous.device_name}" 变为 "${current.device_name}"，可能不是同一条材料记录`
    };
  }

  const currentNm = convertToNm(current.torque_value, current.torque_unit);
  const previousNm = convertToNm(previous.torque_value, previous.torque_unit);
  const diff = Math.abs(currentNm - previousNm);
  const ratedThreshold = current.rated_torque * 0.8;

  if (currentNm > ratedThreshold || previousNm > ratedThreshold) {
    return {
      cause: 'threshold_cross',
      detail: `扭矩值超过额定扭矩阈值 ${ratedThreshold} N·m，当前值 ${currentNm.toFixed(2)} N·m，额定扭矩 ${current.rated_torque} N·m`
    };
  }

  return {
    cause: 'unknown',
    detail: `跳变原因待排查，从 ${previousNm.toFixed(2)} N·m 变为 ${currentNm.toFixed(2)} N·m，变化 ${diff.toFixed(2)} N·m`
  };
}
