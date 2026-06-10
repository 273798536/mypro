import type { Sample } from '../types';

export const samples: Sample[] = [
  {
    id: 'sm-001',
    name: 'S001-健康人粪便样本',
    type: 'clinical',
    status: 'normal',
    collectionDate: '2024-03-15',
    collectionSite: '肠道',
    patientId: 'P001',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-18',
    readCount: 12500000,
    q30: 92.5,
    description: '健康志愿者粪便样本，用于建立基线数据'
  },
  {
    id: 'sm-002',
    name: 'S002-肠炎患者粪便',
    type: 'clinical',
    status: 'normal',
    collectionDate: '2024-03-16',
    collectionSite: '肠道',
    patientId: 'P002',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-19',
    readCount: 11800000,
    q30: 91.2,
    description: '急性肠炎患者粪便样本'
  },
  {
    id: 'sm-003',
    name: 'S003-土壤样本',
    type: 'environmental',
    status: 'normal',
    collectionDate: '2024-03-10',
    collectionSite: '农田',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-20',
    readCount: 15200000,
    q30: 90.8,
    description: '农田土壤微生物组样本'
  },
  {
    id: 'sm-004',
    name: 'S004-口腔拭子',
    type: 'clinical',
    status: 'normal',
    collectionDate: '2024-03-17',
    collectionSite: '口腔',
    patientId: 'P003',
    sequencer: 'Illumina MiSeq',
    sequencingDate: '2024-03-21',
    readCount: 5600000,
    q30: 89.7,
    description: '健康人口腔微生物组样本'
  },
  {
    id: 'sm-005',
    name: 'S005-阴性对照-水',
    type: 'negative-control',
    status: 'normal',
    collectionDate: '2024-03-18',
    collectionSite: '实验室',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-22',
    readCount: 2100000,
    q30: 93.1,
    description: '无菌水阴性对照，用于检测污染'
  },
  {
    id: 'sm-006',
    name: 'S006-低质量样本',
    type: 'clinical',
    status: 'low-quality',
    collectionDate: '2024-03-12',
    collectionSite: '肠道',
    patientId: 'P004',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-23',
    readCount: 1200000,
    q30: 62.3,
    description: '样本降解严重，测序深度不足，Q30偏低'
  },
  {
    id: 'sm-007',
    name: 'S007-污染样本',
    type: 'clinical',
    status: 'contaminated',
    collectionDate: '2024-03-14',
    collectionSite: '血液',
    patientId: 'P005',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-24',
    readCount: 8900000,
    q30: 88.5,
    description: '怀疑采集过程中皮肤菌群污染'
  },
  {
    id: 'sm-008',
    name: 'S008-阴性对照-试剂',
    type: 'negative-control',
    status: 'control-abnormal',
    collectionDate: '2024-03-19',
    collectionSite: '实验室',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-25',
    readCount: 3500000,
    q30: 91.8,
    description: 'DNA提取试剂对照，检测到异常微生物信号'
  },
  {
    id: 'sm-009',
    name: 'S009-皮肤拭子',
    type: 'clinical',
    status: 'normal',
    collectionDate: '2024-03-20',
    collectionSite: '皮肤',
    patientId: 'P006',
    sequencer: 'Illumina MiSeq',
    sequencingDate: '2024-03-26',
    readCount: 4200000,
    q30: 90.2,
    description: '健康人前臂皮肤微生物组'
  },
  {
    id: 'sm-010',
    name: 'S010-阴道拭子',
    type: 'clinical',
    status: 'normal',
    collectionDate: '2024-03-21',
    collectionSite: '阴道',
    patientId: 'P007',
    sequencer: 'Illumina MiSeq',
    sequencingDate: '2024-03-27',
    readCount: 6800000,
    q30: 91.5,
    description: '育龄健康女性阴道微生物组'
  },
  {
    id: 'sm-011',
    name: 'S011-低质量-降解',
    type: 'clinical',
    status: 'low-quality',
    collectionDate: '2024-02-28',
    collectionSite: '痰液',
    patientId: 'P008',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-28',
    readCount: 850000,
    q30: 55.7,
    description: '样本保存不当导致DNA严重降解，测序失败风险高'
  },
  {
    id: 'sm-012',
    name: 'S012-阳性对照',
    type: 'positive-control',
    status: 'normal',
    collectionDate: '2024-03-22',
    collectionSite: '实验室',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-29',
    readCount: 10500000,
    q30: 92.8,
    description: '已知组成的模拟群落阳性对照'
  },
  {
    id: 'sm-013',
    name: 'S013-污水样本',
    type: 'environmental',
    status: 'normal',
    collectionDate: '2024-03-23',
    collectionSite: '污水处理厂',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-03-30',
    readCount: 18300000,
    q30: 89.3,
    description: '城市污水处理厂进水口样本'
  },
  {
    id: 'sm-014',
    name: 'S014-待复核样本',
    type: 'clinical',
    status: 'pending-review',
    collectionDate: '2024-03-24',
    collectionSite: '尿液',
    patientId: 'P009',
    sequencer: 'Illumina MiSeq',
    sequencingDate: '2024-03-31',
    readCount: 3200000,
    q30: 87.6,
    description: '检测到异常病原菌，需复核确认'
  },
  {
    id: 'sm-015',
    name: 'S015-阴性对照-采集管',
    type: 'negative-control',
    status: 'control-abnormal',
    collectionDate: '2024-03-25',
    collectionSite: '实验室',
    sequencer: 'Illumina NovaSeq 6000',
    sequencingDate: '2024-04-01',
    readCount: 1800000,
    q30: 90.5,
    description: '空采集管对照，检测到样本采集装置污染'
  }
];

export const getSampleById = (id: string): Sample | undefined => {
  return samples.find(s => s.id === id);
};

export const getSamplesByStatus = (status: Sample['status']): Sample[] => {
  return samples.filter(s => s.status === status);
};

export const getSamplesByType = (type: Sample['type']): Sample[] => {
  return samples.filter(s => s.type === type);
};

export const getControlSamples = (): Sample[] => {
  return samples.filter(s => s.type === 'negative-control' || s.type === 'positive-control');
};

export const getAbnormalSamples = (): Sample[] => {
  return samples.filter(s => s.status !== 'normal');
};
