import {
  CalculationParameters,
  CalculationOutput,
  FormulaInfo,
  BoundarySampleAnalysis,
  BoundarySample,
} from '@/types/experiment';
import { buildFormulaInfo } from '@/constants/formulas';
import { PARAMETER_RANGES } from '@/constants/parameters';

const AIR_VISCOSITY = 1.81e-5;
const REFERENCE_LENGTH = 0.1;
const REFERENCE_AREA = 0.01;

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

const calculateLiftCoefficient = (params: CalculationParameters): number => {
  const { airDensity, windSpeed, angleOfAttack } = params;
  const alphaRad = degToRad(angleOfAttack);
  const dynamicPressure = 0.5 * airDensity * windSpeed * windSpeed;
  const lift = 2 * Math.PI * alphaRad * dynamicPressure * REFERENCE_AREA;
  const cl = lift / (dynamicPressure * REFERENCE_AREA);
  return Math.round(cl * 10000) / 10000;
};

const calculateDragCoefficient = (params: CalculationParameters): number => {
  const { airDensity, windSpeed, smokeLineDiameter, turbulenceIntensity } = params;
  const dynamicPressure = 0.5 * airDensity * windSpeed * windSpeed;
  const baseDrag = 0.02 + 0.001 * smokeLineDiameter;
  const turbulenceEffect = 1 + turbulenceIntensity * 0.02;
  const cd = baseDrag * turbulenceEffect;
  return Math.round(cd * 10000) / 10000;
};

const calculateReynoldsNumber = (params: CalculationParameters): number => {
  const { airDensity, windSpeed } = params;
  const re = (airDensity * windSpeed * REFERENCE_LENGTH) / AIR_VISCOSITY;
  return Math.round(re);
};

const calculateFlowVelocity = (params: CalculationParameters): number => {
  const { windSpeed, angleOfAttack } = params;
  const alphaRad = degToRad(angleOfAttack);
  const effectiveVelocity = windSpeed * Math.cos(alphaRad);
  return Math.round(effectiveVelocity * 100) / 100;
};

const calculatePressureDistribution = (params: CalculationParameters): number[] => {
  const { angleOfAttack, turbulenceIntensity } = params;
  const alphaRad = degToRad(angleOfAttack);
  const points: number[] = [];
  
  for (let i = 0; i < 20; i++) {
    const x = (i / 19) * Math.PI;
    const baseCp = -2 * Math.sin(x) * Math.sin(alphaRad);
    const turbulenceNoise = (Math.random() - 0.5) * 0.02 * turbulenceIntensity;
    points.push(Math.round((baseCp + turbulenceNoise) * 10000) / 10000);
  }
  
  return points;
};

