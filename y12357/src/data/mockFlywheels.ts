import type { Flywheel } from '../types';

export const mockFlywheels: Flywheel[] = [
  {
    id: 'fw-001',
    name: '45号钢飞轮A-03',
    material: '45号钢',
    radius: 0.5,
    radiusUnit: 'm',
    rawRadiusInput: '500',
    mass: 120,
    frictionCoeff: 0.025,
    batchNo: 'BATCH-2024-001',
    createTime: Date.now() - 86400000 * 3,
  },
  {
    id: 'fw-002',
    name: '铸铁飞轮B-01',
    material: '铸铁',
    radius: 0.35,
    radiusUnit: 'm',
    rawRadiusInput: '350',
    mass: 95,
    frictionCoeff: null,
    batchNo: 'BATCH-2024-002',
    createTime: Date.now() - 86400000 * 2,
  },
  {
    id: 'fw-003',
    name: '铝合金飞轮C-02',
    material: '铝合金',
    radius: 0.25,
    radiusUnit: 'm',
    rawRadiusInput: '250',
    mass: 45,
    frictionCoeff: 0.018,
    batchNo: 'BATCH-2024-003',
    createTime: Date.now() - 86400000,
  },
];

export const materialFrictionStandards: Record<string, number> = {
  '45号钢': 0.025,
  '铸铁': 0.035,
  '铝合金': 0.018,
  '不锈钢': 0.022,
  '铜': 0.030,
};
