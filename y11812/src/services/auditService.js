const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const commissionEngine = require('./commissionEngine');

class AuditService {
  async createBatch(period, createdBy = 'system') {
    return new Promise((resolve, reject) => {
      const batchId = uuidv4();
      const batchNo = `AUDIT-${period}-${Date.now().toString(36).toUpperCase()}`;
      
      db.run(`
        INSERT INTO audit_batches (id, batch_no, period, status, created_by)
        VALUES (?, ?, ?, 'processing', ?)
      `, [batchId, batchNo, period, createdBy], function(err) {
        if (err) reject(err);
        else resolve({ id: batchId, batchNo, period });
      });
    });
  }

  async runAudit(batchId, period, storeIds = null) {
    const stores = await this.getActiveStores(storeIds);
    const records = [];
    let issueCount = 0;

    for (const store of stores) {
      const result = await commissionEngine.calculateStoreRent(store.id, period);
      
      if (!result.error) {
        const previousRecord = await this.getLatestRecord(store.id, period);
        
        if (previousRecord) {
          result.previous_record_id = previousRecord.id;
          result.changed_fields = this.compareRecords(previousRecord, result);
        }

        await this.saveAuditRecord(batchId, result);
        records.push(result);
        
        if (result.status !== 'calculated' || result.issueType) {
          issueCount++;
        }
      }
    }

    await this.updateBatchStatus(batchId, 'completed', stores.length, issueCount);
    
    return { batchId, totalRecords: records.length, issueCount, records };
  }

