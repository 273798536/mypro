import type { BuildingModel, MeterData } from '../types';

export const mockBuildingModel: BuildingModel = {
  id: 'building-001',
  name: '智慧园区A座',
  lastModified: '2026-05-20T10:00:00Z',
  floors: [
    {
      id: 'floor-1',
      name: '1层',
      level: 1,
      height: 4,
      position: [0, 0, 0],
      dimensions: [20, 4, 15],
      devices: [
        { id: 'dev-1-1', name: '中央空调主机', type: 'hvac', position: [-6, 2, 4], dimensions: [3, 2, 2] },
        { id: 'dev-1-2', name: '照明系统A区', type: 'lighting', position: [0, 3.5, 0], dimensions: [8, 0.2, 6] },
        { id: 'dev-1-3', name: '客梯1号', type: 'elevator', position: [7, 0, -5], dimensions: [2, 4, 2.5] },
      ],
    },
    {
      id: 'floor-2',
      name: '2层',
      level: 2,
      height: 3.5,
      position: [0, 4, 0],
      dimensions: [20, 3.5, 15],
      devices: [
        { id: 'dev-2-1', name: '中央空调主机', type: 'hvac', position: [-6, 2, 4], dimensions: [3, 2, 2] },
        { id: 'dev-2-2', name: '照明系统B区', type: 'lighting', position: [0, 3, 0], dimensions: [8, 0.2, 6] },
        { id: 'dev-2-3', name: '服务器机房空调', type: 'hvac', position: [5, 1.5, -4], dimensions: [2.5, 2, 2] },
      ],
    },
    {
      id: 'floor-3',
      name: '3层',
      level: 3,
      height: 3.5,
      position: [0, 7.5, 0],
      dimensions: [20, 3.5, 15],
      devices: [
        { id: 'dev-3-1', name: '中央空调主机', type: 'hvac', position: [-6, 2, 4], dimensions: [3, 2, 2] },
        { id: 'dev-3-2', name: '照明系统C区', type: 'lighting', position: [0, 3, 0], dimensions: [8, 0.2, 6] },
        { id: 'dev-3-3', name: '会议室投影系统', type: 'other', position: [4, 2.5, 2], dimensions: [1.5, 0.8, 1] },
      ],
    },
    {
      id: 'floor-4',
      name: '4层',
      level: 4,
      height: 3.5,
      position: [0, 11, 0],
      dimensions: [20, 3.5, 15],
      devices: [
        { id: 'dev-4-1', name: '中央空调主机', type: 'hvac', position: [-6, 2, 4], dimensions: [3, 2, 2] },
        { id: 'dev-4-2', name: '照明系统D区', type: 'lighting', position: [0, 3, 0], dimensions: [8, 0.2, 6] },
        { id: 'dev-4-3', name: '研发实验室设备', type: 'other', position: [5, 1.5, -3], dimensions: [4, 2.5, 3] },
      ],
    },
    {
      id: 'floor-5',
      name: '5层',
      level: 5,
      height: 3.5,
      position: [0, 14.5, 0],
      dimensions: [20, 3.5, 15],
      devices: [
        { id: 'dev-5-1', name: '中央空调主机', type: 'hvac', position: [-6, 2, 4], dimensions: [3, 2, 2] },
        { id: 'dev-5-2', name: '屋顶冷却塔', type: 'hvac', position: [6, 2.5, 0], dimensions: [4, 2, 4] },
        { id: 'dev-5-3', name: '电梯机房', type: 'elevator', position: [0, 1.5, -5], dimensions: [3, 2.5, 2] },
      ],
    },
  ],
};

export const mockMeterData: MeterData = {
  id: 'meter-2026-05',
  period: { start: '2026-05-01T00:00:00Z', end: '2026-05-28T23:59:59Z' },
  lastModified: '2026-05-28T23:59:59Z',
  floorMeters: [
    {
      floorId: 'floor-1',
      floorName: '1层',
      energyConsumption: { electricity: 4520, water: 120, gas: 80 },
      devices: [
        { deviceId: 'dev-1-1', deviceName: '中央空调主机', energyConsumption: { electricity: 2800 }, isAbnormal: false },
        { deviceId: 'dev-1-2', deviceName: '照明系统A区', energyConsumption: { electricity: 720 }, isAbnormal: false },
        { deviceId: 'dev-1-3', deviceName: '客梯1号', energyConsumption: { electricity: 1000 }, isAbnormal: true, abnormalReason: '运行频次异常高，日均运行时长超过16小时' },
      ],
    },
    {
      floorId: 'floor-2',
      floorName: '2层',
      energyConsumption: { electricity: 6850, water: 95, gas: 50 },
      devices: [
        { deviceId: 'dev-2-1', deviceName: '中央空调主机', energyConsumption: { electricity: 3200 }, isAbnormal: false },
        { deviceId: 'dev-2-2', deviceName: '照明系统B区', energyConsumption: { electricity: 650 }, isAbnormal: false },
        { deviceId: 'dev-2-3', deviceName: '服务器机房空调', energyConsumption: { electricity: 3000 }, isAbnormal: true, abnormalReason: '持续高负荷运行，制冷效率下降30%' },
      ],
    },
    {
      floorId: 'floor-3',
      floorName: '3层',
      energyConsumption: { electricity: 3200, water: 85, gas: 60 },
      devices: [
        { deviceId: 'dev-3-1', deviceName: '中央空调主机', energyConsumption: { electricity: 1800 }, isAbnormal: false },
        { deviceId: 'dev-3-2', deviceName: '照明系统C区', energyConsumption: { electricity: 580 }, isAbnormal: false },
        { deviceId: 'dev-3-3', deviceName: '会议室投影系统', energyConsumption: { electricity: 820 }, isAbnormal: false },
      ],
    },
    {
      floorId: 'floor-4',
      floorName: '4层',
      energyConsumption: { electricity: 5200, water: 150, gas: 45 },
      devices: [
        { deviceId: 'dev-4-1', deviceName: '中央空调主机', energyConsumption: { electricity: 2400 }, isAbnormal: true, abnormalReason: '压缩机异响，能耗较上月增加25%' },
        { deviceId: 'dev-4-2', deviceName: '照明系统D区', energyConsumption: { electricity: 600 }, isAbnormal: false },
        { deviceId: 'dev-4-3', deviceName: '研发实验室设备', energyConsumption: { electricity: 2200 }, isAbnormal: false },
      ],
    },
    {
      floorId: 'floor-5',
      floorName: '5层',
      energyConsumption: { electricity: 4100, water: 60, gas: 30 },
      devices: [
        { deviceId: 'dev-5-1', deviceName: '中央空调主机', energyConsumption: { electricity: 2200 }, isAbnormal: false },
        { deviceId: 'dev-5-2', deviceName: '屋顶冷却塔', energyConsumption: { electricity: 1500 }, isAbnormal: false },
        { deviceId: 'dev-5-3', deviceName: '电梯机房', energyConsumption: { electricity: 400 }, isAbnormal: false },
      ],
    },
  ],
};
