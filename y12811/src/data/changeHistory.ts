import type { ChangeHistory } from '../types';

export const changeHistory: ChangeHistory[] = [
  {
    id: 'ch-001',
    recordId: 'cr-002',
    recordType: 'culture-record',
    version: 1,
    changedBy: '王技师',
    changeTime: '2024-03-18T10:15:00Z',
    changeReason: '初始记录',
    changes: {
      colonyCount: { oldValue: null, newValue: 850 },
      status: { oldValue: null, newValue: 'growth' },
      notes: { oldValue: null, newValue: '肠炎患者样本' }
    }
  },
  {
    id: 'ch-002',
    recordId: 'cr-002',
    recordType: 'culture-record',
    version: 2,
    changedBy: '李主任',
    changeTime: '2024-03-18T14:20:00Z',
    changeReason: '复核修正菌落计数',
    changes: {
      colonyCount: { oldValue: 850, newValue: 892 },
      notes: { oldValue: '肠炎患者样本', newValue: '肠炎患者样本，大肠杆菌数量显著增高' },
      colonyMorphology: { oldValue: '粉红色菌落', newValue: '粉红色菌落，中心深，直径2-3mm' }
    }
  },
  {
    id: 'ch-003',
    recordId: 'cr-003',
    recordType: 'culture-record',
    version: 1,
    changedBy: '张技师',
    changeTime: '2024-03-26T08:45:00Z',
    changeReason: '初始记录',
    changes: {
      colonyCount: { oldValue: null, newValue: 45 },
      status: { oldValue: null, newValue: 'growth' },
      notes: { oldValue: null, newValue: '血液样本有菌生长' }
    }
  },
  {
    id: 'ch-004',
    recordId: 'cr-003',
    recordType: 'culture-record',
    version: 2,
    changedBy: '张技师',
    changeTime: '2024-03-26T15:30:00Z',
    changeReason: '补充形态学鉴定结果',
    changes: {
      colonyCount: { oldValue: 45, newValue: 156 },
      colonyMorphology: { oldValue: '', newValue: '金黄色菌落，β溶血' },
      notes: { oldValue: '血液样本有菌生长', newValue: '血液样本检测到葡萄球菌生长' }
    }
  },
  {
    id: 'ch-005',
    recordId: 'cr-003',
    recordType: 'culture-record',
    version: 3,
    changedBy: '李主任',
    changeTime: '2024-03-27T11:30:00Z',
    changeReason: '判定为污染样本',
    changes: {
      status: { oldValue: 'growth', newValue: 'contaminated' },
      notes: { oldValue: '血液样本检测到葡萄球菌生长', newValue: '血液样本检测到皮肤菌群污染，疑为金黄色葡萄球菌' },
      colonyMorphology: { oldValue: '金黄色菌落，β溶血', newValue: '金黄色菌落，β溶血，直径1-2mm' }
    }
  },
  {
    id: 'ch-006',
    recordId: 'cr-006',
    recordType: 'culture-record',
    version: 1,
    changedBy: '张技师',
    changeTime: '2024-03-28T09:15:00Z',
    changeReason: '初始记录',
    changes: {
      colonyCount: { oldValue: null, newValue: 0 },
      status: { oldValue: null, newValue: 'no-growth' },
      notes: { oldValue: null, newValue: '试剂对照，无菌生长' }
    }
  },
  {
    id: 'ch-007',
    recordId: 'cr-006',
    recordType: 'culture-record',
    version: 2,
    changedBy: '王技师',
    changeTime: '2024-03-29T15:40:00Z',
    changeReason: '发现污染，修正结果',
    changes: {
      colonyCount: { oldValue: 0, newValue: 23 },
      status: { oldValue: 'no-growth', newValue: 'growth' },
      notes: { oldValue: '试剂对照，无菌生长', newValue: '试剂对照检测到细菌生长，提示试剂污染' },
      colonyMorphology: { oldValue: '', newValue: '小菌落，形态不规则' }
    }
  },
  {
    id: 'ch-008',
    recordId: 'sm-006',
    recordType: 'sample',
    version: 1,
    changedBy: '李技师',
    changeTime: '2024-03-12T14:00:00Z',
    changeReason: '样本登记',
    changes: {
      status: { oldValue: null, newValue: 'normal' },
      description: { oldValue: null, newValue: '常规粪便样本' }
    }
  },
  {
    id: 'ch-009',
    recordId: 'sm-006',
    recordType: 'sample',
    version: 2,
    changedBy: '王技师',
    changeTime: '2024-03-23T16:30:00Z',
    changeReason: '测序质量差，更新状态',
    changes: {
      status: { oldValue: 'normal', newValue: 'low-quality' },
      q30: { oldValue: 85.0, newValue: 62.3 },
      readCount: { oldValue: 8000000, newValue: 1200000 },
      description: { oldValue: '常规粪便样本', newValue: '样本降解严重，测序深度不足，Q30偏低' }
    }
  },
  {
    id: 'ch-010',
    recordId: 'sm-008',
    recordType: 'sample',
    version: 1,
    changedBy: '张技师',
    changeTime: '2024-03-19T10:00:00Z',
    changeReason: '样本登记',
    changes: {
      status: { oldValue: null, newValue: 'normal' },
      description: { oldValue: null, newValue: 'DNA提取试剂对照' }
    }
  },
  {
    id: 'ch-011',
    recordId: 'sm-008',
    recordType: 'sample',
    version: 2,
    changedBy: '李主任',
    changeTime: '2024-03-25T09:20:00Z',
    changeReason: '检测到污染，标记异常',
    changes: {
      status: { oldValue: 'normal', newValue: 'control-abnormal' },
      description: { oldValue: 'DNA提取试剂对照', newValue: 'DNA提取试剂对照，检测到异常微生物信号' }
    }
  },
  {
    id: 'ch-012',
    recordId: 'cr-008',
    recordType: 'culture-record',
    version: 1,
    changedBy: '王技师',
    changeTime: '2024-03-25T14:20:00Z',
    changeReason: '初始记录',
    changes: {
      colonyCount: { oldValue: null, newValue: 5 },
      status: { oldValue: null, newValue: 'growth' },
      notes: { oldValue: null, newValue: '少量菌落，可能污染' }
    }
  },
  {
    id: 'ch-013',
    recordId: 'cr-008',
    recordType: 'culture-record',
    version: 2,
    changedBy: '李主任',
    changeTime: '2024-03-26T10:10:00Z',
    changeReason: '复核确认无真实生长',
    changes: {
      colonyCount: { oldValue: 5, newValue: 0 },
      status: { oldValue: 'growth', newValue: 'no-growth' },
      notes: { oldValue: '少量菌落，可能污染', newValue: '样本质量差，可能DNA降解导致培养失败' }
    }
  },
  {
    id: 'ch-014',
    recordId: 'cr-010',
    recordType: 'culture-record',
    version: 1,
    changedBy: '李技师',
    changeTime: '2024-04-02T10:30:00Z',
    changeReason: '初始记录',
    changes: {
      colonyCount: { oldValue: null, newValue: 12 },
      status: { oldValue: null, newValue: 'growth' },
      notes: { oldValue: null, newValue: '尿液样本有少量细菌生长' }
    }
  },
  {
    id: 'ch-015',
    recordId: 'cr-010',
    recordType: 'culture-record',
    version: 2,
    changedBy: '李主任',
    changeTime: '2024-04-03T11:15:00Z',
    changeReason: '重新计数，提交复核',
    changes: {
      colonyCount: { oldValue: 12, newValue: 45 },
      notes: { oldValue: '尿液样本有少量细菌生长', newValue: '尿液样本检测到肠球菌，数量中等，需复核' },
      colonyMorphology: { oldValue: '小菌落', newValue: '圆形凸起，灰白色，γ溶血' }
    }
  },
  {
    id: 'ch-016',
    recordId: 'cr-013',
    recordType: 'culture-record',
    version: 1,
    changedBy: '王技师',
    changeTime: '2024-03-18T11:00:00Z',
    changeReason: '初始记录',
    changes: {
      colonyCount: { oldValue: null, newValue: 89 },
      status: { oldValue: null, newValue: 'growth' },
      notes: { oldValue: null, newValue: '链球菌生长' }
    }
  },
  {
    id: 'ch-017',
    recordId: 'cr-013',
    recordType: 'culture-record',
    version: 2,
    changedBy: '张技师',
    changeTime: '2024-03-19T09:30:00Z',
    changeReason: '补充溶血信息',
    changes: {
      colonyCount: { oldValue: 89, newValue: 167 },
      colonyMorphology: { oldValue: '', newValue: '灰白色，β溶血，链状' },
      notes: { oldValue: '链球菌生长', newValue: '链球菌生长，可能与肠炎相关' }
    }
  },
  {
    id: 'ch-018',
    recordId: 'sm-014',
    recordType: 'sample',
    version: 1,
    changedBy: '王技师',
    changeTime: '2024-03-24T09:00:00Z',
    changeReason: '样本登记',
    changes: {
      status: { oldValue: null, newValue: 'normal' },
      description: { oldValue: null, newValue: '尿液样本' }
    }
  },
  {
    id: 'ch-019',
    recordId: 'sm-014',
    recordType: 'sample',
    version: 2,
    changedBy: '李主任',
    changeTime: '2024-03-31T14:50:00Z',
    changeReason: '检测到异常病原菌，待复核',
    changes: {
      status: { oldValue: 'normal', newValue: 'pending-review' },
      description: { oldValue: '尿液样本', newValue: '检测到异常病原菌，需复核确认' }
    }
  },
  {
    id: 'ch-020',
    recordId: 'sm-015',
    recordType: 'sample',
    version: 1,
    changedBy: '张技师',
    changeTime: '2024-03-25T11:00:00Z',
    changeReason: '样本登记',
    changes: {
      status: { oldValue: null, newValue: 'normal' },
      description: { oldValue: null, newValue: '空采集管对照' }
    }
  }
];

export const getChangeHistoryByRecord = (recordId: string): ChangeHistory[] => {
  return changeHistory
    .filter(h => h.recordId === recordId)
    .sort((a, b) => a.version - b.version);
};

export const getChangeHistoryByType = (recordType: ChangeHistory['recordType']): ChangeHistory[] => {
  return changeHistory
    .filter(h => h.recordType === recordType)
    .sort((a, b) => new Date(b.changeTime).getTime() - new Date(a.changeTime).getTime());
};

export const getChangeHistoryByUser = (changedBy: string): ChangeHistory[] => {
  return changeHistory
    .filter(h => h.changedBy === changedBy)
    .sort((a, b) => new Date(b.changeTime).getTime() - new Date(a.changeTime).getTime());
};

export const getLatestChange = (recordId: string): ChangeHistory | undefined => {
  const history = getChangeHistoryByRecord(recordId);
  return history[history.length - 1];
};
