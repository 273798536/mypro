import type { TideVersion, TideRecord, ConclusionImpact, Anomaly, TrajectorySnapshot, CleanRuleChain } from '@/types';
import { buildChannelReport } from './channelData';

export const CURRENT_TIDE_VERSION: TideVersion = (() => {
  const records: TideRecord[] = [];
  const now = new Date('2026-06-12 08:30:00').getTime();
  for (let h = -6; h <= 30; h++) {
    const t = new Date(now + h * 3600 * 1000);
    const phase = (h / 12.4) * Math.PI * 2;
    const height = +(1.8 + 1.6 * Math.sin(phase)).toFixed(3);
    const prev = +(1.8 + 1.6 * Math.sin(phase - 0.1)).toFixed(3);
    const type: TideRecord['type'] = height > prev
      ? (height > 3.0 ? 'high' : 'rising')
      : (height < 0.6 ? 'low' : 'falling');
    records.push({
      time: t.toISOString().slice(0, 16).replace('T', ' '),
      height,
      type,
    });
  }
  return {
    tideVersionId: 'TIDE-V20260611-03',
    publishTime: '2026-06-11 20:00:00',
    effectiveTime: '2026-06-12 00:00:00',
    status: 'delayed',
    delayHours: 3,
    records,
  };
})();

export const CONCLUSION_IMPACTS: ConclusionImpact[] = [
  {
    impactId: 'IMP-001',
    relatedAnomalyId: 'ANM-003',
    conclusionId: 'CONC-A02',
    conclusionDesc: '断面 SEC-005 至 SEC-007 段平均淤积厚度判定',
    originalValue: '平均淤积厚度 0.42 m，淤积总量 58,320 m³（判定：轻度淤积）',
    originalBasis: '潮汐表 V20260611-03 已同步，各测点潮汐修正按实际潮位计算',
    tempValue: '平均淤积厚度 0.34~0.50 m（区间值），淤积总量 47,200~69,400 m³（判定：临时·轻度-中度，待复核）',
    tempBasis: '潮汐表延迟 3h，以 48h 预报潮位替代，不确定度 ±0.08 m',
    impactLevel: 'major',
    recoverCondition: '潮汐表最新版本发布且本时段实测潮位数据补全',
    estRecoverTime: '2026-06-12 11:30',
    tideVersionId: 'TIDE-V20260611-03',
  },
  {
    impactId: 'IMP-002',
    relatedAnomalyId: 'ANM-003',
    conclusionId: 'CONC-B01',
    conclusionDesc: '最大水深点推荐航路偏移建议',
    originalValue: '最大水深 21.8 m（SEC-006-LN3-P028），建议航路保持中线偏左 15 m',
    originalBasis: '基于 SEC-006 断面横测线深度剖面',
    tempValue: '最大水深 21.2~22.4 m，建议航路暂保持现状（中线偏左 10~20 m 区间均可）',
    tempBasis: '航路深度差阈值 0.5 m，潮汐延迟导致水深偏移 ±0.3 m，边界处决策不可靠',
    impactLevel: 'minor',
    recoverCondition: '潮汐表同步后深度差阈值验证',
    estRecoverTime: '2026-06-12 11:30',
    tideVersionId: 'TIDE-V20260611-03',
  },
  {
    impactId: 'IMP-003',
    relatedAnomalyId: 'ANM-003',
    conclusionId: 'CONC-C04',
    conclusionDesc: '养殖区 A-07 排架下方通航净空核验',
    originalValue: '通航净空 14.6 m，满足 1 万吨级船舶单向通航要求（标准 ≥ 12.5 m）',
    originalBasis: 'SEC-008 断面 5 条测线、250 测点统计',
    tempValue: '通航净空 14.0~15.2 m（【提示】满足要求但余量缩减，需潮汐同步后复核）',
    tempBasis: '该处距潮位站 8.3 km，潮波传播时间差导致区域修正偏差放大至 0.6 m',
    impactLevel: 'critical',
    recoverCondition: '近岸潮位站实时数据与港区预报同步校验通过',
    estRecoverTime: '2026-06-12 12:00',
    tideVersionId: 'TIDE-V20260611-03',
  },
];

