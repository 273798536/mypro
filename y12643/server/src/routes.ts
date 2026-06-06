import { Router, Request, Response } from 'express';
import { db } from './database';
import { Layer, ExceptionRecord, ProcessingRecord, FilterCriteria, RecordStatus, RecordType, ExceptionType, ProcessingAction, ImportResult } from './types';
import { v4 as uuidv4 } from 'uuid';
import { runAllAnomalyDetections, determineRecordStatus } from './utils/anomalyDetection';
import { checkDuplicatesBatch } from './utils/duplicateCheck';
import { getStatusHex, getStatusLabel, getExceptionTypeLabel } from './utils/colorRules';
import { validateDataConsistency, generateExportSummary } from './utils/dataConsistency';
import { exportToCSV, exportToJSON, exportProcessingHistoryToCSV } from './utils/exportGenerator';

const router = Router();

function parseRow(row: any): ExceptionRecord {
  return {
    id: row.id,
    type: row.type as ExceptionType,
    recordType: row.record_type as RecordType,
    title: row.title,
    description: row.description,
    source: row.source ? JSON.parse(row.source) : null,
    layerId: row.layer_id,
    status: row.status as RecordStatus,
    color: row.color,
    data: row.data ? JSON.parse(row.data) : {},
    offlineMissing: row.offline_missing === 1,
    isDuplicate: row.is_duplicate === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseLayer(row: any): Layer {
  return {
    id: row.id,
    name: row.name,
    type: row.type as RecordType,
    status: row.status as 'active' | 'inactive' | 'warning',
    canvasStatus: row.canvas_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseProcessing(row: any): ProcessingRecord {
  return {
    id: row.id,
    exceptionId: row.exception_id,
    action: row.action as ProcessingAction,
    operator: row.operator,
    opinion: row.opinion,
    timestamp: row.timestamp,
    previousStatus: row.previous_status as RecordStatus,
    newStatus: row.new_status as RecordStatus
  };
}

router.get('/layers', (req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM layers ORDER BY created_at DESC').all();
    const layers = rows.map(parseLayer);

    const layersWithStats = layers.map(layer => {
      const countRow = db.prepare(
        'SELECT status, COUNT(*) as count FROM exceptions WHERE layer_id = ? GROUP BY status'
      ).all(layer.id) as { status: string; count: number }[];

      const stats: Record<string, number> = {};
      for (const row of countRow) {
        stats[row.status] = row.count;
      }

      return { ...layer, stats };
    });

    res.json(layersWithStats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/layers/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM layers WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: '图层不存在' });
    }
    res.json(parseLayer(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/layers/:id/status', (req: Request, res: Response) => {
  try {
    const { status, canvasStatus } = req.body;
    db.prepare(
      'UPDATE layers SET status = ?, canvas_status = ?, updated_at = ? WHERE id = ?'
    ).run(status, canvasStatus, new Date().toISOString(), req.params.id);

    const row = db.prepare('SELECT * FROM layers WHERE id = ?').get(req.params.id);
    res.json(parseLayer(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/exceptions', (req: Request, res: Response) => {
  try {
    const {
      status,
      type,
      recordType,
      layerId,
      startDate,
      endDate,
      source,
      keyword
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      const statusArr = Array.isArray(status) ? status : [status];
      conditions.push(`status IN (${statusArr.map(() => '?').join(',')})`);
      params.push(...statusArr);
    }
    if (type) {
      const typeArr = Array.isArray(type) ? type : [type];
      conditions.push(`type IN (${typeArr.map(() => '?').join(',')})`);
      params.push(...typeArr);
    }
    if (recordType) {
      const rtArr = Array.isArray(recordType) ? recordType : [recordType];
      conditions.push(`record_type IN (${rtArr.map(() => '?').join(',')})`);
      params.push(...rtArr);
    }
    if (layerId) {
      conditions.push('layer_id = ?');
      params.push(layerId);
    }
    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }
    if (source) {
      conditions.push('source LIKE ?');
      params.push(`%${source}%`);
    }
    if (keyword) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM exceptions ${whereClause} ORDER BY created_at DESC`;

    const rows = db.prepare(sql).all(...params);
    const records = rows.map(parseRow);

    const summary = generateExportSummary(records, []);

    res.json({
      records,
      summary,
      total: records.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/exceptions/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM exceptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: '异常记录不存在' });
    }
    res.json(parseRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exceptions', (req: Request, res: Response) => {
  try {
    const inputRecords = Array.isArray(req.body) ? req.body : [req.body];
    const existingRows = db.prepare('SELECT * FROM exceptions').all();
    const existingRecords = existingRows.map(parseRow);

    const recordsToImport: ExceptionRecord[] = inputRecords.map(r => {
      const now = new Date().toISOString();
      const id = r.id || uuidv4();
      const anomalies = runAllAnomalyDetections({
        ...r,
        id,
        createdAt: now,
        updatedAt: now
      });
      const status = r.status || determineRecordStatus(r);

      return {
        id,
        type: r.type || (anomalies[0]?.type || ExceptionType.OTHER),
        recordType: r.recordType,
        title: r.title || (anomalies[0]?.title || '未命名异常'),
        description: r.description || (anomalies[0]?.details || ''),
        source: r.source,
        layerId: r.layerId,
        status,
        color: r.color || getStatusHex(status),
        data: r.data || {},
        offlineMissing: r.offlineMissing || false,
        isDuplicate: false,
        createdAt: now,
        updatedAt: now
      } as ExceptionRecord;
    });

    const { duplicates, uniqueRecords, results } = checkDuplicatesBatch(recordsToImport, existingRecords);

    const insertStmt = db.prepare(`
      INSERT INTO exceptions (
        id, type, record_type, title, description, source, layer_id,
        status, color, data, offline_missing, is_duplicate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;

    const insertTx = db.transaction(() => {
      for (const record of uniqueRecords) {
        insertStmt.run(
          record.id,
          record.type,
          record.recordType,
          record.title,
          record.description,
          JSON.stringify(record.source),
          record.layerId,
          record.status,
          record.color,
          JSON.stringify(record.data),
          record.offlineMissing ? 1 : 0,
          record.isDuplicate ? 1 : 0,
          record.createdAt,
          record.updatedAt
        );
        importedCount++;
      }
    });

    insertTx();

    const result: ImportResult = {
      success: true,
      imported: importedCount,
      duplicates: duplicates.length,
      anomalies: uniqueRecords.filter(r => r.status !== RecordStatus.NORMAL).length,
      errors: [],
      duplicateRecords: duplicates
    };

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/exceptions/:id', (req: Request, res: Response) => {
  try {
    const { status, title, description, data, offlineMissing } = req.body;
    const now = new Date().toISOString();
    const color = status ? getStatusHex(status) : undefined;

    const current = db.prepare('SELECT status FROM exceptions WHERE id = ?').get(req.params.id);
    if (!current) {
      return res.status(404).json({ error: '异常记录不存在' });
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (data !== undefined) { fields.push('data = ?'); params.push(JSON.stringify(data)); }
    if (offlineMissing !== undefined) { fields.push('offline_missing = ?'); params.push(offlineMissing ? 1 : 0); }
    if (color !== undefined) { fields.push('color = ?'); params.push(color); }
    fields.push('updated_at = ?');
    params.push(now, req.params.id);

    db.prepare(`UPDATE exceptions SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const row = db.prepare('SELECT * FROM exceptions WHERE id = ?').get(req.params.id);
    res.json(parseRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/exceptions/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM exceptions WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: '异常记录不存在' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/exceptions/:id/records', (req: Request, res: Response) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM processing_records WHERE exception_id = ? ORDER BY timestamp DESC'
    ).all(req.params.id);
    const records = rows.map(parseProcessing);
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exceptions/:id/records', (req: Request, res: Response) => {
  try {
    const { action, operator, opinion, previousStatus, newStatus } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO processing_records (
        id, exception_id, action, operator, opinion,
        timestamp, previous_status, new_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, action, operator, opinion, now, previousStatus, newStatus);

    if (newStatus) {
      db.prepare(
        'UPDATE exceptions SET status = ?, color = ?, updated_at = ? WHERE id = ?'
      ).run(newStatus, getStatusHex(newStatus as RecordStatus), now, req.params.id);
    }

    const row = db.prepare('SELECT * FROM processing_records WHERE id = ?').get(id);
    res.status(201).json(parseProcessing(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/review', (req: Request, res: Response) => {
  try {
    const targetTypes = [
      RecordType.TRAJECTORY,
      RecordType.DEVICE_LIST,
      RecordType.SCALE_ERROR
    ];

    const rows = db.prepare(
      `SELECT * FROM exceptions 
       WHERE record_type IN (?, ?, ?) 
       ORDER BY 
         CASE status 
           WHEN 'abnormal' THEN 1 
           WHEN 'offline_missing' THEN 2 
           WHEN 'pending' THEN 3 
           WHEN 'processing' THEN 4 
           ELSE 5 
         END,
         created_at DESC`
    ).all(...targetTypes);

    const records = rows.map(parseRow);

    const layerStats = targetTypes.map(rt => {
      const layerRows = db.prepare(
        `SELECT status, COUNT(*) as count 
         FROM exceptions 
         WHERE record_type = ? 
         GROUP BY status`
      ).all(rt) as { status: string; count: number }[];

      const stats: Record<string, number> = {};
      for (const row of layerRows) {
        stats[row.status] = row.count;
      }

      return { recordType: rt, stats };
    });

    res.json({
      records,
      layerStats,
      batchInfo: {
        generatedAt: new Date().toISOString(),
        recordTypes: targetTypes,
        totalCount: records.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/review/batch', (req: Request, res: Response) => {
  try {
    const { ids, conclusion, comment, reviewer } = req.body;
    const now = new Date().toISOString();

    const updateTx = db.transaction(() => {
      const insertProcessing = db.prepare(`
        INSERT INTO processing_records (
          id, exception_id, action, operator, opinion,
          timestamp, previous_status, new_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateException = db.prepare(
        'UPDATE exceptions SET status = ?, color = ?, updated_at = ? WHERE id = ?'
      );

      for (const id of ids) {
        const current = db.prepare('SELECT status FROM exceptions WHERE id = ?').get(id) as { status: RecordStatus } | undefined;
        if (current) {
          insertProcessing.run(
            uuidv4(),
            id,
            ProcessingAction.REVIEW,
            reviewer || '系统',
            comment || '批量复核',
            now,
            current.status,
            conclusion
          );
          updateException.run(conclusion, getStatusHex(conclusion as RecordStatus), now, id);
        }
      }
    });

    updateTx();

    res.json({ success: true, processed: ids.length, conclusion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/review/export', (req: Request, res: Response) => {
  try {
    const { format = 'csv', type } = req.query;

    const targetTypes = type
      ? (Array.isArray(type) ? type : [type])
      : [RecordType.TRAJECTORY, RecordType.DEVICE_LIST, RecordType.SCALE_ERROR];

    const placeholders = targetTypes.map(() => '?').join(',');
    const excRows = db.prepare(
      `SELECT * FROM exceptions WHERE record_type IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...targetTypes);
    const records = excRows.map(parseRow);

    const procRows = db.prepare('SELECT * FROM processing_records ORDER BY timestamp DESC').all();
    const processingHistory = procRows.map(parseProcessing);

    const consistency = validateDataConsistency(records, processingHistory);

    if (format === 'json') {
      const jsonContent = exportToJSON(records, processingHistory, { recordType: targetTypes as any });
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="review_report_${Date.now()}.json"`);
      res.send(jsonContent);
    } else {
      let csvContent: string;
      let filename: string;

      if (type === 'processing') {
        csvContent = exportProcessingHistoryToCSV(processingHistory);
        filename = `processing_history_${Date.now()}.csv`;
      } else {
        csvContent = exportToCSV(records);
        filename = `review_report_${Date.now()}.csv`;
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/consistency-check', (req: Request, res: Response) => {
  try {
    const excRows = db.prepare('SELECT * FROM exceptions').all();
    const records = excRows.map(parseRow);

    const procRows = db.prepare('SELECT * FROM processing_records').all();
    const processingHistory = procRows.map(parseProcessing);

    const result = validateDataConsistency(records, processingHistory);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/canvas/overview', (req: Request, res: Response) => {
  try {
    const layers = db.prepare('SELECT * FROM layers').all().map(parseLayer);

    const excRows = db.prepare('SELECT status, layer_id, type, record_type FROM exceptions').all() as any[];

    const totalCounts: Record<string, number> = {};
    for (const row of excRows) {
      totalCounts[row.status] = (totalCounts[row.status] || 0) + 1;
    }

    const summary = {
      totalExceptions: excRows.length,
      statusCounts: totalCounts,
      layerCount: layers.length,
      activeLayers: layers.filter(l => l.status === 'active').length,
      warningLayers: layers.filter(l => l.status === 'warning').length,
      generatedAt: new Date().toISOString()
    };

    res.json({ layers, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
