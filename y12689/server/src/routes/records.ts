import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import type { NormalRecord, NormalVector, Screenshot, PointCloudSlice, HistoryItem, UpdateRecordPayload, CreateSlicePayload } from '../types';

const router = Router();

function mapVector(row: any): NormalVector {
  return {
    id: row.id,
    recordId: row.record_id,
    position: { x: row.pos_x, y: row.pos_y, z: row.pos_z },
    direction: { x: row.dir_x, y: row.dir_y, z: row.dir_z },
    deviation: row.deviation,
    isValid: row.is_valid === 1,
    explanation: row.explanation,
  };
}

function mapScreenshot(row: any): Screenshot {
  return {
    id: row.id,
    recordId: row.record_id,
    order: row.order,
    url: row.url,
    timestamp: row.timestamp,
    annotation: row.annotation,
    hasIssue: row.has_issue === 1,
  };
}

function mapSlice(row: any): PointCloudSlice {
  return {
    id: row.id,
    recordId: row.record_id,
    sliceIndex: row.slice_index,
    data: JSON.parse(row.data),
    timestamp: row.timestamp,
  };
}

function mapHistory(row: any): HistoryItem {
  return {
    id: row.id,
    recordId: row.record_id,
    action: row.action,
    userId: row.user_id,
    userName: row.user_name,
    version: row.version,
    timestamp: row.timestamp,
    details: row.details,
    snapshot: JSON.parse(row.snapshot),
  };
}

function mapRecord(row: any): NormalRecord {
  return {
    id: row.id,
    timestamp: row.timestamp,
    deviceId: row.device_id,
    deviceCoordinates: { x: row.device_x, y: row.device_y, z: row.device_z },
    operator: row.operator,
    status: row.status,
    pointCount: row.point_count,
    normalDeviation: row.normal_deviation,
    normalData: [],
    occlusionReason: row.occlusion_reason,
    occlusion: {
      detected: row.occlusion_detected === 1,
      reason: row.occlusion_reason,
      severity: row.occlusion_severity,
      affectedArea: row.occlusion_affected_area ? JSON.parse(row.occlusion_affected_area) : null,
      deviceCoordinateRelation: row.occlusion_device_relation,
    },
    screenshots: [],
    pointCloudSlices: [],
    history: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getRecordWithRelations(id: string): NormalRecord | null {
  const recordRow = db.prepare('SELECT * FROM normal_records WHERE id = ?').get(id);
  if (!recordRow) return null;

  const record = mapRecord(recordRow);

  const vectors = db.prepare('SELECT * FROM normal_vectors WHERE record_id = ? ORDER BY id').all(id) as any[];
  record.normalData = vectors.map(mapVector);

  const screenshots = db.prepare('SELECT * FROM screenshots WHERE record_id = ? ORDER BY "order"').all(id) as any[];
  record.screenshots = screenshots.map(mapScreenshot);

  const slices = db.prepare('SELECT * FROM point_cloud_slices WHERE record_id = ? ORDER BY slice_index').all(id) as any[];
  record.pointCloudSlices = slices.map(mapSlice);

  const history = db.prepare('SELECT * FROM history_items WHERE record_id = ? ORDER BY timestamp DESC').all(id) as any[];
  record.history = history.map(mapHistory);

  return record;
}

router.get('/', (req: Request, res: Response) => {
  const { status, deviceId } = req.query;

  let query = 'SELECT * FROM normal_records WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (deviceId) {
    query += ' AND device_id = ?';
    params.push(deviceId);
  }

  query += ' ORDER BY timestamp DESC';

  const rows = db.prepare(query).all(...params) as any[];
  const records = rows.map((row) => {
    const record = mapRecord(row);
    const vectors = db.prepare('SELECT * FROM normal_vectors WHERE record_id = ? ORDER BY id').all(row.id) as any[];
    record.normalData = vectors.map(mapVector);
    return record;
  });

  res.json(records);
});

router.get('/:id', (req: Request, res: Response) => {
  const record = getRecordWithRelations(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  res.json(record);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body as UpdateRecordPayload;

  const existingRow = db.prepare('SELECT * FROM normal_records WHERE id = ?').get(id) as any;
  if (!existingRow) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const currentRecord = getRecordWithRelations(id)!;

  const updatedAt = new Date().toISOString();
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.timestamp !== undefined) {
    updates.push('timestamp = ?');
    params.push(payload.timestamp);
  }
  if (payload.deviceId !== undefined) {
    updates.push('device_id = ?');
    params.push(payload.deviceId);
  }
  if (payload.deviceCoordinates !== undefined) {
    updates.push('device_x = ?');
    updates.push('device_y = ?');
    updates.push('device_z = ?');
    params.push(payload.deviceCoordinates.x, payload.deviceCoordinates.y, payload.deviceCoordinates.z);
  }
  if (payload.status !== undefined) {
    updates.push('status = ?');
    params.push(payload.status);
  }
  if (payload.occlusionReason !== undefined) {
    updates.push('occlusion_reason = ?');
    params.push(payload.occlusionReason);
  }

  if (updates.length === 0) {
    res.json(currentRecord);
    return;
  }

  updates.push('updated_at = ?');
  params.push(updatedAt);
  params.push(id);

  const updateQuery = `UPDATE normal_records SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(updateQuery).run(...params);

  const snapshotBefore = { ...currentRecord, history: [], normalData: [], screenshots: [], pointCloudSlices: [] };

  db.prepare(`
    INSERT INTO history_items (id, record_id, action, user_id, timestamp, details, snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    id,
    'updated',
    'user-001',
    updatedAt,
    '记录已更新',
    JSON.stringify(snapshotBefore)
  );

  const updatedRecord = getRecordWithRelations(id);
  res.json(updatedRecord);
});

router.get('/:id/history', (req: Request, res: Response) => {
  const id = req.params.id;
  const exists = db.prepare('SELECT 1 FROM normal_records WHERE id = ?').get(id);
  if (!exists) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  const history = db.prepare('SELECT * FROM history_items WHERE record_id = ? ORDER BY timestamp DESC').all(id) as any[];
  res.json(history.map(mapHistory));
});

router.post('/:id/slices', (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body as CreateSlicePayload;

  const exists = db.prepare('SELECT 1 FROM normal_records WHERE id = ?').get(id);
  if (!exists) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }

  if (payload.sliceIndex === undefined || !payload.data) {
    res.status(400).json({ error: 'sliceIndex and data are required' });
    return;
  }

  const sliceId = uuidv4();
  const timestamp = new Date().toISOString();

  db.prepare(`
    INSERT INTO point_cloud_slices (id, record_id, slice_index, data, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(sliceId, id, payload.sliceIndex, JSON.stringify(payload.data), timestamp);

  const newSlice = db.prepare('SELECT * FROM point_cloud_slices WHERE id = ?').get(sliceId) as any;
  res.status(201).json(mapSlice(newSlice));
});

export default router;
