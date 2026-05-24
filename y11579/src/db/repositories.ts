import { v4 as uuidv4 } from 'uuid';
import { run, getOne, getAll } from './index';
import {
  Ledger,
  DeliveryNote,
  ReworkRecord,
  DeductionDetail,
  HandoverPaper,
  SmsEvidence,
  ChangeHistory,
  AsyncTask,
  User,
  LedgerStatus,
  TaskStatus,
  LedgerSnapshot
} from '../types';

export class LedgerRepository {
  static async create(ledger: Omit<Ledger, 'id' | 'createdAt' | 'updatedAt'>): Promise<Ledger> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO ledgers (
        id, batch_no, status, created_by, created_by_role, current_handler,
        reject_reason, process_result, process_message, sensitive_fields_masked,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, ledger.batchNo, ledger.status, ledger.createdBy, ledger.createdByRole,
      ledger.currentHandler || null, ledger.rejectReason || null,
      ledger.processResult || null, ledger.processMessage || null,
      ledger.sensitiveFieldsMasked ? 1 : 0, now, now
    ]);
    
    return { ...ledger, id, createdAt: now, updatedAt: now } as Ledger;
  }

  static async findById(id: string): Promise<Ledger | null> {
    const row = await getOne('SELECT * FROM ledgers WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapRowToLedger(row);
  }

  static async findByBatchNo(batchNo: string): Promise<Ledger | null> {
    const row = await getOne('SELECT * FROM ledgers WHERE batch_no = ?', [batchNo]);
    if (!row) return null;
    return this.mapRowToLedger(row);
  }

  static async findAll(filters?: { status?: LedgerStatus; page?: number; limit?: number }): Promise<Ledger[]> {
    let sql = 'SELECT * FROM ledgers';
    const params: any[] = [];
    
    if (filters?.status) {
      sql += ' WHERE status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filters?.page && filters?.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, (filters.page - 1) * filters.limit);
    }
    
    const rows = await getAll(sql, params);
    return rows.map(row => this.mapRowToLedger(row));
  }

  static async update(id: string, updates: Partial<Ledger>): Promise<void> {
    const now = new Date().toISOString();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.currentHandler) { fields.push('current_handler = ?'); values.push(updates.currentHandler); }
    if (updates.rejectReason !== undefined) { fields.push('reject_reason = ?'); values.push(updates.rejectReason); }
    if (updates.processResult) { fields.push('process_result = ?'); values.push(updates.processResult); }
    if (updates.processMessage !== undefined) { fields.push('process_message = ?'); values.push(updates.processMessage); }
    if (updates.sensitiveFieldsMasked !== undefined) { fields.push('sensitive_fields_masked = ?'); values.push(updates.sensitiveFieldsMasked ? 1 : 0); }
    if (updates.submittedAt) { fields.push('submitted_at = ?'); values.push(updates.submittedAt); }
    if (updates.confirmedAt) { fields.push('confirmed_at = ?'); values.push(updates.confirmedAt); }
    
    fields.push('updated_at = ?');
    values.push(now, id);
    
    const sql = `UPDATE ledgers SET ${fields.join(', ')} WHERE id = ?`;
    await run(sql, values);
  }

  private static mapRowToLedger(row: any): Ledger {
    return {
      id: row.id,
      batchNo: row.batch_no,
      status: row.status as LedgerStatus,
      createdBy: row.created_by,
      createdByRole: row.created_by_role,
      currentHandler: row.current_handler,
      rejectReason: row.reject_reason,
      processResult: row.process_result,
      processMessage: row.process_message,
      sensitiveFieldsMasked: row.sensitive_fields_masked === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      submittedAt: row.submitted_at,
      confirmedAt: row.confirmed_at,
      deliveryNotes: [],
      reworkRecords: [],
      deductionDetails: [],
      handoverPapers: [],
      smsEvidences: []
    };
  }
}

