import { ReagentBatch, Candidate, AuditLog } from '@/types'

export const sampleReagentBatches: ReagentBatch[] = [
  { id: 'rb-001', batchNo: 'CR-2025-0301', reagentName: 'Cas9 核酸酶', supplier: 'Integrated DNA Technologies', receivedDate: '2025-03-01' },
  { id: 'rb-002', batchNo: 'CR-2025-0308', reagentName: 'sgRNA 合成试剂盒', supplier: 'Synthego', receivedDate: '2025-03-08' },
  { id: 'rb-003', batchNo: 'CR-2025-0315', reagentName: 'Cas9 核酸酶', supplier: 'Integrated DNA Technologies', receivedDate: '2025-03-15' },
  { id: 'rb-004', batchNo: 'CR-2025-0322', reagentName: 'HDR 供体模板', supplier: 'Twist Bioscience', receivedDate: '2025-03-22' },
  { id: 'rb-005', batchNo: 'CR-2025-0405', reagentName: 'Cas9 核酸酶', supplier: 'New England Biolabs', receivedDate: '2025-04-05' },
]

export const sampleCandidates: Candidate[] = [
  {
    id: 'c-001', sampleId: 'SMP-001', targetSite: 'chr17:7579472', offTargetSite: 'chr17:7579510',
    sequence: 'ATCGATCGATCGATCG', mismatchCount: 1, strand: '+', reagentBatchId: 'rb-001',
    negControlResult: 'normal', status: 'normal', processingOpinion: '脱靶风险低，继续实验',
    createdAt: '2025-03-05T09:12:00Z', updatedAt: '2025-03-05T09:12:00Z'
  },
  {
    id: 'c-002', sampleId: 'SMP-001', targetSite: 'chr17:7579472', offTargetSite: 'chr3:178921567',
    sequence: 'GCTAGCTAGCTAGCTA', mismatchCount: 3, strand: '-', reagentBatchId: 'rb-001',
    negControlResult: 'abnormal', status: 'anomaly', processingOpinion: '阴性对照异常，需复核',
    createdAt: '2025-03-05T09:15:00Z', updatedAt: '2025-03-06T14:30:00Z'
  },
  {
    id: 'c-003', sampleId: 'SMP-002', targetSite: 'chr11:108235560', offTargetSite: 'chr11:108235610',
    sequence: 'TTAACCGGTTAACCGG', mismatchCount: 2, strand: '+', reagentBatchId: 'rb-002',
    negControlResult: 'normal', status: 'normal', processingOpinion: '脱靶候选确认，低风险',
    createdAt: '2025-03-10T11:20:00Z', updatedAt: '2025-03-10T11:20:00Z'
  },
  {
    id: 'c-004', sampleId: 'SMP-002', targetSite: 'chr11:108235560', offTargetSite: 'chr5:65432100',
    sequence: 'CCGGAATTCCGGAATT', mismatchCount: 4, strand: '-', reagentBatchId: 'rb-002',
    negControlResult: 'abnormal', status: 'approved', processingOpinion: '阴性对照异常但实验条件可接受，复核通过',
    createdAt: '2025-03-10T11:25:00Z', updatedAt: '2025-03-12T16:45:00Z'
  },
  {
    id: 'c-005', sampleId: 'SMP-003', targetSite: 'chr1:156789012', offTargetSite: 'chr1:156789100',
    sequence: 'AATTAATTAATTAATT', mismatchCount: 1, strand: '+', reagentBatchId: 'rb-003',
    negControlResult: 'normal', status: 'normal', processingOpinion: '单错配脱靶，可忽略',
    createdAt: '2025-03-18T08:45:00Z', updatedAt: '2025-03-18T08:45:00Z'
  },
  {
    id: 'c-006', sampleId: 'SMP-003', targetSite: 'chr1:156789012', offTargetSite: 'chr9:98765432',
    sequence: 'GGCCTTAAGGCCTTAA', mismatchCount: 5, strand: '-', reagentBatchId: 'rb-003',
    negControlResult: 'abnormal', status: 'anomaly', processingOpinion: '高错配数+阴性对照异常，需重新实验',
    createdAt: '2025-03-18T08:50:00Z', updatedAt: '2025-03-19T10:15:00Z'
  },
  {
    id: 'c-007', sampleId: 'SMP-004', targetSite: 'chr7:55191822', offTargetSite: 'chr7:55191900',
    sequence: 'TCCGGAATTCCTTAAG', mismatchCount: 2, strand: '+', reagentBatchId: 'rb-004',
    negControlResult: 'pending', status: 'normal', processingOpinion: '待复核阴性对照结果',
    createdAt: '2025-03-25T13:00:00Z', updatedAt: '2025-03-25T13:00:00Z'
  },
  {
    id: 'c-008', sampleId: 'SMP-004', targetSite: 'chr7:55191822', offTargetSite: 'chr12:34567890',
    sequence: 'AACCGGTTAACCGGTT', mismatchCount: 3, strand: '-', reagentBatchId: 'rb-004',
    negControlResult: 'normal', status: 'normal', processingOpinion: '中等风险，需关注',
    createdAt: '2025-03-25T13:05:00Z', updatedAt: '2025-03-25T13:05:00Z'
  },
  {
    id: 'c-009', sampleId: 'SMP-005', targetSite: 'chr2:47632985', offTargetSite: 'chr2:47633050',
    sequence: 'ATATCGCGATATCGCG', mismatchCount: 1, strand: '+', reagentBatchId: 'rb-005',
    negControlResult: 'normal', status: 'normal', processingOpinion: '低风险脱靶',
    createdAt: '2025-04-07T10:30:00Z', updatedAt: '2025-04-07T10:30:00Z'
  },
  {
    id: 'c-010', sampleId: 'SMP-005', targetSite: 'chr2:47632985', offTargetSite: 'chr15:12345678',
    sequence: 'GCGCATATGCGCATAT', mismatchCount: 6, strand: '-', reagentBatchId: 'rb-005',
    negControlResult: 'abnormal', status: 'anomaly', processingOpinion: '极高错配数，建议丢弃该批次数据',
    createdAt: '2025-04-07T10:35:00Z', updatedAt: '2025-04-08T09:20:00Z'
  },
  {
    id: 'c-011', sampleId: 'SMP-006', targetSite: 'chr13:32316461', offTargetSite: 'chr13:32316520',
    sequence: 'TCGATCGATCGATCGA', mismatchCount: 2, strand: '+', reagentBatchId: 'rb-001',
    negControlResult: 'normal', status: 'normal', processingOpinion: '双错配脱靶，低风险',
    createdAt: '2025-03-06T14:00:00Z', updatedAt: '2025-03-06T14:00:00Z'
  },
  {
    id: 'c-012', sampleId: 'SMP-006', targetSite: 'chr13:32316461', offTargetSite: 'chr8:76543210',
    sequence: 'AGCTAGCTAGCTAGCT', mismatchCount: 3, strand: '-', reagentBatchId: 'rb-002',
    negControlResult: 'pending', status: 'normal', processingOpinion: '待确认对照结果',
    createdAt: '2025-03-11T09:30:00Z', updatedAt: '2025-03-11T09:30:00Z'
  },
]

