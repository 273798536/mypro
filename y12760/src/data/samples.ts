import type { GCRecord } from '@/types';

const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const sample1: GCRecord = {
  id: 'sample-001',
  batchNumber: 'GC-2026-0421-A',
  sampleName: '乙酸乙酯粗产品',
  injectionTime: '2026-04-21 10:35:00',
  instrumentModel: 'Agilent 7890B',
  operator: '李安全员',
  status: 'ready',
  conclusion: '乙酸乙酯纯度为 98.72%，各组分含量正常，符合产品质量标准。主要杂质为乙醇和水，含量在可控范围内。',
  conclusionSource: '依据 GB/T 12717-2007《工业用乙酸乙酯》检验方法，采用归一化法定量，详见称量单 WL-2026-0421-003。',
  chromatogramParams: {
    column: 'HP-INNOWax 30m×0.32mm×0.5μm',
    carrierGas: '高纯氮气',
    flowRate: 1.2,
    temperatureProgram: '60℃保持2min，以10℃/min升至150℃，保持3min',
    injectionVolume: '0.2μL',
    detector: 'FID 氢火焰离子化检测器',
  },
  peaks: [
    { id: 'p1', recordId: 'sample-001', peakIndex: 1, compoundName: '空气', retentionTime: 0.852, peakArea: 12580, peakHeight: 8520, theoreticalPlates: null, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p2', recordId: 'sample-001', peakIndex: 2, compoundName: '水', retentionTime: 1.783, peakArea: 45230, peakHeight: 31200, theoreticalPlates: 12580, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p3', recordId: 'sample-001', peakIndex: 3, compoundName: '乙醇', retentionTime: 2.514, peakArea: 186540, peakHeight: 142300, theoreticalPlates: 15820, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p4', recordId: 'sample-001', peakIndex: 4, compoundName: '乙酸乙酯', retentionTime: 4.128, peakArea: 9876520, peakHeight: 5423800, theoreticalPlates: 28650, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p5', recordId: 'sample-001', peakIndex: 5, compoundName: '正丙醇', retentionTime: 5.632, peakArea: 32150, peakHeight: 21800, theoreticalPlates: 17320, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p6', recordId: 'sample-001', peakIndex: 6, compoundName: '未知杂质', retentionTime: 8.945, peakArea: 12680, peakHeight: 8420, theoreticalPlates: 14250, dataQuality: 'normal', isDuplicate: false, isNull: false },
  ],
  alignmentSteps: [
    {
      id: 's1', recordId: 'sample-001', stepOrder: 1, stepName: '导入原始数据', isCompleted: true,
      description: '从色谱工作站导出 .csv 格式峰表，导入系统。',
      explanation: '原始数据是一切分析的起点，必须保留未经修改的原始峰表，后续所有对齐、计算都要能追溯到这里。',
    },
    {
      id: 's2', recordId: 'sample-001', stepOrder: 2, stepName: '数据质量自动检测', isCompleted: true,
      description: '系统自动检测空值、重复、备注混写、异常值共4类问题，本次未发现异常。',
      explanation: '检测是保护数据质量的第一道关口：空值会导致后续配平失准，重复峰会被误算为两个组分，备注写进数值格会让计算直接报错。',
    },
    {
      id: 's3', recordId: 'sample-001', stepOrder: 3, stepName: '保留时间初步对齐', isCompleted: true,
      description: '以标准样品保留时间为基准，匹配样品中各组分：空气(0.85)、水(1.78)、乙醇(2.51)、乙酸乙酯(4.13)、正丙醇(5.63)。',
      explanation: '保留时间是定性的依据，±0.02 min 以内视为同一组分。温度、载气流速的微小波动都会让保留时间漂移，所以每次分析都要重新对齐。',
    },
    {
      id: 's4', recordId: 'sample-001', stepOrder: 4, stepName: '校正因子确认', isCompleted: true,
      description: '采用 2026-03 月标定的相对校正因子：水0.70、乙醇0.85、乙酸乙酯1.00、正丙醇0.92。',
      explanation: 'FID 检测器对不同物质响应不同，校正因子把"峰面积"换算成"真实质量"。校正因子过期或用错批次，最终纯度可能偏差 2~5%。',
    },
    {
      id: 's5', recordId: 'sample-001', stepOrder: 5, stepName: '归一化法配平计算', isCompleted: true,
      description: '使用校正后面积进行归一化，得到各组分百分含量，总和 99.87%。',
      explanation: '归一化法的前提是"所有组分都出峰"，总和越接近 100% 说明漏峰越少。本次 99.87% 属于良好范围，剩余 0.13% 为未识别的微量杂质。',
    },
    {
      id: 's6', recordId: 'sample-001', stepOrder: 6, stepName: '判读结论与来源追溯', isCompleted: true,
      description: '与产品标准比对，填写判读结论，关联称量单和检验标准编号。',
      explanation: '结论不是孤立的数字，必须写清楚依据的标准条款、称量单号、进样批次，让别人拿到报告就能还原完整证据链。',
    },
  ],
  calculationResult: {
    id: 'calc-001',
    recordId: 'sample-001',
    method: 'normalization',
    formula: 'w(i) = (A(i) × f(i)) / Σ(A(j) × f(j)) × 100%',
    intermediateValues: [
      { label: '水校正面积', value: 31661, unit: '' },
      { label: '乙醇校正面积', value: 158559, unit: '' },
      { label: '乙酸乙酯校正面积', value: 9876520, unit: '' },
      { label: '正丙醇校正面积', value: 29578, unit: '' },
      { label: '校正面积总和', value: 10096318, unit: '' },
    ],
    components: [
      { name: '水', area: 45230, percentage: 0.31 },
      { name: '乙醇', area: 186540, percentage: 1.57 },
      { name: '乙酸乙酯', area: 9876520, percentage: 97.82 },
      { name: '正丙醇', area: 32150, percentage: 0.29 },
      { name: '未知杂质', area: 12680, percentage: 0.13 },
    ],
    totalPercentage: 99.87,
    finalResult: 97.82,
    unit: '%',
    note: '乙酸乙酯主含量 97.82%，加校正因子后纯度为 98.72%（按企业标准折算）。',
  },
  operationLogs: [
    { id: 'l1', recordId: 'sample-001', operator: '李安全员', actionType: 'create', timestamp: '2026-04-21 11:02:00', reason: '完成当日第一批次样品分析' },
    { id: 'l2', recordId: 'sample-001', operator: '李安全员', actionType: 'recalculate', timestamp: '2026-04-21 11:08:00', reason: '使用3月最新校正因子重新计算' },
    { id: 'l3', recordId: 'sample-001', operator: '李安全员', actionType: 'update_status', oldValue: 'needs_review', newValue: 'ready', timestamp: '2026-04-21 11:15:00', reason: '复核通过，数据可直接使用' },
  ],
  createdAt: '2026-04-21 11:02:00',
  updatedAt: '2026-04-21 11:15:00',
};

const sample2: GCRecord = {
  id: 'sample-002',
  batchNumber: 'GC-2026-0422-B',
  sampleName: '苯乙烯中间产物',
  injectionTime: '2026-04-22 14:20:00',
  instrumentModel: 'Shimadzu GC-2030',
  operator: '张安全员',
  status: 'needs_review',
  conclusion: '检测到 2 个缺失峰和 1 组疑似重复峰，需人工复核后再进行定量。初步估算苯乙烯含量约 94.5%，但数据质量不足，暂不建议直接使用。',
  conclusionSource: '当前数据仅为初步导入结果，因空值和重复峰问题尚未解决，结论需安全员复核确认，参考称量单 WL-2026-0422-007。',
  chromatogramParams: {
    column: 'DB-5 30m×0.25mm×0.25μm',
    carrierGas: '氦气',
    flowRate: 1.0,
    temperatureProgram: '80℃保持3min，以8℃/min升至200℃',
    injectionVolume: '0.4μL',
    detector: 'FID',
  },
  peaks: [
    { id: 'p1', recordId: 'sample-002', peakIndex: 1, compoundName: '空气', retentionTime: 0.92, peakArea: 15620, peakHeight: 9850, theoreticalPlates: null, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p2', recordId: 'sample-002', peakIndex: 2, compoundName: '乙苯', retentionTime: 3.24, peakArea: 285420, peakHeight: 192300, theoreticalPlates: 18620, dataQuality: 'normal', isDuplicate: false, isNull: false },
    { id: 'p3', recordId: 'sample-002', peakIndex: 3, compoundName: '苯乙烯', retentionTime: 5.62, peakArea: 8542300, peakHeight: 4852000, theoreticalPlates: 31250, dataQuality: 'duplicate', isDuplicate: true, isNull: false, note: '与下一个峰保留时间差仅0.01min，疑似肩峰分裂' },
    { id: 'p4', recordId: 'sample-002', peakIndex: 4, compoundName: '苯乙烯（肩峰）', retentionTime: 5.63, peakArea: 8621400, peakHeight: 4862500, theoreticalPlates: 30980, dataQuality: 'duplicate', isDuplicate: true, isNull: false, note: '与上一峰几乎重合，需确认是否合并' },
    { id: 'p5', recordId: 'sample-002', peakIndex: 5, compoundName: 'α-甲基苯乙烯', retentionTime: null, peakArea: null, peakHeight: null, theoreticalPlates: null, dataQuality: 'null', isDuplicate: false, isNull: true, note: '峰表缺失，原始谱图中可观察到弱峰但未被积分' },
    { id: 'p6', recordId: 'sample-002', peakIndex: 6, compoundName: '二聚体', retentionTime: 12.58, peakArea: null, peakHeight: 7200, theoreticalPlates: null, dataQuality: 'null', isDuplicate: false, isNull: true, note: '仅检测到峰高，峰面积未积分' },
  ],
  alignmentSteps: [
    {
      id: 's1', recordId: 'sample-002', stepOrder: 1, stepName: '导入原始数据', isCompleted: true,
      description: '从 Shimadzu Labsolutions 导出数据，共 6 个峰。',
      explanation: '原始数据是一切分析的起点。',
    },
    {
      id: 's2', recordId: 'sample-002', stepOrder: 2, stepName: '数据质量自动检测', isCompleted: true,
      description: '检测出问题：2处空值（峰P5、P6）、1组重复峰（P3与P4保留时间差仅0.01min）。',
      explanation: '空值会让配平总和偏低，重复峰会让同一组分被算两次——都不能直接过。',
    },
    {
      id: 's3', recordId: 'sample-002', stepOrder: 3, stepName: '保留时间对齐（待复核）', isCompleted: false,
      description: 'P3/P4 需确认是否合并，P5/P6 需手动补积分后再对齐。',
      explanation: '当系统无法自动判断时，应保持"待确认"状态并邀请安全员介入，而不是给出一个貌似精确的错误数字。',
    },
    {
      id: 's4', recordId: 'sample-002', stepOrder: 4, stepName: '校正因子确认', isCompleted: false,
      description: '等待数据完整后再选取校正因子。',
      explanation: '',
    },
    {
      id: 's5', recordId: 'sample-002', stepOrder: 5, stepName: '归一化法配平计算', isCompleted: false,
      description: '数据不完整，暂不计算。',
      explanation: '',
    },
    {
      id: 's6', recordId: 'sample-002', stepOrder: 6, stepName: '判读结论与来源追溯', isCompleted: false,
      description: '等待安全员完成复核后填写。',
      explanation: '',
    },
  ],
  calculationResult: undefined,
  operationLogs: [
    { id: 'l1', recordId: 'sample-002', operator: '张安全员', actionType: 'import', timestamp: '2026-04-22 15:05:00', reason: '导入原始峰表' },
    { id: 'l2', recordId: 'sample-002', operator: '系统自动', actionType: 'update_status', oldValue: '', newValue: 'needs_review', timestamp: '2026-04-22 15:05:30', reason: '检测到空值和重复峰，自动标记待复核' },
  ],
  createdAt: '2026-04-22 15:05:00',
  updatedAt: '2026-04-22 15:05:30',
};

const sample3: GCRecord = {
  id: 'sample-003',
  batchNumber: 'GC-2026-0423-C',
  sampleName: '混合溶剂回收样',
  injectionTime: '2026-04-23 09:10:00',
  instrumentModel: 'Agilent 6890N',
  operator: '王安全员',
  status: 'invalid',
  conclusion: '本批次数据无效，不得用于任何报告。主要问题：1) 基线严重漂移导致积分全部失真；2) 多个峰保留时间偏移超过 2 分钟，无法与标准样品对齐；3) 谱图数据中存在备注混写。建议重新进样。',
  conclusionSource: '依据《色谱数据质量判定细则》第 4.2 条，保留时间偏差 > 0.5 min 或基线漂移超过满量程 5% 即判定为无效进样。本次数据同时违反多条，作废品处理，保留记录仅供教学展示"什么是坏数据"。',
  chromatogramParams: {
    column: '未知型号（柱标签脱落）',
    carrierGas: '可能为氮气（钢瓶压力不足）',
    flowRate: NaN as unknown as number,
    temperatureProgram: '参数未保存',
    injectionVolume: '约 1μL（手动进样记录不明）',
    detector: 'FID',
  },
  peaks: [
    { id: 'p1', recordId: 'sample-003', peakIndex: 1, compoundName: '空气', retentionTime: 1.85, peakArea: 9820, peakHeight: 6200, theoreticalPlates: null, dataQuality: 'outlier', isDuplicate: false, isNull: false, note: '保留时间从正常 0.85 漂到 1.85，偏移达 1 min' },
    { id: 'p2', recordId: 'sample-003', peakIndex: 2, compoundName: '甲醇', retentionTime: 6.92, peakArea: 328500, peakHeight: 215400, theoreticalPlates: 9250, dataQuality: 'outlier', isDuplicate: false, isNull: false, note: '正常 3.1 min，实际 6.92 min，偏移 3.82 min' },
    { id: 'p3', recordId: 'sample-003', peakIndex: 3, compoundName: '丙酮', retentionTime: null, peakArea: null, peakHeight: null, theoreticalPlates: null, dataQuality: 'note_inline', isDuplicate: false, isNull: false, inlineNote: '125.8万(基线漂移严重，数值不可信)' },
    { id: 'p4', recordId: 'sample-003', peakIndex: 4, compoundName: '乙醇', retentionTime: 18.5, peakArea: 782500, peakHeight: 452000, theoreticalPlates: 6580, dataQuality: 'outlier', isDuplicate: false, isNull: false, note: '正常 5.1 min，实际 18.5 min，理论塔板数偏低，疑似柱流失' },
    { id: 'p5', recordId: 'sample-003', peakIndex: 5, compoundName: '异丙醇', retentionTime: null, peakArea: null, peakHeight: null, theoreticalPlates: null, dataQuality: 'null', isDuplicate: false, isNull: true },
  ],
  alignmentSteps: [
    {
      id: 's1', recordId: 'sample-003', stepOrder: 1, stepName: '导入原始数据', isCompleted: true,
      description: '发现导出文件中 P3 的峰面积单元格混入了中文备注。',
      explanation: '操作员把 "(基线漂移严重，数值不可信)" 直接写在了数值格中，机器读成字符串就会报错或被忽略——备注必须放在独立字段里。',
    },
    {
      id: 's2', recordId: 'sample-003', stepOrder: 2, stepName: '数据质量自动检测', isCompleted: true,
      description: '发现 1 处备注混写、1 处空值、3 个离群峰（保留时间偏移 > 2 min）。',
      explanation: '坏数据往往不是一种问题，而是多种问题叠加：参数没存好 → 保留时间漂 → 积分失真 → 操作员急了就在数值格里写备注。',
    },
    {
      id: 's3', recordId: 'sample-003', stepOrder: 3, stepName: '保留时间对齐（失败）', isCompleted: false,
      description: '所有峰都无法与标准品对应，保留时间系统性偏移 +300% 以上。',
      explanation: '这种系统性偏移通常意味着：色谱柱装错、载气流速不对、柱温程序没跑起来——需要检查硬件，而不是在数据上"对齐"。',
    },
    {
      id: 's4', recordId: 'sample-003', stepOrder: 4, stepName: '判为无效进样', isCompleted: true,
      description: '按数据质量判定细则作废品处理，记录保留供教学。',
      explanation: '识别"什么时候该放弃"和识别"什么时候数据可信"同样重要。硬着头皮用坏数据出报告，比退回去重进样造成的损失大得多。',
    },
  ],
  calculationResult: undefined,
  operationLogs: [
    { id: 'l1', recordId: 'sample-003', operator: '王安全员', actionType: 'import', timestamp: '2026-04-23 09:50:00', reason: '导入数据' },
    { id: 'l2', recordId: 'sample-003', operator: '王安全员', actionType: 'edit', fieldName: 'P3 备注', oldValue: '(空)', newValue: '在峰面积字段中写入备注', timestamp: '2026-04-23 09:55:00', reason: '试图标记数据问题，但位置错误' },
    { id: 'l3', recordId: 'sample-003', operator: '王安全员', actionType: 'update_status', oldValue: 'needs_review', newValue: 'invalid', timestamp: '2026-04-23 10:10:00', reason: '判定为无效进样，保留为教学样例' },
  ],
  createdAt: '2026-04-23 09:50:00',
  updatedAt: '2026-04-23 10:10:00',
};

export const sampleRecords: GCRecord[] = [sample1, sample2, sample3];

export default sampleRecords;