export const ANOMALIES: Anomaly[] = [
  {
    anomalyId: 'ANM-001',
    type: 'negative_depth',
    severity: 'red',
    title: 'SEC-002 断面 3 测点出现深度负值拦截',
    description: 'SEC-002-LN2 P012、P018、P031 三个测点修正后深度分别为 -0.58、-0.72、-0.63 m，均超出 3σ 阈值 0.45 m，已拦截不参与淤积统计。疑似基准面换算或潮位修正错误，请检查局部潮位数据与基准面转换参数。',
    relatedPointIds: ['SEC-002-LN2-P012', 'SEC-002-LN2-P018', 'SEC-002-LN2-P031'],
    relatedSectionIds: ['SEC-002'],
    status: 'pending',
    disposalDirection: 'adjust_caliber',
    disposalSteps: [
      { stepId: 'DS-001-1', stepNumber: 1, direction: 'adjust_caliber', instruction: '比对 SEC-002 断面测量时刻与潮汐表潮时，确认潮位修正值符号（+/-）是否正确', required: true, completed: false },
      { stepId: 'DS-001-2', stepNumber: 2, direction: 'adjust_caliber', instruction: '核对该处 GPS 天线高与换能器吃水深度校准记录（偏差阈值 0.1 m）', required: true, completed: false },
      { stepId: 'DS-001-3', stepNumber: 3, direction: 'supplement_material', instruction: '调取测量船原始导航日志（.POS 文件），确认该时段定位质量因子 Q≥2', required: true, completed: false },
      { stepId: 'DS-001-4', stepNumber: 4, direction: 'adjust_caliber', instruction: '修正后提交复核：深度须 ≥ 0 且满足 |Δ| < 0.15 m', required: true, completed: false },
    ],
    createdAt: '2026-06-12 07:10:22',
    updatedAt: '2026-06-12 07:10:22',
  },
  {
    anomalyId: 'ANM-002',
    type: 'water_quality_mismatch',
    severity: 'orange',
    title: 'SEC-004 ~ SEC-006 段水质浊度与养殖投饵量趋势不符',
    description: 'SEC-004 至 SEC-006 共 14 个测点中，水质浊度较相邻区段升高 25~35 NTU，但同期养殖日志显示该 3 小时内投饵量较均值下降 38%，两者趋势背离超阈值（偏差比 0.20）。',
    relatedPointIds: ['SEC-004-LN1-P020', 'SEC-005-LN3-P015', 'SEC-006-LN2-P033'],
    relatedSectionIds: ['SEC-004', 'SEC-005', 'SEC-006'],
    status: 'processing',
    disposalDirection: 'supplement_material',
    disposalSteps: [
      { stepId: 'DS-002-1', stepNumber: 1, direction: 'supplement_material', instruction: '联系养殖区 A-05 补传该时段（6 月 11 日 09:00~12:00）自动投饵机原始运行记录', required: true, completed: true, completedAt: '2026-06-12 07:40:00' },
      { stepId: 'DS-002-2', stepNumber: 2, direction: 'supplement_material', instruction: '补录 3 张以上现场巡检照片（包含浊度仪读数屏幕）以佐证水质实测值（已上传 1/3）', required: true, completed: false, meta: { requiredPhotos: 3, uploadedPhotos: 1 } },
      { stepId: 'DS-002-3', stepNumber: 3, direction: 'supplement_material', instruction: '核对相邻船舶 AIS 记录，排除施工/抛锚扰动导致浊度异常', required: false, completed: false },
      { stepId: 'DS-002-4', stepNumber: 4, direction: 'adjust_caliber', instruction: '如确认数据无误，调大水质对账偏差阈值至 0.30（需课题组会签）', required: true, completed: false },
    ],
    createdAt: '2026-06-12 07:12:05',
    updatedAt: '2026-06-12 07:40:00',
  },
  {
    anomalyId: 'ANM-003',
    type: 'tide_delayed',
    severity: 'orange',
    title: '潮汐表版本延迟 3 小时，3 项结论受影响',
    description: '当前潮汐表版本 TIDE-V20260611-03 发布于 2026-06-11 20:00，截止 2026-06-12 08:30，港区潮位站实时数据已 3h 未同步至本系统，导致 3 项淤积与通航结论处于临时状态。',
    relatedPointIds: [],
    relatedSectionIds: ['SEC-005', 'SEC-006', 'SEC-008'],
    status: 'pending',
    disposalDirection: 'adjust_caliber',
    disposalSteps: [
      { stepId: 'DS-003-1', stepNumber: 1, direction: 'adjust_caliber', instruction: '等待潮汐表系统自动推送最新版本（预计 11:30 前），或手动导入预报潮位', required: true, completed: false },
      { stepId: 'DS-003-2', stepNumber: 2, direction: 'supplement_material', instruction: '检查近岸潮位站网络连通性，确认数据上传链路正常', required: true, completed: false },
      { stepId: 'DS-003-3', stepNumber: 3, direction: 'adjust_caliber', instruction: '若 12:00 前仍未同步，启用「48h 预报潮位」口径并在报告中签署说明', required: true, completed: false },
    ],
    createdAt: '2026-06-12 08:30:00',
    updatedAt: '2026-06-12 08:30:00',
  },
  {
    anomalyId: 'ANM-004',
    type: 'trajectory_drift',
    severity: 'yellow',
    title: 'SEC-008 纵测线 LN1 起点段轨迹偏航',
    description: 'SEC-008-LN1 前 10 个测点（P001~P010）GPS 轨迹与设计测线偏差 28~42 m，超过 2 倍船宽（24 m），疑似测量船在起点处航向调整未完成即开始采集。',
    relatedPointIds: ['SEC-008-LN1-P005', 'SEC-008-LN1-P008'],
    relatedSectionIds: ['SEC-008'],
    status: 'processing',
    disposalDirection: 'supplement_material',
    disposalSteps: [
      { stepId: 'DS-004-1', stepNumber: 1, direction: 'supplement_material', instruction: '上传至少 2 张现场巡检照片，包含测线起点岸上参照物与驾驶台航向屏幕', required: true, completed: false, meta: { requiredPhotos: 2, uploadedPhotos: 0 } },
      { stepId: 'DS-004-2', stepNumber: 2, direction: 'adjust_caliber', instruction: '在轨迹清洗规则链中启用「航偏剔除」或对 P001~P010 做线性插值修复', required: true, completed: false },
      { stepId: 'DS-004-3', stepNumber: 3, direction: 'supplement_material', instruction: '标记该段测点「航偏修正」标签，在审计链备注', required: false, completed: false },
    ],
    createdAt: '2026-06-12 07:18:44',
    updatedAt: '2026-06-12 07:18:44',
  },
  {
    anomalyId: 'ANM-005',
    type: 'log_gap',
    severity: 'yellow',
    title: '养殖区 A-03 连续 4.5h 日志缺口',
    description: '养殖日志 A-03 于 6 月 11 日 14:30~19:00 期间投饵量、水体交换率、溶氧 3 项字段均为缺项/零值，共关联 6 个航道测点水质对账。',
    relatedPointIds: ['SEC-003-LN4-P040', 'SEC-003-LN4-P045'],
    relatedSectionIds: ['SEC-003'],
    status: 'reviewing',
    disposalDirection: 'supplement_material',
    disposalSteps: [
      { stepId: 'DS-005-1', stepNumber: 1, direction: 'supplement_material', instruction: '联系 A-03 养殖场提供当日纸质记录扫描件', required: true, completed: true, completedAt: '2026-06-12 06:50:00' },
      { stepId: 'DS-005-2', stepNumber: 2, direction: 'supplement_material', instruction: '养殖场管理员书面说明缺口原因（设备故障）并盖章', required: true, completed: true, completedAt: '2026-06-12 08:05:00' },
      { stepId: 'DS-005-3', stepNumber: 3, direction: 'adjust_caliber', instruction: '将该时段 6 个测点对账状态标记为「人工豁免」，提交复核人确认', required: true, completed: false },
    ],
    createdAt: '2026-06-12 07:25:10',
    updatedAt: '2026-06-12 08:05:00',
  },
  {
    anomalyId: 'ANM-006',
    type: 'other',
    severity: 'blue',
    title: 'SEC-010 末端 2 测点采样时间跨日',
    description: 'SEC-010-LN3-P049、P050 采样时间为 6 月 12 日 00:05 与 00:12，跨日导致潮汐修正处于高低潮交替拐点，深度不确定度略高。',
    relatedPointIds: ['SEC-010-LN3-P049', 'SEC-010-LN3-P050'],
    relatedSectionIds: ['SEC-010'],
    status: 'closed',
    disposalDirection: 'supplement_material',
    disposalSteps: [
      { stepId: 'DS-006-1', stepNumber: 1, direction: 'supplement_material', instruction: '在报告备注中标注跨日测点，无需补充材料', required: true, completed: true, completedAt: '2026-06-12 06:40:00' },
    ],
    createdAt: '2026-06-12 06:30:00',
    updatedAt: '2026-06-12 06:40:00',
  },
];

