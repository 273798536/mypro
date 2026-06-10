import { Router, Request, Response } from 'express';
import { SampleRepository } from '../repositories/SampleRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';

const router = Router();

router.get('/sample/:id', (req: Request, res: Response) => {
  try {
    const sample = SampleRepository.findById(req.params.id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }

    const auditLogs = AuditLogRepository.findBySampleId(req.params.id);
    const processingRecords = ProcessingRecordRepository.findBySampleId(req.params.id);

    const trace = AuditLogRepository.traceSampleChanges(req.params.id);

    const timePointChanges = auditLogs.filter(
      log => log.fieldName === 'sowingDate' || log.fieldName === 'germinationDates'
    );

    const missingTimePointApprovals = timePointChanges.filter(
      log => log.oldValue === '缺失' && log.newValue?.includes('复核通过')
    );

    res.json({
      data: {
        sample,
        auditTrail: auditLogs,
        processingRecords,
        fieldChangeTrace: trace.fieldChanges,
        timePointAudit: {
          totalChanges: timePointChanges.length,
          missingTimePointApprovals: missingTimePointApprovals.map(a => ({
            operator: a.operator,
            time: a.operateTime,
            reason: a.reason,
            oldValue: a.oldValue,
            newValue: a.newValue
          }))
        },
        pathologyRemark: sample.pathologyRemark,
        handlingOpinion: sample.handlingOpinion,
        abnormalRemark: sample.abnormalRemark
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/batch/:batchId', (req: Request, res: Response) => {
  try {
    const auditLogs = AuditLogRepository.findByBatchId(req.params.batchId);
    const processingRecords = ProcessingRecordRepository.findByBatchId(req.params.batchId);

    res.json({
      data: {
        auditLogs,
        processingRecords
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sample/:id/trace', (req: Request, res: Response) => {
  try {
    const sample = SampleRepository.findById(req.params.id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }

    const trace = AuditLogRepository.traceSampleChanges(req.params.id);
    const processingRecords = ProcessingRecordRepository.findBySampleId(req.params.id);

    const abnormalRelatedRecords = processingRecords.filter(
      r => r.recordType === 'review' || r.remark?.includes('异常')
    );

    const auditLogs = AuditLogRepository.findBySampleId(req.params.id);
    const timePointApprovals = auditLogs.filter(
      log => log.operation === '时间点缺失复核通过'
    );

    res.json({
      data: {
        barcode: sample.barcode,
        groupName: sample.groupName,
        seedType: sample.seedType,
        status: sample.status,
        abnormal: sample.abnormal,
        abnormalRemark: sample.abnormalRemark,
        pathologyRemark: sample.pathologyRemark,
        handlingOpinion: sample.handlingOpinion,
        changeHistory: trace.fieldChanges,
        processingHistory: abnormalRelatedRecords,
        timePointApprovalHistory: timePointApprovals.map(a => ({
          who: a.operator,
          when: a.operateTime,
          why: a.reason,
          whatChanged: `${a.fieldName}: ${a.oldValue} -> ${a.newValue}`
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/operator/:name', (req: Request, res: Response) => {
  try {
    const logs = AuditLogRepository.findByOperator(req.params.name);
    res.json({ data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/operation/:operation', (req: Request, res: Response) => {
  try {
    const { batchId } = req.query;
    const logs = AuditLogRepository.findByOperation(
      req.params.operation,
      batchId as string | undefined
    );
    res.json({ data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/field-changes/:fieldName', (req: Request, res: Response) => {
  try {
    const { sampleId } = req.query;
    const logs = AuditLogRepository.findByFieldChange(
      req.params.fieldName,
      sampleId as string | undefined
    );
    res.json({ data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recent', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = AuditLogRepository.findAll(limit);
    res.json({ data: logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
