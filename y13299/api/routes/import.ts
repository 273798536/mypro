import { Router, type Request, type Response } from 'express';
import { recordService } from '../services/RecordService.js';
import { exceptionDetectionService } from '../services/ExceptionDetectionService.js';
import { v4 as uuidv4 } from 'uuid';
import type { AttachmentUploadRequest } from '../../shared/types.js';

const router = Router();

router.post('/batch', (req: Request, res: Response): void => {
  const { records } = req.body as { records?: Array<Record<string, unknown>> };
  if (!records || !Array.isArray(records)) {
    res.status(400).json({
      success: false,
      error: 'records 数组为必填项',
    });
    return;
  }

  const created = [];
  for (const rec of records) {
    try {
      const record = recordService.createRecord({
        code: String(rec.code ?? `GY-IMPORT-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
        locationName: String(rec.locationName ?? '未命名点位'),
        street: String(rec.street ?? '未知街道'),
        status: rec.status as any,
        materialCompleteness: Number(rec.materialCompleteness ?? 50),
        points: rec.points as any,
        attachments: rec.attachments as any,
        operator: String(rec.operator ?? '批量导入'),
      });
      created.push(record as unknown as Record<string, unknown>);
      exceptionDetectionService.detectExceptionsForRecord(record.id);
    } catch (err) {
      console.error('批量导入单条失败:', err);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      imported: created.length,
      total: records.length,
      records: created,
    },
  });
});

router.post('/demo-late-attachment', (req: Request, res: Response): void => {
  const records = recordService.getRecords();
  if (records.length === 0) {
    res.status(400).json({
      success: false,
      error: '暂无记录可用于演示',
    });
    return;
  }

  const target = records[Math.floor(Math.random() * records.length)];
  const lateAttachment: AttachmentUploadRequest = {
    name: `晚到补录材料-${uuidv4().slice(0, 6)}.pdf`,
    type: 'application/pdf',
    note: '演示用：街道办延迟报送的补充核查文件',
  };

  const updated = recordService.addAttachment(target.id, lateAttachment);
  exceptionDetectionService.detectExceptionsForRecord(target.id);

  res.status(200).json({
    success: true,
    data: {
      record: updated,
      message: `已向记录"${target.locationName}"补录晚到附件，异常检测已触发`,
    },
  });
});

export default router;
