import {
  StandardBatch,
  SpectrumRecord,
  AnomalyRecord,
  ProcessRecord,
} from '../types'

export const sampleBatches: StandardBatch[] = [
  {
    id: 'batch-001',
    batchNo: 'STD-2026-0610-001',
    reagentName: '六价铬标准溶液',
    reagentCasNo: '18540-29-9',
    nominalConcentration: 100.0,
    nominalConcentrationUnit: 'mg/L',
    actualConcentration: 102.3,
    concentrationErrorCause:
      '配制当天环境温度比标定温度高 3℃，容量瓶体积略有膨胀，导致实际浓度比标称值偏高约 2.3%。该偏差仍在国家标准 ±5% 允许范围内，但需在报告中注明。',
    preparationDate: '2026-06-01',
    validUntilDate: '2026-08-31',
    preparator: '李监测',
    auditor: '王主管',
    status: 'audited',
    remark: '用于水质六价铬检测的工作标准液，避光冷藏保存。',
    createdAt: '2026-06-01 09:20:00',
    updatedAt: '2026-06-05 14:30:00',
  },
  {
    id: 'batch-002',
    batchNo: 'STD-2026-0610-002',
    reagentName: '甲醛标准溶液',
    reagentCasNo: '50-00-0',
    nominalConcentration: 10.0,
    nominalConcentrationUnit: 'μg/mL',
    preparationDate: '2026-05-15',
    validUntilDate: '2026-06-14',
    preparator: '张监测',
    status: 'prepared',
    remark: '室内空气甲醛检测用。',
    createdAt: '2026-05-15 10:00:00',
    updatedAt: '2026-05-15 10:00:00',
  },
  {
    id: 'batch-003',
    batchNo: 'STD-2026-0610-003',
    reagentName: '总磷标准溶液',
    nominalConcentration: 50.0,
    nominalConcentrationUnit: 'mg/L',
    actualConcentration: 44.8,
    concentrationErrorCause:
      '配制人员误将磷酸二氢钾试剂按无水物计算，但实际取用的是带结晶水的 KH2PO4·H2O，导致实际浓度比标称值偏低约 10.4%，已超出允许范围。本批次需作废重配。',
    preparationDate: '2026-06-03',
    validUntilDate: '2026-09-02',
    preparator: '赵监测',
    status: 'invalid',
    remark: '已作废，不可使用。',
    createdAt: '2026-06-03 11:00:00',
    updatedAt: '2026-06-07 16:20:00',
  },
]

function genRawData(
  peaks: { rt: number; height: number; width: number }[],
  count = 300,
) {
  const arr: { rt: number; intensity: number }[] = []
  for (let i = 0; i < count; i++) {
    const rt = (i / count) * 10
    let intensity = 5 + Math.random() * 3
    peaks.forEach((p) => {
      const diff = (rt - p.rt) / (p.width / 2.355)
      intensity += p.height * Math.exp(-0.5 * diff * diff)
    })
    arr.push({ rt: Number(rt.toFixed(3)), intensity: Number(intensity.toFixed(2)) })
  }
  return arr
}

