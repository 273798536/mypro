import type { CoordinateRecord, TimeConclusion, ViewpointSnapshot } from '@/types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function round(n: number, d = 3) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

export function generateMockEddyRecords(): CoordinateRecord[] {
  const records: CoordinateRecord[] = [];
  const deviceIds = ['ADCP-001', 'ADCP-002', 'ADCP-003', 'CTD-S07', 'CTD-S12'];
  const systems = ['CARTESIAN', 'CARTESIAN', 'CARTESIAN', 'LOCAL', 'WGS84'] as const;
  const timestamps = [
    '2026-06-01T08:00:00Z',
    '2026-06-01T09:00:00Z',
    '2026-06-01T10:00:00Z',
    '2026-06-01T11:00:00Z',
    '2026-06-01T12:00:00Z',
  ];
  const fileName = 'ocean_eddy_batch_0601.csv';
  const batchId = 'BATCH-20260601-001';

  const N = 380;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const theta = t * Math.PI * 6;
    const r = 1.5 + 2.5 * (1 - t * 0.5);
    const x = round(r * Math.cos(theta));
    const y = round(r * Math.sin(theta));
    const z = round(-5 + t * 8 + Math.sin(theta * 2) * 0.6);
    const value = round(0.4 + Math.sin(theta * 3) * 0.35 + t * 0.4, 4);
    const deviceId = deviceIds[i % deviceIds.length];
    const sysIdx = i % systems.length;
    const coordinateSystem = systems[sysIdx];
    const ts = timestamps[Math.floor(i / (N / timestamps.length)) % timestamps.length];

    const hashStr = `${deviceId}-${x}-${y}-${z}-${ts}`;
    let hashNum = 0;
    for (let j = 0; j < hashStr.length; j++) {
      hashNum = ((hashNum << 5) - hashNum + hashStr.charCodeAt(j)) | 0;
    }
    const hash = 'h' + Math.abs(hashNum).toString(36);

    const abnormalFlags: CoordinateRecord['abnormalFlags'] = [];
    if (Math.abs(x) > 5 || Math.abs(y) > 5 || z > 4 || z < -6) {
      abnormalFlags.push({
        type: 'OUT_OF_BOUNDS',
        detail: `坐标超出正常范围 (x:${x}, y:${y}, z:${z})`,
        resolved: false,
      });
    }
    if (i % 47 === 0 && i > 0) {
      abnormalFlags.push({
        type: 'COORDINATE_MIX',
        detail: `与同批记录坐标系不一致 (${coordinateSystem})`,
        resolved: false,
      });
    }

    records.push({
      id: uid(),
      deviceId,
      x,
      y,
      z,
      value,
      coordinateSystem,
      timestamp: ts,
      hash,
      conclusion: i % 73 === 0 ? '需要人工复核该采样点流速异常' : undefined,
      sourceMeta: {
        sourceFileName: fileName,
        originalLineNumber: i + 2,
        importBatchId: batchId,
        remark: i % 11 === 0 ? '备注：原始数据缺失一列，已按前值填充' : undefined,
      },
      abnormalFlags,
    });
  }

  const dupIds = [12, 56, 134, 201, 289];
  dupIds.forEach((idx, k) => {
    const src = records[idx];
    records.push({
      ...src,
      id: uid(),
      sourceMeta: {
        ...src.sourceMeta,
        originalLineNumber: src.sourceMeta.originalLineNumber + 400 + k * 17,
        importBatchId: 'BATCH-20260601-002',
        remark: '疑似重复导入',
      },
      abnormalFlags: [
        ...src.abnormalFlags,
        {
          type: 'DUPLICATE',
          detail: `与 BATCH-20260601-001 记录 hash 重复 (${src.hash})`,
          resolved: false,
        },
      ],
    });
  });

  return records;
}

export function generateMockTimeConclusions(): TimeConclusion[] {
  const timestamps = [
    '2026-06-01T08:00:00Z',
    '2026-06-01T09:00:00Z',
    '2026-06-01T10:00:00Z',
    '2026-06-01T11:00:00Z',
    '2026-06-01T12:00:00Z',
  ];
  const texts = [
    '涡旋中心形成，流速 0.62 m/s，顺时针旋转',
    '涡旋强度增强，最大流速升至 0.85 m/s',
    '涡旋半径扩大 12%，东侧出现剪切层',
    '涡旋达到峰值强度，西侧流速异常点需复核',
    '涡旋开始消散，能量向南北两侧扩散',
  ];
  const params = [0.62, 0.85, 0.94, 1.07, 0.73];
  return timestamps.map((ts, i) => ({
    id: uid(),
    timestamp: ts,
    parameterValue: params[i],
    conclusionText: texts[i],
    linkedRecordIds: [],
  }));
}

export function generateMockViewpoints(): ViewpointSnapshot[] {
  return [
    {
      id: 'vp-demo-1',
      name: '默认主视角',
      camera: { x: 8, y: 6, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      remark: '日常评审用',
      createdAt: '2026-06-01T08:00:00Z',
    },
    {
      id: 'vp-demo-2',
      name: '涡旋中心俯视',
      camera: { x: 0, y: 14, z: 0.1 },
      target: { x: 0, y: 0, z: 0 },
      remark: '查看涡旋旋转结构',
      createdAt: '2026-06-01T09:15:00Z',
    },
    {
      id: 'vp-demo-3',
      name: '异常点侧视',
      camera: { x: -10, y: 2, z: 4 },
      target: { x: 2, y: -1, z: 1 },
      remark: '讲解剪切层异常用',
      createdAt: '2026-06-01T10:42:00Z',
    },
  ];
}
