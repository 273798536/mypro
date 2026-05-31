import type { CalculateRequest } from './shared/types';

const now = new Date().toISOString();

export const normalSample: CalculateRequest = {
  shipName: '远洋号客轮',
  hullParams: {
    displacement: 5000,
    GM: 0.8,
    rollRadius: 4.5,
    shipLength: 120,
    shipWidth: 20,
    source: { name: '船体改装设计报告_2024.pdf', timestamp: now },
  },
  waveParams: {
    significantHeight: 1.5,
    wavePeriod: 8,
    waveDirection: 90,
    source: { name: '东海海洋站_20240515.csv', timestamp: now },
  },
  navigationParams: {
    speed: 15,
    speedHistory: [14.5, 14.8, 15.2, 14.9, 15.1],
    headingAngle: 0,
    source: { name: 'AIS实时数据_20240515.json', timestamp: now },
  },
  cabinParams: {
    longitudinalPos: 0,
    verticalPos: 9,
    deck: 3,
    source: { name: '舱室布局图_改装后.dwg', timestamp: now },
  },
};

export const waveMissingSample: CalculateRequest = {
  shipName: '和平号客轮',
  hullParams: {
    displacement: 8000,
    GM: 0.6,
    rollRadius: 5.2,
    shipLength: 150,
    shipWidth: 24,
    source: { name: '原船级社检验报告.pdf', timestamp: now },
  },
  waveParams: {
    significantHeight: null,
    wavePeriod: null,
    waveDirection: null,
    source: { name: '海洋站数据（缺测）', timestamp: now },
  },
  navigationParams: {
    speed: 12,
    speedHistory: [11.8, 12.1, 11.9, 12.2, 12.0],
    headingAngle: 45,
    source: { name: '船舶日志_20240515.xlsx', timestamp: now },
  },
  cabinParams: {
    longitudinalPos: -20,
    verticalPos: 12,
    deck: 4,
    source: { name: '客舱分布表.csv', timestamp: now },
  },
};

export const speedJumpSample: CalculateRequest = {
  shipName: '飞跃号快船',
  hullParams: {
    displacement: 3000,
    GM: 1.2,
    rollRadius: 3.8,
    shipLength: 90,
    shipWidth: 16,
    source: { name: '高速客船设计手册.pdf', timestamp: now },
  },
  waveParams: {
    significantHeight: 2.0,
    wavePeriod: 10,
    waveDirection: 120,
    source: { name: '气象预报_20240515.xml', timestamp: now },
  },
  navigationParams: {
    speed: 35,
    speedHistory: [18, 17.5, 18.2, 17.8, 35],
    headingAngle: 0,
    source: { name: '机舱数据记录仪.json', timestamp: now },
  },
  cabinParams: {
    longitudinalPos: 10,
    verticalPos: 6,
    deck: 2,
    source: { name: '舱室坐标表.csv', timestamp: now },
  },
};

export const cabinMisalignmentSample: CalculateRequest = {
  shipName: '复兴号客轮（改装后）',
  hullParams: {
    displacement: 6500,
    GM: 0.75,
    rollRadius: 4.8,
    shipLength: 135,
    shipWidth: 22,
    source: { name: '改装工程竣工报告.pdf', timestamp: now },
  },
  waveParams: {
    significantHeight: 1.8,
    wavePeriod: 9,
    waveDirection: 75,
    source: { name: '卫星遥感波浪数据.nc', timestamp: now },
  },
  navigationParams: {
    speed: 14,
    speedHistory: [13.8, 14.2, 14.0, 13.9, 14.1],
    headingAngle: 30,
    source: { name: 'AIS轨迹数据.json', timestamp: now },
  },
  cabinParams: {
    longitudinalPos: 200,
    verticalPos: 2,
    deck: 5,
    source: { name: '改装前舱室数据表（已过期）.xls', timestamp: now },
  },
};

export const combinedAnomalySample: CalculateRequest = {
  shipName: '探索号科考船',
  hullParams: {
    displacement: 4500,
    GM: 0.9,
    rollRadius: 4.2,
    shipLength: 110,
    shipWidth: 19,
    source: { name: '船舶技术参数手册.pdf', timestamp: now },
  },
  waveParams: {
    significantHeight: null,
    wavePeriod: 7,
    waveDirection: null,
    source: { name: '现场观测（部分缺测）.csv', timestamp: now },
  },
  navigationParams: {
    speed: 28,
    speedHistory: [12, 12.5, 11.8, 28, 27.5],
    headingAngle: 60,
    source: { name: '机舱监控数据.json', timestamp: now },
  },
  cabinParams: {
    longitudinalPos: -180,
    verticalPos: 15,
    deck: 25,
    source: { name: '第三方提供的舱室数据.xlsx', timestamp: now },
  },
};

export function printSample(name: string, sample: CalculateRequest) {
  console.log(`\n========== ${name} ==========`);
  console.log('船舶:', sample.shipName);
  console.log('排水量:', sample.hullParams.displacement, '吨');
  console.log('初稳心高:', sample.hullParams.GM, 'm');
  console.log('横摇惯性半径:', sample.hullParams.rollRadius, 'm');
  console.log('波浪有义波高:', sample.waveParams.significantHeight, 'm');
  console.log('波浪周期:', sample.waveParams.wavePeriod, 's');
  console.log('当前航速:', sample.navigationParams.speed, '节');
  console.log('航速历史:', sample.navigationParams.speedHistory?.join(', '));
  console.log('舱室纵向位置:', sample.cabinParams.longitudinalPos, 'm');
  console.log('舱室垂向位置:', sample.cabinParams.verticalPos, 'm');
  console.log('舱室甲板层:', sample.cabinParams.deck);
}

if (process.argv[2] === '--print') {
  printSample('正常样例', normalSample);
  printSample('波浪缺测样例', waveMissingSample);
  printSample('航速突变样例', speedJumpSample);
  printSample('舱室错位样例', cabinMisalignmentSample);
  printSample('综合异常样例', combinedAnomalySample);
}
