import { ElectricityPrice } from '@/types';

export interface ElectricityTemplate {
  id: string;
  name: string;
  region: string;
  prices: ElectricityPrice;
  source: string;
}

export const electricityTemplates: ElectricityTemplate[] = [
  {
    id: 'bj-2024',
    name: '北京居民峰谷电价',
    region: '北京',
    prices: {
      peak: 0.78,
      valley: 0.32,
      flat: 0.52
    },
    source: '北京市发改委2024电价表'
  },
  {
    id: 'sh-2024',
    name: '上海居民峰谷电价',
    region: '上海',
    prices: {
      peak: 0.72,
      valley: 0.36,
      flat: 0.54
    },
    source: '上海市电力公司2024'
  },
  {
    id: 'gd-2024',
    name: '广东居民电价',
    region: '广东',
    prices: {
      peak: 0.92,
      valley: 0.35,
      flat: 0.65
    },
    source: '南方电网2024电价'
  },
  {
    id: 'js-2024',
    name: '江苏工业电价',
    region: '江苏',
    prices: {
      peak: 1.15,
      valley: 0.40,
      flat: 0.72
    },
    source: '江苏省电网销售电价'
  },
  {
    id: 'zj-2024',
    name: '浙江居民电价',
    region: '浙江',
    prices: {
      peak: 0.83,
      valley: 0.38,
      flat: 0.58
    },
    source: '浙江省电网2024'
  }
];

export const getElectricityTemplateById = (id: string): ElectricityTemplate | undefined => {
  return electricityTemplates.find(t => t.id === id);
};

export const getDefaultElectricityTemplate = (): ElectricityTemplate => {
  return electricityTemplates[0];
};
