import { Router, Request, Response } from 'express';
import { SampleRepository } from '../repositories/SampleRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SampleStatus, ReviewResult } from '../types';

const router = Router();

router.post('/sample/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      result,
      operator,
      reason,
      fixSuggestion,
      pathologyRemark,
      handlingOpinion,
      missingTimePointApproved
    } = req.body;

    if (!result || !operator || !reason) {
      return res.status(400).json({ error: '请提供复核结果、操作人和原因' });
    }

    const sample = SampleRepository.findById(id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }

    const updates: any = {};
    const auditReasons: string[] = [reason];

    if (result === ReviewResult.APPROVED) {
      updates.qcPassed = true;
      if (missingTimePointApproved && sample.abnormal) {
        updates.abnormalRemark = (sample.abnormalRemark || '') + ' [时间点缺失已复核通过]';
        auditReasons.push(`时间点缺失已由 ${operator} 复核通过，原因: ${reason}`);
      }
      if (pathologyRemark) {
        updates.pathologyRemark = pathologyRemark;
      }
      if (handlingOpinion) {
        updates.handlingOpinion = handlingOpinion;
      }
    } else if (result === ReviewResult.REJECTED) {
      updates.qcPassed = false;
      updates.qcRemark = reason;
      if (fixSuggestion) {
        updates.abnormalRemark = (sample.abnormalRemark || '') + ` [修复建议: ${fixSuggestion}]`;
      }
    } else if (result === ReviewResult.NEEDS_FIX) {
      updates.qcPassed = false;
      updates.qcRemark = `${reason}${fixSuggestion ? `; 修复建议: ${fixSuggestion}` : ''}`;
    }

    const updatedSample = SampleRepository.update(id, updates, operator, auditReasons.join('; '));

    const newStatus = result === ReviewResult.APPROVED
      ? SampleStatus.QC_PASSED
      : SampleStatus.QC_FAILED;
    SampleRepository.updateStatus(id, newStatus, operator, `复核${result === ReviewResult.APPROVED ? '通过' : '不通过'}: ${reason}`);

    ProcessingRecordRepository.create({
      sampleId: id,
      batchId: sample.batchId,
      recordType: 'review',
      operator,
      oldValue: sample.qcPassed ? '通过' : '不通过',
      newValue: result === ReviewResult.APPROVED ? '通过' : '不通过',
      remark: `复核${result === ReviewResult.APPROVED ? '通过' : '不通过'}, 原因: ${reason}`,
      shared: true
    });

    if (missingTimePointApproved) {
      AuditLogRepository.create({
        sampleId: id,
        batchId: sample.batchId,
        operation: '时间点缺失复核通过',
        operator,
        fieldName: 'sowing_date',
        oldValue: '缺失',
        newValue: '复核通过-允许缺失',
        reason: `操作人 ${operator} 于复核时批准时间点缺失, 原因: ${reason}`
      });
    }

    res.json({
      data: updatedSample,
      message: `复核完成: ${result === ReviewResult.APPROVED ? '通过' : result === ReviewResult.REJECTED ? '驳回' : '需修改'}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/:batchId/review', (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { reviews, operator } = req.body;

    if (!Array.isArray(reviews) || !operator) {
      return res.status(400).json({ error: '请提供复核数据和操作人' });
    }

    const results: any[] = [];

    for (const review of reviews) {
      const sample = SampleRepository.findById(review.sampleId);
      if (!sample || sample.batchId !== batchId) continue;

      const updates: any = {};
      if (review.qcPassed !== undefined) {
        updates.qcPassed = review.qcPassed;
      }
      if (review.pathologyRemark) {
        updates.pathologyRemark = review.pathologyRemark;
      }
      if (review.handlingOpinion) {
        updates.handlingOpinion = review.handlingOpinion;
      }

      SampleRepository.update(review.sampleId, updates, operator, review.reason || '批量复核');

      const newStatus = review.qcPassed ? SampleStatus.QC_PASSED : SampleStatus.QC_FAILED;
      SampleRepository.updateStatus(review.sampleId, newStatus, operator, `批量复核: ${review.reason || ''}`);

      ProcessingRecordRepository.create({
        sampleId: review.sampleId,
        batchId,
        recordType: 'review',
        operator,
        newValue: review.qcPassed ? '通过' : '不通过',
        remark: review.reason || '批量复核',
        shared: true
      });

      results.push({
        sampleId: review.sampleId,
        barcode: sample.barcode,
        result: review.qcPassed ? '通过' : '不通过'
      });
    }

    res.json({ data: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pending/:batchId', (req: Request, res: Response) => {
  try {
    const pending = SampleRepository.findByStatus(SampleStatus.PENDING_REVIEW, req.params.batchId);
    const abnormal = SampleRepository.findAbnormal(req.params.batchId);
    res.json({
      data: {
        pendingReview: pending,
        abnormalSamples: abnormal
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
