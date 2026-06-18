import type { ArchiveRecord } from '@/types';

export const mockArchiveRecords: ArchiveRecord[] = [
  {
    id: 'rec_001',
    batchNumber: 'BATCH-2026-0618-001',
    runTimestamp: '2026-06-18T08:00:00Z',
    tableName: 'order_backup_2026_001',
    status: 'success',
    anomalyType: 'none',
    expectedCount: 150000,
    actualCount: 150000,
    pageSequence: [1, 2, 3, 4, 5],
    pageSequenceValid: true,
    createdAt: '2026-06-18T08:00:00Z',
    updatedAt: '2026-06-18T08:15:22Z',
    source: [
      {
        id: 'src_001',
        sourceType: 'full_backup',
        sourcePath: '/backup/order/full/20260617.bak',
        recordCount: 120000,
        timestamp: '2026-06-17T22:00:00Z',
        pageNumber: 1,
      },
      {
        id: 'src_002',
        sourceType: 'incremental_backup',
        sourcePath: '/backup/order/incr/20260618_0000.bak',
        recordCount: 15000,
        timestamp: '2026-06-18T00:00:00Z',
        pageNumber: 2,
      },
      {
        id: 'src_003',
        sourceType: 'incremental_backup',
        sourcePath: '/backup/order/incr/20260618_0400.bak',
        recordCount: 10000,
        timestamp: '2026-06-18T04:00:00Z',
        pageNumber: 3,
      },
      {
        id: 'src_004',
        sourceType: 'incremental_backup',
        sourcePath: '/backup/order/incr/20260618_0800.bak',
        recordCount: 5000,
        timestamp: '2026-06-18T08:00:00Z',
        pageNumber: 4,
      },
    ],
    backupGaps: [],
    processingNotes: [
      {
        id: 'note_001',
        type: 'system',
        content: '全量备份完整，增量备份连续，分页顺序正确。预期记录数150,000，实际150,000，数据一致性校验通过。',
        source: 'System-Detector-v2.1',
        createdAt: '2026-06-18T08:15:22Z',
      },
    ],
    slowQueryLogs: [],
    auditLogs: [
      {
        id: 'audit_001',
        action: 'IMPORT',
        operator: 'system',
        timestamp: '2026-06-18T08:00:00Z',
        detail: '导入归档记录 order_backup_2026_001',
      },
      {
        id: 'audit_002',
        action: 'ANOMALY_DETECT',
        operator: 'system',
        timestamp: '2026-06-18T08:10:00Z',
        detail: '异常检测完成，状态：顺利',
      },
    ],
    exportBatches: [],
  },
  {
    id: 'rec_002',
    batchNumber: 'BATCH-2026-0618-002',
    runTimestamp: '2026-06-18T09:30:00Z',
    tableName: 'user_log_2026_002',
    status: 'pending',
    anomalyType: 'page_sequence',
    expectedCount: 85000,
    actualCount: 84987,
    pageSequence: [1, 2, 4, 5],
    pageSequenceValid: false,
    createdAt: '2026-06-18T09:30:00Z',
    updatedAt: '2026-06-18T09:45:10Z',
    source: [
      {
        id: 'src_005',
        sourceType: 'binlog',
        sourcePath: '/mysql/binlog/mysql-bin.000123',
        recordCount: 30000,
        timestamp: '2026-06-17T20:00:00Z',
        pageNumber: 1,
      },
      {
        id: 'src_006',
        sourceType: 'binlog',
        sourcePath: '/mysql/binlog/mysql-bin.000124',
        recordCount: 25000,
        timestamp: '2026-06-18T00:00:00Z',
        pageNumber: 2,
      },
      {
        id: 'src_007',
        sourceType: 'binlog',
        sourcePath: '/mysql/binlog/mysql-bin.000126',
        recordCount: 17987,
        timestamp: '2026-06-18T08:00:00Z',
        pageNumber: 4,
      },
      {
        id: 'src_008',
        sourceType: 'binlog',
        sourcePath: '/mysql/binlog/mysql-bin.000127',
        recordCount: 12000,
        timestamp: '2026-06-18T09:00:00Z',
        pageNumber: 5,
      },
    ],
    backupGaps: [],
    processingNotes: [
      {
        id: 'note_002',
        type: 'system',
        content: '分页顺序异常：检测到分页序列 [1, 2, 4, 5]，缺少第3页。预期记录数85,000，实际84,987，缺失13条记录。请检查 mysql-bin.000125 是否存在或补录慢查询日志。',
        source: 'System-Detector-v2.1',
        createdAt: '2026-06-18T09:45:10Z',
      },
    ],
    slowQueryLogs: [],
    auditLogs: [
      {
        id: 'audit_003',
        action: 'IMPORT',
        operator: 'system',
        timestamp: '2026-06-18T09:30:00Z',
        detail: '导入归档记录 user_log_2026_002',
      },
      {
        id: 'audit_004',
        action: 'ANOMALY_DETECT',
        operator: 'system',
        timestamp: '2026-06-18T09:45:10Z',
        detail: '异常检测完成，状态：待确认，类型：分页顺序异常',
      },
    ],
    exportBatches: [],
  },
  {
    id: 'rec_003',
    batchNumber: 'BATCH-2026-0618-003',
    runTimestamp: '2026-06-18T10:15:00Z',
    tableName: 'payments_2026_003',
    status: 'error',
    anomalyType: 'backup_gap',
    expectedCount: 98000,
    actualCount: 97853,
    pageSequence: [1, 2, 3],
    pageSequenceValid: true,
    createdAt: '2026-06-18T10:15:00Z',
    updatedAt: '2026-06-18T10:35:45Z',
    source: [
      {
        id: 'src_009',
        sourceType: 'full_backup',
        sourcePath: '/backup/payments/full/20260614.bak',
        recordCount: 80000,
        timestamp: '2026-06-14T22:00:00Z',
        pageNumber: 1,
      },
      {
        id: 'src_010',
        sourceType: 'incremental_backup',
        sourcePath: '/backup/payments/incr/20260615_0000.bak',
        recordCount: 10353,
        timestamp: '2026-06-15T00:00:00Z',
        pageNumber: 2,
      },
      {
        id: 'src_011',
        sourceType: 'incremental_backup',
        sourcePath: '/backup/payments/incr/20260615_0600.bak',
        recordCount: 7500,
        timestamp: '2026-06-15T06:00:00Z',
        pageNumber: 3,
      },
    ],
    backupGaps: [
      {
        id: 'gap_001',
        gapStart: '2026-06-15T02:00:00Z',
        gapEnd: '2026-06-15T04:00:00Z',
        missingCount: 147,
        sourceTable: 'payments',
        impactLevel: 'high',
        expectedCount: 500,
        actualCount: 353,
        detailRecords: [
          {
            id: 'd1',
            timeSlot: '02:00-02:30',
            expected: 150,
            actual: 150,
            delta: 0,
            explanation: '正常',
          },
          {
            id: 'd2',
            timeSlot: '02:30-03:00',
            expected: 150,
            actual: 87,
            delta: -63,
            explanation: '存在63条记录缺口，疑似存储节点10.0.1.23在02:45-02:55期间网络中断',
          },
          {
            id: 'd3',
            timeSlot: '03:00-03:30',
            expected: 100,
            actual: 16,
            delta: -84,
            explanation: '存在84条记录缺口，存储节点10.0.1.23仍未恢复，主从切换耗时约15分钟',
          },
          {
            id: 'd4',
            timeSlot: '03:30-04:00',
            expected: 100,
            actual: 100,
            delta: 0,
            explanation: '正常',
          },
        ],
      },
    ],
    processingNotes: [
      {
        id: 'note_003',
        type: 'system',
        content: '备份缺口检测：2026-06-15 02:00-04:00 期间存在147条支付记录缺失。缺口分布在02:30-03:30时段，对应存储节点10.0.1.23网络中断事件。建议：1) 检查节点10.0.1.23的binlog是否完好；2) 从备库同步缺失时段数据；3) 补录后重新归档。此记录已被拦截，禁止迁移。',
        source: 'System-Detector-v2.1',
        createdAt: '2026-06-18T10:35:45Z',
      },
      {
        id: 'note_004',
        type: 'manual',
        content: '已确认为高优先级问题，联系运维团队核查存储节点10.0.1.23的故障日志。',
        source: 'DBA-ZhangSan',
        createdAt: '2026-06-18T11:00:00Z',
      },
    ],
    slowQueryLogs: [],
    auditLogs: [
      {
        id: 'audit_005',
        action: 'IMPORT',
        operator: 'system',
        timestamp: '2026-06-18T10:15:00Z',
        detail: '导入归档记录 payments_2026_003',
      },
      {
        id: 'audit_006',
        action: 'ANOMALY_DETECT',
        operator: 'system',
        timestamp: '2026-06-18T10:35:45Z',
        detail: '异常检测完成，状态：异常，类型：备份缺口，缺失147条记录',
      },
      {
        id: 'audit_007',
        action: 'BLOCK_MIGRATION',
        operator: 'system',
        timestamp: '2026-06-18T10:35:46Z',
        detail: '已拦截迁移，原因：备份缺口高风险',
      },
      {
        id: 'audit_008',
        action: 'ADD_NOTE',
        operator: 'DBA-ZhangSan',
        timestamp: '2026-06-18T11:00:00Z',
        detail: '添加人工备注：已确认为高优先级问题',
      },
    ],
    exportBatches: [
      {
        id: 'export_001',
        batchNumber: 'EXPORT-2026-0618-001',
        exportTime: '2026-06-18T10:40:00Z',
        operator: 'DBA-ZhangSan',
        format: 'csv',
      },
    ],
  },
];

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

export function getMissingCount(record: ArchiveRecord): number {
  return record.expectedCount - record.actualCount;
}
