import { SensorLog, ThresholdParams, ThresholdResult, CalculationStep, UNIT_FACTORS } from '../types';
import { generateId } from '../data/sampleLogs';

const convertToOhms = (value: number, fromUnit: string): number => {
  const factor = UNIT_FACTORS[fromUnit] || 0.001;
  return value * factor;
};

const convertFromOhms = (value: number, toUnit: string): number => {
  const factor = UNIT_FACTORS[toUnit] || 0.001;
  return value / factor;
};

const formatNumber = (num: number, decimals: number = 4): number => {
  return parseFloat(num.toFixed(decimals));
};

export const calculateThreshold = (
  log: SensorLog,
  params: ThresholdParams,
  hasQualityIssue: boolean = false
): ThresholdResult => {
  const steps: CalculationStep[] = [];
  let currentValue = log.resistance ?? 0;
  let currentUnit = log.resistanceUnit;

  if (log.resistance === null || log.temperature === null) {
    steps.push({
      stepId: generateId(),
      description: '数据缺失，无法计算',
      formula: 'N/A',
      inputValue: 0,
      inputUnit: currentUnit,
      outputValue: 0,
      outputUnit: params.thresholdUnit,
    });

    return {
      logId: log.id,
      rawLineNumber: log.rawLineNumber,
      deviceId: log.deviceId,
      thresholdValue: params.warningThreshold,
      thresholdUnit: params.thresholdUnit,
      measuredValue: 0,
      measuredUnit: params.thresholdUnit,
      isWarning: false,
      calculationSteps: steps,
      hasQualityIssue,
    };
  }

  steps.push({
    stepId: generateId(),
    description: '原始测量值',
    formula: '读取传感器数据',
    inputValue: currentValue,
    inputUnit: currentUnit,
    outputValue: currentValue,
    outputUnit: currentUnit,
  });

  if (params.temperatureCompensation && log.temperature !== null) {
    const tempDiff = log.temperature - params.baseTemperature;
    const compensationFactor = 1 + params.temperatureCoefficient * tempDiff;
    const compensatedValue = currentValue * compensationFactor;

    steps.push({
      stepId: generateId(),
      description: '温度补偿计算',
      formula: `R_comp = R_meas × [1 + α × (T_meas - T_base)]`,
      inputValue: currentValue,
      inputUnit: currentUnit,
      outputValue: formatNumber(compensatedValue),
      outputUnit: currentUnit,
      conversion: `= ${currentValue}${currentUnit} × [1 + ${params.temperatureCoefficient}/°C × (${log.temperature}°C - ${params.baseTemperature}°C)] = ${formatNumber(compensatedValue)}${currentUnit}`,
    });

    currentValue = compensatedValue;
  }

  if (currentUnit !== params.thresholdUnit) {
    const valueInOhms = convertToOhms(currentValue, currentUnit);
    const convertedValue = convertFromOhms(valueInOhms, params.thresholdUnit);
    const conversionFactor = UNIT_FACTORS[currentUnit] / UNIT_FACTORS[params.thresholdUnit];

    steps.push({
      stepId: generateId(),
      description: '单位换算',
      formula: `${currentUnit} → ${params.thresholdUnit}`,
      inputValue: formatNumber(currentValue),
      inputUnit: currentUnit,
      outputValue: formatNumber(convertedValue),
      outputUnit: params.thresholdUnit,
      conversion: `${formatNumber(currentValue)}${currentUnit} × ${conversionFactor} = ${formatNumber(convertedValue)}${params.thresholdUnit}`,
    });

    currentValue = convertedValue;
    currentUnit = params.thresholdUnit;
  }

  const isWarning = currentValue > params.warningThreshold;

  steps.push({
    stepId: generateId(),
    description: '阈值比较',
    formula: isWarning
      ? `${formatNumber(currentValue)}${params.thresholdUnit} > ${params.warningThreshold}${params.thresholdUnit} → 预警`
      : `${formatNumber(currentValue)}${params.thresholdUnit} ≤ ${params.warningThreshold}${params.thresholdUnit} → 正常`,
    inputValue: formatNumber(currentValue),
    inputUnit: params.thresholdUnit,
    outputValue: isWarning ? 1 : 0,
    outputUnit: isWarning ? '预警' : '正常',
    conversion: `阈值: ${params.warningThreshold}${params.thresholdUnit}`,
  });

  return {
    logId: log.id,
    rawLineNumber: log.rawLineNumber,
    deviceId: log.deviceId,
    thresholdValue: params.warningThreshold,
    thresholdUnit: params.thresholdUnit,
    measuredValue: formatNumber(currentValue),
    measuredUnit: currentUnit,
    isWarning,
    calculationSteps: steps,
    hasQualityIssue,
  };
};

export const calculateAllThresholds = (
  logs: SensorLog[],
  params: ThresholdParams,
  qualityIssueLogIds: Set<string>
): ThresholdResult[] => {
  return logs.map((log) => {
    const hasIssue = qualityIssueLogIds.has(log.id);
    return calculateThreshold(log, params, hasIssue);
  });
};

export const compareResults = (
  resultsA: ThresholdResult[],
  resultsB: ThresholdResult[]
): Array<{
  logId: string;
  rawLineNumber: number;
  deviceId: string;
  resultA: ThresholdResult;
  resultB: ThresholdResult;
  isDifferent: boolean;
  difference: string;
}> => {
  const mapB = new Map(resultsB.map((r) => [r.logId, r]));

  return resultsA.map((resultA) => {
    const resultB = mapB.get(resultA.logId)!;
    const isDifferent = resultA.isWarning !== resultB.isWarning;
    let difference = '';

    if (isDifferent) {
      difference = `${resultA.isWarning ? '预警' : '正常'} → ${resultB.isWarning ? '预警' : '正常'}`;
    }

    return {
      logId: resultA.logId,
      rawLineNumber: resultA.rawLineNumber,
      deviceId: resultA.deviceId,
      resultA,
      resultB,
      isDifferent,
      difference,
    };
  });
};