const calculateSmokeLineTrajectory = (params: CalculationParameters): { x: number; y: number }[] => {
  const { windSpeed, angleOfAttack, smokeLineDiameter } = params;
  const alphaRad = degToRad(angleOfAttack);
  const trajectory: { x: number; y: number }[] = [];
  const timeStep = 0.01;
  const totalTime = 1;
  
  let x = 0;
  let y = smokeLineDiameter;
  let vx = windSpeed * Math.cos(alphaRad);
  let vy = windSpeed * Math.sin(alphaRad) * 0.3;
  
  for (let t = 0; t < totalTime; t += timeStep) {
    trajectory.push({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
    
    x += vx * timeStep;
    y += vy * timeStep;
    
    vy -= 0.5 * timeStep;
  }
  
  return trajectory;
};

export const performCalculation = (params: CalculationParameters): CalculationOutput => {
  return {
    liftCoefficient: calculateLiftCoefficient(params),
    dragCoefficient: calculateDragCoefficient(params),
    reynoldsNumber: calculateReynoldsNumber(params),
    flowVelocity: calculateFlowVelocity(params),
    pressureDistribution: calculatePressureDistribution(params),
    smokeLineTrajectory: calculateSmokeLineTrajectory(params),
  };
};

export const getFormulaForResult = (
  resultKey: keyof CalculationOutput,
  params: CalculationParameters,
  result: number
): FormulaInfo => {
  const formulaMap: Record<string, keyof typeof import('@/constants/formulas').FORMULA_DEFINITIONS> = {
    liftCoefficient: 'liftCoefficient',
    dragCoefficient: 'dragCoefficient',
    reynoldsNumber: 'reynoldsNumber',
    flowVelocity: 'flowVelocity',
    pressureDistribution: 'pressureCoefficient',
    smokeLineTrajectory: 'flowVelocity',
  };
  
  const formulaKey = formulaMap[resultKey] || 'liftCoefficient';
  return buildFormulaInfo(formulaKey, params, result);
};

export const performBoundaryAnalysis = (
  baseParams: CalculationParameters,
  baseResult: CalculationOutput
): BoundarySampleAnalysis => {
  const samples: BoundarySample[] = [];
  const impactFactors: BoundarySampleAnalysis['impactFactors'] = [];
  
  const parameterKeys: (keyof CalculationParameters)[] = [
    'airDensity',
    'windSpeed',
    'angleOfAttack',
    'smokeLineDiameter',
    'turbulenceIntensity',
  ];
  
  for (const key of parameterKeys) {
    if (key === 'parameterLevel') continue;
    
    const range = PARAMETER_RANGES[key];
    const baseValue = baseParams[key];
    const testValues = [range.min, range.max];
    
    for (const testValue of testValues) {
      const testParams = { ...baseParams, [key]: testValue };
      const testResult = performCalculation(testParams);
      const deviation = ((testResult.liftCoefficient - baseResult.liftCoefficient) / baseResult.liftCoefficient) * 100;
      
      samples.push({
        id: `${key}_${testValue}`,
        name: `${key === 'airDensity' ? '空气密度' : key === 'windSpeed' ? '风速' : key === 'angleOfAttack' ? '攻角' : key === 'smokeLineDiameter' ? '烟线直径' : '湍流强度'} ${testValue}${range.unit}`,
        parameter: key,
        value: testValue,
        result: testResult.liftCoefficient,
        deviationFromBase: Math.round(deviation * 100) / 100,
      });
    }
    
    const minResult = performCalculation({ ...baseParams, [key]: range.min });
    const maxResult = performCalculation({ ...baseParams, [key]: range.max });
    const minDeviation = ((minResult.liftCoefficient - baseResult.liftCoefficient) / baseResult.liftCoefficient) * 100;
    const maxDeviation = ((maxResult.liftCoefficient - baseResult.liftCoefficient) / baseResult.liftCoefficient) * 100;
    const totalVariation = Math.abs(maxDeviation - minDeviation);
    
    let impact: 'high' | 'medium' | 'low' = 'low';
    if (totalVariation > 20) impact = 'high';
    else if (totalVariation > 5) impact = 'medium';
    
    const labels: Record<string, string> = {
      airDensity: '空气密度',
      windSpeed: '风速',
      angleOfAttack: '攻角',
      smokeLineDiameter: '烟线直径',
      turbulenceIntensity: '湍流强度',
    };
    
    impactFactors.push({
      factor: labels[key] || key,
      impact,
      change: `${minDeviation.toFixed(2)}% ~ ${maxDeviation.toFixed(2)}%`,
    });
  }
  
  const highImpact = impactFactors.filter(f => f.impact === 'high').map(f => f.factor).join('、');
  const mediumImpact = impactFactors.filter(f => f.impact === 'medium').map(f => f.factor).join('、');
  
  let sensitivityReport = '边界样本敏感性分析：';
  if (highImpact) sensitivityReport += `${highImpact} 对结果影响较大；`;
  if (mediumImpact) sensitivityReport += `${mediumImpact} 对结果有中等影响；`;
  sensitivityReport += '其余参数影响较小。';
  
  return {
    samples,
    sensitivityReport,
    impactFactors,
  };
};
