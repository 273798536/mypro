import type { Lineage, LineageNode } from '../types';

const lineages: Record<string, Lineage> = {
  'sm-001': {
    sampleId: 'sm-001',
    nodes: [
      {
        id: 'node-001-1',
        name: '样本采集',
        type: 'sample-collection',
        timestamp: '2024-03-15T08:30:00Z',
        operator: '李护士',
        status: 'completed',
        notes: '新鲜粪便样本，采集后立即冷藏',
        metadata: {
          collectionMethod: '无菌便盒',
          storageTemperature: 4
        }
      },
      {
        id: 'node-001-2',
        name: 'DNA提取',
        type: 'dna-extraction',
        timestamp: '2024-03-15T14:20:00Z',
        operator: '王技师',
        status: 'completed',
        notes: '使用Qiagen QIAamp PowerFecal Pro试剂盒',
        metadata: {
          kit: 'QIAamp PowerFecal Pro',
          dnaYield: 25.6,
          dnaConcentration: 128
        }
      },
      {
        id: 'node-001-3',
        name: '文库制备',
        type: 'library-prep',
        timestamp: '2024-03-16T10:15:00Z',
        operator: '张技师',
        status: 'completed',
        notes: '16S rRNA基因文库，V3-V4区',
        metadata: {
          targetRegion: 'V3-V4',
          libraryConcentration: 45,
          insertSize: 450
        }
      },
      {
        id: 'node-001-4',
        name: '测序',
        type: 'sequencing',
        timestamp: '2024-03-18T06:00:00Z',
        operator: '测序组',
        status: 'completed',
        notes: 'Illumina NovaSeq 6000，PE250',
        metadata: {
          sequencer: 'NovaSeq 6000',
          readMode: 'PE250',
          totalReads: 12500000
        }
      },
      {
        id: 'node-001-5',
        name: '数据分析',
        type: 'analysis',
        timestamp: '2024-03-19T11:30:00Z',
        operator: '生物信息组',
        status: 'completed',
        notes: '使用QIIME2进行分析',
        metadata: {
          pipeline: 'QIIME2',
          version: '2023.7',
          classifiedReads: 11200000
        }
      },
      {
        id: 'node-001-6',
        name: '质控检查',
        type: 'qc',
        timestamp: '2024-03-20T09:45:00Z',
        operator: '李主任',
        status: 'completed',
        notes: '质量合格，数据可用',
        metadata: {
          q30: 92.5,
          mappingRate: 89.6,
          overallStatus: 'pass'
        }
      }
    ]
  },
  'sm-006': {
    sampleId: 'sm-006',
    nodes: [
      {
        id: 'node-006-1',
        name: '样本采集',
        type: 'sample-collection',
        timestamp: '2024-03-12T10:00:00Z',
        operator: '赵护士',
        status: 'completed',
        notes: '样本采集后未及时冷藏',
        metadata: {
          collectionMethod: '无菌便盒',
          storageTemperature: 25
        }
      },
      {
        id: 'node-006-2',
        name: 'DNA提取',
        type: 'dna-extraction',
        timestamp: '2024-03-20T09:15:00Z',
        operator: '王技师',
        status: 'completed',
        notes: 'DNA产量低，可能存在降解',
        metadata: {
          kit: 'QIAamp PowerFecal Pro',
          dnaYield: 3.2,
          dnaConcentration: 16
        }
      },
      {
        id: 'node-006-3',
        name: '文库制备',
        type: 'library-prep',
        timestamp: '2024-03-21T14:30:00Z',
        operator: '张技师',
        status: 'completed',
        notes: '文库浓度低，需增加PCR循环数',
        metadata: {
          targetRegion: 'V3-V4',
          libraryConcentration: 8,
          pcrCycles: 35
        }
      },
      {
        id: 'node-006-4',
        name: '测序',
        type: 'sequencing',
        timestamp: '2024-03-23T08:00:00Z',
        operator: '测序组',
        status: 'completed',
        notes: '测序数据质量差',
        metadata: {
          sequencer: 'NovaSeq 6000',
          readMode: 'PE250',
          totalReads: 1200000
        }
      },
      {
        id: 'node-006-5',
        name: '数据分析',
        type: 'analysis',
        timestamp: '2024-03-24T10:20:00Z',
        operator: '生物信息组',
        status: 'completed',
        notes: '数据质量差，分析结果可靠性低',
        metadata: {
          pipeline: 'QIIME2',
          version: '2023.7',
          classifiedReads: 680000
        }
      },
      {
        id: 'node-006-6',
        name: '质控检查',
        type: 'qc',
        timestamp: '2024-03-24T15:40:00Z',
        operator: '李主任',
        status: 'failed',
        notes: '样本质量不合格，建议重新采样',
        metadata: {
          q30: 62.3,
          mappingRate: 56.7,
          overallStatus: 'fail'
        }
      }
    ]
  },
  'sm-007': {
    sampleId: 'sm-007',
    nodes: [
      {
        id: 'node-007-1',
        name: '样本采集',
        type: 'sample-collection',
        timestamp: '2024-03-14T11:30:00Z',
        operator: '刘护士',
        status: 'completed',
        notes: '静脉采血，无菌操作',
        metadata: {
          collectionMethod: '静脉穿刺',
          volume: 5
        }
      },
      {
        id: 'node-007-2',
        name: 'DNA提取',
        type: 'dna-extraction',
        timestamp: '2024-03-14T16:45:00Z',
        operator: '王技师',
        status: 'completed',
        notes: '使用血液DNA提取试剂盒',
        metadata: {
          kit: 'QIAamp DNA Blood Mini',
          dnaYield: 12.8,
          dnaConcentration: 64
        }
      },
      {
        id: 'node-007-3',
        name: '文库制备',
        type: 'library-prep',
        timestamp: '2024-03-22T09:20:00Z',
        operator: '张技师',
        status: 'completed',
        notes: '16S rRNA基因文库',
        metadata: {
          targetRegion: 'V3-V4',
          libraryConcentration: 32
        }
      },
      {
        id: 'node-007-4',
        name: '测序',
        type: 'sequencing',
        timestamp: '2024-03-24T06:30:00Z',
        operator: '测序组',
        status: 'completed',
        notes: '测序完成',
        metadata: {
          sequencer: 'NovaSeq 6000',
          totalReads: 8900000
        }
      },
      {
        id: 'node-007-5',
        name: '数据分析',
        type: 'analysis',
        timestamp: '2024-03-25T13:10:00Z',
        operator: '生物信息组',
        status: 'completed',
        notes: '检测到皮肤菌群污染',
        metadata: {
          pipeline: 'QIIME2',
          contaminationRate: 28.7
        }
      },
      {
        id: 'node-007-6',
        name: '质控检查',
        type: 'qc',
        timestamp: '2024-03-27T10:30:00Z',
        operator: '李主任',
        status: 'failed',
        notes: '样本存在污染，结果仅供参考',
        metadata: {
          q30: 88.5,
          overallStatus: 'fail',
          contaminationLevel: 'high'
        }
      }
    ]
  },
  'sm-008': {
    sampleId: 'sm-008',
    parentSampleId: 'sm-007',
    derivationMethod: '同时处理的阴性对照',
    nodes: [
      {
        id: 'node-008-1',
        name: '试剂准备',
        type: 'sample-collection',
        timestamp: '2024-03-19T08:00:00Z',
        operator: '王技师',
        status: 'completed',
        notes: 'DNA提取试剂作为阴性对照',
        metadata: {
          controlType: 'reagent-control',
          lotNumber: 'RGT-202403'
        }
      },
      {
        id: 'node-008-2',
        name: 'DNA提取',
        type: 'dna-extraction',
        timestamp: '2024-03-19T10:30:00Z',
        operator: '王技师',
        status: 'completed',
        notes: '与样本sm-007同批次提取',
        metadata: {
          batchId: 'BATCH-2024-03-19'
        }
      },
      {
        id: 'node-008-3',
        name: '文库制备',
        type: 'library-prep',
        timestamp: '2024-03-22T14:00:00Z',
        operator: '张技师',
        status: 'completed',
        notes: '与样本同时制备文库',
        metadata: {
          libraryConcentration: 15
        }
      },
      {
        id: 'node-008-4',
        name: '测序',
        type: 'sequencing',
        timestamp: '2024-03-25T06:30:00Z',
        operator: '测序组',
        status: 'completed',
        notes: '同lane测序',
        metadata: {
          totalReads: 3500000
        }
      },
      {
        id: 'node-008-5',
        name: '数据分析',
        type: 'analysis',
        timestamp: '2024-03-26T09:15:00Z',
        operator: '生物信息组',
        status: 'completed',
        notes: '检测到大肠杆菌信号，疑为试剂污染',
        metadata: {
          contaminationSignal: 5.2
        }
      },
      {
        id: 'node-008-6',
        name: '质控检查',
        type: 'qc',
        timestamp: '2024-03-26T14:30:00Z',
        operator: '李主任',
        status: 'failed',
        notes: '阴性对照异常，提示试剂污染',
        metadata: {
          q30: 91.8,
          overallStatus: 'fail',
          abnormalType: 'contamination'
        }
      }
    ]
  },
  'sm-012': {
    sampleId: 'sm-012',
    nodes: [
      {
        id: 'node-012-1',
        name: '模拟群落制备',
        type: 'sample-collection',
        timestamp: '2024-03-22T10:00:00Z',
        operator: '质控组',
        status: 'completed',
        notes: '已知组成的模拟微生物群落',
        metadata: {
          controlType: 'mock-community',
          expectedSpecies: 8
        }
      },
      {
        id: 'node-012-2',
        name: 'DNA提取',
        type: 'dna-extraction',
        timestamp: '2024-03-23T09:00:00Z',
        operator: '王技师',
        status: 'completed',
        notes: '标准流程提取',
        metadata: {
          dnaYield: 20.5,
          dnaConcentration: 102.5
        }
      },
      {
        id: 'node-012-3',
        name: '文库制备',
        type: 'library-prep',
        timestamp: '2024-03-26T11:30:00Z',
        operator: '张技师',
        status: 'completed',
        notes: '标准文库制备',
        metadata: {
          targetRegion: 'V3-V4',
          libraryConcentration: 52
        }
      },
      {
        id: 'node-012-4',
        name: '测序',
        type: 'sequencing',
        timestamp: '2024-03-29T06:00:00Z',
        operator: '测序组',
        status: 'completed',
        notes: '测序质量良好',
        metadata: {
          totalReads: 10500000,
          q30: 92.8
        }
      },
      {
        id: 'node-012-5',
        name: '数据分析',
        type: 'analysis',
        timestamp: '2024-03-30T14:20:00Z',
        operator: '生物信息组',
        status: 'completed',
        notes: '分析结果与预期组成一致',
        metadata: {
          accuracy: 95.2
        }
      },
      {
        id: 'node-012-6',
        name: '质控检查',
        type: 'qc',
        timestamp: '2024-03-31T09:45:00Z',
        operator: '李主任',
        status: 'completed',
        notes: '阳性对照合格，可作为参考',
        metadata: {
          overallStatus: 'pass'
        }
      }
    ]
  }
};

export const lineageList: Lineage[] = Object.values(lineages);

export const getLineageBySample = (sampleId: string): Lineage | undefined => {
  return lineages[sampleId];
};

export const getLineageNode = (sampleId: string, nodeId: string): LineageNode | undefined => {
  const lineage = lineages[sampleId];
  return lineage?.nodes.find(n => n.id === nodeId);
};

export const getLineagesByNodeType = (type: LineageNode['type']): Lineage[] => {
  return Object.values(lineages).filter(l => l.nodes.some(n => n.type === type));
};

export const getFailedLineages = (): Lineage[] => {
  return Object.values(lineages).filter(l => 
    l.nodes.some(n => n.status === 'failed')
  );
};

export const getRelatedSamples = (sampleId: string): Lineage[] => {
  const lineage = lineages[sampleId];
  if (!lineage?.parentSampleId) return [];
  return Object.values(lineages).filter(l => 
    l.parentSampleId === lineage.parentSampleId || 
    l.sampleId === lineage.parentSampleId
  );
};
