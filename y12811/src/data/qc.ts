import type { QCData } from '../types';

export const qcDataList: QCData[] = [
  {
    sampleId: 'sm-001',
    totalReads: 12500000,
    mappedReads: 11200000,
    mappingRate: 89.6,
    q30: 92.5,
    gcContent: 45.2,
    duplicationRate: 12.3,
    adapterContent: 0.8,
    overallStatus: 'pass',
    warnings: []
  },
  {
    sampleId: 'sm-002',
    totalReads: 11800000,
    mappedReads: 10500000,
    mappingRate: 88.98,
    q30: 91.2,
    gcContent: 47.8,
    duplicationRate: 15.6,
    adapterContent: 1.2,
    overallStatus: 'pass',
    warnings: ['duplication_rate_near_threshold']
  },
  {
    sampleId: 'sm-003',
    totalReads: 15200000,
    mappedReads: 13800000,
    mappingRate: 90.79,
    q30: 90.8,
    gcContent: 52.3,
    duplicationRate: 8.5,
    adapterContent: 0.5,
    overallStatus: 'pass',
    warnings: []
  },
  {
    sampleId: 'sm-004',
    totalReads: 5600000,
    mappedReads: 4800000,
    mappingRate: 85.71,
    q30: 89.7,
    gcContent: 48.6,
    duplicationRate: 18.2,
    adapterContent: 2.1,
    overallStatus: 'warning',
    warnings: ['low_read_count', 'high_duplication_rate']
  },
  {
    sampleId: 'sm-005',
    totalReads: 2100000,
    mappedReads: 120000,
    mappingRate: 5.71,
    q30: 93.1,
    gcContent: 42.1,
    duplicationRate: 2.5,
    adapterContent: 0.3,
    overallStatus: 'pass',
    warnings: ['low_total_reads_normal_for_control']
  },
  {
    sampleId: 'sm-006',
    totalReads: 1200000,
    mappedReads: 680000,
    mappingRate: 56.67,
    q30: 62.3,
    gcContent: 50.2,
    duplicationRate: 35.8,
    adapterContent: 8.5,
    overallStatus: 'fail',
    warnings: [
      'very_low_read_count',
      'very_low_q30',
      'low_mapping_rate',
      'high_duplication_rate',
      'high_adapter_content'
    ],
    contaminationLevel: 5.2
  },
  {
    sampleId: 'sm-007',
    totalReads: 8900000,
    mappedReads: 7800000,
    mappingRate: 87.64,
    q30: 88.5,
    gcContent: 46.8,
    duplicationRate: 14.3,
    adapterContent: 1.8,
    overallStatus: 'fail',
    warnings: ['sample_contamination', 'skin_microbiome_signal'],
    contaminationLevel: 28.7
  },
  {
    sampleId: 'sm-008',
    totalReads: 3500000,
    mappedReads: 180000,
    mappingRate: 5.14,
    q30: 91.8,
    gcContent: 44.5,
    duplicationRate: 3.2,
    adapterContent: 0.4,
    overallStatus: 'fail',
    warnings: ['negative_control_abnormal', 'ecoli_signal_detected', 'reagent_contamination_suspected'],
    contaminationLevel: 5.2
  },
  {
    sampleId: 'sm-009',
    totalReads: 4200000,
    mappedReads: 3600000,
    mappingRate: 85.71,
    q30: 90.2,
    gcContent: 47.5,
    duplicationRate: 16.8,
    adapterContent: 1.5,
    overallStatus: 'warning',
    warnings: ['low_read_count']
  },
  {
    sampleId: 'sm-010',
    totalReads: 6800000,
    mappedReads: 6100000,
    mappingRate: 89.71,
    q30: 91.5,
    gcContent: 43.2,
    duplicationRate: 11.5,
    adapterContent: 0.9,
    overallStatus: 'pass',
    warnings: []
  },
  {
    sampleId: 'sm-011',
    totalReads: 850000,
    mappedReads: 320000,
    mappingRate: 37.65,
    q30: 55.7,
    gcContent: 51.8,
    duplicationRate: 42.3,
    adapterContent: 12.8,
    overallStatus: 'fail',
    warnings: [
      'extremely_low_read_count',
      'extremely_low_q30',
      'very_low_mapping_rate',
      'very_high_duplication_rate',
      'very_high_adapter_content',
      'sample_degradation_suspected'
    ],
    contaminationLevel: 8.5
  },
  {
    sampleId: 'sm-012',
    totalReads: 10500000,
    mappedReads: 9800000,
    mappingRate: 93.33,
    q30: 92.8,
    gcContent: 46.5,
    duplicationRate: 6.8,
    adapterContent: 0.4,
    overallStatus: 'pass',
    warnings: ['positive_control_expected_composition']
  },
  {
    sampleId: 'sm-013',
    totalReads: 18300000,
    mappedReads: 16500000,
    mappingRate: 90.16,
    q30: 89.3,
    gcContent: 55.2,
    duplicationRate: 9.2,
    adapterContent: 0.7,
    overallStatus: 'pass',
    warnings: ['high_gc_content_environmental_sample']
  },
  {
    sampleId: 'sm-014',
    totalReads: 3200000,
    mappedReads: 2600000,
    mappingRate: 81.25,
    q30: 87.6,
    gcContent: 48.9,
    duplicationRate: 19.5,
    adapterContent: 2.3,
    overallStatus: 'warning',
    warnings: ['low_read_count', 'low_mapping_rate', 'abnormal_pathogen_signal', 'pending_review']
  },
  {
    sampleId: 'sm-015',
    totalReads: 1800000,
    mappedReads: 95000,
    mappingRate: 5.28,
    q30: 90.5,
    gcContent: 45.8,
    duplicationRate: 2.8,
    adapterContent: 0.5,
    overallStatus: 'fail',
    warnings: ['negative_control_abnormal', 'staph_contamination_detected', 'collection_device_contamination_suspected'],
    contaminationLevel: 3.8
  }
];

export const getQCBySample = (sampleId: string): QCData | undefined => {
  return qcDataList.find(q => q.sampleId === sampleId);
};

export const getQCPassedSamples = (): QCData[] => {
  return qcDataList.filter(q => q.overallStatus === 'pass');
};

export const getQCWarningSamples = (): QCData[] => {
  return qcDataList.filter(q => q.overallStatus === 'warning');
};

export const getQCFailedSamples = (): QCData[] => {
  return qcDataList.filter(q => q.overallStatus === 'fail');
};

export const getContaminatedSamples = (): QCData[] => {
  return qcDataList.filter(q => q.contaminationLevel !== undefined && q.contaminationLevel > 5);
};

export const getQCSummary = () => {
  const total = qcDataList.length;
  const passed = getQCPassedSamples().length;
  const warning = getQCWarningSamples().length;
  const failed = getQCFailedSamples().length;
  const avgQ30 = qcDataList.reduce((sum, q) => sum + q.q30, 0) / total;
  const avgMappingRate = qcDataList.reduce((sum, q) => sum + q.mappingRate, 0) / total;
  
  return {
    total,
    passed,
    warning,
    failed,
    passRate: Math.round((passed / total) * 100) / 100,
    avgQ30: Math.round(avgQ30 * 100) / 100,
    avgMappingRate: Math.round(avgMappingRate * 100) / 100
  };
};
