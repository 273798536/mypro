import { SupplierQuote, WeightConfig, JudgeNote, WeightChangeRecord } from '@/types';

export const SAMPLE_SUPPLIERS: SupplierQuote[] = [
  {
    id: 's1',
    name: '中科智造',
    source: '公开招标文件',
    price: 85,
    energyConsumption: 120,
    afterSales: 88,
    deliveryPeriod: 45,
  },
  {
    id: 's2',
    name: '瑞恒机械',
    source: '公开招标文件',
    price: 92,
    energyConsumption: 135,
    afterSales: 82,
    deliveryPeriod: 50,
  },
  {
    id: 's3',
    name: '鼎盛装备',
    source: '邀请报价',
    price: 78,
    energyConsumption: 110,
    afterSales: 90,
    deliveryPeriod: 40,
  },
  {
    id: 's4',
    name: '华信达设备',
    source: '邀请报价',
    price: 0,
    energyConsumption: -5,
    afterSales: 0,
    deliveryPeriod: 999,
  },
  {
    id: 's5',
    name: '博远科技',
    source: '公开招标文件',
    price: 88,
    energyConsumption: 128,
    afterSales: 85,
    deliveryPeriod: 48,
  },
  {
    id: 's6',
    name: '天成重工',
    source: '邀请报价',
    price: 95,
    energyConsumption: 142,
    afterSales: 78,
    deliveryPeriod: 55,
  },
];

export const DEFAULT_WEIGHTS: WeightConfig = {
  price: 35,
  energyConsumption: 25,
  afterSales: 20,
  deliveryPeriod: 20,
};

export const SAMPLE_NOTES: JudgeNote[] = [
  {
    id: 'n1',
    supplierId: 's3',
    dimension: 'price',
    content: '鼎盛装备价格最低，但需核实是否包含安装调试费用',
    author: '张评委',
    timestamp: Date.now() - 86400000,
  },
  {
    id: 'n2',
    supplierId: 's4',
    dimension: 'price',
    content: '华信达报价为0，疑似未填写或数据缺失，需联系确认',
    author: '李评委',
    timestamp: Date.now() - 43200000,
  },
  {
    id: 'n3',
    supplierId: 's6',
    dimension: 'deliveryPeriod',
    content: '天成重工交付期最长，但承诺可加急至40天，需书面确认',
    author: '王评委',
    timestamp: Date.now() - 21600000,
  },
];

export const SAMPLE_WEIGHT_HISTORY: WeightChangeRecord[] = [
  {
    id: 'wh1',
    timestamp: Date.now() - 172800000,
    previous: { price: 25, energyConsumption: 25, afterSales: 25, deliveryPeriod: 25 },
    current: { price: 30, energyConsumption: 25, afterSales: 25, deliveryPeriod: 20 },
    operator: '张评委',
  },
  {
    id: 'wh2',
    timestamp: Date.now() - 86400000,
    previous: { price: 30, energyConsumption: 25, afterSales: 25, deliveryPeriod: 20 },
    current: { price: 35, energyConsumption: 25, afterSales: 20, deliveryPeriod: 20 },
    operator: '李评委',
  },
];