export const DEFAULT_CLEAN_RULE_CHAIN: CleanRuleChain = {
  chainId: 'CHAIN-DEFAULT-001',
  rules: [
    { ruleId: 'R-OUTLIER', type: 'outlier', name: '野值剔除（3σ）', enabled: true, params: { sigma: 3, windowSize: 11 } },
    { ruleId: 'R-MOVAVG', type: 'movingAvg', name: '滑动平均滤波', enabled: true, params: { windowSize: 5 } },
    { ruleId: 'R-KALMAN', type: 'kalman', name: '卡尔曼滤波', enabled: false, params: { processNoise: 0.01, measureNoise: 0.05 } },
    { ruleId: 'R-MANUAL', type: 'manualReview', name: '人工复核航偏点', enabled: true, params: { maxDriftMeters: 24 } },
  ],
  appliedAt: '2026-06-12 06:00:00',
};

export function buildInitialSnapshots(): TrajectorySnapshot[] {
  const snapshots: TrajectorySnapshot[] = [];
  const report = buildChannelReport();
  report.sections.forEach((sec: any) => {
    sec.surveyLines.forEach((line: any) => {
      const before = line.points;
      const after = line.points.map((p: any) => ({
        ...p,
        correctedDepth: +(p.correctedDepth * 0.99 + 0.02 * Math.sin(p.mileage / 100)).toFixed(3),
      }));
      snapshots.push({
        snapshotId: `SNAP-${line.lineId}-INIT`,
        timestamp: '2026-06-12 06:00:00',
        chainId: 'CHAIN-DEFAULT-001',
        trigger: 'initial',
        pointsBefore: before,
        pointsAfter: after,
        diffCount: Math.floor(line.points.length * 0.12),
      });
    });
  });
  return snapshots;
}
