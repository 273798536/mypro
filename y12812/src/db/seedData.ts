import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { runTransaction, runQuery } from './database';
import { SampleStatus } from '../types';

export function checkAndSeedData(): void {
  const existingBatches = runQuery('SELECT COUNT(*) as count FROM batches');
  if (existingBatches[0].count > 0) {
    return;
  }

  const batchId = uuidv4();
  const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const operator = '系统初始化';

  const operations: Array<{ sql: string; params: any[] }> = [];

  operations.push({
    sql: `INSERT INTO batches (id, batch_no, name, created_at, created_by, status, remark)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params: [
      batchId,
      'BATCH-2026-001',
      '2026年夏季玉米种子发芽试验',
      now,
      operator,
      SampleStatus.STATISTICS_DONE,
      '示例数据 - 用于演示系统功能'
    ]
  });

  const sampleTemplates = [
    {
      barcode: 'SEED-001',
      groupName: '对照组',
      seedType: '玉米-郑单958',
      sowingDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      germinationDates: [
        dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
        dayjs().subtract(3, 'day').format('YYYY-MM-DD')
      ],
      totalSeeds: 100,
      germinatedSeeds: 92,
      germinationRate: 92.0,
      abnormal: false,
      qcPassed: true,
      status: SampleStatus.STATISTICS_DONE
    },
    {
      barcode: 'SEED-002',
      groupName: '对照组',
      seedType: '玉米-郑单958',
      sowingDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      germinationDates: [
        dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
        dayjs().subtract(3, 'day').format('YYYY-MM-DD')
      ],
      totalSeeds: 100,
      germinatedSeeds: 88,
      germinationRate: 88.0,
      abnormal: false,
      qcPassed: true,
      status: SampleStatus.STATISTICS_DONE
    },
    {
      barcode: 'SEED-003',
      groupName: '实验组A',
      seedType: '玉米-先玉335',
      sowingDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      germinationDates: [
        dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
        dayjs().subtract(3, 'day').format('YYYY-MM-DD')
      ],
      totalSeeds: 100,
      germinatedSeeds: 95,
      germinationRate: 95.0,
      abnormal: false,
      qcPassed: true,
      status: SampleStatus.STATISTICS_DONE
    },
    {
      barcode: 'SEED-004',
      groupName: '实验组A',
      seedType: '玉米-先玉335',
      sowingDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      germinationDates: [
        dayjs().subtract(5, 'day').format('YYYY-MM-DD')
      ],
      totalSeeds: 100,
      germinatedSeeds: 45,
      germinationRate: 45.0,
      abnormal: true,
      abnormalRemark: '发芽率异常偏低，第二次观察时间点缺失',
      qcPassed: true,
      pathologyRemark: '种子可能存在活力下降问题，建议做种子活力测定',
      handlingOpinion: '建议重新取样复测，如结果一致则判定该批次不合格',
      status: SampleStatus.PENDING_REVIEW
    },
    {
      barcode: 'SEED-005',
      groupName: '实验组B',
      seedType: '玉米-登海605',
      sowingDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
      germinationDates: [
        dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
        dayjs().subtract(3, 'day').format('YYYY-MM-DD')
      ],
      totalSeeds: 100,
      germinatedSeeds: 87,
      germinationRate: 87.0,
      abnormal: false,
      qcPassed: true,
      status: SampleStatus.STATISTICS_DONE
    },
    {
      barcode: 'SEED-006',
      groupName: '实验组B',
      seedType: '玉米-登海605',
      sowingDate: undefined,
      germinationDates: [],
      totalSeeds: 100,
      germinatedSeeds: 0,
      germinationRate: 0,
      abnormal: true,
      abnormalRemark: '播种时间缺失，无发芽记录',
      qcPassed: false,
      qcRemark: '时间点缺失，需要复核确认',
      status: SampleStatus.PENDING_REVIEW
    }
  ];

  for (const template of sampleTemplates) {
    const sampleId = uuidv4();
    operations.push({
      sql: `INSERT INTO samples (
        id, batch_id, barcode, group_name, seed_type, sowing_date, germination_dates,
        total_seeds, germinated_seeds, germination_rate, status, qc_passed, qc_remark,
        abnormal, abnormal_remark, pathology_remark, handling_opinion, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        sampleId,
        batchId,
        template.barcode,
        template.groupName,
        template.seedType,
        template.sowingDate || null,
        JSON.stringify(template.germinationDates),
        template.totalSeeds,
        template.germinatedSeeds,
        template.germinationRate,
        template.status,
        template.qcPassed ? 1 : 0,
        template.qcRemark || null,
        template.abnormal ? 1 : 0,
        template.abnormalRemark || null,
        template.pathologyRemark || null,
        template.handlingOpinion || null,
        now,
        now
      ]
    });

    const recordId1 = uuidv4();
    operations.push({
      sql: `INSERT INTO processing_records (
        id, sample_id, batch_id, record_type, operator, operation_time,
        old_value, new_value, remark, shared
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        recordId1,
        sampleId,
        batchId,
        'qc',
        '检验师-张三',
        dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
        null,
        template.qcPassed ? '通过' : '不通过',
        '质控检查',
        1
      ]
    });

    if (template.abnormal) {
      const recordId2 = uuidv4();
      operations.push({
        sql: `INSERT INTO processing_records (
          id, sample_id, batch_id, record_type, operator, operation_time,
          old_value, new_value, remark, shared
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          recordId2,
          sampleId,
          batchId,
          'review',
          '主管-李四',
          dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
          'pending',
          'pending_review',
          '标记为异常，待复核',
          1
        ]
      });
    }

    const auditId = uuidv4();
    operations.push({
      sql: `INSERT INTO audit_logs (
        id, sample_id, batch_id, operation, operator, operate_time,
        field_name, old_value, new_value, reason, ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        auditId,
        sampleId,
        batchId,
        '导入样本',
        operator,
        now,
        null,
        null,
        null,
        '系统初始化示例数据',
        '127.0.0.1'
      ]
    });
  }

  const transitionId = uuidv4();
  operations.push({
    sql: `INSERT INTO status_transitions (
      id, batch_id, sample_id, from_status, to_status,
      operator, transition_time, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      transitionId,
      batchId,
      null,
      SampleStatus.IMPORTED,
      SampleStatus.STATISTICS_DONE,
      operator,
      now,
      '示例数据批量状态推进'
    ]
  });

  runTransaction(operations);
}