export const sampleSpectrums: SpectrumRecord[] = [
  {
    id: 'spec-001',
    batchId: 'batch-001',
    importHash: 'h7a9f2k1',
    instrumentName: '高效液相色谱仪',
    instrumentNo: 'HPLC-03',
    analyst: '李监测',
    analysisDate: '2026-06-05',
    peaks: [
      { retentionTime: 2.31, height: 120, area: 3420, width: 0.12, compoundName: '六价铬' },
    ],
    hasOverlap: false,
    overlapDetails: [],
    conclusion: 'qualified',
    rawData: genRawData([{ rt: 2.31, height: 120, width: 0.12 }]),
    createdAt: '2026-06-05 10:15:00',
  },
  {
    id: 'spec-002',
    batchId: 'batch-001',
    importHash: 'h3k8p5mz',
    instrumentName: '高效液相色谱仪',
    instrumentNo: 'HPLC-03',
    analyst: '李监测',
    analysisDate: '2026-06-08',
    peaks: [
      { retentionTime: 2.28, height: 115, area: 3300, width: 0.13, compoundName: '六价铬' },
      { retentionTime: 2.34, height: 40, area: 820, width: 0.11, compoundName: '杂质A' },
    ],
    hasOverlap: true,
    overlapDetails: [
      '六价铬 与 杂质A 保留时间差 0.060 分钟，小于峰宽均值的 50%，判定为谱峰重叠',
    ],
    conclusion: 'unqualified',
    rawData: genRawData([
      { rt: 2.28, height: 115, width: 0.13 },
      { rt: 2.34, height: 40, width: 0.11 },
    ]),
    createdAt: '2026-06-08 09:40:00',
  },
  {
    id: 'spec-003',
    batchId: 'batch-003',
    importHash: 'h2c7j9nv',
    instrumentName: '紫外可见分光光度计',
    instrumentNo: 'UV-12',
    analyst: '赵监测',
    analysisDate: '2026-06-06',
    peaks: [
      { retentionTime: 3.55, height: 88, area: 2450, width: 0.18 },
    ],
    hasOverlap: false,
    overlapDetails: [],
    conclusion: 'unqualified',
    rawData: genRawData([{ rt: 3.55, height: 88, width: 0.18 }]),
    createdAt: '2026-06-06 15:10:00',
  },
]

export const sampleAnomalies: AnomalyRecord[] = [
  {
    id: 'anom-001',
    batchId: 'batch-001',
    relatedSpectrumId: 'spec-002',
    anomalyType: 'peak_overlap',
    severity: 'medium',
    title: '6月8日谱图出现谱峰重叠',
    detail:
      '2026年6月8日对批次 STD-2026-0610-001 进行检测时，六价铬主峰（RT=2.28min）与杂质A（RT=2.34min）发生重叠，分离度不符合要求。',
    safetyHint:
      '本次检测结果不可用于有效期判定。重叠峰提示标准液中可能出现未知杂质，需立即核查储存条件是否合规、容器是否被污染，必要时对同批已分装标准液做报废处理。',
    plainLanguageExplanation:
      '通俗地说，这次测出来的曲线在同一个时间点上冒出了两个"山头"贴在一起，仪器分不清它们分别有多少。所以这份数据不能用来判断这瓶标准液还有没有效。大概率是保存过程中进了杂质，或者瓶子没洗干净。建议先换一根新配制的再测一次，同时把这瓶的使用记录全部暂停，等问题查清再决定是否继续用。',
    status: 'handling',
    handler: '王主管',
    handlingOpinion:
      '已要求重新配制并更换流动相比例，待新谱图合格后再判定有效期。同批次其他分装样品暂存隔离。',
    handledAt: '2026-06-08 16:30:00',
    reporter: '李监测',
    reportedAt: '2026-06-08 10:05:00',
    processRecordIds: ['proc-004', 'proc-005', 'proc-006'],
  },
  {
    id: 'anom-002',
    batchId: 'batch-003',
    anomalyType: 'concentration_error',
    severity: 'high',
    title: '总磷标准液实际浓度严重偏低',
    detail:
      '总磷标准液批次 STD-2026-0610-003 标称 50.0 mg/L，实际检测仅 44.8 mg/L，偏差 -10.4%，超出 ±5% 允许范围。',
    safetyHint:
      '本批次标准液已用于 3 份环境样品检测，对应报告需追溯并通知客户复检。所有剩余溶液立即销毁，配制记录需重新培训。',
    plainLanguageExplanation:
      '简单说，这瓶总磷标准液配错了——应该是 50 毫克每升，实际只有 44.8 毫克每升，差了一成多。原因是配制的同事拿错了试剂形态，把带结晶水的盐当成了干燥盐来称重。用这瓶标准液算出来的样品数据也会跟着偏，凡是最近几天用它测过的水样都要重新测一遍。剩下的这瓶直接倒掉，以后每次配完都要再找第二个人核对一遍称量记录。',
    status: 'resolved',
    handler: '王主管',
    handlingOpinion:
      '已通知相关客户，3 份样品免费重测。配制流程新增双人复核环节，赵监测重新参加标准液配制培训。',
    handledAt: '2026-06-07 17:00:00',
    reporter: '王主管',
    reportedAt: '2026-06-07 10:30:00',
    processRecordIds: ['proc-007', 'proc-008'],
  },
  {
    id: 'anom-003',
    batchId: 'batch-002',
    anomalyType: 'expired',
    severity: 'medium',
    title: '甲醛标准液即将到期',
    detail:
      '甲醛标准液 STD-2026-0610-002 有效期至 2026-06-14，距到期不足 5 天。',
    safetyHint:
      '如超过 2026-06-14 未使用完毕，应按过期废液处置，不得再用于出具检测数据。',
    plainLanguageExplanation:
      '甲醛这瓶标准液再过几天就到保质期了。过期之后浓度会不准，测出来的结果就没有法律效力。如果还没用完，到时候按化学废液倒掉，千万别硬撑着用。',
    status: 'open',
    reporter: '系统',
    reportedAt: '2026-06-10 08:00:00',
    processRecordIds: ['proc-009'],
  },
]

