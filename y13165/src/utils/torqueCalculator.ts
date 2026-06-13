import type { NameplateRecord, TorqueCalcResult, AnomalyItem, UnitConversion } from '@/types';
import { convertToNm, detectOrderOfMagnitude, checkOrderOfMagnitudeAnomaly } from './unitConverter';

const CALC_METHOD_POWER_SPEED = '功率转速法 (T = 9550 × P / n)';
const CALC_METHOD_NAMEPLATE = '铭牌原值换算';
const CALC_DEVIATION_WARN_THRESHOLD = 0.15;

export function calculateTorque(record: NameplateRecord, allRecords: NameplateRecord[]): TorqueCalcResult {
  const anomalies: AnomalyItem[] = [];
  let normalizedValue = 0;
  let unitConversion: UnitConversion;

  if (record.torqueValue === null || record.torqueValue === undefined) {
    anomalies.push({
      type: 'missing_data',
      severity: 'high',
      message: '铭牌扭矩值缺失',
      sourceRef: `${record.sourceFile} 第${record.sourceRow}行`,
    });
    unitConversion = {
      fromUnit: record.torqueUnit || '',
      toUnit: 'N·m',
      factor: 1,
      detected: false,
      displayName: '未识别',
    };
  } else {
    const convResult = convertToNm(record.torqueValue, record.torqueUnit);
    normalizedValue = convResult.value;
    unitConversion = convResult.conversion;

    if (!convResult.conversion.detected) {
      anomalies.push({
        type: 'unit_unclear',
        severity: 'medium',
        message: `单位"${record.torqueUnit}"未能自动识别，按原值处理`,
        sourceRef: `${record.sourceFile} 第${record.sourceRow}行`,
      });
    }
  }

  let calculatedTorque: number | null = null;
  let calcMethod = CALC_METHOD_NAMEPLATE;

  if (record.power !== undefined && record.power !== null &&
      record.ratedSpeed !== undefined && record.ratedSpeed !== null &&
      record.ratedSpeed > 0) {
    calculatedTorque = 9550 * record.power / record.ratedSpeed;
    calcMethod = CALC_METHOD_POWER_SPEED;

    if (record.torqueValue !== null && record.torqueValue !== undefined && normalizedValue > 0) {
      const deviation = Math.abs(calculatedTorque - normalizedValue) / normalizedValue;
      if (deviation > CALC_DEVIATION_WARN_THRESHOLD) {
        anomalies.push({
          type: 'calc_deviation',
          severity: 'medium',
          message: `铭牌值与复算值偏差${(deviation * 100).toFixed(1)}%，超出${CALC_DEVIATION_WARN_THRESHOLD * 100}%预警线`,
          sourceRef: `铭牌值: ${record.torqueValue} ${record.torqueUnit}，复算值: ${calculatedTorque.toFixed(2)} N·m`,
        });
      }
    }
  }

  const allValidValues = allRecords
    .filter(r => r.torqueValue !== null && r.torqueValue !== undefined)
    .map(r => {
      const conv = convertToNm(r.torqueValue!, r.torqueUnit);
      return conv.value;
    })
    .filter(v => v > 0);

  const baselineMagnitude = detectOrderOfMagnitude(allValidValues);

  if (normalizedValue > 0 && checkOrderOfMagnitudeAnomaly(normalizedValue, baselineMagnitude)) {
    anomalies.push({
      type: 'order_of_magnitude',
      severity: 'high',
      message: `数量级异常：${normalizedValue.toExponential(2)} N·m，与同批次均值相差超过100倍，可能单位混写`,
      sourceRef: `${record.sourceFile} 第${record.sourceRow}行，原始单位：${record.torqueUnit}`,
    });
  }

  let thresholdCheck;
  if (record.threshold !== undefined && record.threshold !== null && normalizedValue > 0) {
    let thresholdNm = record.threshold;
    if (record.thresholdUnit && record.thresholdUnit !== 'N·m') {
      const thresholdConv = convertToNm(record.threshold, record.thresholdUnit);
      thresholdNm = thresholdConv.value;
    }

    const ratio = normalizedValue / thresholdNm;
    const passed = ratio <= 1;

    if (!passed) {
      anomalies.push({
        type: 'over_threshold',
        severity: 'high',
        message: `超出安全阈值 ${thresholdNm.toFixed(2)} N·m，实际值 ${normalizedValue.toFixed(2)} N·m，超标${((ratio - 1) * 100).toFixed(1)}%`,
        sourceRef: record.thresholdSource || `${record.sourceFile} 第${record.sourceRow}行`,
      });
    }

    thresholdCheck = {
      passed,
      threshold: thresholdNm,
      thresholdUnit: 'N·m',
      thresholdSource: record.thresholdSource || '铭牌标注',
      ratio,
    };
  }

  const sameDeviceRecords = allRecords.filter(r => r.deviceId === record.deviceId && r.id !== record.id);
  if (sameDeviceRecords.length > 0) {
    anomalies.push({
      type: 'batch_conflict',
      severity: 'low',
      message: `同设备存在${sameDeviceRecords.length}条历史记录，来自不同批次，已保留全部`,
      sourceRef: `设备编号：${record.deviceId}`,
    });
  }

  let status: TorqueCalcResult['status'] = 'normal';
  if (anomalies.length > 0) {
    const highSeverity = anomalies.some(a => a.severity === 'high');
    status = highSeverity ? 'error' : 'warning';
  }
  if (record.torqueValue === null && calculatedTorque === null) {
    status = 'unknown';
  }

  return {
    recordId: record.id,
    deviceId: record.deviceId,
    deviceName: record.deviceName,
    originalValue: record.torqueValue,
    originalUnit: record.torqueUnit,
    normalizedValue,
    unitConversion,
    calculatedTorque,
    calcMethod,
    status,
    anomalies,
    thresholdCheck,
    sourceFile: record.sourceFile,
    sourceRow: record.sourceRow,
    sourceBatch: record.sourceBatch,
    sourceContent: record.sourceContent,
    importedAt: record.importedAt,
  };
}

export function batchCalculate(records: NameplateRecord[]): TorqueCalcResult[] {
  return records.map(record => calculateTorque(record, records));
}

export function summarizeResults(results: TorqueCalcResult[]) {
  const total = results.length;
  const normal = results.filter(r => r.status === 'normal').length;
  const warning = results.filter(r => r.status === 'warning').length;
  const error = results.filter(r => r.status === 'error').length;
  const unknown = results.filter(r => r.status === 'unknown').length;

  return { total, normal, warning, error, unknown };
}
