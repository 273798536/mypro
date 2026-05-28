import { HeatPumpParams } from '@/types';

export const heatPumpData: HeatPumpParams[] = [
  {
    id: 'hp-001',
    model: 'AQUA HEAT 10',
    brand: '美的',
    ratedCOP: 4.2,
    ratedOutdoorTemp: 7,
    ratedSupplyWaterTemp: 45,
    minOutdoorTemp: -25,
    maxOutdoorTemp: 43,
    ratedCapacity: 10,
    powerInput: 2.38,
    source: '美的2024产品手册'
  },
  {
    id: 'hp-002',
    model: 'Thermia Diplomat',
    brand: '丹佛斯',
    ratedCOP: 4.8,
    ratedOutdoorTemp: 7,
    ratedSupplyWaterTemp: 35,
    minOutdoorTemp: -20,
    maxOutdoorTemp: 35,
    ratedCapacity: 12,
    powerInput: 2.5,
    source: '丹佛斯官方技术参数'
  },
  {
    id: 'hp-003',
    model: '格力·火玫瑰',
    brand: '格力',
    ratedCOP: 3.8,
    ratedOutdoorTemp: -12,
    ratedSupplyWaterTemp: 41,
    minOutdoorTemp: -30,
    maxOutdoorTemp: 24,
    ratedCapacity: 8.5,
    powerInput: 2.24,
    source: '格力低温热泵技术手册'
  },
  {
    id: 'hp-004',
    model: '海尔·天沐',
    brand: '海尔',
    ratedCOP: 4.5,
    ratedOutdoorTemp: 7,
    ratedSupplyWaterTemp: 55,
    minOutdoorTemp: -15,
    maxOutdoorTemp: 40,
    ratedCapacity: 15,
    powerInput: 3.33,
    source: '海尔空气能2024样本'
  },
  {
    id: 'hp-005',
    model: 'Vaillant aroTHERM',
    brand: '威能',
    ratedCOP: 5.1,
    ratedOutdoorTemp: 7,
    ratedSupplyWaterTemp: 35,
    minOutdoorTemp: -22,
    maxOutdoorTemp: 35,
    ratedCapacity: 7,
    powerInput: 1.37,
    source: 'Vaillant德国总部技术文档'
  }
];

export const getHeatPumpById = (id: string): HeatPumpParams | undefined => {
  return heatPumpData.find(hp => hp.id === id);
};

export const getDefaultHeatPump = (): HeatPumpParams => {
  return heatPumpData[0];
};