export class DeliveryNoteRepository {
  static async create(note: Omit<DeliveryNote, 'id' | 'createdAt' | 'updatedAt'>, ledgerId: string): Promise<DeliveryNote> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO delivery_notes (
        id, batch_no, ledger_id, supplier_id, supplier_name, product_code,
        product_name, quantity, unit, delivery_date, warehouse, receiver, remark,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, note.batchNo, ledgerId, note.supplierId, note.supplierName,
      note.productCode, note.productName, note.quantity, note.unit,
      note.deliveryDate, note.warehouse, note.receiver, note.remark || null,
      now, now
    ]);
    
    return { ...note, id, createdAt: now, updatedAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<DeliveryNote[]> {
    const rows = await getAll('SELECT * FROM delivery_notes WHERE ledger_id = ? ORDER BY created_at', [ledgerId]);
    return rows.map(row => this.mapRow(row));
  }

  static async deleteByLedgerId(ledgerId: string): Promise<void> {
    await run('DELETE FROM delivery_notes WHERE ledger_id = ?', [ledgerId]);
  }

  private static mapRow(row: any): DeliveryNote {
    return {
      id: row.id,
      batchNo: row.batch_no,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      productCode: row.product_code,
      productName: row.product_name,
      quantity: row.quantity,
      unit: row.unit,
      deliveryDate: row.delivery_date,
      warehouse: row.warehouse,
      receiver: row.receiver,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class ReworkRecordRepository {
  static async create(record: Omit<ReworkRecord, 'id' | 'createdAt' | 'updatedAt'>, ledgerId: string): Promise<ReworkRecord> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO rework_records (
        id, batch_no, ledger_id, delivery_note_id, rework_reason, rework_type,
        rework_quantity, rework_date, responsible_person, completion_date, result,
        remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.batchNo, ledgerId, record.deliveryNoteId, record.reworkReason,
      record.reworkType, record.reworkQuantity, record.reworkDate, record.responsiblePerson,
      record.completionDate || null, record.result || null, record.remark || null, now, now
    ]);
    
    return { ...record, id, createdAt: now, updatedAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<ReworkRecord[]> {
    const rows = await getAll('SELECT * FROM rework_records WHERE ledger_id = ? ORDER BY created_at', [ledgerId]);
    return rows.map(row => this.mapRow(row));
  }

  static async deleteByLedgerId(ledgerId: string): Promise<void> {
    await run('DELETE FROM rework_records WHERE ledger_id = ?', [ledgerId]);
  }

  private static mapRow(row: any): ReworkRecord {
    return {
      id: row.id,
      batchNo: row.batch_no,
      deliveryNoteId: row.delivery_note_id,
      reworkReason: row.rework_reason,
      reworkType: row.rework_type,
      reworkQuantity: row.rework_quantity,
      reworkDate: row.rework_date,
      responsiblePerson: row.responsible_person,
      completionDate: row.completion_date,
      result: row.result,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class DeductionDetailRepository {
  static async create(detail: Omit<DeductionDetail, 'id' | 'createdAt' | 'updatedAt'>, ledgerId: string): Promise<DeductionDetail> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO deduction_details (
        id, batch_no, ledger_id, delivery_note_id, rework_record_id, deduction_type,
        deduction_amount, deduction_reason, deduction_date, operator, evidence_urls,
        remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, detail.batchNo, ledgerId, detail.deliveryNoteId || null, detail.reworkRecordId || null,
      detail.deductionType, detail.deductionAmount, detail.deductionReason,
      detail.deductionDate, detail.operator,
      detail.evidenceUrls ? JSON.stringify(detail.evidenceUrls) : null,
      detail.remark || null, now, now
    ]);
    
    return { ...detail, id, createdAt: now, updatedAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<DeductionDetail[]> {
    const rows = await getAll('SELECT * FROM deduction_details WHERE ledger_id = ? ORDER BY created_at', [ledgerId]);
    return rows.map(row => this.mapRow(row));
  }

  static async deleteByLedgerId(ledgerId: string): Promise<void> {
    await run('DELETE FROM deduction_details WHERE ledger_id = ?', [ledgerId]);
  }

  private static mapRow(row: any): DeductionDetail {
    return {
      id: row.id,
      batchNo: row.batch_no,
      deliveryNoteId: row.delivery_note_id,
      reworkRecordId: row.rework_record_id,
      deductionType: row.deduction_type,
      deductionAmount: row.deduction_amount,
      deductionReason: row.deduction_reason,
      deductionDate: row.deduction_date,
      operator: row.operator,
      evidenceUrls: row.evidence_urls ? JSON.parse(row.evidence_urls) : undefined,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class HandoverPaperRepository {
  static async create(paper: Omit<HandoverPaper, 'id' | 'createdAt' | 'updatedAt'>, ledgerId: string): Promise<HandoverPaper> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO handover_papers (
        id, batch_no, ledger_id, delivery_note_id, store_id, store_name,
        handover_date, handover_person, receiver, items, remark, image_urls,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, paper.batchNo, ledgerId, paper.deliveryNoteId, paper.storeId, paper.storeName,
      paper.handoverDate, paper.handoverPerson, paper.receiver, JSON.stringify(paper.items),
      paper.remark || null, paper.imageUrls ? JSON.stringify(paper.imageUrls) : null, now, now
    ]);
    
    return { ...paper, id, createdAt: now, updatedAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<HandoverPaper[]> {
    const rows = await getAll('SELECT * FROM handover_papers WHERE ledger_id = ? ORDER BY created_at', [ledgerId]);
    return rows.map(row => this.mapRow(row));
  }

  static async deleteByLedgerId(ledgerId: string): Promise<void> {
    await run('DELETE FROM handover_papers WHERE ledger_id = ?', [ledgerId]);
  }

  private static mapRow(row: any): HandoverPaper {
    return {
      id: row.id,
      batchNo: row.batch_no,
      deliveryNoteId: row.delivery_note_id,
      storeId: row.store_id,
      storeName: row.store_name,
      handoverDate: row.handover_date,
      handoverPerson: row.handover_person,
      receiver: row.receiver,
      items: JSON.parse(row.items),
      remark: row.remark,
      imageUrls: row.image_urls ? JSON.parse(row.image_urls) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class SmsEvidenceRepository {
  static async create(evidence: Omit<SmsEvidence, 'id' | 'createdAt'>, ledgerId: string): Promise<SmsEvidence> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO sms_evidences (
        id, batch_no, ledger_id, related_type, related_id, sender, receiver,
        content, send_time, screenshot_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, evidence.batchNo, ledgerId, evidence.relatedType, evidence.relatedId,
      evidence.sender, evidence.receiver, evidence.content, evidence.sendTime,
      evidence.screenshotUrl, now
    ]);
    
    return { ...evidence, id, createdAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<SmsEvidence[]> {
    const rows = await getAll('SELECT * FROM sms_evidences WHERE ledger_id = ? ORDER BY created_at', [ledgerId]);
    return rows.map(row => ({
      id: row.id,
      batchNo: row.batch_no,
      relatedType: row.related_type,
      relatedId: row.related_id,
      sender: row.sender,
      receiver: row.receiver,
      content: row.content,
      sendTime: row.send_time,
      screenshotUrl: row.screenshot_url,
      createdAt: row.created_at
    }));
  }
}

export class ChangeHistoryRepository {
  static async create(history: Omit<ChangeHistory, 'id' | 'changedAt'>): Promise<ChangeHistory> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO change_history (
        id, ledger_id, field_name, old_value, new_value, changed_by,
        changed_by_role, change_reason, changed_at, diff_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, history.ledgerId, history.fieldName, history.oldValue || null,
      history.newValue || null, history.changedBy, history.changedByRole,
      history.changeReason, now, history.diffSummary || null
    ]);
    
    return { ...history, id, changedAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<ChangeHistory[]> {
    const rows = await getAll('SELECT * FROM change_history WHERE ledger_id = ? ORDER BY changed_at DESC', [ledgerId]);
    return rows.map(row => ({
      id: row.id,
      ledgerId: row.ledger_id,
      fieldName: row.field_name,
      oldValue: row.old_value,
      newValue: row.new_value,
      changedBy: row.changed_by,
      changedByRole: row.changed_by_role,
      changeReason: row.change_reason,
      changedAt: row.changed_at,
      diffSummary: row.diff_summary
    }));
  }
}

export class LedgerSnapshotRepository {
  static async create(snapshot: Omit<LedgerSnapshot, 'id' | 'createdAt'>): Promise<LedgerSnapshot> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO ledger_snapshots (
        id, ledger_id, ledger_data, status, snapshot_type, action, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, snapshot.ledgerId, snapshot.ledgerData, snapshot.status,
      snapshot.snapshotType, snapshot.action, snapshot.createdBy, now
    ]);
    
    return { ...snapshot, id, createdAt: now };
  }

  static async findByLedgerId(ledgerId: string): Promise<LedgerSnapshot[]> {
    const rows = await getAll('SELECT * FROM ledger_snapshots WHERE ledger_id = ? ORDER BY created_at', [ledgerId]);
    return rows.map(row => ({
      id: row.id,
      ledgerId: row.ledger_id,
      ledgerData: row.ledger_data,
      status: row.status as LedgerStatus,
      snapshotType: row.snapshot_type as 'before' | 'after',
      action: row.action,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
  }

  static async getBeforeAfterPair(ledgerId: string, action: string): Promise<{ before: LedgerSnapshot | null; after: LedgerSnapshot | null }> {
    const snapshots = await this.findByLedgerId(ledgerId);
    const filtered = snapshots.filter(s => s.action === action);
    return {
      before: filtered.find(s => s.snapshotType === 'before') || null,
      after: filtered.find(s => s.snapshotType === 'after') || null
    };
  }
}

export class AsyncTaskRepository {
  static async create(task: Omit<AsyncTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AsyncTask> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO async_tasks (
        id, task_type, payload, status, retry_count, max_retries,
        error_message, error_stack, last_run_at, next_run_at, completed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, task.taskType, JSON.stringify(task.payload), task.status,
      task.retryCount, task.maxRetries, task.errorMessage || null,
      task.errorStack || null, task.lastRunAt || null, task.nextRunAt || null,
      task.completedAt || null, now, now
    ]);
    
    return { ...task, id, createdAt: now, updatedAt: now };
  }

  static async findById(id: string): Promise<AsyncTask | null> {
    const row = await getOne('SELECT * FROM async_tasks WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapRow(row);
  }

  static async findPending(): Promise<AsyncTask[]> {
    const now = new Date().toISOString();
    const rows = await getAll(`
      SELECT * FROM async_tasks 
      WHERE status IN (?, ?) AND (next_run_at IS NULL OR next_run_at <= ?)
      ORDER BY created_at
    `, [TaskStatus.PENDING, TaskStatus.WAITING_RETRY, now]);
    return rows.map(row => this.mapRow(row));
  }

  static async findByStatus(status: TaskStatus): Promise<AsyncTask[]> {
    const rows = await getAll('SELECT * FROM async_tasks WHERE status = ? ORDER BY created_at', [status]);
    return rows.map(row => this.mapRow(row));
  }

  static async update(id: string, updates: Partial<AsyncTask>): Promise<void> {
    const now = new Date().toISOString();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.retryCount !== undefined) { fields.push('retry_count = ?'); values.push(updates.retryCount); }
    if (updates.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(updates.errorMessage); }
    if (updates.errorStack !== undefined) { fields.push('error_stack = ?'); values.push(updates.errorStack); }
    if (updates.lastRunAt) { fields.push('last_run_at = ?'); values.push(updates.lastRunAt); }
    if (updates.nextRunAt !== undefined) { fields.push('next_run_at = ?'); values.push(updates.nextRunAt); }
    if (updates.completedAt) { fields.push('completed_at = ?'); values.push(updates.completedAt); }
    
    fields.push('updated_at = ?');
    values.push(now, id);
    
    const sql = `UPDATE async_tasks SET ${fields.join(', ')} WHERE id = ?`;
    await run(sql, values);
  }

  private static mapRow(row: any): AsyncTask {
    return {
      id: row.id,
      taskType: row.task_type,
      payload: JSON.parse(row.payload),
      status: row.status as TaskStatus,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      errorMessage: row.error_message,
      errorStack: row.error_stack,
      lastRunAt: row.last_run_at,
      nextRunAt: row.next_run_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export class UserRepository {
  static async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date().toISOString();
    const id = uuidv4();
    
    await run(`
      INSERT INTO users (
        id, username, password_hash, role, name, department, phone,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, user.username, user.passwordHash, user.role, user.name,
      user.department, user.phone, user.isActive ? 1 : 0, now, now
    ]);
    
    return { ...user, id, createdAt: now, updatedAt: now };
  }

  static async findByUsername(username: string): Promise<User | null> {
    const row = await getOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!row) return null;
    return this.mapRow(row);
  }

  static async findById(id: string): Promise<User | null> {
    const row = await getOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapRow(row);
  }

  private static mapRow(row: any): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      name: row.name,
      department: row.department,
      phone: row.phone,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
