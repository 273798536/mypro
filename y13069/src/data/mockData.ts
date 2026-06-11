import type {
  Project,
  SchemeVersion,
  RigPoint,
  AnomalyRecord,
  Note,
  DataSource,
} from '../types';

export const mockProject: Project = {
  id: 'proj-001',
  name: '国家大剧院主舞台吊杆阵列方案比选',
  createdAt: '2026-05-20T09:00:00.000Z',
};

export const mockVersions: SchemeVersion[] = [
  {
    id: 'ver-1',
    projectId: 'proj-001',
    versionNo: 1,
    label: '初稿方案（已撤回）',
    timestamp: '2026-05-22T10:00:00.000Z',
    isActive: false,
    isWithdrawn: true,
    description: '首次提交方案，点位坐标基于旧版图纸，发现多处坐标偏差后撤回',
  },
  {
    id: 'ver-2',
    projectId: 'proj-001',
    versionNo: 2,
    label: '修正版V2（含旧版遗留）',
    timestamp: '2026-06-01T14:30:00.000Z',
    isActive: false,
    isWithdrawn: false,
    description: '修正大部分坐标，混有2处旧版坐标未更新',
  },
  {
    id: 'ver-3',
    projectId: 'proj-001',
    versionNo: 3,
    label: '评审终稿V3',
    timestamp: '2026-06-10T08:15:00.000Z',
    isActive: true,
    isWithdrawn: false,
    description: '方案终稿，含口头备注确认的2处微调点，截图条件有丢失记录',
  },
];

const ZONES = ['后舞台区', '主舞台中区', '主舞台前区', '台口区', '侧台A', '侧台B'];
const STATUSES: RigPoint['status'][] = ['approved', 'pending', 'approved', 'approved', 'pending', 'conflict', 'withdrawn', 'approved'];

function generateDataSources(pointId: string, seed: number): DataSource[] {
  const sources: DataSource[] = [];
  const hasOld = seed % 7 === 0;
  const hasVerbal = seed % 3 === 0;

  sources.push({
    id: `ds-${pointId}-1`,
    pointId,
    sourceType: 'official',
    content: '来自设计院CAD图纸 v2026-05 Rev.C',
    impactWeight: hasVerbal ? 0.65 : hasOld ? 0.45 : 1.0,
    createdAt: '2026-05-28T11:00:00.000Z',
    operator: '设计院-李工',
  });

  if (hasVerbal) {
    sources.push({
      id: `ds-${pointId}-2`,
      pointId,
      sourceType: 'verbal',
      content: '现场交底会议口头调整：向台口前移30cm，方案经理小赵确认',
      impactWeight: 0.35,
      createdAt: '2026-06-05T16:20:00.000Z',
      operator: '方案经理-小赵',
    });
  }

  if (hasOld) {
    sources.push({
      id: `ds-${pointId}-3`,
      pointId,
      sourceType: 'old_withdrawn',
      content: '旧版V1遗留坐标，已标注废弃标记，待最终确认',
      impactWeight: 0.55,
      createdAt: '2026-05-22T10:00:00.000Z',
      operator: '系统（历史遗留）',
    });
  }

  const total = sources.reduce((s, d) => s + d.impactWeight, 0);
  sources.forEach((d) => (d.impactWeight = +(d.impactWeight / total).toFixed(2)));
  return sources;
}

function generateNotes(pointId: string, seed: number): Note[] {
  const notes: Note[] = [];
  if (seed % 4 === 0) {
    notes.push({
      id: `note-${pointId}-1`,
      pointId,
      content: '注意与侧灯架的干涉问题，现场需二次复核',
      isVerbal: false,
      author: '方案经理-小赵',
      createdAt: '2026-06-08T10:30:00.000Z',
    });
  }
  if (seed % 5 === 0) {
    notes.push({
      id: `note-${pointId}-2`,
      pointId,
      content: '项目经理口头指示：此点位荷载需按1.2倍设计',
      isVerbal: true,
      author: '项目负责人-王总（口头转达）',
      createdAt: '2026-06-09T09:15:00.000Z',
    });
  }
  return notes;
}

