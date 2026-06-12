import type { Mission, SamplePoint } from '@/types';

function generateTrajectory(baseX: number, baseY: number, count: number, isCleaned: boolean) {
  const points: { x: number; y: number; depth: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const noise = isCleaned ? 0 : (Math.random() - 0.5) * 1.5;
    points.push({
      x: baseX + t * 80 - 40 + noise,
      y: baseY + Math.sin(t * Math.PI * 3) * 15 + noise,
      depth: 5 + Math.sin(t * Math.PI * 2) * 8 + Math.random() * 2,
    });
  }
  return points;
}

function createSamplePoint(
  id: string,
  missionId: string,
  idx: number,
  pos: { x: number; y: number; depth: number },
): SamplePoint {
  const riskSeed = Math.random();
  const statusSeed = Math.random();
  const riskLevel = riskSeed < 0.5 ? 'safe' : riskSeed < 0.8 ? 'warning' : 'danger';
  const status =
    statusSeed < 0.45 ? 'approved' : statusSeed < 0.7 ? 'pending' : statusSeed < 0.85 ? 'delayed' : 'recollect';
  return {
    id,
    missionId,
    name: `采样点 SP-${String(idx + 1).padStart(3, '0')}`,
    position: pos,
    riskLevel,
    status,
    waterQuality: {
      temperature: Number((12 + Math.random() * 8).toFixed(2)),
      salinity: Number((30 + Math.random() * 5).toFixed(2)),
      ph: Number((7 + Math.random() * 1.5).toFixed(2)),
      dissolvedOxygen: Number((4 + Math.random() * 5).toFixed(2)),
      turbidity: Number((5 + Math.random() * 30).toFixed(2)),
    },
    sources: [
      {
        id: `${id}-src-1`,
        type: 'excel',
        fileName: `水质探测记录_${missionId}.xlsx`,
        rowNumber: 12 + idx * 3,
        remark: '原始采集表格',
      },
      {
        id: `${id}-src-2`,
        type: 'image',
        fileName: `IMG_${String(1024 + idx).padStart(4, '0')}.jpg`,
        remark: '现场拍摄照片',
      },
    ],
    reviewLogs:
      status === 'approved'
        ? [
            {
              id: `${id}-log-1`,
              timestamp: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
              operator: '李教练',
              beforeStatus: 'pending',
              afterStatus: 'approved',
              remark: '数据核对无误，水质参数与现场记录一致',
              diff: { dissolvedOxygen: Number((5.2 + Math.random()).toFixed(2)) },
            },
          ]
        : status === 'delayed'
          ? [
              {
                id: `${id}-log-1`,
                timestamp: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
                operator: '王教练',
                beforeStatus: 'pending',
                afterStatus: 'delayed',
                remark: '浊度数据异常，等待设备校准后复核',
              },
            ]
          : status === 'recollect'
            ? [
                {
                  id: `${id}-log-1`,
                  timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
                  operator: '张教练',
                  beforeStatus: 'pending',
                  afterStatus: 'recollect',
                  remark: '数据缺失严重，需要重新下水采集',
                },
              ]
            : [],
    available: status === 'approved',
    delayed: status === 'delayed',
    recollect: status === 'recollect',
  };
}

function createMission(id: string, name: string, date: string, operator: string): Mission {
  const samplePoints: SamplePoint[] = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const x = t * 70 - 35 + (Math.random() - 0.5) * 5;
    const y = Math.sin(t * Math.PI * 2.5) * 12 + (Math.random() - 0.5) * 3;
    const depth = 4 + Math.sin(t * Math.PI * 2) * 6 + Math.random() * 3;
    samplePoints.push(createSamplePoint(`${id}-sp-${i}`, id, i, { x, y, depth }));
  }
  return {
    id,
    name,
    date,
    version: `v${1 + Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}`,
    status: Math.random() > 0.3 ? 'active' : 'archived',
    operator,
    samplePoints,
    trajectories: {
      raw: generateTrajectory(0, 0, 60, false),
      cleaned: generateTrajectory(0, 0, 60, true),
    },
  };
}

export const mockMissions: Mission[] = [
  createMission('mission-001', '东海深水区探测', '2026-06-10', '李教练'),
  createMission('mission-002', '南海珊瑚礁区域', '2026-06-05', '王教练'),
  createMission('mission-003', '黄海冷水团调查', '2026-05-28', '张教练'),
  createMission('mission-004', '渤海湾水质例行监测', '2026-05-20', '李教练'),
];

export function getMissionById(id: string): Mission | undefined {
  return mockMissions.find((m) => m.id === id);
}
