import db from '../db/database';
import crypto from 'crypto-js';
import { DataDictionary, DictionaryVersion, DictionaryComparison, DiagnosisResult } from '../../shared/types';
import auditService from './AuditService';

export class DictionaryService {
  public getAll(): DataDictionary[] {
    const rows = db.prepare('SELECT * FROM data_dictionary ORDER BY key').all() as any[];
    return rows.map(r => ({
      id: r.id,
      key: r.key,
      value: r.value,
      description: r.description,
      version: r.version,
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  }

  public getById(id: string): DataDictionary | undefined {
    const row = db.prepare('SELECT * FROM data_dictionary WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      description: row.description,
      version: row.version,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  public update(
    id: string,
    newValue: string,
    operatorId: string,
    operatorName: string,
    reason: string
  ): DataDictionary {
    const current = this.getById(id);
    if (!current) throw new Error('Dictionary item not found');

    const newVersion = current.version + 1;
    const now = Date.now();

    db.prepare(`
      UPDATE data_dictionary 
      SET value = ?, version = ?, created_at = ?
      WHERE id = ?
    `).run(newValue, newVersion, now, id);

    const versionId = 'dv-' + crypto.MD5('dictversion' + now + Math.random()).toString();
    db.prepare(`
      INSERT INTO dictionary_version 
      (id, dictionary_id, old_value, new_value, version, changed_by, change_time, change_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(versionId, id, current.value, newValue, newVersion, operatorId, now, reason);

    auditService.logOperation('dictionary_change', operatorId, operatorName, 
      `修改数据字典: ${current.key} 从 ${current.value} 改为 ${newValue}`, {
      reason,
      changes: [{ field: current.key, oldValue: current.value, newValue }]
    });

    return {
      ...current,
      value: newValue,
      version: newVersion,
      createdAt: now
    };
  }

  public getVersionHistory(dictionaryId: string): DictionaryVersion[] {
    const rows = db.prepare(`
      SELECT dv.*, u.name as changed_by_name
      FROM dictionary_version dv
      LEFT JOIN user u ON dv.changed_by = u.id
      WHERE dv.dictionary_id = ?
      ORDER BY dv.version DESC
    `).all(dictionaryId) as any[];
    return rows.map(r => ({
      id: r.id,
      dictionaryId: r.dictionary_id,
      oldValue: r.old_value,
      newValue: r.new_value,
      version: r.version,
      changedBy: r.changed_by_name || r.changed_by,
      changeTime: r.change_time,
      changeReason: r.change_reason
    }));
  }

  public compareVersions(dictionaryId: string, version1: number, version2: number): DictionaryComparison {
    const dict = this.getById(dictionaryId);
    if (!dict) throw new Error('Dictionary item not found');

    const v1Row = db.prepare(
      'SELECT * FROM dictionary_version WHERE dictionary_id = ? AND version = ?'
    ).get(dictionaryId, version1) as any;
    const v2Row = db.prepare(
      'SELECT * FROM dictionary_version WHERE dictionary_id = ? AND version = ?'
    ).get(dictionaryId, version2) as any;

    const v1Value = v1Row ? v1Row.new_value : dict.value;
    const v2Value = v2Row ? v2Row.new_value : dict.value;

    const oldThreshold = parseFloat(v1Value);
    const newThreshold = parseFloat(v2Value);

    const allBatches = db.prepare(`
      SELECT b.id, b.timestamp, b.raw_data, r.severity, r.issue_type, r.description
      FROM diagnosis_batch b
      LEFT JOIN diagnosis_result r ON b.id = r.batch_id
      WHERE b.status = 'completed'
      ORDER BY b.timestamp DESC
    `).all() as any[];

    const affectedDiagnoses: DictionaryComparison['affectedDiagnoses'] = [];

    const fieldMap: Record<string, string> = {
      'pool.max_connections_warning': 'usageRate',
      'pool.max_connections_critical': 'usageRate',
      'pool.waiting_warning': 'waitingRequests',
      'pool.timeout_warning': 'timeoutCount',
      'pool.error_rate_warning': 'errorRate'
    };

    const fieldKey = fieldMap[dict.key] || dict.key;

    allBatches.forEach(batch => {
      const rawData = JSON.parse(batch.raw_data);
      let oldConclusion = 'normal';
      let newConclusion = 'normal';
      let changed = false;

      rawData.forEach((data: any) => {
        let value: number;
        if (fieldKey === 'usageRate') {
          value = (data.totalConnections / data.maxConnections) * 100;
        } else {
          value = data[fieldKey] || 0;
        }

        if (value >= oldThreshold && value < newThreshold) {
          oldConclusion = 'warning';
          newConclusion = 'normal';
          changed = true;
        } else if (value < oldThreshold && value >= newThreshold) {
          oldConclusion = 'normal';
          newConclusion = 'warning';
          changed = true;
        } else if (value >= oldThreshold && value >= newThreshold) {
          oldConclusion = 'warning';
          newConclusion = 'warning';
        }
      });

      affectedDiagnoses.push({
        batchId: batch.id,
        oldConclusion,
        newConclusion,
        changed
      });
    });

    return {
      dictionaryId,
      key: dict.key,
      version1,
      version2,
      oldValue: v1Value,
      newValue: v2Value,
      affectedDiagnoses
    };
  }

  public getLatestComparison(dictionaryId: string): DictionaryComparison {
    const versions = this.getVersionHistory(dictionaryId);
    if (versions.length === 0) {
      return this.compareVersions(dictionaryId, 1, 1);
    }
    const latest = versions[0];
    return this.compareVersions(dictionaryId, latest.version - 1, latest.version);
  }
}

export default new DictionaryService();
