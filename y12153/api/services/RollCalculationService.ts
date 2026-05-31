import type { CalculateRequest, CalculateResult, TraceInfo } from '../../shared/types';

const GRAVITY = 9.81;

export function calculateRollFrequency(GM: number, rollRadius: number): number {
  if (GM <= 0 || rollRadius <= 0) {
    throw new Error('初稳心高和横摇惯性半径必须大于0');
  }
  return Math.sqrt((GRAVITY * GM) / (rollRadius * rollRadius));
}

export function calculateRollAmplitude(
  significantHeight: number | null,
  wavePeriod: number | null,
  waveDirection: number | null,
  rollFrequency: number,
  shipWidth: number,
  speed: number,
  headingAngle: number
): { amplitude: number; usesEstimation: boolean; estimationReason?: string } {
  if (significantHeight === null || wavePeriod === null || waveDirection === null) {
    const estimatedHeight = significantHeight ?? 1.5;
    const estimatedPeriod = wavePeriod ?? 8;
    const estimatedDirection = waveDirection ?? 90;

    const encounterFrequency = calculateEncounterFrequency(estimatedPeriod, speed, estimatedDirection, headingAngle);
    const magnificationFactor = calculateMagnificationFactor(rollFrequency, encounterFrequency);
    const amplitude = (estimatedHeight * shipWidth * magnificationFactor) / 20;

    return {
      amplitude,
      usesEstimation: true,
      estimationReason: `波浪参数缺测，使用默认值：有义波高=${estimatedHeight}m，波浪周期=${estimatedPeriod}s，浪向角=${estimatedDirection}°`
    };
  }

  const encounterFrequency = calculateEncounterFrequency(wavePeriod, speed, waveDirection, headingAngle);
  const magnificationFactor = calculateMagnificationFactor(rollFrequency, encounterFrequency);
  const amplitude = (significantHeight * shipWidth * magnificationFactor) / 20;

  return {
    amplitude,
    usesEstimation: false
  };
}

export function calculateEncounterFrequency(
  wavePeriod: number,
  speed: number,
  waveDirection: number,
  headingAngle: number
): number {
  const waveOmega = (2 * Math.PI) / wavePeriod;
  const speedMs = speed * 0.5144;
  const relativeAngle = (waveDirection - headingAngle) * Math.PI / 180;
  const waveLength = (GRAVITY * wavePeriod * wavePeriod) / (2 * Math.PI);
  return waveOmega + (2 * Math.PI * speedMs * Math.cos(relativeAngle)) / waveLength;
}

export function calculateMagnificationFactor(rollFrequency: number, encounterFrequency: number): number {
  const tuning = encounterFrequency / rollFrequency;
  const damping = 0.15;
  return 1 / Math.sqrt(Math.pow(1 - tuning * tuning, 2) + Math.pow(2 * damping * tuning, 2));
}

export function calculateComfortScore(rollAmplitude: number, rollFrequency: number, cabinVerticalPos: number): {
  score: number;
  level: string;
  scope: string;
} {
  const rmsAcceleration = rollAmplitude * Math.PI / 180 * rollFrequency * rollFrequency * cabinVerticalPos;

  let score: number;
  let level: string;

  if (rmsAcceleration < 0.05) {
    score = 10;
    level = '极为舒适';
  } else if (rmsAcceleration < 0.1) {
    score = 9;
    level = '非常舒适';
  } else if (rmsAcceleration < 0.2) {
    score = 8;
    level = '舒适';
  } else if (rmsAcceleration < 0.315) {
    score = 7;
    level = '较为舒适';
  } else if (rmsAcceleration < 0.5) {
    score = 6;
    level = '轻微不适';
  } else if (rmsAcceleration < 0.8) {
    score = 5;
    level = '中度不适';
  } else if (rmsAcceleration < 1.25) {
    score = 4;
    level = '明显不适';
  } else if (rmsAcceleration < 2.0) {
    score = 3;
    level = '严重不适';
  } else if (rmsAcceleration < 3.15) {
    score = 2;
    level = '非常不适';
  } else {
    score = 1;
    level = '难以忍受';
  }

  const scope = `适用于常规客船（排水量500-50000吨），航速5-30节，有义波高0.5-6m。基于ISO 2631-1:1997标准，横摇加速度加权评估。当前RMS加速度: ${rmsAcceleration.toFixed(4)} m/s²`;

  return { score, level, scope };
}

