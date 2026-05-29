import { ParkingRecord, ExplanationResult } from '../types/parking';
import {
  calculateOverallPressure,
  calculateFloorContribution,
  calculateEntranceContribution,
  calculateTimeContribution,
  calculateEventContribution,
} from './pressureCalculator';
import { formatHour, getPressureLabel } from './colorUtils';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const generateExplanation = (record: ParkingRecord, allRecords: ParkingRecord[]): ExplanationResult => {
  const { floors, entrances, dateType, hourOfDay } = record;

  const overallPressure = calculateOverallPressure(floors, entrances, dateType, hourOfDay);
  const timeContribution = calculateTimeContribution(hourOfDay, dateType);
  const floorContribution = calculateFloorContribution(floors);
  const entranceContribution = calculateEntranceContribution(entrances);
  const eventContribution = calculateEventContribution(dateType, hourOfDay);

  const contributions = [
    { name: '时段高峰', value: timeContribution, key: 'time' as const },
    { name: '楼层溢出', value: floorContribution, key: 'floor' as const },
    { name: '入口压力', value: entranceContribution, key: 'entrance' as const },
    { name: '活动影响', value: eventContribution, key: 'event' as const },
  ].sort((a, b) => b.value - a.value);

  const primaryCause = contributions[0];
  const peakPeriod = findPeakPeriod(allRecords);

  const contributingFactors = contributions.map(c => ({
    name: c.name,
    value: c.value,
    description: getFactorDescription(c.key, c.value, record),
  }));

  const causeChain = buildCauseChain(record, contributions);
  const naturalLanguageExplanation = buildNaturalLanguageExplanation(record, primaryCause, contributions, overallPressure);

  return {
    id: generateId(),
    recordId: record.id,
    overallPressure,
    peakPeriod,
    primaryCause: primaryCause.name,
    timeContribution,
    floorContribution,
    entranceContribution,
    eventContribution,
    naturalLanguageExplanation,
    contributingFactors,
    causeChain,
  };
};

const findPeakPeriod = (records: ParkingRecord[]): string => {
  if (records.length === 0) return '18:00-20:00';
  
  let maxPressure = 0;
  let peakHour = 18;
  
  records.forEach(r => {
    const pressure = calculateOverallPressure(r.floors, r.entrances, r.dateType, r.hourOfDay);
    if (pressure > maxPressure) {
      maxPressure = pressure;
      peakHour = r.hourOfDay;
    }
  });

  const startHour = Math.floor(peakHour);
  return `${formatHour(startHour)}-${formatHour(startHour + 2)}`;
};

const getFactorDescription = (
  factor: 'time' | 'floor' | 'entrance' | 'event',
  value: number,
  record: ParkingRecord
): string => {
  const { hourOfDay, floors, entrances, dateType } = record;

  switch (factor) {
    case 'time':
      if (value < 0.3) return '当前时段车流平稳';
      if (value < 0.6) return `时段车流开始上升，${formatHour(hourOfDay)}进入小高峰`;
      return `处于当日高峰时段(${formatHour(hourOfDay)})，历史数据显示此时段为车流最集中时期`;

    case 'floor': {
      const maxFloor = floors.reduce((max, f) => f.pressureLevel > max.pressureLevel ? f : max, floors[0]);
      const fullCount = floors.filter(f => f.overflowStatus === 'full').length;
      if (value < 0.3) return '各楼层车位充足';
      if (value < 0.6) return `B${maxFloor.floorNumber + 1}层压力较高，占用率${Math.round(maxFloor.occupiedSpots / maxFloor.totalSpots * 100)}%`;
      if (fullCount > 0) return `${fullCount}个楼层已饱和，B${maxFloor.floorNumber + 1}层满位导致车辆绕行`;
      return `多楼层接近饱和，B${maxFloor.floorNumber + 1}层占用率${Math.round(maxFloor.occupiedSpots / maxFloor.totalSpots * 100)}%`;
    }

    case 'entrance': {
      const maxEntrance = entrances.reduce((max, e) => e.pressureLevel > max.pressureLevel ? e : max, entrances[0]);
      const blockedCount = entrances.filter(e => e.blockageStatus === 'blocked').length;
      if (value < 0.3) return '各入口通行顺畅';
      if (value < 0.6) return `${maxEntrance.entranceName}排队${maxEntrance.queueLength}辆，通行放缓`;
      if (blockedCount > 0) return `${blockedCount}个入口回堵，${maxEntrance.entranceName}排队${maxEntrance.queueLength}辆`;
      return `${maxEntrance.entranceName}压力最大，排队${maxEntrance.queueLength}辆，小时流量${maxEntrance.incomingCars}辆`;
    }

    case 'event':
      if (value < 0.2) return '无特殊活动影响';
      if (dateType === 'event') return '活动日车流激增，叠加时段高峰形成双重压力';
      return '周末商圈活动带动额外车流';
  }
};

