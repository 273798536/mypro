import express from 'express';
import { UsageRecordService } from '../services/UsageRecordService.js';

const router = express.Router();
const usageRecordService = new UsageRecordService();

router.get('/', (_req, res) => {
  try {
    const records = usageRecordService.getAll();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '获取用电记录失败' });
  }
});

router.get('/date-range', (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      res.status(400).json({ error: '请提供 start 和 end 参数' });
      return;
    }
    const records = usageRecordService.getByDateRange(start as string, end as string);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '获取用电记录失败' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const record = usageRecordService.getById(req.params.id);
    if (!record) {
      res.status(404).json({ error: '未找到用电记录' });
      return;
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '获取用电记录失败' });
  }
});

router.post('/', (req, res) => {
  try {
    const { recordDate, totalBill, sourceFile, peakUsage, valleyUsage, flatUsage, totalUsage, customerNote } = req.body;

    if (!recordDate || !totalBill || !sourceFile) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }

    const issues = usageRecordService.getValidationIssues({
      id: '',
      recordDate,
      totalBill,
      sourceFile,
      importedAt: '',
      peakUsage,
      valleyUsage,
      flatUsage,
      totalUsage,
      customerNote,
    });

    const newRecord = usageRecordService.create({
      recordDate,
      totalBill: Number(totalBill),
      sourceFile,
      peakUsage: peakUsage !== undefined ? Number(peakUsage) : undefined,
      valleyUsage: valleyUsage !== undefined ? Number(valleyUsage) : undefined,
      flatUsage: flatUsage !== undefined ? Number(flatUsage) : undefined,
      totalUsage: totalUsage !== undefined ? Number(totalUsage) : undefined,
      customerNote,
    });

    res.status(201).json({
      record: newRecord,
      warnings: issues,
    });
  } catch (error) {
    res.status(500).json({ error: '创建用电记录失败' });
  }
});

router.post('/batch', (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) {
      res.status(400).json({ error: 'records 必须是数组' });
      return;
    }

    const newRecords = usageRecordService.batchCreate(records);
    res.status(201).json(newRecords);
  } catch (error) {
    res.status(500).json({ error: '批量创建用电记录失败' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const updated = usageRecordService.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: '未找到用电记录' });
      return;
    }

    const issues = usageRecordService.getValidationIssues(updated);

    res.json({
      record: updated,
      warnings: issues,
    });
  } catch (error) {
    res.status(500).json({ error: '更新用电记录失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const deleted = usageRecordService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '未找到用电记录' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除用电记录失败' });
  }
});

router.get('/:id/validate', (req, res) => {
  try {
    const record = usageRecordService.getById(req.params.id);
    if (!record) {
      res.status(404).json({ error: '未找到用电记录' });
      return;
    }

    const issues = usageRecordService.getValidationIssues(record);
    const hasNegative = usageRecordService.hasNegativeUsage(record);

    res.json({
      valid: issues.length === 0,
      hasNegativeUsage: hasNegative,
      issues,
    });
  } catch (error) {
    res.status(500).json({ error: '验证用电记录失败' });
  }
});

export default router;
