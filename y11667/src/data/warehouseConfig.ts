import { Warehouse } from '@/types';

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-001',
    name: '上海期货交割库A区',
    rows: 6,
    cols: 8,
    levels: 4,
    coordinates: { x: 0, y: 0, z: 0 },
    dataSource: '上海期货交易所仓单系统 v2.3.1',
  },
  {
    id: 'wh-002',
    name: '宁波保税仓库B区',
    rows: 5,
    cols: 6,
    levels: 3,
    coordinates: { x: 20, y: 0, z: 0 },
    dataSource: '宁波保税区物流管理系统 v1.8.0',
  },
];

export const DATA_SOURCES = {
  warehouse: '仓库坐标数据：上期所仓单注册系统',
  receipt: '仓单批次数据：期货公司交割系统',
  quality: '质检结果数据：第三方质检机构API',
  capacity: '库容数据：仓库WMS系统',
  delivery: '交割日数据：交易所日历',
};

export const STATUS_COLORS = {
  normal: '#10B981',
  warning: '#F59E0B',
  overload: '#EF4444',
  quality_fail: '#EAB308',
  delivery_soon: '#8B5CF6',
};

export const STATUS_LABELS = {
  normal: '正常',
  warning: '库容预警',
  overload: '库容超限',
  quality_fail: '质检未过',
  delivery_soon: '交割临近',
};
