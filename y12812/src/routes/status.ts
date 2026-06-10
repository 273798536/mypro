import { Router, Request, Response } from 'express';
import { SampleRepository } from '../repositories/SampleRepository';
import { BatchRepository } from '../repositories/BatchRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SampleStatus } from '../types';

const router = Router();

const VALID_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  [SampleStatus.IMPORTED]: [SampleStatus.PENDING_REVIEW, SampleStatus.QC_PASSED, SampleStatus.QC_FAILED],
  [SampleStatus.PENDING_REVIEW]: [SampleStatus.QC_PASSED, SampleStatus.QC_FAILED],
  [SampleStatus.QC_PASSED]: [SampleStatus.STATISTICS_DONE],
  [SampleStatus.QC_FAILED]: [SampleStatus.PENDING_REVIEW, SampleStatus.QC_PASSED],
  [SampleStatus.STATISTICS_DONE]: [SampleStatus.REPORT_GENERATED],
  [SampleStatus.REPORT_GENERATED]: []
};

router.post('/sample/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetStatus, operator, remark } = req.body;

    if (!targetStatus || !operator) {
      return res.status(400).json({ error: '请提供目标状态和操作人' });
    }

    const sample = SampleRepository.findById(id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }

    const allowedTransitions = VALID_TRANSITIONS[sample.status as SampleStatus];
    if (!allowedTransitions || !allowedTransitions.includes(targetStatus as SampleStatus)) {
      return res.status(400).json({
        error: `不允许从 ${sample.status} 转换到 ${targetStatus}`,
        allowedTransitions: allowedTransitions || []
      });
    }

    SampleRepository.updateStatus(id, targetStatus, operator, remark);

    ProcessingRecordRepository.create({
      sampleId: id,
      batchId: sample.batchId,
      recordType: 'status_change',
      operator,
      oldValue: sample.status,
      newValue: targetStatus,
      remark: remark || `状态从 ${sample.status} 推进到 ${targetStatus}`,
      shared: true
    });

    res.json({
      data: SampleRepository.findById(id),
      message: `状态已从 ${sample.status} 推进到 ${targetStatus}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/:batchId', (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { targetStatus, operator, remark, sampleIds } = req.body;

    if (!targetStatus || !operator) {
      return res.status(400).json({ error: '请提供目标状态和操作人' });
    }

    const batch = BatchRepository.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const samples = sampleIds
      ? sampleIds.map((sid: string) => SampleRepository.findById(sid)).filter(Boolean)
      : SampleRepository.findByBatchId(batchId);

    const results: any[] = [];
    const errors: any[] = [];

    for (const sample of samples) {
      if (!sample) continue;

      const allowedTransitions = VALID_TRANSITIONS[sample.status as SampleStatus];
      if (!allowedTransitions || !allowedTransitions.includes(targetStatus as SampleStatus)) {
        errors.push({
          sampleId: sample.id,
          barcode: sample.barcode,
          currentStatus: sample.status,
          error: `不允许从 ${sample.status} 转换到 ${targetStatus}`
        });
        continue;
      }

      SampleRepository.updateStatus(sample.id, targetStatus, operator, remark);

      ProcessingRecordRepository.create({
        sampleId: sample.id,
        batchId,
        recordType: 'status_change',
        operator,
        oldValue: sample.status,
        newValue: targetStatus,
        remark: remark || `批量状态推进: ${sample.status} -> ${targetStatus}`,
        shared: true
      });

      results.push({
        sampleId: sample.id,
        barcode: sample.barcode,
        fromStatus: sample.status,
        toStatus: targetStatus
      });
    }

    BatchRepository.updateStatus(batchId, targetStatus, operator, remark || '批量状态推进');

    AuditLogRepository.create({
      batchId,
      operation: '批量状态推进',
      operator,
      fieldName: 'status',
      oldValue: batch.status,
      newValue: targetStatus,
      reason: remark || `批量推进 ${results.length} 条样本到 ${targetStatus}`
    });

    res.json({
      data: {
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transitions/:batchId', (req: Request, res: Response) => {
  try {
    const transitions = ProcessingRecordRepository.findByBatchId(req.params.batchId, 'status_change');
    res.json({ data: transitions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/valid-next/:id', (req: Request, res: Response) => {
  try {
    const sample = SampleRepository.findById(req.params.id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }
    const allowed = VALID_TRANSITIONS[sample.status as SampleStatus] || [];
    res.json({ data: { currentStatus: sample.status, allowedNextStatuses: allowed } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
