import type { Chemical, Thresholds, WaterQuality } from '@/types';

export const CHEMICALS: Chemical[] = [
  {
    id: 'pac',
    name: '聚合氯化铝 (PAC)',
    type: 'coagulant',
    unitPrice: 2.5,
    dosageRange: [10, 50],
    efficiency: 0.85,
    targetIndicators: ['cod', 'turbidity', 'totalPhosphorus'],
    description: '常用混凝剂，对COD、浊度和总磷有较好的去除效果',
  },
  {
    id: 'pam',
    name: '聚丙烯酰胺 (PAM)',
    type: 'flocculant',
    unitPrice: 18.0,
    dosageRange: [0.5, 3],
    efficiency: 0.75,
    targetIndicators: ['turbidity', 'cod'],
    description: '助凝剂，增强絮凝效果，配合PAC使用效果更佳',
  },
  {
    id: 'lime',
    name: '石灰',
    type: 'phAdjuster',
    unitPrice: 0.8,
    dosageRange: [50, 200],
    efficiency: 0.9,
    targetIndicators: ['ph', 'totalPhosphorus'],
    description: '调节pH值，同时可辅助除磷',
  },
  {
    id: 'carbon',
    name: '活性炭',
    type: 'coagulant',
    unitPrice: 12.0,
    dosageRange: [20, 80],
    efficiency: 0.95,
    targetIndicators: ['cod', 'ammonia', 'turbidity'],
    description: '高级处理药剂，对难降解COD和氨氮有特效',
  },
];

export const STANDARD_THRESHOLDS: Thresholds = {
  cod: 50,
  ammonia: 5,
  totalPhosphorus: 0.5,
  totalNitrogen: 15,
  ph: [6, 9],
  turbidity: 10,
};

export const INITIAL_INLET: WaterQuality = {
  cod: 120,
  ammonia: 25,
  totalPhosphorus: 3.5,
  totalNitrogen: 45,
  ph: 7.2,
  turbidity: 85,
};

export const INDICATOR_LABELS: Record<keyof WaterQuality, string> = {
  cod: 'COD',
  ammonia: '氨氮',
  totalPhosphorus: '总磷',
  totalNitrogen: '总氮',
  ph: 'pH值',
  turbidity: '浊度',
};

export const INDICATOR_UNITS: Record<keyof WaterQuality, string> = {
  cod: 'mg/L',
  ammonia: 'mg/L',
  totalPhosphorus: 'mg/L',
  totalNitrogen: 'mg/L',
  ph: '',
  turbidity: 'NTU',
};

export const INDICATOR_COLORS: Record<keyof WaterQuality, string> = {
  cod: '#165DFF',
  ammonia: '#00B42A',
  totalPhosphorus: '#FF7D00',
  totalNitrogen: '#722ED1',
  ph: '#14C9C9',
  turbidity: '#F53F3F',
};
