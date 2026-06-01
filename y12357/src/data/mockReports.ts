import type { MeasurementReport, Flywheel, AngularVelocityRecord, InertiaResult } from '../types';

const sampleFlywheel: Flywheel = {
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
};

const sampleVelocities: AngularVelocityRecord[] = [];
for (let i = 0; i < 10; i++) {
  sampleVelocities.push({
    id: `vel-fw-001-${i}`,
    flywheelId: 'fw-001',
    timestamp: i * 0.5,
    omega: 80 + i * 5,
    alpha: 10,
    torque: 1500 + i * 50,
    source: 'sensor',
    isValid: true,
  });
}

const sampleResult: InertiaResult = {
  id: 'res-001',
  flywheelId: 'fw-001',
  timeRange: [0, 20],
  theoreticalInertia: 15.0,
  measuredInertia: 15.23,
  frictionCorrection: 0.18,
  finalInertia: 15.41,
  deviation: 2.73,
  calculationTrace: {
    angularVelocityIds: ['vel-fw-001-0', 'vel-fw-001-1'],
    formula: 'I = τ / α + I_friction',
    steps: [
      { param: 'τ (平均力矩)', value: 1523.5, source: '角速度记录' },
      { param: 'α (平均角加速度)', value: 98.86, source: '角速度记录' },
      { param: 'I_measured', value: 15.23, source: '计算' },
      { param: 'I_friction', value: 0.18, source: '摩擦修正' },
    ],
  },
  gapsInvolved: [],
  errorsInvolved: [],
};

export const mockReports: MeasurementReport[] = [
  {
    id: 'rpt-001',
    flywheelId: 'fw-001',
    reportNo: 'REP-2024-06-001',
    reportDate: '2024-06-15',
    reportedInertia: 15.5,
    reportedUnit: 'kg·m²',
    rawDataSnapshot: {
      flywheel: sampleFlywheel,
      angularVelocities: sampleVelocities,
      results: [sampleResult],
    },
    angularVelocityIds: sampleVelocities.map(v => v.id),
    status: 'final',
  },
  {
    id: 'rpt-002',
    flywheelId: 'fw-002',
    reportNo: 'REP-2024-06-002',
    reportDate: '2024-06-16',
    reportedInertia: 5.95,
    reportedUnit: 'kg·m²',
    rawDataSnapshot: {
      flywheel: { ...sampleFlywheel, id: 'fw-002', name: '铸铁飞轮B-01', material: '铸铁', radius: 0.35, mass: 95, frictionCoeff: null },
      angularVelocities: [],
      results: [],
    },
    angularVelocityIds: [],
    status: 'conflicting',
  },
];
