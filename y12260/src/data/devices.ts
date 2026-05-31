import { Device, DeviceType } from '@/types';

export const DEVICES: Record<DeviceType, Device> = {
  speaker: {
    id: 'speaker',
    type: 'speaker',
    name: '主音箱',
    icon: 'Speaker',
    size: { width: 2, height: 2 },
    priority: 1,
    score: 100,
    color: '#A855F7'
  },
  mic_stand: {
    id: 'mic_stand',
    type: 'mic_stand',
    name: '麦克风架',
    icon: 'Mic2',
    size: { width: 1, height: 1 },
    priority: 2,
    score: 50,
    color: '#EC4899'
  },
  mixer: {
    id: 'mixer',
    type: 'mixer',
    name: '调音台',
    icon: 'SlidersHorizontal',
    size: { width: 3, height: 2 },
    priority: 1,
    score: 150,
    color: '#06B6D4'
  },
  effect_pedal: {
    id: 'effect_pedal',
    type: 'effect_pedal',
    name: '效果器',
    icon: 'Gauge',
    size: { width: 1, height: 1 },
    priority: 3,
    score: 40,
    color: '#F97316'
  },
  di_box: {
    id: 'di_box',
    type: 'di_box',
    name: 'DI盒',
    icon: 'Box',
    size: { width: 1, height: 1 },
    priority: 3,
    score: 30,
    color: '#10B981'
  },
  monitor: {
    id: 'monitor',
    type: 'monitor',
    name: '返听音箱',
    icon: 'MonitorSmartphone',
    size: { width: 2, height: 1 },
    priority: 2,
    score: 70,
    color: '#EAB308'
  }
};

export const DEVICE_LIST: Device[] = Object.values(DEVICES);

export const CABLE_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#10B981',
  '#06B6D4',
  '#A855F7',
  '#EC4899',
  '#6366F1'
];

export const MUSICIAN_COLORS: Record<string, string> = {
  '主唱': '#EF4444',
  '吉他手': '#F97316',
  '贝斯手': '#10B981',
  '鼓手': '#A855F7',
  '键盘手': '#06B6D4'
};
