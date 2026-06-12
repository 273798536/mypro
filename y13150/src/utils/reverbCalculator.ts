import { CalculationResult, CalculationStep, UnitConversion, MaintenanceNote, ParameterSet } from '../types';
import { normalizeToSI, convertUnit, getUnitDisplayName } from './unitConverter';

export interface CalculationConfig {
  showIntermediateSteps: boolean;
  temperatureCorrection: boolean;
  humidityCorrection: boolean;
}

function calculateSabineReverb(
  roomVolume: number,
  totalAbsorption: number,
  temperature: number = 20,
  humidity: number = 50
): { reverbTime: number; steps: CalculationStep[]; conversions: UnitConversion[] } {
  const steps: CalculationStep[] = [];
  const conversions: UnitConversion[] = [];

  let V = roomVolume;
  let A = totalAbsorption;

  const volumeNorm = normalizeToSI(V, 'm³');
  if (volumeNorm.conversion) {
    conversions.push(volumeNorm.conversion);
    V = volumeNorm.value;
  }

  const absorptionNorm = normalizeToSI(A, 'm²');
  if (absorptionNorm.conversion) {
    conversions.push(absorptionNorm.conversion);
    A = absorptionNorm.value;
  }

  steps.push({
    description: '确认输入参数',
    formula: 'V = {V} m³, A = {A} m²',
    input: { V, A },
    output: 0,
    unit: ''
  });

  if (A <= 0) {
    steps.push({
      description: '错误检查',
      formula: 'A > 0 ?',
      input: { A },
      output: NaN,
      unit: ''
    });
    return { reverbTime: NaN, steps, conversions };
  }

  const K = 0.161;

  let tempCorrection = 1;
  if (temperature !== 20) {
    tempCorrection = (temperature + 273.15) / 293.15;
    steps.push({
      description: '温度修正系数',
      formula: 'K_temp = (T + 273.15) / 293.15 = ({T} + 273.15) / 293.15',
      input: { T: temperature },
      output: tempCorrection,
      unit: ''
    });
  }

  let humidityCorrection = 1;
  if (humidity !== 50) {
    humidityCorrection = 1 + (humidity - 50) * 0.001;
    steps.push({
      description: '湿度修正系数',
      formula: 'K_hum = 1 + (RH - 50) × 0.001 = 1 + ({RH} - 50) × 0.001',
      input: { RH: humidity },
      output: humidityCorrection,
      unit: ''
    });
  }

  const correctedK = K * tempCorrection * humidityCorrection;

  steps.push({
    description: '应用 Sabine 混响公式',
    formula: 'T60 = K × V / A = {K} × {V} / {A}',
    input: { K: correctedK, V, A },
    output: 0,
    unit: 's'
  });

  const reverbTime = correctedK * V / A;

  steps.push({
    description: '计算最终结果',
    formula: 'T60 = {K} × {V} ÷ {A} = {result}',
    input: { K: correctedK, V, A, result: reverbTime },
    output: reverbTime,
    unit: 's'
  });

  return { reverbTime, steps, conversions };
}

function calculateEyringReverb(
  roomVolume: number,
  surfaceArea: number,
  avgAbsorptionCoeff: number,
  temperature: number = 20,
  humidity: number = 50
): { reverbTime: number; steps: CalculationStep[]; conversions: UnitConversion[] } {
  const steps: CalculationStep[] = [];
  const conversions: UnitConversion[] = [];

  let V = roomVolume;
  let S = surfaceArea;
  let alpha = avgAbsorptionCoeff;

  const volumeNorm = normalizeToSI(V, 'm³');
  if (volumeNorm.conversion) {
    conversions.push(volumeNorm.conversion);
    V = volumeNorm.value;
  }

  const areaNorm = normalizeToSI(S, 'm²');
  if (areaNorm.conversion) {
    conversions.push(areaNorm.conversion);
    S = areaNorm.value;
  }

  steps.push({
    description: '确认输入参数',
    formula: 'V = {V} m³, S = {S} m², α = {alpha}',
    input: { V, S, alpha },
    output: 0,
    unit: ''
  });

  if (alpha <= 0 || alpha >= 1) {
    steps.push({
      description: '错误检查',
      formula: '0 < α < 1 ?',
      input: { alpha },
      output: NaN,
      unit: ''
    });
    return { reverbTime: NaN, steps, conversions };
  }

  const K = 0.161;
  const oneMinusAlpha = 1 - alpha;

  steps.push({
    description: '计算吸声项',
    formula: '1 - α = 1 - {alpha} = {result}',
    input: { alpha, result: oneMinusAlpha },
    output: oneMinusAlpha,
    unit: ''
  });

  const lnTerm = -Math.log(oneMinusAlpha);

  steps.push({
    description: '计算自然对数项',
    formula: '-ln(1 - α) = -ln({oneMinusAlpha}) = {result}',
    input: { oneMinusAlpha, result: lnTerm },
    output: lnTerm,
    unit: ''
  });

  let tempCorrection = 1;
  if (temperature !== 20) {
    tempCorrection = (temperature + 273.15) / 293.15;
    steps.push({
      description: '温度修正系数',
      formula: 'K_temp = (T + 273.15) / 293.15 = ({T} + 273.15) / 293.15',
      input: { T: temperature },
      output: tempCorrection,
      unit: ''
    });
  }

  let humidityCorrection = 1;
  if (humidity !== 50) {
    humidityCorrection = 1 + (humidity - 50) * 0.001;
    steps.push({
      description: '湿度修正系数',
      formula: 'K_hum = 1 + (RH - 50) × 0.001 = 1 + ({RH} - 50) × 0.001',
      input: { RH: humidity },
      output: humidityCorrection,
      unit: ''
    });
  }

  const correctedK = K * tempCorrection * humidityCorrection;
  const reverbTime = correctedK * V / (S * lnTerm);

  steps.push({
    description: '应用 Eyring 混响公式',
    formula: 'T60 = K × V / (S × (-ln(1 - α))) = {K} × {V} / ({S} × {lnTerm})',
    input: { K: correctedK, V, S, lnTerm },
    output: reverbTime,
    unit: 's'
  });

  steps.push({
    description: '计算最终结果',
    formula: 'T60 = {result} s',
    input: { result: reverbTime },
    output: reverbTime,
    unit: 's'
  });

  return { reverbTime, steps, conversions };
}

