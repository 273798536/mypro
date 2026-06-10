import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { runQuery, runExecute, runTransaction } from '../db/database';
import { Sample, SampleStatus, AuditLog } from '../types';

export interface SampleCreateData {
  batchId: string;
  barcode: string;
  groupName: string;
  seedType: string;
  sowingDate?: string;
  germinationDates: string[];
  totalSeeds: number;
  germinatedSeeds: number;
}

export class SampleRepository {
  static create(data: SampleCreateData, operator: string): Sample {
    const id = uuidv4();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const germinationRate = data.totalSeeds > 0
      ? Math.round((data.germinatedSeeds / data.totalSeeds) * 10000) / 100
      : 0;

    const hasMissingTimePoint = !data.sowingDate || data.germinationDates.length === 0;
    const abnormal = hasMissingTimePoint || germinationRate < 50 || germinationRate > 100;

    runExecute(
      `INSERT INTO samples (
        id, batch_id, barcode, group_name, seed_type, sowing_date, germination_dates,
        total_seeds, germinated_seeds, germination_rate, status, qc_passed,
        abnormal, abnormal_remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.batchId,
        data.barcode,
        data.groupName,
        data.seedType,
        data.sowingDate || null,
        JSON.stringify(data.germinationDates),
        data.totalSeeds,
        data.germinatedSeeds,
        germinationRate,
        hasMissingTimePoint ? SampleStatus.PENDING_REVIEW : SampleStatus.IMPORTED,
        hasMissingTimePoint ? 0 : 1,
        abnormal ? 1 : 0,
        abnormal ? (hasMissingTimePoint ? '时间点缺失' : `发芽率${germinationRate}%异常`) : null,
        now,
        now
      ]
    );

    this.addAuditLog({
      sampleId: id,
      batchId: data.batchId,
      operation: '创建样本',
      operator,
      fieldName: undefined,
      oldValue: undefined,
      newValue: undefined,
      reason: '导入新样本'
    });

    return this.findById(id)!;
  }

  static findById(id: string): Sample | null {
    const results = runQuery('SELECT * FROM samples WHERE id = ?', [id]);
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static findByBatchId(batchId: string): Sample[] {
    const results = runQuery('SELECT * FROM samples WHERE batch_id = ? ORDER BY barcode', [batchId]);
    return results.map(row => this.mapRow(row));
  }

  static findByBarcode(batchId: string, barcode: string): Sample | null {
    const results = runQuery(
      'SELECT * FROM samples WHERE batch_id = ? AND barcode = ?',
      [batchId, barcode]
    );
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static findAll(): Sample[] {
    const results = runQuery('SELECT * FROM samples ORDER BY created_at DESC');
    return results.map(row => this.mapRow(row));
  }

  static findAbnormal(batchId?: string): Sample[] {
    const sql = batchId
      ? 'SELECT * FROM samples WHERE batch_id = ? AND abnormal = 1 ORDER BY barcode'
      : 'SELECT * FROM samples WHERE abnormal = 1 ORDER BY created_at DESC';
    const params = batchId ? [batchId] : [];
    const results = runQuery(sql, params);
    return results.map(row => this.mapRow(row));
  }

  static findByStatus(status: SampleStatus, batchId?: string): Sample[] {
    const sql = batchId
      ? 'SELECT * FROM samples WHERE batch_id = ? AND status = ? ORDER BY barcode'
      : 'SELECT * FROM samples WHERE status = ? ORDER BY created_at DESC';
    const params = batchId ? [batchId, status] : [status];
    const results = runQuery(sql, params);
    return results.map(row => this.mapRow(row));
  }

  static update(
    id: string,
    updates: Partial<{
      sowingDate: string;
      germinationDates: string[];
      totalSeeds: number;
      germinatedSeeds: number;
      qcPassed: boolean;
      qcRemark: string;
      pathologyRemark: string;
      handlingOpinion: string;
      abnormalRemark: string;
      abnormal: boolean;
    }>,
    operator: string,
    reason: string
  ): Sample | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const operations: Array<{ sql: string; params: any[] }> = [];
    const setClauses: string[] = [];
    const setParams: any[] = [];

    const oldValues: Record<string, string> = {};
    const newValues: Record<string, string> = {};

    if (updates.sowingDate !== undefined) {
      setClauses.push('sowing_date = ?');
      setParams.push(updates.sowingDate || null);
      oldValues.sowingDate = existing.sowingDate || '';
      newValues.sowingDate = updates.sowingDate || '';
    }

    if (updates.germinationDates !== undefined) {
      setClauses.push('germination_dates = ?');
      setParams.push(JSON.stringify(updates.germinationDates));
      oldValues.germinationDates = JSON.stringify(existing.germinationDates);
      newValues.germinationDates = JSON.stringify(updates.germinationDates);
    }

    if (updates.totalSeeds !== undefined || updates.germinatedSeeds !== undefined) {
      const totalSeeds = updates.totalSeeds ?? existing.totalSeeds;
      const germinatedSeeds = updates.germinatedSeeds ?? existing.germinatedSeeds;
      const germinationRate = totalSeeds > 0
        ? Math.round((germinatedSeeds / totalSeeds) * 10000) / 100
        : 0;

      if (updates.totalSeeds !== undefined) {
        setClauses.push('total_seeds = ?');
        setParams.push(updates.totalSeeds);
        oldValues.totalSeeds = String(existing.totalSeeds);
        newValues.totalSeeds = String(updates.totalSeeds);
      }

      if (updates.germinatedSeeds !== undefined) {
        setClauses.push('germinated_seeds = ?');
        setParams.push(updates.germinatedSeeds);
        oldValues.germinatedSeeds = String(existing.germinatedSeeds);
        newValues.germinatedSeeds = String(updates.germinatedSeeds);
      }

      setClauses.push('germination_rate = ?');
      setParams.push(germinationRate);
      oldValues.germinationRate = String(existing.germinationRate);
      newValues.germinationRate = String(germinationRate);

      const hasMissingTimePoint = !updates.sowingDate
        ? (!existing.sowingDate || existing.germinationDates.length === 0)
        : (!updates.sowingDate || (updates.germinationDates || existing.germinationDates).length === 0);

      const abnormal = hasMissingTimePoint || germinationRate < 50 || germinationRate > 100;
      setClauses.push('abnormal = ?');
      setParams.push(abnormal ? 1 : 0);
      if (abnormal) {
        setClauses.push('abnormal_remark = ?');
        setParams.push(hasMissingTimePoint ? '时间点缺失' : `发芽率${germinationRate}%异常`);
      }
    }

    if (updates.qcPassed !== undefined) {
      setClauses.push('qc_passed = ?');
      setParams.push(updates.qcPassed ? 1 : 0);
      oldValues.qcPassed = existing.qcPassed ? '通过' : '不通过';
      newValues.qcPassed = updates.qcPassed ? '通过' : '不通过';
    }

    if (updates.qcRemark !== undefined) {
      setClauses.push('qc_remark = ?');
      setParams.push(updates.qcRemark || null);
      oldValues.qcRemark = existing.qcRemark || '';
      newValues.qcRemark = updates.qcRemark || '';
    }

    if (updates.pathologyRemark !== undefined) {
      setClauses.push('pathology_remark = ?');
      setParams.push(updates.pathologyRemark || null);
      oldValues.pathologyRemark = existing.pathologyRemark || '';
      newValues.pathologyRemark = updates.pathologyRemark || '';
    }

    if (updates.handlingOpinion !== undefined) {
      setClauses.push('handling_opinion = ?');
      setParams.push(updates.handlingOpinion || null);
      oldValues.handlingOpinion = existing.handlingOpinion || '';
      newValues.handlingOpinion = updates.handlingOpinion || '';
    }

    if (updates.abnormalRemark !== undefined) {
      setClauses.push('abnormal_remark = ?');
      setParams.push(updates.abnormalRemark || null);
    }

    setClauses.push('updated_at = ?');
    setParams.push(now);

    if (setClauses.length > 0) {
      operations.push({
        sql: `UPDATE samples SET ${setClauses.join(', ')} WHERE id = ?`,
        params: [...setParams, id]
      });

      for (const [field, oldVal] of Object.entries(oldValues)) {
        const newVal = newValues[field];
        if (oldVal !== newVal) {
          operations.push({
            sql: `INSERT INTO audit_logs (
              id, sample_id, batch_id, operation, operator, operate_time,
              field_name, old_value, new_value, reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            params: [
              uuidv4(),
              id,
              existing.batchId,
              '修改样本',
              operator,
              now,
              field,
              oldVal,
              newVal,
              reason
            ]
          });
        }
      }

      runTransaction(operations);
    }

    return this.findById(id);
  }

  static updateStatus(id: string, status: SampleStatus, operator: string, remark?: string): void {
    const existing = this.findById(id);
    if (!existing) return;

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    const operations: Array<{ sql: string; params: any[] }> = [];

    operations.push({
      sql: 'UPDATE samples SET status = ?, updated_at = ? WHERE id = ?',
      params: [status, now, id]
    });

    operations.push({
      sql: `INSERT INTO status_transitions (
        id, batch_id, sample_id, from_status, to_status, operator, transition_time, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        uuidv4(),
        existing.batchId,
        id,
        existing.status,
        status,
        operator,
        now,
        remark || null
      ]
    });

    operations.push({
      sql: `INSERT INTO audit_logs (
        id, sample_id, batch_id, operation, operator, operate_time,
        field_name, old_value, new_value, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        uuidv4(),
        id,
        existing.batchId,
        '状态变更',
        operator,
        now,
        'status',
        existing.status,
        status,
        remark || '状态推进'
      ]
    });

    runTransaction(operations);
  }

  static delete(id: string): void {
    runExecute('DELETE FROM samples WHERE id = ?', [id]);
  }

  private static addAuditLog(data: Partial<AuditLog>): void {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    runExecute(
      `INSERT INTO audit_logs (
        id, sample_id, batch_id, operation, operator, operate_time,
        field_name, old_value, new_value, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        data.sampleId || null,
        data.batchId || null,
        data.operation!,
        data.operator!,
        now,
        data.fieldName || null,
        data.oldValue || null,
        data.newValue || null,
        data.reason || null
      ]
    );
  }

  private static mapRow(row: any): Sample {
    return {
      id: row.id,
      batchId: row.batch_id,
      barcode: row.barcode,
      groupName: row.group_name,
      seedType: row.seed_type,
      sowingDate: row.sowing_date,
      germinationDates: row.germination_dates ? JSON.parse(row.germination_dates) : [],
      totalSeeds: row.total_seeds,
      germinatedSeeds: row.germinated_seeds,
      germinationRate: row.germination_rate,
      status: row.status as SampleStatus,
      qcPassed: row.qc_passed === 1,
      qcRemark: row.qc_remark,
      abnormal: row.abnormal === 1,
      abnormalRemark: row.abnormal_remark,
      pathologyRemark: row.pathology_remark,
      handlingOpinion: row.handling_opinion,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
