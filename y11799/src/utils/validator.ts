import { HeatPumpParams, CalculationInput, RiskAlert } from '@/types';

export const validateInput = (
  input: CalculationInput,
  heatPump: HeatPumpParams
): RiskAlert[] => {
  const alerts: RiskAlert[] = [];

  if (input.outdoorTemp < heatPump.minOutdoorTemp) {
    alerts.push({
      type: 'error',
      field: 'outdoorTemp',
      message: `室外温度 ${input.outdoorTemp}℃ 低于机组最低工作温度 ${heatPump.minOutdoorTemp}℃`,
      suggestion: `请将室外温度调整至 ${heatPump.minOutdoorTemp}℃ 以上，或选择适用于更低温度的机组型号`
    });
  }

  if (input.outdoorTemp > heatPump.maxOutdoorTemp) {
    alerts.push({
      type: 'error',
      field: 'outdoorTemp',
      message: `室外温度 ${input.outdoorTemp}℃ 高于机组最高工作温度 ${heatPump.maxOutdoorTemp}℃`,
      suggestion: `请将室外温度调整至 ${heatPump.maxOutdoorTemp}℃ 以下`
    });
  }

  if (input.supplyWaterTemp < 25) {
    alerts.push({
      type: 'warning',
      field: 'supplyWaterTemp',
      message: `供水温度 ${input.supplyWaterTemp}℃ 偏低`,
      suggestion: '通常地暖供水温度建议在35-45℃，暖气片建议在50-55℃'
    });
  }

  if (input.supplyWaterTemp > 60) {
    alerts.push({
      type: 'warning',
      field: 'supplyWaterTemp',
      message: `供水温度 ${input.supplyWaterTemp}℃ 偏高，可能影响机组寿命`,
      suggestion: '建议将供水温度设置在60℃以下，高温会显著降低COP并增加压缩机磨损'
    });
  }

  if (input.heatLoad <= 0) {
    alerts.push({
      type: 'error',
      field: 'heatLoad',
      message: '热负荷不能为0或负数',
      suggestion: '请输入正确的建筑热负荷，可通过热负荷计算软件获得'
    });
  }

  if (input.heatLoad > heatPump.ratedCapacity * 1.5) {
    alerts.push({
      type: 'warning',
      field: 'heatLoad',
      message: `热负荷 ${input.heatLoad}kW 远大于机组额定制热量 ${heatPump.ratedCapacity}kW`,
      suggestion: '建议选择更大容量的机组，或考虑多机并联方案'
    });
  }

  if (input.electricityPrice.peak <= input.electricityPrice.valley) {
    alerts.push({
      type: 'warning',
      field: 'electricityPrice',
      message: '峰电价不应低于或等于谷电价',
      suggestion: '请检查电价设置是否正确，通常峰时段电价高于谷时段'
    });
  }

  if (input.electricityPrice.peak <= 0 || input.electricityPrice.valley <= 0 || input.electricityPrice.flat <= 0) {
    alerts.push({
      type: 'error',
      field: 'electricityPrice',
      message: '电价不能为0或负数',
      suggestion: '请输入正确的电价数值'
    });
  }

  const totalHours = input.operatingHours.peak + input.operatingHours.valley + input.operatingHours.flat;
  if (totalHours > 24) {
    alerts.push({
      type: 'error',
      field: 'operatingHours',
      message: `每日运行时间合计 ${totalHours} 小时，超过24小时`,
      suggestion: '请调整各时段运行小时数，合计不应超过24小时'
    });
  }

  if (totalHours === 0) {
    alerts.push({
      type: 'error',
      field: 'operatingHours',
      message: '每日运行时间不能为0',
      suggestion: '请设置至少一个时段的运行小时数'
    });
  }

  if (totalHours < 8) {
    alerts.push({
      type: 'info',
      field: 'operatingHours',
      message: `每日运行时间较短（${totalHours}小时）`,
      suggestion: '如果是间歇运行模式，此设置是正常的'
    });
  }

  return alerts;
};

export const hasErrors = (alerts: RiskAlert[]): boolean => {
  return alerts.some(alert => alert.type === 'error');
};

export const hasWarnings = (alerts: RiskAlert[]): boolean => {
  return alerts.some(alert => alert.type === 'warning');
};

export const getAlertsByField = (alerts: RiskAlert[], field: string): RiskAlert[] => {
  return alerts.filter(alert => alert.field === field);
};