export const sampleAuditLogs: AuditLog[] = [
  {
    id: 'al-001', candidateId: 'c-002', reagentBatchId: 'rb-001',
    operator: '李明', operatedAt: '2025-03-06T14:30:00Z',
    action: 'mark_anomaly', oldValue: 'status: normal', newValue: 'status: anomaly',
    reason: '阴性对照出现异常信号，与实验组信号重叠，需进一步验证试剂完整性'
  },
  {
    id: 'al-002', candidateId: 'c-004', reagentBatchId: 'rb-002',
    operator: '王芳', operatedAt: '2025-03-11T10:00:00Z',
    action: 'mark_anomaly', oldValue: 'status: normal', newValue: 'status: anomaly',
    reason: '阴性对照检测到非特异性扩增，怀疑试剂批次污染'
  },
  {
    id: 'al-003', candidateId: 'c-004', reagentBatchId: 'rb-002',
    operator: '张伟', operatedAt: '2025-03-12T16:45:00Z',
    action: 'approve_anomaly', oldValue: 'status: anomaly', newValue: 'status: approved',
    reason: '经复核，阴性对照异常源于模板残留而非试剂问题，实验条件可接受，允许继续'
  },
  {
    id: 'al-004', candidateId: 'c-006', reagentBatchId: 'rb-003',
    operator: '李明', operatedAt: '2025-03-19T10:15:00Z',
    action: 'mark_anomaly', oldValue: 'status: normal', newValue: 'status: anomaly',
    reason: '5处错配仍检测到切割信号，且阴性对照异常，Cas9活性可能异常偏高'
  },
  {
    id: 'al-005', candidateId: 'c-010', reagentBatchId: 'rb-005',
    operator: '赵静', operatedAt: '2025-04-08T09:20:00Z',
    action: 'mark_anomaly', oldValue: 'status: normal', newValue: 'status: anomaly',
    reason: '6处错配+阴性对照异常，数据可信度极低，建议丢弃该批次全部数据'
  },
  {
    id: 'al-006', candidateId: 'c-004', reagentBatchId: 'rb-002',
    operator: '王芳', operatedAt: '2025-03-12T16:40:00Z',
    action: 'modify_opinion', oldValue: '阴性对照异常，需复核', newValue: '阴性对照异常但实验条件可接受，复核通过',
    reason: '补充了模板残留验证实验，确认异常来源非试剂问题'
  },
]