function generatePointsForVersion(versionId: string, offset: number, withdrawn: boolean, containsOld: boolean): RigPoint[] {
  const points: RigPoint[] = [];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const seed = i + offset;
    const col = i % 6;
    const row = Math.floor(i / 6);
    const isOld = containsOld && (i === 7 || i === 15);
    const isConflict = !withdrawn && i === 11;
    const isWithdrawnPoint = withdrawn || (i === 3 && !withdrawn);
    const status: RigPoint['status'] = isConflict ? 'conflict' : isWithdrawnPoint ? 'withdrawn' : STATUSES[seed % STATUSES.length];
    points.push({
      id: `${versionId}-pt-${String(i + 1).padStart(3, '0')}`,
      versionId,
      rigNo: `RIG-${String(6001 + i + offset).padStart(4, '0')}`,
      zone: ZONES[col],
      x_coord: +((col - 2.5) * 3.2 + (isOld ? -0.8 : 0) + (seed % 3) * 0.15).toFixed(2),
      y_coord: +((row - 1.5) * 4.5 + (seed % 2) * 0.1).toFixed(2),
      z_coord: +(12 + (seed % 5) * 0.6 - (isOld ? 1.2 : 0)).toFixed(2),
      status,
      isOldVersion: isOld,
      dataSources: generateDataSources(`${versionId}-pt-${String(i + 1).padStart(3, '0')}`, seed),
      notes: generateNotes(`${versionId}-pt-${String(i + 1).padStart(3, '0')}`, seed),
    });
  }
  return points;
}

export const mockPointsByVersionId: Record<string, RigPoint[]> = {
  'ver-1': generatePointsForVersion('ver-1', 0, true, false),
  'ver-2': generatePointsForVersion('ver-2', 10, false, true),
  'ver-3': generatePointsForVersion('ver-3', 20, false, false),
};

export const mockAnomalies: AnomalyRecord[] = [
  {
    id: 'anom-1',
    versionId: 'ver-3',
    anomalyType: 'screenshot_missing',
    description: 'RIG-6012点位在审核环节缺少空间位置截图佐证，处理结果【待补截图】，非正常通过',
    status: 'open',
    markedAsNormal: false,
    createdAt: '2026-06-10T10:22:00.000Z',
    pointId: 'ver-3-pt-012',
  },
  {
    id: 'anom-2',
    versionId: 'ver-1',
    anomalyType: 'withdrawn',
    description: 'V1整版方案已撤回：坐标体系偏差共17处，影响结论有效性',
    status: 'closed',
    markedAsNormal: false,
    createdAt: '2026-05-25T08:00:00.000Z',
  },
  {
    id: 'anom-3',
    versionId: 'ver-2',
    pointId: 'ver-2-pt-008',
    anomalyType: 'old_version',
    description: 'RIG-6008点位混入V1旧版坐标，已在V3中修正，影响V2结论权重',
    status: 'closed',
    markedAsNormal: false,
    createdAt: '2026-06-03T14:10:00.000Z',
  },
  {
    id: 'anom-4',
    versionId: 'ver-2',
    pointId: 'ver-2-pt-016',
    anomalyType: 'old_version',
    description: 'RIG-6016点位高度坐标沿用V1旧值-1.2m，已在V3修正',
    status: 'closed',
    markedAsNormal: false,
    createdAt: '2026-06-03T14:12:00.000Z',
  },
  {
    id: 'anom-5',
    versionId: 'ver-3',
    pointId: 'ver-3-pt-012',
    anomalyType: 'conflict',
    description: 'RIG-6021点位坐标与灯光桥架位置冲突，需现场协调',
    status: 'processing',
    markedAsNormal: false,
    createdAt: '2026-06-10T11:45:00.000Z',
  },
  {
    id: 'anom-6',
    versionId: 'ver-3',
    anomalyType: 'screenshot_missing',
    description: '侧台B区域批量审核截图缺失共3张，处理结果：【暂缓归档，待补材料】',
    status: 'open',
    markedAsNormal: false,
    createdAt: '2026-06-10T12:05:00.000Z',
  },
];
