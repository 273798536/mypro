import type { ImportRawRecord } from '@/types';

export const REIMPORT_TEST_CASE_A: ImportRawRecord[] = [
  {
    deviceCode: 'MIC-T01',
    deviceCoordinates: { x: 0, y: 1.5, z: 0 },
    rawRemark: '测试重复导入-第一次',
    cameraView: { isValid: true, position: [5, 5, 10], target: [0, 1, 0], fov: 50, label: 'T01' },
    soundRays: [],
  },
  {
    deviceCode: 'MIC-T02',
    deviceCoordinates: { x: 2, y: 1.5, z: 2 },
    rawRemark: '测试重复导入-第一次',
    soundRays: [],
  },
];

export const REIMPORT_TEST_CASE_B: ImportRawRecord[] = [
  {
    deviceCode: 'MIC-T01',
    deviceCoordinates: { x: 0, y: 1.5, z: 0 },
    rawRemark: '测试重复导入-第二次（与T01重复）',
    soundRays: [],
  },
  {
    deviceCode: 'MIC-T03',
    deviceCoordinates: { x: -2, y: 1.5, z: -2 },
    rawRemark: '新增记录',
    soundRays: [],
  },
];

export function downloadAsJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
