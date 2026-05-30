import { MeasurementPoint } from '../types';

const SYSTEMATIC_OFFSET = 0.023;

export const mockMeasurementPoints: MeasurementPoint[] = [
  {
    id: 'p001',
    pointName: 'A-01',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 50.015 + SYSTEMATIC_OFFSET,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:15:23',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-001',
    x: 1,
    remeasureRecords: [
      {
        id: 'r001',
        measuredValue: 50.038,
        measureTime: '2026-05-31 09:18:45',
        operator: '李四',
        reason: '首次测量复检',
      },
    ],
  },
  {
    id: 'p002',
    pointName: 'A-02',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 49.992 + SYSTEMATIC_OFFSET,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:16:02',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-002',
    x: 2,
  },
  {
    id: 'p003',
    pointName: 'A-03',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 50.008 + SYSTEMATIC_OFFSET,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:16:41',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-003',
    x: 3,
  },
  {
    id: 'p004',
    pointName: 'B-01',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 50.021 + SYSTEMATIC_OFFSET,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:17:18',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-004',
    x: 4,
  },
  {
    id: 'p005',
    pointName: 'B-02',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 0,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:17:55',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-005',
    x: 5,
    isMissing: true,
  },
  {
    id: 'p006',
    pointName: 'B-03',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-002',
    designSize: 50.0,
    measuredValue: 50.102,
    tolerance: 0.05,
    measureTime: '2026-05-31 10:02:33',
    operator: '王五',
    rawDataRef: 'RAW-2026-0531-006',
    x: 6,
  },
  {
    id: 'p007',
    pointName: 'C-01',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 49.988 + SYSTEMATIC_OFFSET,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:19:22',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-007',
    x: 7,
  },
  {
    id: 'p008',
    pointName: 'C-02',
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    designSize: 50.0,
    measuredValue: 50.005 + SYSTEMATIC_OFFSET,
    tolerance: 0.05,
    measureTime: '2026-05-31 09:20:05',
    operator: '张三',
    rawDataRef: 'RAW-2026-0531-008',
    x: 8,
  },
];

export const requiredPointNames = [
  'A-01',
  'A-02',
  'A-03',
  'B-01',
  'B-02',
  'B-03',
  'C-01',
  'C-02',
];

export const mockFileInfo = {
  fileName: 'measurement_data_20260531.zip',
  fileSize: 245760,
  uploadTime: '2026-05-31 08:00:00',
  batchNo: 'BATCH-2026-001',
};

export const batchList = [
  {
    batchNo: 'BATCH-2026-001',
    fixtureId: 'FIX-001',
    measureDate: '2026-05-31',
    pointCount: 8,
  },
  {
    batchNo: 'BATCH-2026-002',
    fixtureId: 'FIX-001',
    measureDate: '2026-05-30',
    pointCount: 8,
  },
];

export function getMockDataByBatch(batchNo: string): MeasurementPoint[] {
  return mockMeasurementPoints.filter((p) => p.batchNo === batchNo);
}