  getActiveStores(storeIds = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM stores WHERE status = "active"';
      let params = [];
      
      if (storeIds && storeIds.length > 0) {
        query += ' AND id IN (' + storeIds.map(() => '?').join(',') + ')';
        params = storeIds;
      }
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getLatestRecord(storeId, period) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM audit_records 
        WHERE store_id = ? AND period = ?
        ORDER BY created_at DESC LIMIT 1
      `, [storeId, period], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  compareRecords(oldRecord, newRecord) {
    const changes = [];
    const fields = ['base_rent', 'commission_amount', 'total_rent', 'sales_amount'];
    
    for (const field of fields) {
      const oldVal = oldRecord[field] || 0;
      const newVal = newRecord[field.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] || 0;
      
      if (Math.abs(oldVal - newVal) > 0.01) {
        changes.push({
          field,
          oldValue: oldVal,
          newValue: newVal,
          diff: newVal - oldVal,
          diffPercent: oldVal > 0 ? ((newVal - oldVal) / oldVal * 100).toFixed(2) + '%' : 'N/A'
        });
      }
    }
    
    return JSON.stringify(changes);
  }

  saveAuditRecord(batchId, result) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO audit_records (
          id, batch_id, store_id, contract_id, period,
          base_rent, commission_amount, total_rent, sales_amount,
          refund_adjustment, activity_adjustment, status,
          issue_type, issue_description, correction_hint, follow_up_action,
          trial_calculation, previous_record_id, changed_fields
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        result.id, batchId, result.storeId, result.contractId, result.period,
        result.baseRent, result.commissionAmount, result.totalRent, result.salesAmount,
        result.refundAdjustment, result.activityAdjustment, result.status,
        result.issueType, result.issueDescription, result.correctionHint, result.followUpAction,
        result.trialCalculation, result.previous_record_id, result.changed_fields
      ], function(err) {
        if (err) reject(err);
        else resolve(result.id);
      });
    });
  }

  updateBatchStatus(batchId, status, totalRecords = null, issueCount = null) {
    return new Promise((resolve, reject) => {
      const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const params = [status];
      
      if (totalRecords !== null) {
        updates.push('total_records = ?');
        params.push(totalRecords);
      }
      if (issueCount !== null) {
        updates.push('issue_count = ?');
        params.push(issueCount);
      }
      
      params.push(batchId);
      
      db.run(`
        UPDATE audit_batches SET ${updates.join(', ')} WHERE id = ?
      `, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  getAuditRecords(batchId, options = {}) {
    return new Promise((resolve, reject) => {
      const { status, storeId, page = 1, pageSize = 100 } = options;
      
      let query = `
        SELECT ar.*, s.store_name, s.store_code, s.mall_name,
               c.contract_no, c.version as contract_version
        FROM audit_records ar
        JOIN stores s ON ar.store_id = s.id
        LEFT JOIN contracts c ON ar.contract_id = c.id
        WHERE ar.batch_id = ?
      `;
      let params = [batchId];
      
      if (status) {
        query += ' AND ar.status = ?';
        params.push(status);
      }
      if (storeId) {
        query += ' AND ar.store_id = ?';
        params.push(storeId);
      }
      
      query += ' ORDER BY ar.created_at DESC LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.trial_calculation) {
              row.trial_calculation = JSON.parse(row.trial_calculation);
            }
            if (row.changed_fields) {
              row.changed_fields = JSON.parse(row.changed_fields);
            }
          });
          resolve(rows);
        }
      });
    });
  }

  getAuditRecordDetail(recordId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT ar.*, s.store_name, s.store_code, s.mall_name,
               c.contract_no, c.version as contract_version,
               c.effective_date as contract_effective_date,
               c.rent_type, c.base_rent as contract_base_rent
        FROM audit_records ar
        JOIN stores s ON ar.store_id = s.id
        LEFT JOIN contracts c ON ar.contract_id = c.id
        WHERE ar.id = ?
      `, [recordId], async (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          if (row.trial_calculation) {
            row.trial_calculation = JSON.parse(row.trial_calculation);
          }
          if (row.changed_fields) {
            row.changed_fields = JSON.parse(row.changed_fields);
          }
          
          row.sales_detail = await this.getSalesAggregation(row.store_id, row.period);
          row.status_history = await this.getStatusHistory(recordId);
          row.version_history = await this.getVersionHistory(row.store_id, row.period, recordId);
        }
        
        resolve(row);
      });
    });
  }

  getSalesAggregation(storeId, period) {
    return new Promise((resolve, reject) => {
      const [year, month] = period.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      
      db.all(`
        SELECT category,
               COUNT(*) as transaction_count,
               SUM(gross_amount) as total_gross,
               SUM(refund_amount) as total_refund,
               SUM(net_amount) as total_net,
               SUM(activity_deduction) as total_activity_deduction
        FROM sales_data
        WHERE store_id = ? AND sale_date BETWEEN ? AND ?
        GROUP BY category WITH ROLLUP
        ORDER BY category
      `, [storeId, startDate, endDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getStatusHistory(recordId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM status_transitions
        WHERE record_id = ?
        ORDER BY created_at ASC
      `, [recordId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getVersionHistory(storeId, period, currentRecordId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT id, period, total_rent, sales_amount, commission_amount,
               status, created_at, changed_fields
        FROM audit_records
        WHERE store_id = ? AND period = ? AND id != ?
        ORDER BY created_at DESC
      `, [storeId, period, currentRecordId], (err, rows) => {
        if (err) reject(err);
        else {
          rows.forEach(row => {
            if (row.changed_fields) {
              row.changed_fields = JSON.parse(row.changed_fields);
            }
          });
          resolve(rows);
        }
      });
    });
  }

  async transitionStatus(recordId, toStatus, reason, operator = 'system') {
    const record = await this.getAuditRecordDetail(recordId);
    if (!record) {
      throw new Error('记录不存在');
    }

    const fromStatus = record.status;
    const validTransitions = this.getValidTransitions(fromStatus);
    
    if (!validTransitions.includes(toStatus)) {
      throw new Error(`无效的状态转换: ${fromStatus} -> ${toStatus}`);
    }

    await this.recordStatusTransition(recordId, fromStatus, toStatus, reason, operator);
    await this.updateRecordStatus(recordId, toStatus);

    return { fromStatus, toStatus, reason, operator };
  }

  getValidTransitions(currentStatus) {
    const transitions = {
      'pending': ['calculated', 'pending_confirmation', 'cancelled'],
      'calculated': ['pending_confirmation', 'confirmed', 're_calculating'],
      'pending_confirmation': ['confirmed', 're_calculating', 'pending'],
      'confirmed': ['re_calculating', 'finalized'],
      're_calculating': ['calculated', 'pending_confirmation'],
      'finalized': ['re_calculating'],
      'cancelled': ['pending']
    };
    return transitions[currentStatus] || [];
  }

  recordStatusTransition(recordId, fromStatus, toStatus, reason, operator) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO status_transitions (id, record_id, from_status, to_status, transition_reason, operator)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [uuidv4(), recordId, fromStatus, toStatus, reason, operator], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  updateRecordStatus(recordId, status) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE audit_records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [status, recordId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  getBatches(options = {}) {
    return new Promise((resolve, reject) => {
      const { period, status, page = 1, pageSize = 50 } = options;
      
      let query = 'SELECT * FROM audit_batches WHERE 1=1';
      let params = [];
      
      if (period) {
        query += ' AND period = ?';
        params.push(period);
      }
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);
      
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getImpactAnalysis(storeId, period, changes) {
    const previous = this.getLatestRecord(storeId, period);
    return {
      previous,
      changes,
      impact: '计算中...'
    };
  }
}

module.exports = new AuditService();
