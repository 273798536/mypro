import express, { type Request, type Response } from 'express';
import { getAllRecords, getRecordById } from '../db/db.js';
import type { VolcanoRecord } from '@shared/types';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { format = 'json', id } = req.query;
    let data;

    if (id && typeof id === 'string') {
      const record = await getRecordById(id);
      if (!record) {
        return res.status(404).json({ success: false, error: '记录不存在' });
      }
      data = record;
    } else {
      data = await getAllRecords();
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="volcano_records_${Date.now()}.csv"`);
      res.send('\uFEFF' + csv);
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="volcano_records_${Date.now()}.json"`);
      res.json(data);
    }
  } catch (_error) {
    res.status(500).json({ success: false, error: '导出数据失败' });
  }
});

function convertToCSV(data: VolcanoRecord | VolcanoRecord[]): string {
  const records = Array.isArray(data) ? data : [data];
  const headers = [
    'ID', '标题', '地点', '批次ID', '时间', '结论', '结论作者', '结论时间',
    '截图数量', '历史版本数', '创建时间', '更新时间'
  ];

  const rows = records.map((r: VolcanoRecord) => [
    r.id,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.location || '').replace(/"/g, '""')}"`,
    r.batchId,
    r.timestamp,
    `"${(r.currentConclusion?.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    r.currentConclusion?.author || '',
    r.currentConclusion?.timestamp || '',
    r.screenshots?.length || 0,
    r.history?.length || 0,
    r.createdAt,
    r.updatedAt,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export default router;
