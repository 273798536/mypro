import type { RiskRecord } from '../types';

export const mockRiskRecords: RiskRecord[] = [
  {
    id: 'GR20260601001',
    bondCode: 'G2026001',
    bondName: '长江三峡绿色能源专项债券（一期）',
    issuer: '中国长江电力股份有限公司',
    raiseDate: '2026-05-15',
    raiseAmount: 5000000000,
    currency: 'CNY',
    riskLevel: 'medium',
    riskType: '资金用途偏离风险',
    riskDescription: '募集资金 2 亿元用于补充流动资金，超出绿色项目投资范围约 8000 万元，存在资金用途偏离风险。',
    processingStatus: 'anomaly_fixed',
    processingResult: '已调整资金划拨计划，8000 万元补充流动资金已退回募集资金专户，待重新投放至绿色项目。',
    isAnomaly: true,
    anomalyReason: '初始资金划拨方案未经风控部门复核',
    manualNotes: [
      {
        id: 'N001',
        content: '补充说明：该笔资金为临时周转，将在 15 个工作日内转回绿色项目账户。（原补充说明已撤回）',
        author: '王强',
        authorRole: '业务经理',
        createdAt: '2026-05-20 10:30:00',
        isWithdrawn: true,
        withdrawnAt: '2026-05-22 14:15:00',
        withdrawnBy: '阿敏',
        linkedConclusionId: 'C001',
        source: 'supplement',
        history: [
          {
            content: '该笔资金为临时周转，将在 15 个工作日内转回。',
            modifiedAt: '2026-05-20 10:30:00',
            modifiedBy: '王强',
            modifiedByRole: '业务经理'
          },
          {
            content: '补充说明：该笔资金为临时周转，将在 15 个工作日内转回绿色项目账户。',
            modifiedAt: '2026-05-21 09:00:00',
            modifiedBy: '王强',
            modifiedByRole: '业务经理'
          }
        ]
      },
      {
        id: 'N002',
        content: '资金主管阿敏最终结论：原补充说明中"临时周转"表述不严谨，已要求业务方调整为正式资金回流方案。当前该笔风险已解除。',
        author: '阿敏',
        authorRole: '资金主管',
        createdAt: '2026-05-22 14:20:00',
        isWithdrawn: false,
        source: 'manual',
        history: []
      }
    ],
    historicalJudgments: [
      {
        id: 'J001',
        judgment: '该笔风险可控，建议放行',
        judger: '陈伟',
        judgerRole: '风控初审',
        judgedAt: '2026-05-20 15:00:00',
        isFinal: false,
        reason: '金额占募集总额比例较低（1.6%），且有回流承诺'
      },
      {
        id: 'J002',
        judgment: '该笔风险不可接受，需立即整改',
        judger: '阿敏',
        judgerRole: '资金主管',
        judgedAt: '2026-05-21 11:30:00',
        isFinal: true,
        reason: '补充说明中"临时周转"缺乏制度依据，存在监管合规风险'
      }
    ],
    auditTrail: [
      {
        id: 'A001',
        field: 'processingStatus',
        oldValue: 'normal_pending',
        newValue: 'anomaly_pending',
        changedBy: '系统',
        changedByRole: '风控引擎',
        changedAt: '2026-05-20 09:00:00'
      },
      {
        id: 'A002',
        field: 'processingStatus',
        oldValue: 'anomaly_pending',
        newValue: 'anomaly_fixed',
        changedBy: '阿敏',
        changedByRole: '资金主管',
        changedAt: '2026-05-25 16:00:00',
        reason: '资金已退回专户，整改完成'
      }
    ],
    summaryImpact: '该记录由"待复核"转为"异常已修复"，导致异常待处理数减少 1，已修复数增加 1。',
    createdAt: '2026-05-20 09:00:00',
    updatedAt: '2026-05-25 16:00:00',
    responsiblePerson: '阿敏',
    withdrawalRecord: {
      withdrawnAt: '2026-05-22 14:15:00',
      withdrawnBy: '阿敏',
      withdrawnReason: '原补充说明表述不严谨，与最终整改结论不一致',
      linkedConclusionId: 'C001'
    }
  },
  {
    id: 'GR20260601002',
    bondCode: 'G2026002',
    bondName: '国家电投碳中和绿色债券',
    issuer: '国家电力投资集团有限公司',
    raiseDate: '2026-05-10',
    raiseAmount: 8000000000,
    currency: 'CNY',
    riskLevel: 'low',
    riskType: '项目进度风险',
    riskDescription: '光伏电站建设进度较计划滞后 5%，预计不影响整体收益。',
    processingStatus: 'normal_passed',
    processingResult: '风险可控，正常通过。项目方已出具进度追赶计划，预计 1 个月内追平进度。',
    isAnomaly: false,
    manualNotes: [],
    historicalJudgments: [
      {
        id: 'J003',
        judgment: '风险可控，正常通过',
        judger: '李娜',
        judgerRole: '风控专员',
        judgedAt: '2026-05-12 10:00:00',
        isFinal: true,
        reason: '进度滞后在允许范围内，且有追赶计划'
      }
    ],
    auditTrail: [
      {
        id: 'A003',
        field: 'processingStatus',
        oldValue: 'normal_pending',
        newValue: 'normal_passed',
        changedBy: '李娜',
        changedByRole: '风控专员',
        changedAt: '2026-05-12 10:00:00'
      }
    ],
    summaryImpact: '该记录正常通过，未影响异常统计指标。',
    createdAt: '2026-05-12 09:00:00',
    updatedAt: '2026-05-12 10:00:00',
    responsiblePerson: '李娜'
  },
  {
    id: 'GR20260601003',
    bondCode: 'G2026003',
    bondName: '华能新能源绿色金融债券',
    issuer: '中国华能集团有限公司',
    raiseDate: '2026-05-20',
    raiseAmount: 3000000000,
    currency: 'USD',
    riskLevel: 'high',
    riskType: '币种错误风险',
    riskDescription: '系统录入币种为 USD，但实际募集合同币种为 CNY。币种不一致可能导致汇兑计算错误和监管报表异常。',
    processingStatus: 'currency_error',
    processingResult: '【异常处理中】币种录入错误，待数据组修正后重新校验。当前记录不计入正常通过统计。',
    isAnomaly: true,
    anomalyReason: '前端录入下拉框默认值错误，操作员未核对',
    manualNotes: [
      {
        id: 'N003',
        content: '币种错误已确认，系数据录入失误。该记录属于小样例测试数据混入生产环境，已通知数据组修正。',
        author: '张伟',
        authorRole: '数据运维',
        createdAt: '2026-06-01 11:00:00',
        isWithdrawn: false,
        source: 'manual',
        history: []
      }
    ],
    historicalJudgments: [
      {
        id: 'J004',
        judgment: '该记录为数据错误，非真实业务风险',
        judger: '阿敏',
        judgerRole: '资金主管',
        judgedAt: '2026-06-01 14:00:00',
        isFinal: false,
        reason: '币种明显错误，需修正后再判断'
      }
    ],
    auditTrail: [
      {
        id: 'A004',
        field: 'processingStatus',
        oldValue: 'normal_pending',
        newValue: 'currency_error',
        changedBy: '系统',
        changedByRole: '币种校验引擎',
        changedAt: '2026-06-01 10:30:00'
      }
    ],
    summaryImpact: '该记录标记为币种错误，不计入正常风险统计。高风险数因此不包含此条。',
    createdAt: '2026-06-01 09:00:00',
    updatedAt: '2026-06-01 14:00:00',
    responsiblePerson: '张伟'
  },
  {
    id: 'GR20260601004',
    bondCode: 'G2026004',
    bondName: '中广核海上风电绿色债券',
    issuer: '中国广核集团有限公司',
    raiseDate: '2026-05-25',
    raiseAmount: 6000000000,
    currency: 'CNY',
    riskLevel: 'high',
    riskType: '环境效益数据缺失',
    riskDescription: '第三方环境效益评估报告缺失，无法核实减排量测算依据。',
    processingStatus: 'anomaly_pending',
    processingResult: '【异常待处理】需发行方 3 个工作日内补充环境效益评估报告，否则触发资金冻结。',
    isAnomaly: true,
    anomalyReason: '发行方未按要求提交第三方评估文件',
    manualNotes: [
      {
        id: 'N004',
        content: '发行方已口头承诺 6 月 5 日前提交报告，暂不冻结资金。',
        author: '刘涛',
        authorRole: '客户经理',
        createdAt: '2026-06-02 09:30:00',
        isWithdrawn: false,
        source: 'manual',
        history: [
          {
            content: '发行方承诺本周内提交报告。',
            modifiedAt: '2026-06-02 09:30:00',
            modifiedBy: '刘涛',
            modifiedByRole: '客户经理'
          },
          {
            content: '发行方已口头承诺 6 月 5 日前提交报告，暂不冻结资金。',
            modifiedAt: '2026-06-02 15:00:00',
            modifiedBy: '阿敏',
            modifiedByRole: '资金主管'
          }
        ]
      }
    ],
    historicalJudgments: [
      {
        id: 'J005',
        judgment: '高风险，建议立即冻结资金',
        judger: '李娜',
        judgerRole: '风控专员',
        judgedAt: '2026-06-01 16:00:00',
        isFinal: false,
        reason: '缺失核心评估文件'
      },
      {
        id: 'J006',
        judgment: '暂缓冻结，给予 3 个工作日宽限期',
        judger: '阿敏',
        judgerRole: '资金主管',
        judgedAt: '2026-06-02 15:00:00',
        isFinal: true,
        reason: '发行方为重要客户，且有明确提交承诺，兼顾风险与客户关系'
      }
    ],
    auditTrail: [
      {
        id: 'A005',
        field: 'processingStatus',
        oldValue: 'normal_pending',
        newValue: 'anomaly_pending',
        changedBy: '系统',
        changedByRole: '风控引擎',
        changedAt: '2026-06-01 14:00:00'
      },
      {
        id: 'A006',
        field: 'manualNotes[N004].content',
        oldValue: '发行方承诺本周内提交报告。',
        newValue: '发行方已口头承诺 6 月 5 日前提交报告，暂不冻结资金。',
        changedBy: '阿敏',
        changedByRole: '资金主管',
        changedAt: '2026-06-02 15:00:00',
        reason: '需明确时间节点和处理态度'
      }
    ],
    summaryImpact: '阿敏主管将处理意见从"立即冻结"调整为"3日宽限"，异常待处理数不变，但风险处置策略已更新。',
    createdAt: '2026-06-01 14:00:00',
    updatedAt: '2026-06-02 15:00:00',
    responsiblePerson: '阿敏'
  },
  {
    id: 'GR20260601005',
    bondCode: 'G2026005',
    bondName: '比亚迪新能源汽车绿色债券',
    issuer: '比亚迪股份有限公司',
    raiseDate: '2026-05-28',
    raiseAmount: 10000000000,
    currency: 'CNY',
    riskLevel: 'medium',
    riskType: '信息披露不完整',
    riskDescription: '募集说明书中绿色项目目录描述不够具体，需补充单个项目明细。',
    processingStatus: 'normal_pending',
    processingResult: '待补充材料，正常流程中。',
    isAnomaly: false,
    manualNotes: [],
    historicalJudgments: [],
    auditTrail: [
      {
        id: 'A007',
        field: 'processingStatus',
        oldValue: 'normal_pending',
        newValue: 'normal_pending',
        changedBy: '系统',
        changedByRole: '风控引擎',
        changedAt: '2026-06-03 09:00:00'
      }
    ],
    summaryImpact: '该记录待处理，不计入已通过或异常统计。',
    createdAt: '2026-06-03 09:00:00',
    updatedAt: '2026-06-03 09:00:00',
    responsiblePerson: '李娜'
  },
  {
    id: 'GR20260601006',
    bondCode: 'G2026006',
    bondName: '京能清洁能源绿色债券（已撤回）',
    issuer: '北京能源集团有限责任公司',
    raiseDate: '2026-04-15',
    raiseAmount: 2000000000,
    currency: 'CNY',
    riskLevel: 'low',
    riskType: '已撤回记录',
    riskDescription: '该笔募集申请已由发行方主动撤回，原因为绿色项目调整。',
    processingStatus: 'withdrawn',
    processingResult: '【已撤回】本记录已与最终结论关联，归档保存。不参与当前风险统计。',
    isAnomaly: false,
    manualNotes: [
      {
        id: 'N005',
        content: '原说明：因市场利率波动撤回申请。（已撤回，最终结论见关联记录）',
        author: '赵磊',
        authorRole: '业务经理',
        createdAt: '2026-04-20 10:00:00',
        isWithdrawn: true,
        withdrawnAt: '2026-04-22 16:00:00',
        withdrawnBy: '阿敏',
        linkedConclusionId: 'C006',
        source: 'supplement',
        history: []
      },
      {
        id: 'N006',
        content: '最终结论：发行方因内部绿色项目名单调整主动撤回，与市场利率无关。原补充说明中"利率波动"说法不准确，已撤回并以此结论为准。',
        author: '阿敏',
        authorRole: '资金主管',
        createdAt: '2026-04-22 16:05:00',
        isWithdrawn: false,
        source: 'manual',
        history: []
      }
    ],
    historicalJudgments: [
      {
        id: 'J007',
        judgment: '同意撤回，归档处理',
        judger: '阿敏',
        judgerRole: '资金主管',
        judgedAt: '2026-04-22 16:10:00',
        isFinal: true,
        reason: '发行方主动撤回，非风险事件'
      }
    ],
    auditTrail: [
      {
        id: 'A008',
        field: 'processingStatus',
        oldValue: 'normal_pending',
        newValue: 'withdrawn',
        changedBy: '阿敏',
        changedByRole: '资金主管',
        changedAt: '2026-04-22 16:10:00',
        reason: '发行方主动撤回申请'
      }
    ],
    summaryImpact: '该记录已撤回，不计入任何在途风险统计。撤回记录与最终结论已关联。',
    createdAt: '2026-04-20 10:00:00',
    updatedAt: '2026-04-22 16:10:00',
    responsiblePerson: '阿敏',
    withdrawalRecord: {
      withdrawnAt: '2026-04-22 16:00:00',
      withdrawnBy: '阿敏',
      withdrawnReason: '原补充说明中撤回原因与事实不符，已修正为"绿色项目名单调整"',
      linkedConclusionId: 'C006'
    }
  },
  {
    id: 'GR20260601007',
    bondCode: 'G2026007',
    bondName: '三峡水利水电绿色专项债券',
    issuer: '中国长江电力股份有限公司',
    raiseDate: '2026-06-01',
    raiseAmount: 4500000000,
    currency: 'CNY',
    riskLevel: 'low',
    riskType: '常规核查',
    riskDescription: '募集资金全部投向水利水电项目，材料完整，无异常。',
    processingStatus: 'normal_passed',
    processingResult: '材料齐全，投向合规，正常通过。',
    isAnomaly: false,
    manualNotes: [],
    historicalJudgments: [
      {
        id: 'J008',
        judgment: '正常通过',
        judger: '李娜',
        judgerRole: '风控专员',
        judgedAt: '2026-06-03 11:00:00',
        isFinal: true,
        reason: '材料完整合规'
      }
    ],
    auditTrail: [],
    summaryImpact: '该记录正常通过，低风险通过数增加 1。',
    createdAt: '2026-06-03 10:00:00',
    updatedAt: '2026-06-03 11:00:00',
    responsiblePerson: '李娜'
  }
];
