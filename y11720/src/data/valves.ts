import type { ValveLibraryItem } from '../types';

export const VALVE_LIBRARY: ValveLibraryItem[] = [
  {
    id: 'gate-1',
    type: '闸阀',
    subtype: '全开',
    kValue: 0.17,
    standard: 'GB/T 12234',
    description: '闸阀全开状态阻力系数',
  },
  {
    id: 'gate-2',
    type: '闸阀',
    subtype: '1/2开',
    kValue: 4.5,
    standard: 'GB/T 12234',
    description: '闸阀半开状态阻力系数',
  },
  {
    id: 'gate-3',
    type: '闸阀',
    subtype: '1/4开',
    kValue: 24,
    standard: 'GB/T 12234',
    description: '闸阀1/4开状态阻力系数',
  },
  {
    id: 'globe-1',
    type: '截止阀',
    subtype: '标准型',
    kValue: 6.3,
    standard: 'GB/T 12235',
    description: '标准截止阀阻力系数',
  },
  {
    id: 'globe-2',
    type: '截止阀',
    subtype: 'Y型',
    kValue: 1.8,
    standard: 'GB/T 12235',
    description: 'Y型截止阀阻力系数',
  },
  {
    id: 'ball-1',
    type: '球阀',
    subtype: '全通径',
    kValue: 0.05,
    standard: 'GB/T 12237',
    description: '全通径球阀全开阻力系数',
  },
  {
    id: 'ball-2',
    type: '球阀',
    subtype: '缩径',
    kValue: 0.5,
    standard: 'GB/T 12237',
    description: '缩径球阀阻力系数',
  },
  {
    id: 'butterfly-1',
    type: '蝶阀',
    subtype: '对夹式',
    kValue: 0.25,
    standard: 'GB/T 12238',
    description: '对夹式蝶阀全开阻力系数',
  },
  {
    id: 'butterfly-2',
    type: '蝶阀',
    subtype: '法兰式',
    kValue: 0.3,
    standard: 'GB/T 12238',
    description: '法兰式蝶阀全开阻力系数',
  },
  {
    id: 'check-1',
    type: '止回阀',
    subtype: '旋启式',
    kValue: 2.0,
    standard: 'GB/T 12236',
    description: '旋启式止回阀阻力系数',
  },
  {
    id: 'check-2',
    type: '止回阀',
    subtype: '升降式',
    kValue: 12.0,
    standard: 'GB/T 12236',
    description: '升降式止回阀阻力系数',
  },
  {
    id: 'elbow-90-1',
    type: '弯头',
    subtype: '90°标准',
    kValue: 0.75,
    standard: 'GB/T 12459',
    description: '90度标准弯头阻力系数',
  },
  {
    id: 'elbow-90-2',
    type: '弯头',
    subtype: '90°长半径',
    kValue: 0.45,
    standard: 'GB/T 12459',
    description: '90度长半径弯头阻力系数',
  },
  {
    id: 'elbow-45',
    type: '弯头',
    subtype: '45°',
    kValue: 0.35,
    standard: 'GB/T 12459',
    description: '45度弯头阻力系数',
  },
  {
    id: 'tee-1',
    type: '三通',
    subtype: '直流',
    kValue: 0.4,
    standard: 'GB/T 12459',
    description: '三通直流阻力系数',
  },
  {
    id: 'tee-2',
    type: '三通',
    subtype: '分流',
    kValue: 1.8,
    standard: 'GB/T 12459',
    description: '三通分流阻力系数',
  },
  {
    id: 'reducer-1',
    type: '大小头',
    subtype: '同心',
    kValue: 0.1,
    standard: 'GB/T 12459',
    description: '同心大小头阻力系数',
  },
  {
    id: 'reducer-2',
    type: '大小头',
    subtype: '偏心',
    kValue: 0.2,
    standard: 'GB/T 12459',
    description: '偏心大小头阻力系数',
  },
  {
    id: 'strainer',
    type: '过滤器',
    subtype: 'Y型',
    kValue: 2.5,
    standard: 'GB/T 13927',
    description: 'Y型过滤器阻力系数',
  },
  {
    id: 'expansion',
    type: '膨胀节',
    subtype: '波纹管',
    kValue: 0.3,
    standard: 'GB/T 12777',
    description: '波纹管膨胀节阻力系数',
  },
];

export function getValveById(id: string): ValveLibraryItem | undefined {
  return VALVE_LIBRARY.find((v) => v.id === id);
}

export function getValvesByType(type: string): ValveLibraryItem[] {
  return VALVE_LIBRARY.filter((v) => v.type === type);
}

export function getValveTypes(): string[] {
  return [...new Set(VALVE_LIBRARY.map((v) => v.type))];
}
