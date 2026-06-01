import express from 'express';
import { VersionService } from '../services/VersionService.js';
import type { CalculateRequest } from '../../shared/types.js';

const router = express.Router();
const versionService = new VersionService();

router.post('/', (req, res) => {
  try {
    const { tariffTableId, usageRecordId, versionName, note } = req.body as CalculateRequest;

    if (!tariffTableId || !usageRecordId) {
      res.status(400).json({ error: '请提供电价表ID和用电记录ID' });
      return;
    }

    const result = versionService.create({
      tariffTableId,
      usageRecordId,
      versionName: versionName || `核算版本 ${new Date().toLocaleDateString('zh-CN')}`,
      note,
    });

    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      success: true,
      version: result,
      summary: {
        totalBill: result.totalBill,
        calculatedTotal: result.calculatedTotal,
        discrepancy: result.discrepancy,
        totalCalculatedKwh: result.totalCalculatedKwh,
        warningCount: result.warnings.length,
        errorCount: result.warnings.filter(w => w.severity === 'error').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: '核算失败', details: String(error) });
  }
});

router.post('/preview', (req, res) => {
  try {
    const { tariffTableId, usageRecordId } = req.body;

    if (!tariffTableId || !usageRecordId) {
      res.status(400).json({ error: '请提供电价表ID和用电记录ID' });
      return;
    }

    const { TariffService } = require('../services/TariffService.js');
    const { UsageRecordService } = require('../services/UsageRecordService.js');
    const { ReverseCalculationEngine } = require('../services/ReverseCalculationEngine.js');

    const tariffService = new TariffService();
    const usageRecordService = new UsageRecordService();
    const engine = new ReverseCalculationEngine();

    const tariff = tariffService.getById(tariffTableId);
    const usageRecord = usageRecordService.getById(usageRecordId);

    if (!tariff) {
      res.status(404).json({ error: `未找到电价表: ${tariffTableId}` });
      return;
    }

    if (!usageRecord) {
      res.status(404).json({ error: `未找到用电记录: ${usageRecordId}` });
      return;
    }

    const result = engine.calculate(tariff, usageRecord);

    res.json({
      preview: true,
      tariff: { id: tariff.id, name: tariff.name },
      usageRecord: { id: usageRecord.id, recordDate: usageRecord.recordDate },
      result,
    });
  } catch (error) {
    res.status(500).json({ error: '预览核算失败', details: String(error) });
  }
});

export default router;
