
import { WindType, Rule, Drone } from '@/types';

export const WIND_EFFECTS: Record<WindType, { consumptionMultiplier: number; speedMultiplier: number }> = {
  headwind: { consumptionMultiplier: 1.8, speedMultiplier: 0.7 },
  tailwind: { consumptionMultiplier: 0.7, speedMultiplier: 1.2 },
  crosswind: { consumptionMultiplier: 1.3, speedMultiplier: 0.9 },
  calm: { consumptionMultiplier: 1.0, speedMultiplier: 1.0 }
};

export const WIND_LABELS: Record<WindType, string> = {
  headwind: '逆风',
  tailwind: '顺风',
  crosswind: '侧风',
  calm: '无风'
};

export const WIND_COLORS: Record<WindType, string> = {
  headwind: 'rgba(255, 59, 48, 0.3)',
  tailwind: 'rgba(52, 199, 89, 0.3)',
  crosswind: 'rgba(255, 149, 0, 0.3)',
  calm: 'rgba(142, 142, 147, 0.2)'
};

export const RULES: Rule[] = [
  {
    id: 'R001',
    name: '逆风规避规则',
    description: '应主动规避强逆风区域，可选择绕行以降低能耗。逆风会使能耗增加80%，速度降低30%。',
    penalty: 15,
    category: 'wind'
  },
  {
    id: 'R002',
    name: '返航余量规则',
    description: '返航电量需保持安全余量：正常天气20%，逆风条件下需增加至35%。',
    penalty: 20,
    category: 'energy'
  },
  {
    id: 'R003',
    name: '路径优化规则',
    description: '航线路径应尽量简洁高效，避免不必要的绕路和过多的航点。',
    penalty: 10,
    category: 'path'
  },
  {
    id: 'R004',
    name: '禁飞区规则',
    description: '航线不可穿越禁飞区域，必须保持安全距离。',
    penalty: 30,
    category: 'path'
  },
  {
    id: 'R005',
    name: '数据完整性规则',
    description: '飞行记录关键字段不可缺失，包括飞行员姓名、电池数据等。',
    penalty: 5,
    category: 'data'
  },
  {
    id: 'R006',
    name: '数据时效性规则',
    description: '飞行数据应在24小时内完成录入，逾期补录将影响数据可信度。',
    penalty: 3,
    category: 'data'
  }
];

export const Drones: Drone[] = [
  {
    id: 'drone-001',
    name: 'Phantom 4 Pro',
    maxBattery: 5870,
    cruiseSpeed: 15,
    baseConsumption: 120
  },
  {
    id: 'drone-002',
    name: 'Mavic 2 Pro',
    maxBattery: 3850,
    cruiseSpeed: 18,
    baseConsumption: 95
  },
  {
    id: 'drone-003',
    name: 'Inspire 2',
    maxBattery: 9800,
    cruiseSpeed: 25,
    baseConsumption: 220
  }
];

export const CANVAS_CONFIG = {
  width: 800,
  height: 600,
  gridSize: 40
};

export const VIOLATION_LABELS: Record<string, string> = {
  headwind_ignored: '逆风耗电',
  inefficient_path: '路径低效',
  insufficient_return: '返航不足',
  no_fly_zone: '禁飞穿越',
  missing_field: '缺字段',
  late_entry: '晚补'
};

export const VIOLATION_COLORS: Record<string, string> = {
  headwind_ignored: '#FF3B30',
  inefficient_path: '#FF9500',
  insufficient_return: '#FF9500',
  no_fly_zone: '#FF3B30',
  missing_field: '#FFCC00',
  late_entry: '#FF9500'
};