const buildCauseChain = (
  record: ParkingRecord,
  contributions: Array<{ name: string; value: number; key: string }>
): string[] => {
  const chain: string[] = [];
  const { floors, entrances, hourOfDay } = record;

  const maxEntrance = entrances.reduce((max, e) => e.pressureLevel > max.pressureLevel ? e : max, entrances[0]);
  const maxFloor = floors.reduce((max, f) => f.pressureLevel > max.pressureLevel ? f : max, floors[0]);

  if (contributions[0].key === 'entrance' && maxEntrance.blockageStatus === 'blocked') {
    chain.push(`${maxEntrance.entranceName}回堵（排队${maxEntrance.queueLength}辆）`);
    chain.push('入口通行效率下降50%');
    if (maxFloor.overflowStatus === 'full') {
      chain.push('地面车辆无法入场，等待时间超过15分钟');
    }
    chain.push(`整体压力上升至${getPressureLabel(calculateOverallPressure(floors, entrances, record.dateType, hourOfDay))}`);
  } else if (contributions[0].key === 'floor' && maxFloor.overflowStatus === 'full') {
    chain.push(`${formatHour(hourOfDay)}时段高峰到来`);
    chain.push(`B${maxFloor.floorNumber + 1}层饱和（${maxFloor.occupiedSpots}/${maxFloor.totalSpots}）`);
    chain.push('车辆绕行至其他楼层，增加场内通行时间');
    if (maxEntrance.queueLength > 10) {
      chain.push(`${maxEntrance.entranceName}入口开始积压`);
    }
    chain.push(`整体压力${getPressureLabel(calculateOverallPressure(floors, entrances, record.dateType, hourOfDay))}`);
  } else {
    if (contributions[0].key === 'time') {
      chain.push(`进入${formatHour(hourOfDay)}高峰时段`);
    }
    if (maxEntrance.pressureLevel > 0.5) {
      chain.push(`${maxEntrance.entranceName}流量${maxEntrance.incomingCars}辆/小时`);
    }
    if (maxFloor.pressureLevel > 0.7) {
      chain.push(`B${maxFloor.floorNumber + 1}层占用率${Math.round(maxFloor.occupiedSpots / maxFloor.totalSpots * 100)}%`);
    }
    chain.push(`当前状态：${getPressureLabel(calculateOverallPressure(floors, entrances, record.dateType, hourOfDay))}`);
  }

  return chain;
};

const buildNaturalLanguageExplanation = (
  record: ParkingRecord,
  primaryCause: { name: string; value: number; key: string },
  contributions: Array<{ name: string; value: number; key: string }>,
  overallPressure: number
): string => {
  const { hourOfDay, floors, entrances, dateType } = record;
  const maxFloor = floors.reduce((max, f) => f.pressureLevel > max.pressureLevel ? f : max, floors[0]);
  const maxEntrance = entrances.reduce((max, e) => e.pressureLevel > max.pressureLevel ? e : max, entrances[0]);

  let explanation = `当前时间${formatHour(hourOfDay)}，整体压力为${getPressureLabel(overallPressure)}（${Math.round(overallPressure * 100)}%）。`;

  if (primaryCause.key === 'entrance' && maxEntrance.blockageStatus === 'blocked') {
    explanation += `主要原因是${maxEntrance.entranceName}入口回堵，当前排队${maxEntrance.queueLength}辆，通行效率大幅下降。`;
    if (maxFloor.overflowStatus === 'full') {
      explanation += `叠加B${maxFloor.floorNumber + 1}层满位，形成"入口堵+场内满"的双重压力。`;
    }
    explanation += `建议：立即加派人员在${maxEntrance.entranceName}疏导，同时在外部道路引导车辆绕行至${entrances.filter(e => e.blockageStatus === 'normal').map(e => e.entranceName).join('、')}。`;
  } else if (primaryCause.key === 'floor' && maxFloor.overflowStatus === 'full') {
    explanation += `主要原因是B${maxFloor.floorNumber + 1}层饱和，当前${maxFloor.occupiedSpots}/${maxFloor.totalSpots}个车位已占用。`;
    if (dateType === 'event') {
      explanation += '今日为活动日，车流较平日增加40%。';
    }
    explanation += `建议：通过场内诱导屏引导车辆优先前往${floors.filter(f => f.overflowStatus === 'normal').map(f => 'B' + (f.floorNumber + 1) + '层').join('、')}，同时提前开放备用楼层。`;
  } else if (primaryCause.key === 'time') {
    explanation += `当前处于${formatHour(hourOfDay)}时段高峰，`;
    if (dateType === 'workday') {
      explanation += '工作日晚高峰通勤车流与商圈购物车流叠加。';
    } else if (dateType === 'weekend') {
      explanation += '周末休闲购物客流集中。';
    } else {
      explanation += '活动散场时段，车流集中离场。';
    }
    if (maxEntrance.queueLength > 5) {
      explanation += `${maxEntrance.entranceName}已出现${maxEntrance.queueLength}辆排队，建议加开临时入口通道。`;
    }
  } else if (primaryCause.key === 'event') {
    explanation += '今日为活动日，商圈客流激增，';
    explanation += `${formatHour(hourOfDay)}时段活动散场与常规高峰叠加。`;
    explanation += `建议：启动活动日应急预案，所有入口全开，加派10名疏导人员。`;
  }

  const secondary = contributions[1];
  if (secondary && secondary.value > 0.5) {
    explanation += `此外，${secondary.name}贡献度${Math.round(secondary.value * 100)}%，也是重要影响因素。`;
  }

  return explanation;
};
