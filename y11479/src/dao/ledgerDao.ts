import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../database';
import { MeetingLedger, LedgerStatus } from '../types';

function rowToLedger(row: any): MeetingLedger {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    meetingTitle: row.meeting_title,
    roomName: row.room_name,
    startTime: row.start_time,
    endTime: row.end_time,
    organizer: row.organizer,
    participants: JSON.parse(row.participants),
    status: row.status as LedgerStatus,
    hasTeaBreak: row.has_tea_break === 1,
    hasEquipment: row.has_equipment === 1,
    teaBreakCost: row.tea_break_cost,
    equipmentCost: row.equipment_cost,
    isCanceled: row.is_canceled === 1,
    cancelTime: row.cancel_time,
    cancelReason: row.cancel_reason,
    dataSources: JSON.parse(row.data_sources),
    customerServiceNotes: JSON.parse(row.customer_service_notes),
    accessRecords: JSON.parse(row.access_records),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
    version: row.version
  };
}

export async function createLedger(data: Omit<MeetingLedger, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<MeetingLedger> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const version = 1;

  await runQuery(`
    INSERT INTO meeting_ledger (
      id, meeting_id, meeting_title, room_name, start_time, end_time,
      organizer, participants, status, has_tea_break, has_equipment,
      tea_break_cost, equipment_cost, is_canceled, cancel_time, cancel_reason,
      data_sources, customer_service_notes, access_records,
      created_by, created_at, updated_by, updated_at, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.meetingId,
    data.meetingTitle,
    data.roomName,
    data.startTime,
    data.endTime,
    data.organizer,
    JSON.stringify(data.participants),
    data.status,
    data.hasTeaBreak ? 1 : 0,
    data.hasEquipment ? 1 : 0,
    data.teaBreakCost,
    data.equipmentCost,
    data.isCanceled ? 1 : 0,
    data.cancelTime,
    data.cancelReason,
    JSON.stringify(data.dataSources),
    JSON.stringify(data.customerServiceNotes),
    JSON.stringify(data.accessRecords),
    data.createdBy,
    now,
    data.updatedBy,
    now,
    version
  ]);

  return getLedgerById(id) as Promise<MeetingLedger>;
}

export async function getLedgerById(id: string): Promise<MeetingLedger | null> {
  const row = await getOne('SELECT * FROM meeting_ledger WHERE id = ?', [id]);
  return row ? rowToLedger(row) : null;
}

export async function getLedgerByMeetingId(meetingId: string): Promise<MeetingLedger | null> {
  const row = await getOne('SELECT * FROM meeting_ledger WHERE meeting_id = ?', [meetingId]);
  return row ? rowToLedger(row) : null;
}

export async function getAllLedgers(options?: { status?: LedgerStatus; limit?: number; offset?: number }): Promise<MeetingLedger[]> {
  let sql = 'SELECT * FROM meeting_ledger';
  const params: any[] = [];

  if (options?.status) {
    sql += ' WHERE status = ?';
    params.push(options.status);
  }

  sql += ' ORDER BY created_at DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const rows = await getAll(sql, params);
  return rows.map(rowToLedger);
}

export async function updateLedger(
  id: string,
  updates: Partial<MeetingLedger>,
  updatedBy: string
): Promise<MeetingLedger | null> {
  const existing = await getLedgerById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const newVersion = existing.version + 1;

  const fields: string[] = [];
  const values: any[] = [];

  const fieldMapping: Record<string, string> = {
    meetingTitle: 'meeting_title',
    roomName: 'room_name',
    startTime: 'start_time',
    endTime: 'end_time',
    organizer: 'organizer',
    participants: 'participants',
    status: 'status',
    hasTeaBreak: 'has_tea_break',
    hasEquipment: 'has_equipment',
    teaBreakCost: 'tea_break_cost',
    equipmentCost: 'equipment_cost',
    isCanceled: 'is_canceled',
    cancelTime: 'cancel_time',
    cancelReason: 'cancel_reason',
    dataSources: 'data_sources',
    customerServiceNotes: 'customer_service_notes',
    accessRecords: 'access_records'
  };

  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMapping[key];
    if (dbField) {
      fields.push(`${dbField} = ?`);
      if (key === 'participants' || key === 'dataSources' || key === 'customerServiceNotes' || key === 'accessRecords') {
        values.push(JSON.stringify(value));
      } else if (key === 'hasTeaBreak' || key === 'hasEquipment' || key === 'isCanceled') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  }

  fields.push('updated_by = ?');
  values.push(updatedBy);
  fields.push('updated_at = ?');
  values.push(now);
  fields.push('version = ?');
  values.push(newVersion);

  values.push(id);

  const sql = `UPDATE meeting_ledger SET ${fields.join(', ')} WHERE id = ?`;
  await runQuery(sql, values);

  return getLedgerById(id);
}

export async function deleteLedger(id: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM meeting_ledger WHERE id = ?', [id]);
  return result.changes > 0;
}
