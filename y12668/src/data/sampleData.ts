import type { ProjectionRecord, TimelineVersion } from '@/types';

const now = Date.now();
const day = 86400000;

const projects = ['中心区城市设计', '滨江片区控规', '老城区更新', 'TOD 综合体'];
const sourceNotes = [
  'Sheet1 / 设计院初版',
  'Sheet2 / 二轮修改',
  'Sheet3 / 专家评审前',
  '附件A / 现场拍照',
  '附件B / 无人机航测',
];
const conclusions_camera = [
  '相机视角丢失导致投影面无法闭合，南侧建筑轮廓出现 3.2m 缺口。建议补充东侧视角重投。',
  '高楼层区域存在视角盲区，第 12-15 层立面投影不完整。需补拍仰角视角。',
  '街角建筑被遮挡，投影与现场实测偏差 1.8m。需结合点云数据修正。',
];
const suggestions_camera = [
  '优先补拍：SE 135° 仰角 25°，距离 45m，与原拍摄点对齐。',
  '联系无人机团队补充低空环绕拍摄，覆盖 12 层以上立面。',
  '使用激光点云数据作为底图，人工描出缺失立面轮廓。',
];
const conclusions_distort = [
  '投影畸变主要出现在曲面屋顶，鱼眼镜头校正参数偏保守。',
  '狭长通道出现透视拉伸，长宽比失真约 12%。',
];
const suggestions_distort = [
  '使用等距柱状投影重算曲面区域，校正系数 0.92。',
  '通道分段投影后再拼接，每段长度不超过 20m。',
];
const conclusions_scale = [
  '比例不匹配：首层标高与总图差 0.45m，可能由基准面选取引起。',
];
const suggestions_scale = [
  '统一使用黄海高程系 0.00 作为基准面，重新导出投影坐标。',
];

function buildRecord(
  idx: number,
  overrides: Partial<ProjectionRecord> = {},
): ProjectionRecord {
  const anomalyType = overrides.anomalyType ?? 'normal';
  const severity = overrides.severity ?? 'info';
  const baseConclusion =
    anomalyType === 'camera_view_lost'
      ? conclusions_camera[idx % conclusions_camera.length]
      : anomalyType === 'projection_distortion'
        ? conclusions_distort[idx % conclusions_distort.length]
        : anomalyType === 'scale_mismatch'
          ? conclusions_scale[0]
          : '投影结果正常，与现场核对一致，无异常。';
  const baseSuggestion =
    anomalyType === 'camera_view_lost'
      ? suggestions_camera[idx % suggestions_camera.length]
      : anomalyType === 'projection_distortion'
        ? suggestions_distort[idx % suggestions_distort.length]
        : anomalyType === 'scale_mismatch'
          ? suggestions_scale[0]
          : '无需处理，可直接用于下一步出图。';

  const importBatchIdx = idx % 4;
  const importedAt = new Date(now - (3 - importBatchIdx) * day - idx * 3600_000).toISOString();

  return {
    id: `rec-${idx.toString().padStart(4, '0')}`,
    originalRowNumber: overrides.originalRowNumber ?? idx + 1,
    imageName: overrides.imageName ?? `proj_${(idx + 1).toString().padStart(3, '0')}.tif`,
    sourceNote: overrides.sourceNote ?? sourceNotes[idx % sourceNotes.length],
    projectName: overrides.projectName ?? projects[idx % projects.length],
    importedAt,
    importBatchId: `batch-202606${(9 - importBatchIdx).toString().padStart(2, '0')}-${importBatchIdx + 1}`,
    anomalyType,
    severity,
    status: overrides.status ?? (idx > 15 ? 'supplemented' : idx > 10 ? 'merged' : 'new'),
    crossSectionUrl: '',
    conclusion: baseConclusion,
    suggestion: baseSuggestion,
    duplicateOf: overrides.duplicateOf,
    supplementedFields: overrides.supplementedFields,
    rawSnapshot: {
      row: idx + 1,
      image: `proj_${(idx + 1).toString().padStart(3, '0')}.tif`,
      x: (200 + idx * 3.7).toFixed(2),
      y: (150 + idx * 2.1).toFixed(2),
      z: idx % 3,
      source: sourceNotes[idx % sourceNotes.length],
    },
    createdAt: importedAt,
    updatedAt: importedAt,
    ...overrides,
  };
}

