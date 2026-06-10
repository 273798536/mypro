import type { Review } from '../types';

export const reviews: Review[] = [
  {
    id: 'rv-001',
    targetId: 'sm-006',
    targetType: 'sample',
    reviewer: '李主任',
    status: 'approved',
    reviewDate: '2024-03-24T10:30:00Z',
    comments: '样本质量确实较差，Q30偏低，建议重新采样。当前数据仅供参考，不建议用于正式分析。',
    issuesFound: [
      '测序深度不足，仅1.2M reads',
      'Q30值仅62.3%，低于阈值80%',
      'DNA降解严重'
    ],
    recommendations: [
      '重新采集样本',
      '优化样本保存条件',
      '提高测序深度至10M以上'
    ]
  },
  {
    id: 'rv-002',
    targetId: 'sm-007',
    targetType: 'sample',
    reviewer: '王副主任',
    status: 'approved',
    reviewDate: '2024-03-27T14:20:00Z',
    comments: '确认样本存在皮肤菌群污染，主要为金黄色葡萄球菌和表皮葡萄球菌。污染来源可能为采血过程操作不规范。',
    issuesFound: [
      '金黄色葡萄球菌丰度异常偏高',
      '皮肤共生菌比例异常',
      '采集过程可能存在污染'
    ],
    recommendations: [
      '加强采血操作规范培训',
      '使用皮肤消毒试剂盒',
      '建议重新采集样本'
    ]
  },
  {
    id: 'rv-003',
    targetId: 'sm-008',
    targetType: 'sample',
    reviewer: '李主任',
    status: 'approved',
    reviewDate: '2024-03-26T09:15:00Z',
    comments: '阴性对照检测到大肠杆菌信号，提示DNA提取试剂盒可能存在污染。需要追溯同批次其他样本。',
    issuesFound: [
      '阴性对照出现大肠杆菌阳性信号',
      '丰度5.2%，超过背景阈值',
      '可能为试剂污染'
    ],
    recommendations: [
      '更换试剂批次',
      '检查实验室操作流程',
      '对同批次样本进行评估'
    ]
  },
  {
    id: 'rv-004',
    targetId: 'cr-003',
    targetType: 'culture-record',
    reviewer: '李主任',
    status: 'approved',
    reviewDate: '2024-03-27T11:30:00Z',
    comments: '确认培养结果为污染。菌落形态符合金黄色葡萄球菌特征，结合血液样本来源，判断为皮肤污染。',
    issuesFound: [
      '血液样本检出皮肤常见菌',
      '菌落形态符合金黄色葡萄球菌',
      '采集过程污染可能性大'
    ],
    recommendations: [
      '标记为污染样本',
      '加强无菌操作培训',
      '必要时重新采样'
    ]
  },
  {
    id: 'rv-005',
    targetId: 'sm-011',
    targetType: 'sample',
    reviewer: '王副主任',
    status: 'rejected',
    reviewDate: '2024-04-01T10:00:00Z',
    comments: '样本质量极差，数据不可用。Q30仅55.7%，reads数不足1M，建议直接废弃该样本。',
    issuesFound: [
      '测序深度严重不足，仅850K reads',
      'Q30值55.7%，远低于标准',
      '数据质量不可接受'
    ],
    recommendations: [
      '废弃该样本',
      '重新采集新鲜样本',
      '检查样本保存流程'
    ]
  },
  {
    id: 'rv-006',
    targetId: 'cr-006',
    targetType: 'culture-record',
    reviewer: '张主管',
    status: 'pending',
    reviewDate: '2024-03-29T16:00:00Z',
    comments: '待复核，需要进一步确认试剂污染情况。建议做空白对照实验验证。',
    issuesFound: [
      '试剂对照检测到细菌生长',
      '污染来源待确认'
    ],
    recommendations: [
      '进行污染来源调查',
      '检查试剂批号',
      '做空白对照验证'
    ]
  },
  {
    id: 'rv-007',
    targetId: 'sm-014',
    targetType: 'sample',
    reviewer: '李主任',
    status: 'pending',
    reviewDate: '2024-04-02T15:30:00Z',
    comments: '尿液样本检测到肠球菌和链球菌，数量异常。需结合临床症状判断是否为感染。待补充临床信息后复核。',
    issuesFound: [
      '肠球菌丰度异常',
      '链球菌比例偏高',
      '需确认临床意义'
    ],
    recommendations: [
      '补充临床诊断信息',
      '结合培养结果综合判断',
      '必要时进行药敏试验'
    ]
  },
  {
    id: 'rv-008',
    targetId: 'cr-010',
    targetType: 'culture-record',
    reviewer: '王副主任',
    status: 'pending',
    reviewDate: '2024-04-03T14:00:00Z',
    comments: '尿液培养肠球菌45个菌落，处于临界值。需要结合菌落形态和生化鉴定进一步确认。',
    issuesFound: [
      '菌落计数处于临界值',
      '菌种鉴定待确认',
      '需排除污染可能'
    ],
    recommendations: [
      '进行生化鉴定确认菌种',
      '重新划线分离纯化',
      '结合临床综合判断'
    ]
  },
  {
    id: 'rv-009',
    targetId: 'sm-015',
    targetType: 'sample',
    reviewer: '张主管',
    status: 'approved',
    reviewDate: '2024-04-04T10:45:00Z',
    comments: '采集管对照检测到金黄色葡萄球菌污染，确认采集装置存在污染问题。需更换供应商或批次。',
    issuesFound: [
      '空采集管检出细菌',
      '金黄色葡萄球菌污染',
      '采集装置质量问题'
    ],
    recommendations: [
      '更换采集管批次',
      '对供应商进行质量评估',
      '对库存采集管进行抽检'
    ]
  },
  {
    id: 'rv-010',
    targetId: 'cr-002',
    targetType: 'culture-record',
    reviewer: '李主任',
    status: 'approved',
    reviewDate: '2024-03-18T14:30:00Z',
    comments: '复核通过。肠炎患者样本大肠杆菌数量显著增高，符合临床诊断。菌落计数和形态描述准确。',
    issuesFound: [],
    recommendations: [
      '结果准确，可用于报告'
    ]
  }
];

export const getReviewById = (id: string): Review | undefined => {
  return reviews.find(r => r.id === id);
};

export const getReviewsByTarget = (targetId: string): Review[] => {
  return reviews
    .filter(r => r.targetId === targetId)
    .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
};

export const getReviewsByStatus = (status: Review['status']): Review[] => {
  return reviews
    .filter(r => r.status === status)
    .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
};

export const getReviewsByReviewer = (reviewer: string): Review[] => {
  return reviews
    .filter(r => r.reviewer === reviewer)
    .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
};

export const getPendingReviews = (): Review[] => {
  return getReviewsByStatus('pending');
};

export const getReviewsByTargetType = (targetType: Review['targetType']): Review[] => {
  return reviews
    .filter(r => r.targetType === targetType)
    .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
};