export const sampleProcesses: ProcessRecord[] = [
  {
    id: 'proc-001',
    batchId: 'batch-001',
    operator: '李监测',
    operationType: 'create_batch',
    description: '创建六价铬标准液批次 STD-2026-0610-001',
    createdAt: '2026-06-01 09:20:00',
  },
  {
    id: 'proc-002',
    batchId: 'batch-001',
    relatedSpectrumId: 'spec-001',
    operator: '李监测',
    operationType: 'import_spectrum',
    description: '导入 6 月 5 日 HPLC-03 谱图数据，单峰正常。',
    createdAt: '2026-06-05 10:15:00',
  },
  {
    id: 'proc-003',
    batchId: 'batch-001',
    operator: '王主管',
    operationType: 'audit',
    description: '复核批次信息与首次谱图，状态更新为已复核。',
    createdAt: '2026-06-05 14:30:00',
  },
  {
    id: 'proc-004',
    batchId: 'batch-001',
    relatedSpectrumId: 'spec-002',
    operator: '李监测',
    operationType: 'import_spectrum',
    description: '导入 6 月 8 日 HPLC-03 二次检测谱图。',
    createdAt: '2026-06-08 09:40:00',
  },
  {
    id: 'proc-005',
    batchId: 'batch-001',
    relatedSpectrumId: 'spec-002',
    operator: '系统',
    operationType: 'detect_overlap',
    description: '自动检测：谱图存在 1 处谱峰重叠，已标记不合格。',
    safetyHint: '谱峰重叠数据不可用于有效期判定，建议重测。',
    createdAt: '2026-06-08 09:40:05',
  },
  {
    id: 'proc-006',
    batchId: 'batch-001',
    relatedAnomalyId: 'anom-001',
    operator: '李监测',
    operationType: 'mark_anomaly',
    description: '登记谱峰重叠异常 anom-001，等级：中。',
    safetyHint: '同批次样品暂停使用，等待主管处理意见。',
    createdAt: '2026-06-08 10:05:00',
  },
  {
    id: 'proc-007',
    batchId: 'batch-003',
    operator: '王主管',
    operationType: 'mark_anomaly',
    description: '登记浓度异常 anom-002，等级：高，批次作废。',
    safetyHint: '立即停止使用该批次，追溯受影响检测报告。',
    createdAt: '2026-06-07 10:30:00',
  },
  {
    id: 'proc-008',
    batchId: 'batch-003',
    relatedAnomalyId: 'anom-002',
    operator: '王主管',
    operationType: 'handle_anomaly',
    description: '异常已处理：客户已通知，样品免费重测，新增双人复核。',
    createdAt: '2026-06-07 17:00:00',
  },
  {
    id: 'proc-009',
    batchId: 'batch-002',
    relatedAnomalyId: 'anom-003',
    operator: '系统',
    operationType: 'mark_anomaly',
    description: '系统自动登记：甲醛标准液距到期不足 5 天。',
    safetyHint: '到期后按过期废液处置，不可使用。',
    createdAt: '2026-06-10 08:00:00',
  },
]
