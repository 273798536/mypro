import { Router, Request, Response } from 'express';
import { SampleRepository } from '../repositories/SampleRepository';
import { BatchRepository } from '../repositories/BatchRepository';
import { StatisticsRepository } from '../repositories/StatisticsRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SampleStatus } from '../types';

const router = Router();

router.get('/group/:batchId', (req: Request, res: Response) => {
  try {
    const groupStats = StatisticsRepository.calculateGroupStatistics(req.params.batchId);
    const processingRecords = ProcessingRecordRepository.findByBatchId(req.params.batchId, 'statistics');

    res.json({
      data: {
        groupStatistics: groupStats,
        processingRecords,
        dataSource: 'shared_processing_records'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/overall/:batchId', (req: Request, res: Response) => {
  try {
    const overallStats = StatisticsRepository.calculateOverallStatistics(req.params.batchId);
    const processingRecords = ProcessingRecordRepository.findByBatchId(req.params.batchId, 'statistics');

    res.json({
      data: {
        ...overallStats,
        processingRecords,
        dataSource: 'shared_processing_records'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/seed-type/:batchId', (req: Request, res: Response) => {
  try {
    const seedTypeStats = StatisticsRepository.getStatisticsBySeedType(req.params.batchId);
    res.json({ data: seedTypeStats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/time-point-completeness/:batchId', (req: Request, res: Response) => {
  try {
    const completeness = StatisticsRepository.getTimePointCompleteness(req.params.batchId);
    const missingSamples = SampleRepository.findAbnormal(req.params.batchId)
      .filter(s => !s.sowingDate || !s.germinationDates || s.germinationDates.length === 0);

    res.json({
      data: {
        completeness,
        missingTimePointSamples: missingSamples.map(s => ({
          id: s.id,
          barcode: s.barcode,
          groupName: s.groupName,
          seedType: s.seedType,
          missingSowingDate: !s.sowingDate,
          missingGerminationDates: !s.germinationDates || s.germinationDates.length === 0,
          abnormalRemark: s.abnormalRemark,
          status: s.status
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/calculate/:batchId', (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { operator } = req.body;

    if (!operator) {
      return res.status(400).json({ error: '请提供操作人' });
    }

    const batch = BatchRepository.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const samples = SampleRepository.findByBatchId(batchId);
    const notPassedSamples = samples.filter(s => s.status !== SampleStatus.QC_PASSED && s.status !== SampleStatus.STATISTICS_DONE);
    if (notPassedSamples.length > 0) {
      return res.status(400).json({
        error: `尚有 ${notPassedSamples.length} 条样本未通过质控，无法进行统计`,
        notPassedCount: notPassedSamples.length
      });
    }

    const groupStats = StatisticsRepository.calculateGroupStatistics(batchId);
    const overallStats = StatisticsRepository.calculateOverallStatistics(batchId);

    for (const stat of groupStats) {
      const groupSamples = samples.filter(s => s.groupName === stat.groupName);
      for (const sample of groupSamples) {
        ProcessingRecordRepository.create({
          sampleId: sample.id,
          batchId,
          recordType: 'statistics',
          operator,
          newValue: `分组统计: ${stat.groupName}, 平均发芽率: ${stat.avgGerminationRate}%`,
          remark: `分组统计完成`,
          shared: true
        });
      }
    }

    for (const sample of samples) {
      SampleRepository.updateStatus(sample.id, SampleStatus.STATISTICS_DONE, operator, '统计完成');
    }

    BatchRepository.updateStatus(batchId, SampleStatus.STATISTICS_DONE, operator, '统计分析完成');

    AuditLogRepository.create({
      batchId,
      operation: '统计分析',
      operator,
      fieldName: 'status',
      oldValue: batch.status,
      newValue: SampleStatus.STATISTICS_DONE,
      reason: '完成分组统计和整体统计'
    });

    res.json({
      data: {
        groupStatistics: groupStats,
        overallStatistics: overallStats,
        message: '统计分析完成，质控和统计共用同一批处理记录'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/abnormal/:batchId', (req: Request, res: Response) => {
  try {
    const abnormalSamples = SampleRepository.findAbnormal(req.params.batchId);

    const detailedAbnormals = abnormalSamples.map(sample => {
      const auditLogs = AuditLogRepository.findBySampleId(sample.id);
      const processingRecords = ProcessingRecordRepository.findBySampleId(sample.id, true);

      return {
        sample,
        auditLogs,
        processingRecords,
        pathologyRemark: sample.pathologyRemark,
        handlingOpinion: sample.handlingOpinion
      };
    });

    res.json({ data: detailedAbnormals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
