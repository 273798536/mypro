import { Router, Request, Response } from 'express';
import { SampleRepository } from '../repositories/SampleRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { SampleStatus } from '../types';

const router = Router();

router.post('/sample/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { passed, operator, remark } = req.body;

    if (passed === undefined || !operator) {
      return res.status(400).json({ error: '请提供质控结果和操作人' });
    }

    const sample = SampleRepository.findById(id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }

    const updatedSample = SampleRepository.update(
      id,
      {
        qcPassed: passed,
        qcRemark: remark || (passed ? '质控通过' : '质控不通过')
      },
      operator,
      passed ? '质控通过' : `质控不通过: ${remark || ''}`
    );

    const newStatus = passed ? SampleStatus.QC_PASSED : SampleStatus.QC_FAILED;
    SampleRepository.updateStatus(id, newStatus, operator, `质控${passed ? '通过' : '不通过'}`);

    ProcessingRecordRepository.create({
      sampleId: id,
      batchId: sample.batchId,
      recordType: 'qc',
      operator,
      oldValue: sample.qcPassed ? '通过' : '不通过',
      newValue: passed ? '通过' : '不通过',
      remark: remark || (passed ? '质控通过' : '质控不通过'),
      shared: true
    });

    AuditLogRepository.create({
      sampleId: id,
      batchId: sample.batchId,
      operation: '质控检查',
      operator,
      fieldName: 'qcPassed',
      oldValue: sample.qcPassed ? '通过' : '不通过',
      newValue: passed ? '通过' : '不通过',
      reason: remark || (passed ? '质控通过' : '质控不通过')
    });

    res.json({ data: updatedSample });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/:batchId', (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const { operator, rules } = req.body;

    if (!operator) {
      return res.status(400).json({ error: '请提供操作人' });
    }

    const samples = SampleRepository.findByBatchId(batchId);
    const results: any[] = [];

    for (const sample of samples) {
      let passed = true;
      const remarks: string[] = [];

      if (!sample.sowingDate) {
        passed = false;
        remarks.push('播种日期缺失');
      }

      if (!sample.germinationDates || sample.germinationDates.length === 0) {
        passed = false;
        remarks.push('发芽观察日期缺失');
      }

      if (sample.germinationRate < (rules?.minGerminationRate ?? 50)) {
        passed = false;
        remarks.push(`发芽率${sample.germinationRate}%低于阈值${rules?.minGerminationRate ?? 50}%`);
      }

      if (sample.germinationRate > 100) {
        passed = false;
        remarks.push('发芽率超过100%');
      }

      SampleRepository.update(
        sample.id,
        {
          qcPassed: passed,
          qcRemark: remarks.length > 0 ? remarks.join('; ') : '质控通过',
          abnormal: !passed,
          abnormalRemark: !passed ? remarks.join('; ') : undefined
        },
        operator,
        passed ? '批量质控通过' : `批量质控不通过: ${remarks.join('; ')}`
      );

      const newStatus = passed ? SampleStatus.QC_PASSED : SampleStatus.QC_FAILED;
      SampleRepository.updateStatus(sample.id, newStatus, operator, `批量质控${passed ? '通过' : '不通过'}`);

      ProcessingRecordRepository.create({
        sampleId: sample.id,
        batchId,
        recordType: 'qc',
        operator,
        oldValue: sample.qcPassed ? '通过' : '不通过',
        newValue: passed ? '通过' : '不通过',
        remark: remarks.length > 0 ? remarks.join('; ') : '质控通过',
        shared: true
      });

      results.push({
        sampleId: sample.id,
        barcode: sample.barcode,
        passed,
        remarks
      });
    }

    res.json({
      data: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        details: results
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/results/:batchId', (req: Request, res: Response) => {
  try {
    const samples = SampleRepository.findByBatchId(req.params.batchId);
    const qcRecords = ProcessingRecordRepository.findByBatchId(req.params.batchId, 'qc');

    res.json({
      data: {
        samples,
        qcRecords,
        summary: {
          total: samples.length,
          passed: samples.filter(s => s.qcPassed).length,
          failed: samples.filter(s => !s.qcPassed).length,
          abnormal: samples.filter(s => s.abnormal).length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
