import type { BatterySample, ParameterSet, AttributionResult, ErrorComponent } from '../types';

export function calculateAttribution(
  sample: BatterySample,
  params: ParameterSet
): AttributionResult {
  const { internalResistance, temperature, soc } = sample;
  const { baseResistance, baseTemperature, baseSoc, temperatureCoefficient, socCorrectionFactor, tolerance } = params;

  const baseError = internalResistance - baseResistance;

  const tempError = (temperature - baseTemperature) * temperatureCoefficient;
  const tempCalculation = `(${temperature}°C - ${baseTemperature}°C) × ${temperatureCoefficient}mΩ/°C = ${tempError.toFixed(3)}mΩ`;

  const socError = baseResistance * socCorrectionFactor * (soc - baseSoc) / 100;
  const socCalculation = `${baseResistance}mΩ × ${socCorrectionFactor} × (${soc}% - ${baseSoc}%) / 100 = ${socError.toFixed(4)}mΩ`;

  const otherError = baseError - tempError - socError;
  const otherCalculation = `${baseError.toFixed(3)}mΩ - ${tempError.toFixed(3)}mΩ - ${socError.toFixed(4)}mΩ = ${otherError.toFixed(4)}mΩ`;

  const totalError = baseError;
  const totalErrorPercentage = (totalError / baseResistance) * 100;

  const components: ErrorComponent[] = [
    {
      id: 'c-temp',
      name: '温度引起的误差',
      value: tempError,
      percentage: totalError !== 0 ? (tempError / totalError) * 100 : 0,
      formula: 'ΔT × 温度系数',
      unitConversion: '温度单位：°C，内阻单位：mΩ，系数单位：mΩ/°C',
      description: '环境温度偏离基准温度导致的内阻变化',
      calculation: tempCalculation
    },
    {
      id: 'c-soc',
      name: 'SOC引起的误差',
      value: socError,
      percentage: totalError !== 0 ? (socError / totalError) * 100 : 0,
      formula: '基准内阻 × SOC修正系数 × ΔSOC / 100',
      unitConversion: 'SOC单位：%，计算结果单位：mΩ',
      description: '荷电状态偏离基准导致的内阻变化',
      calculation: socCalculation
    },
    {
      id: 'c-other',
      name: '其他因素误差',
      value: otherError,
      percentage: totalError !== 0 ? (otherError / totalError) * 100 : 0,
      formula: '总误差 - 温度误差 - SOC误差',
      description: '接触电阻、老化、测量误差等综合因素',
      calculation: otherCalculation
    }
  ];

  const isWithinTolerance = Math.abs(totalError) <= tolerance;

  let conclusion = '';
  if (isWithinTolerance) {
    conclusion = `误差 ${totalError.toFixed(3)}mΩ（${totalErrorPercentage.toFixed(2)}%）在容许范围 ${tolerance}mΩ 内，电池状态正常。`;
  } else {
    conclusion = `误差 ${totalError.toFixed(3)}mΩ（${totalErrorPercentage.toFixed(2)}%）超出容许范围 ${tolerance}mΩ，建议进一步排查。`;
  }

  let boundaryImpact: string | undefined;
  if (sample.type === 'boundary') {
    boundaryImpact = `该样本为边界样本，温度 ${temperature}°C 接近上限，SOC ${soc}% 接近下限，共同作用使误差逼近公差边界。若温度再升高2°C或SOC再降5%，误差将超出容许范围。`;
  }

  return {
    sampleId: sample.id,
    parameterSetId: params.id,
    totalError,
    totalErrorPercentage,
    components,
    conclusion,
    boundaryImpact,
    isWithinTolerance
  };
}

export function formatResistance(value: number): string {
  return `${value.toFixed(3)} mΩ`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
