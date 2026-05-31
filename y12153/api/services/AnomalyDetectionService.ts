import type { CalculateRequest, AnomalyInfo } from '../../shared/types';

export function detectWaveMissing(request: CalculateRequest): AnomalyInfo | null {
  const missingFields: string[] = [];

  if (request.waveParams.significantHeight === null) {
    missingFields.push('有义波高');
  }
  if (request.waveParams.wavePeriod === null) {
    missingFields.push('波浪周期');
  }
  if (request.waveParams.waveDirection === null) {
    missingFields.push('浪向角');
  }

  if (missingFields.length > 0) {
    return {
      type: 'wave_missing',
      severity: missingFields.length >= 2 ? 'error' : 'warning',
      message: `波浪参数缺测：${missingFields.join('、')}。系统将使用默认估算值，计算结果可能存在偏差。`,
      affectedField: 'waveParams',
      rawValue: {
        significantHeight: request.waveParams.significantHeight,
        wavePeriod: request.waveParams.wavePeriod,
        waveDirection: request.waveParams.waveDirection
      },
      source: request.waveParams.source.name
    };
  }

  return null;
}

export function detectSpeedJump(request: CalculateRequest): AnomalyInfo | null {
  const speedHistory = request.navigationParams.speedHistory;
  const currentSpeed = request.navigationParams.speed;

  if (!speedHistory || speedHistory.length < 3) {
    return null;
  }

  const recentSpeeds = speedHistory.slice(-5);
  const avgSpeed = recentSpeeds.reduce((a, b) => a + b, 0) / recentSpeeds.length;
  const stdDev = Math.sqrt(
    recentSpeeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / recentSpeeds.length
  );

  const zScore = Math.abs(currentSpeed - avgSpeed) / (stdDev || 1);
  const changePercent = Math.abs((currentSpeed - avgSpeed) / avgSpeed) * 100;

  if (zScore > 3 || changePercent > 50) {
    return {
      type: 'speed_jump',
      severity: zScore > 4 || changePercent > 80 ? 'error' : 'warning',
      message: `检测到航速突变：当前航速 ${currentSpeed} 节，历史平均 ${avgSpeed.toFixed(1)} 节，变化幅度 ${changePercent.toFixed(1)}%。可能为数据错误或特殊工况。`,
      affectedField: 'navigationParams.speed',
      rawValue: {
        currentSpeed,
        recentSpeeds,
        avgSpeed: avgSpeed.toFixed(2),
        changePercent: changePercent.toFixed(2)
      },
      source: request.navigationParams.source.name
    };
  }

  return null;
}

export function detectCabinMisalignment(request: CalculateRequest): AnomalyInfo | null {
  const { shipLength, shipWidth } = request.hullParams;
  const { longitudinalPos, verticalPos, deck } = request.cabinParams;

  const halfLength = shipLength / 2;
  const issues: string[] = [];

  if (Math.abs(longitudinalPos) > halfLength * 1.1) {
    issues.push(`纵向位置 ${longitudinalPos}m 超出船半长 ${halfLength.toFixed(1)}m 的10%容差`);
  }

  const typicalDeckHeight = 3.0;
  const expectedVerticalPos = deck * typicalDeckHeight;
  const verticalDeviation = Math.abs(verticalPos - expectedVerticalPos);

  if (verticalDeviation > typicalDeckHeight * 0.5) {
    issues.push(`垂向位置 ${verticalPos}m 与第 ${deck} 层甲板预期高度 ${expectedVerticalPos.toFixed(1)}m 偏差 ${verticalDeviation.toFixed(1)}m，超过50%层高容差`);
  }

  if (deck < 1 || deck > 20) {
    issues.push(`甲板层数 ${deck} 超出常规范围（1-20层）`);
  }

  if (issues.length > 0) {
    return {
      type: 'cabin_misalignment',
      severity: issues.length >= 2 ? 'error' : 'warning',
      message: `舱室位置异常：${issues.join('；')}。请确认舱室坐标是否与改装后的船体布局匹配，避免错误合并不同批次数据。`,
      affectedField: 'cabinParams',
      rawValue: {
        longitudinalPos,
        verticalPos,
        deck,
        expectedVerticalPos,
        shipHalfLength: halfLength
      },
      source: request.cabinParams.source.name
    };
  }

  return null;
}

export function validateRequiredParams(request: CalculateRequest): AnomalyInfo[] {
  const errors: AnomalyInfo[] = [];

  const hullFields = [
    { key: 'displacement', name: '排水量', value: request.hullParams.displacement },
    { key: 'GM', name: '初稳心高', value: request.hullParams.GM },
    { key: 'rollRadius', name: '横摇惯性半径', value: request.hullParams.rollRadius },
    { key: 'shipLength', name: '船长', value: request.hullParams.shipLength },
    { key: 'shipWidth', name: '船宽', value: request.hullParams.shipWidth },
  ];

  for (const field of hullFields) {
    if (field.value === null || field.value === undefined || isNaN(field.value) || field.value <= 0) {
      errors.push({
        type: 'wave_missing',
        severity: 'error',
        message: `船体参数缺失或无效：${field.name} = ${field.value}`,
        affectedField: `hullParams.${field.key}`,
        rawValue: field.value,
        source: request.hullParams.source.name
      });
    }
  }

  const navFields = [
    { key: 'speed', name: '航速', value: request.navigationParams.speed },
    { key: 'headingAngle', name: '航向角', value: request.navigationParams.headingAngle },
  ];

  for (const field of navFields) {
    if (field.value === null || field.value === undefined || isNaN(field.value)) {
      errors.push({
        type: 'wave_missing',
        severity: 'error',
        message: `航行参数缺失或无效：${field.name} = ${field.value}`,
        affectedField: `navigationParams.${field.key}`,
        rawValue: field.value,
        source: request.navigationParams.source.name
      });
    }
  }

  const cabinFields = [
    { key: 'longitudinalPos', name: '纵向位置', value: request.cabinParams.longitudinalPos },
    { key: 'verticalPos', name: '垂向位置', value: request.cabinParams.verticalPos },
    { key: 'deck', name: '甲板层', value: request.cabinParams.deck },
  ];

  for (const field of cabinFields) {
    if (field.value === null || field.value === undefined || isNaN(field.value)) {
      errors.push({
        type: 'wave_missing',
        severity: 'error',
        message: `舱室参数缺失或无效：${field.name} = ${field.value}`,
        affectedField: `cabinParams.${field.key}`,
        rawValue: field.value,
        source: request.cabinParams.source.name
      });
    }
  }

  if (!request.shipName || request.shipName.trim() === '') {
    errors.push({
      type: 'wave_missing',
      severity: 'error',
      message: '船舶名称不能为空',
      affectedField: 'shipName',
      rawValue: request.shipName,
      source: '用户输入'
    });
  }

  return errors;
}

export function detectAllAnomalies(request: CalculateRequest): AnomalyInfo[] {
  const anomalies: AnomalyInfo[] = [];

  const requiredErrors = validateRequiredParams(request);
  anomalies.push(...requiredErrors);

  if (requiredErrors.length === 0) {
    const waveMissing = detectWaveMissing(request);
    if (waveMissing) anomalies.push(waveMissing);

    const speedJump = detectSpeedJump(request);
    if (speedJump) anomalies.push(speedJump);

    const cabinMisalignment = detectCabinMisalignment(request);
    if (cabinMisalignment) anomalies.push(cabinMisalignment);
  }

  return anomalies;
}