export const sampleRecords: ProjectionRecord[] = [
  buildRecord(0, { anomalyType: 'camera_view_lost', severity: 'critical', originalRowNumber: 7, imageName: 'camera_007_se.tif' }),
  buildRecord(1, { anomalyType: 'camera_view_lost', severity: 'critical', originalRowNumber: 23, imageName: 'camera_023_ne.tif' }),
  buildRecord(2, { anomalyType: 'camera_view_lost', severity: 'critical', originalRowNumber: 45, imageName: 'camera_045_nw.tif' }),
  buildRecord(3, { anomalyType: 'camera_view_lost', severity: 'warning', originalRowNumber: 58, imageName: 'camera_058_e.tif' }),
  buildRecord(4, { anomalyType: 'projection_distortion', severity: 'warning', originalRowNumber: 12 }),
  buildRecord(5, { anomalyType: 'projection_distortion', severity: 'warning', originalRowNumber: 19 }),
  buildRecord(6, { anomalyType: 'projection_distortion', severity: 'info', originalRowNumber: 33 }),
  buildRecord(7, { anomalyType: 'scale_mismatch', severity: 'warning', originalRowNumber: 3 }),
  buildRecord(8, { anomalyType: 'scale_mismatch', severity: 'info', originalRowNumber: 41 }),
  buildRecord(9, { anomalyType: 'normal', severity: 'info', originalRowNumber: 1 }),
  buildRecord(10, { anomalyType: 'normal', severity: 'info', originalRowNumber: 2 }),
  buildRecord(11, { anomalyType: 'normal', severity: 'info', originalRowNumber: 4 }),
  buildRecord(12, { anomalyType: 'normal', severity: 'info', originalRowNumber: 5 }),
  buildRecord(13, { anomalyType: 'normal', severity: 'info', originalRowNumber: 6 }),
  buildRecord(14, { anomalyType: 'normal', severity: 'info', originalRowNumber: 8, status: 'resolved' }),
  buildRecord(15, {
    anomalyType: 'camera_view_lost',
    severity: 'warning',
    originalRowNumber: 7,
    imageName: 'camera_007_se.tif',
    status: 'merged',
    duplicateOf: 'rec-0000',
    supplementedFields: ['conclusion', 'suggestion'],
  }),
  buildRecord(16, {
    anomalyType: 'scale_mismatch',
    severity: 'info',
    originalRowNumber: 3,
    status: 'supplemented',
    duplicateOf: 'rec-0007',
    supplementedFields: ['suggestion'],
  }),
  buildRecord(17, { anomalyType: 'normal', severity: 'info', originalRowNumber: 55, status: 'resolved' }),
  buildRecord(18, { anomalyType: 'projection_distortion', severity: 'warning', originalRowNumber: 62 }),
  buildRecord(19, { anomalyType: 'normal', severity: 'info', originalRowNumber: 71 }),
];

export const sampleVersions: TimelineVersion[] = [
  {
    batchId: 'batch-20260606-1',
    importedAt: new Date(now - 3 * day).toISOString(),
    recordCount: 8,
    anomalyCount: 5,
    note: '初版导入：设计院提交的第一轮投影结果',
  },
  {
    batchId: 'batch-20260607-2',
    importedAt: new Date(now - 2 * day).toISOString(),
    recordCount: 6,
    anomalyCount: 3,
    note: '二轮修改：补拍 SE / NE 视角，修正 2 处严重异常',
  },
  {
    batchId: 'batch-20260608-3',
    importedAt: new Date(now - 1 * day).toISOString(),
    recordCount: 3,
    anomalyCount: 2,
    note: '补录：专家评审反馈新增 2 条提示级异常',
  },
  {
    batchId: 'batch-20260609-4',
    importedAt: new Date(now).toISOString(),
    recordCount: 3,
    anomalyCount: 1,
    note: '今日：完成 1 条正常记录核对，剩余 1 条等待处理',
  },
];