export function generateRollTrace(
  request: CalculateRequest,
  rollFrequency: number,
  rollAmplitude: number
): TraceInfo[] {
  return [
    {
      field: 'rollFrequency',
      value: rollFrequency,
      unit: 'rad/s',
      source: `船体参数-${request.hullParams.source.name}`,
      formula: 'ω_φ = √(g·GM / k_φ²)',
      standard: '船舶静力学-横摇固有频率公式'
    },
    {
      field: 'rollAmplitude',
      value: rollAmplitude,
      unit: '°',
      source: `波浪参数-${request.waveParams.source.name}`,
      formula: 'φ_a = (H_s · B · V(ω_e)) / 20',
      standard: '线性横摇响应估算'
    }
  ];
}

export function generateComfortTrace(
  request: CalculateRequest,
  comfortScore: number,
  rmsAcceleration: number
): TraceInfo[] {
  return [
    {
      field: 'rmsAcceleration',
      value: rmsAcceleration,
      unit: 'm/s²',
      source: `舱室参数-${request.cabinParams.source.name}`,
      formula: 'a_rms = φ_a · ω_φ² · z',
      standard: '横摇垂向加速度公式'
    },
    {
      field: 'comfortScore',
      value: comfortScore,
      unit: '级',
      source: '综合计算',
      formula: '基于RMS加速度的10级评分映射',
      standard: 'ISO 2631-1:1997 机械振动与冲击标准'
    }
  ];
}

export function performCalculation(request: CalculateRequest): CalculateResult {
  try {
    const rollFrequency = calculateRollFrequency(
      request.hullParams.GM,
      request.hullParams.rollRadius
    );

    const amplitudeResult = calculateRollAmplitude(
      request.waveParams.significantHeight,
      request.waveParams.wavePeriod,
      request.waveParams.waveDirection,
      rollFrequency,
      request.hullParams.shipWidth,
      request.navigationParams.speed,
      request.navigationParams.headingAngle
    );

    const comfort = calculateComfortScore(
      amplitudeResult.amplitude,
      rollFrequency,
      request.cabinParams.verticalPos
    );

    const rmsAcceleration = amplitudeResult.amplitude * Math.PI / 180 *
      rollFrequency * rollFrequency * request.cabinParams.verticalPos;

    const traceability = [
      ...generateRollTrace(request, rollFrequency, amplitudeResult.amplitude),
      ...generateComfortTrace(request, comfort.score, rmsAcceleration)
    ];

    let applicableScope = comfort.scope;
    if (amplitudeResult.usesEstimation && amplitudeResult.estimationReason) {
      applicableScope += ` 注意：${amplitudeResult.estimationReason}`;
    }

    return {
      id: '',
      shipName: request.shipName,
      rollFrequency: Number(rollFrequency.toFixed(4)),
      rollAmplitude: Number(amplitudeResult.amplitude.toFixed(3)),
      comfortScore: comfort.score,
      comfortLevel: comfort.level,
      rollFrequencyUnit: 'rad/s',
      rollAmplitudeUnit: '°',
      comfortScoreUnit: '级',
      applicableScope,
      calculationSuccess: true,
      anomalies: [],
      traceability,
      isDuplicate: false,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      id: '',
      shipName: request.shipName,
      rollFrequency: 0,
      rollAmplitude: 0,
      comfortScore: 0,
      comfortLevel: '计算失败',
      rollFrequencyUnit: 'rad/s',
      rollAmplitudeUnit: '°',
      comfortScoreUnit: '级',
      applicableScope: '',
      failureReason: error instanceof Error ? error.message : '未知计算错误',
      calculationSuccess: false,
      anomalies: [],
      traceability: [],
      isDuplicate: false,
      createdAt: new Date().toISOString()
    };
  }
}
