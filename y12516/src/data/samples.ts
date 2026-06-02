import { SurfaceModel, SamplePoint } from '../types';

export const sampleSurfaces: SurfaceModel[] = [
  {
    id: 's_001',
    name: '抛物面 z = x² + y²',
    equation: 'z = x² + y²',
    domain: { xRange: [-2, 2], yRange: [-2, 2] },
    parameters: { a: 1, b: 1 },
    currentVersion: 2,
    versions: [
      {
        id: 'v_001_v1',
        version: 1,
        createdAt: '2026-06-01T10:00:00Z',
        fluxEstimate: 5.2,
        samplePoints: generateSamplePoints(1, false),
        anomalies: [],
        notes: '初始版本 - 正常记录'
      },
      {
        id: 'v_001_v2',
        version: 2,
        createdAt: '2026-06-01T14:30:00Z',
        fluxEstimate: 5.8,
        samplePoints: generateSamplePoints(2, false),
        anomalies: [],
        notes: '补充了2个采样点'
      }
    ]
  },
  {
    id: 's_002',
    name: '球面 x² + y² + z² = 4',
    equation: 'z = sqrt(4 - x² - y²)',
    domain: { xRange: [-1.5, 1.5], yRange: [-1.5, 1.5] },
    parameters: { radius: 2 },
    currentVersion: 1,
    versions: [
      {
        id: 'v_002_v1',
        version: 1,
        createdAt: '2026-06-02T09:00:00Z',
        fluxEstimate: 12.5,
        samplePoints: generateSamplePoints(1, true),
        anomalies: [
          {
            id: 'bm_boundary_missing',
            type: 'boundary_missing',
            description: '边界采样不足: 期望 4 个, 实际 1 个',
            severity: 'error',
            evidence: { before: 4, after: 1, timestamp: '2026-06-02T09:00:00Z' },
            versionId: 'v_002_v1'
          }
        ],
        notes: '边界漏算样例 - 用于演示边界检测功能'
      }
    ]
  }
];

function generateSamplePoints(version: number, hasBoundaryIssue: boolean): SamplePoint[] {
  const baseCount = version === 1 ? 8 : 10;
  const points: SamplePoint[] = [];
  for (let i = 0; i < baseCount; i++) {
    const x = (Math.random() - 0.5) * 3;
    const y = (Math.random() - 0.5) * 3;
    const z = x * x + y * y;
    points.push({
      id: `p_${version}_${i}`,
      position: { x, y, z },
      normal: { x: -2 * x, y: -2 * y, z: 1 },
      fluxValue: 4 + Math.random() * 2,
      measuredAt: `2026-06-0${version}T10:0${i}:00Z`,
      isBoundary: false,
      source: 'original'
    });
  }
  if (!hasBoundaryIssue) {
    points.push({
      id: `p_${version}_b1`,
      position: { x: -2, y: 0, z: 4 },
      normal: { x: 4, y: 0, z: 1 },
      fluxValue: 6.5,
      measuredAt: `2026-06-0${version}T11:00:00Z`,
      isBoundary: true,
      source: 'original'
    });
    points.push({
      id: `p_${version}_b2`,
      position: { x: 2, y: 0, z: 4 },
      normal: { x: -4, y: 0, z: 1 },
      fluxValue: 6.8,
      measuredAt: `2026-06-0${version}T11:05:00Z`,
      isBoundary: true,
      source: 'original'
    });
  }
  return points;
}
