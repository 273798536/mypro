import express from 'express';
import diagnosisService from '../services/DiagnosisService';
import auditService from '../services/AuditService';
import { ConnectionPoolData } from '../../shared/types';

const router = express.Router();

const DEFAULT_USER = { id: 'u002', name: '李华' };

router.get('/batches', (req, res) => {
  try {
    const batches = diagnosisService.getBatches();
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const data = diagnosisService.getBatchResults(batchId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/import', (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }

    const batch = diagnosisService.importData(
      data as ConnectionPoolData[],
      DEFAULT_USER.id,
      DEFAULT_USER.name
    );

    auditService.logOperation('import', DEFAULT_USER.id, DEFAULT_USER.name,
      `导入连接池数据，共${data.length}条记录`, {
      batchId: batch.id,
      reason: req.body.reason || '手动导入'
    });

    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/run', (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ success: false, error: 'batchId is required' });
    }

    const results = diagnosisService.runDiagnosis(batchId);
    const criticalCount = results.filter(r => r.severity === 'critical').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;

    auditService.logOperation('diagnose', DEFAULT_USER.id, DEFAULT_USER.name,
      `执行诊断，发现${criticalCount}个严重，${warningCount}个警告`, {
      batchId
    });

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/:batchId/download', (req, res) => {
  try {
    const { batchId } = req.params;
    const report = diagnosisService.generateReport(batchId);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="diagnosis_report_${batchId}.txt"`);
    
    auditService.logOperation('diagnose', DEFAULT_USER.id, DEFAULT_USER.name,
      `下载诊断报告，批次: ${batchId}`, {
      batchId
    });

    res.send(report);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:batchId/confirm', (req, res) => {
  try {
    const { batchId } = req.params;
    const { reason } = req.body;
    
    const result = auditService.confirmDiagnosis(
      batchId,
      DEFAULT_USER.id,
      DEFAULT_USER.name,
      reason
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/compare/:id1/:id2', (req, res) => {
  try {
    const { id1, id2 } = req.params;
    const comparison = diagnosisService.compareBatches(id1, id2);
    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