export function calculateReverbTime(
  note: MaintenanceNote,
  paramSet: ParameterSet,
  config: CalculationConfig = {
    showIntermediateSteps: true,
    temperatureCorrection: true,
    humidityCorrection: true
  }
): Omit<CalculationResult, 'id' | 'noteId' | 'paramSetId' | 'timestamp' | 'status'> {
  const { parameters } = paramSet;
  
  const noteValue = note.convertedValue;
  const noteUnit = note.unit;

  let absorptionFromNote = 0;
  const conversions: UnitConversion[] = [];

  if (noteUnit === 'm²' || noteUnit === 'ft²' || noteUnit === 'cm²') {
    const { result, conversion } = convertUnit(noteValue, noteUnit, 'm²');
    absorptionFromNote = result;
    if (conversion) conversions.push(conversion);
  } else if (noteUnit === '' && noteValue > 0 && noteValue < 1) {
    absorptionFromNote = noteValue * parameters.totalAbsorption;
    conversions.push({
      fromUnit: '',
      toUnit: 'm²',
      factor: parameters.totalAbsorption,
      formula: `${noteValue} × ${parameters.totalAbsorption} m² = ${absorptionFromNote.toFixed(4)} m²`
    });
  } else if (noteUnit === 's' || noteUnit === 'ms') {
    const { result, conversion } = convertUnit(noteValue, noteUnit, 's');
    return {
      reverbTime: result,
      unitConversions: conversion ? [conversion] : [],
      intermediateSteps: [{
        description: '直接使用测量的混响时间',
        formula: 'T60 = {value} {unit}',
        input: { value: noteValue, unit: getUnitDisplayName(noteUnit) },
        output: result,
        unit: 's'
      }]
    };
  } else {
    absorptionFromNote = noteValue;
  }

  const adjustedAbsorption = parameters.totalAbsorption + absorptionFromNote;

  const { reverbTime, steps, conversions: calcConversions } = calculateSabineReverb(
    parameters.roomVolume,
    adjustedAbsorption,
    config.temperatureCorrection ? parameters.temperature : 20,
    config.humidityCorrection ? parameters.humidity : 50
  );

  return {
    reverbTime,
    unitConversions: [...conversions, ...calcConversions],
    intermediateSteps: steps
  };
}

export function calculateDiffuseFieldReverb(
  frequencies: number[],
  absorptionCoeffs: number[],
  roomVolume: number,
  surfaceArea: number
): { frequencies: number[]; reverbTimes: number[]; steps: CalculationStep[] } {
  const steps: CalculationStep[] = [];
  const reverbTimes: number[] = [];

  steps.push({
    description: '频率响应计算初始化',
    formula: '频点数量: {count}',
    input: { count: frequencies.length },
    output: frequencies.length,
    unit: '个'
  });

  frequencies.forEach((freq, index) => {
    const coeff = absorptionCoeffs[index] || 0;
    const { reverbTime } = calculateEyringReverb(
      roomVolume,
      surfaceArea,
      coeff
    );
    reverbTimes.push(reverbTime);

    steps.push({
      description: `${freq} Hz 频点计算`,
      formula: 'T60@{freq}Hz = {result} s',
      input: { freq, result: reverbTime },
      output: reverbTime,
      unit: 's'
    });
  });

  return { frequencies, reverbTimes, steps };
}

export function formatResult(value: number, unit: string, precision: number = 4): string {
  if (isNaN(value) || !isFinite(value)) {
    return '无效值';
  }
  return `${value.toFixed(precision)} ${getUnitDisplayName(unit)}`;
}
