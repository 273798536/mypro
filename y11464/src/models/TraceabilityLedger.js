const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const AuditLog = require('./AuditLog');
const Implant = require('./Implant');
const Appointment = require('./Appointment');
const SupplierInvoice = require('./SupplierInvoice');
const FailedRecord = require('./FailedRecord');

const LEDGER_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REJECTED: 'rejected',
  CONFIRMED: 'confirmed',
  READONLY: 'readonly'
};

const STATUS_TRANSITIONS = {
  [LEDGER_STATUS.DRAFT]: [LEDGER_STATUS.SUBMITTED],
  [LEDGER_STATUS.SUBMITTED]: [LEDGER_STATUS.REJECTED, LEDGER_STATUS.CONFIRMED],
  [LEDGER_STATUS.REJECTED]: [LEDGER_STATUS.SUBMITTED, LEDGER_STATUS.READONLY],
  [LEDGER_STATUS.CONFIRMED]: [LEDGER_STATUS.READONLY],
  [LEDGER_STATUS.READONLY]: []
};

class TraceabilityLedger {
  static generateLedgerNo() {
    const date = moment().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TL-${date}-${random}`;
  }

  static canTransition(currentStatus, nextStatus) {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(nextStatus);
  }

  static async validateData(data) {
    const errors = [];
    
    if (!data.implant_batch_number) {
      errors.push('种植体批号不能为空');
    }
    
    if (!data.usage_quantity || data.usage_quantity <= 0) {
      errors.push('使用数量必须大于0');
    }
    
    if (!data.created_by) {
      errors.push('创建人不能为空');
    }
    
    const implant = await Implant.findByBatchNumber(data.implant_batch_number);
    if (!implant) {
      errors.push(`种植体批号 ${data.implant_batch_number} 不存在`);
    } else if (implant.current_stock < data.usage_quantity) {
      errors.push(`种植体库存不足，当前库存: ${implant.current_stock}，需要: ${data.usage_quantity}`);
    }
    
    return errors;
  }

  static async create(data, operator = {}) {
    const errors = await this.validateData(data);
    if (errors.length > 0) {
      await FailedRecord.create({
        record_type: 'ledger_create',
        record_data: JSON.stringify(data),
        error_message: errors.join('; '),
        error_code: 'VALIDATION_ERROR'
      });
      throw new Error(`数据验证失败: ${errors.join('; ')}`);
    }

    const implant = await Implant.findByBatchNumber(data.implant_batch_number);
    
    let appointmentId = data.appointment_id || null;
    if (!appointmentId && data.appointment_no) {
      const appointment = await Appointment.findByAppointmentNo(data.appointment_no);
      if (appointment) {
        appointmentId = appointment.id;
      }
    }
    
    let invoiceId = data.invoice_id || null;
    if (!invoiceId && data.invoice_no) {
      const invoice = await SupplierInvoice.findByInvoiceNo(data.invoice_no);
      if (invoice) {
        invoiceId = invoice.id;
      }
    }
    
    const id = uuidv4();
    const now = moment().toISOString();
    const ledgerNo = this.generateLedgerNo();
    const stockAfter = implant.current_stock;
    
    await db.run(`
      INSERT INTO traceability_ledgers (
        id, ledger_no, implant_id, implant_batch_number, appointment_id,
        appointment_no, invoice_id, invoice_no, patient_name, doctor_name,
        department, usage_date, usage_quantity, stock_after, status,
        supervisor_comment, change_reason, created_by, created_at,
        updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      ledgerNo,
      implant.id,
      data.implant_batch_number,
      appointmentId,
      data.appointment_no || null,
      invoiceId,
      data.invoice_no || null,
      data.patient_name || null,
      data.doctor_name || null,
      data.department || null,
      data.usage_date || now,
      data.usage_quantity,
      stockAfter,
      LEDGER_STATUS.DRAFT,
      data.supervisor_comment || null,
      data.change_reason || null,
      data.created_by,
      now,
      now,
      1
    );
    
    await AuditLog.create({
      ledger_id: id,
      action: 'create',
      new_value: { 
        status: LEDGER_STATUS.DRAFT, 
        appointment_id: appointmentId,
        invoice_id: invoiceId,
        stock_after: stockAfter,
        ...data 
      },
      operator_id: operator.id || data.created_by,
      operator_name: operator.name || 'system',
      operator_role: operator.role || 'replenisher',
      remark: '创建台账记录（草稿状态，库存待确认后扣减）'
    });
    
    return this.findById(id);
  }

  static async findById(id) {
    return await db.get('SELECT * FROM traceability_ledgers WHERE id = ?', id);
  }

  static async findByLedgerNo(ledgerNo) {
    return await db.get('SELECT * FROM traceability_ledgers WHERE ledger_no = ?', ledgerNo);
  }

  static async findAll(options = {}) {
    let sql = 'SELECT * FROM traceability_ledgers WHERE 1=1';
    const params = [];
    
    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    
    if (options.implant_batch_number) {
      sql += ' AND implant_batch_number LIKE ?';
      params.push(`%${options.implant_batch_number}%`);
    }
    
    if (options.appointment_no) {
      sql += ' AND appointment_no LIKE ?';
      params.push(`%${options.appointment_no}%`);
    }
    
    if (options.invoice_no) {
      sql += ' AND invoice_no LIKE ?';
      params.push(`%${options.invoice_no}%`);
    }
    
    if (options.start_date) {
      sql += ' AND usage_date >= ?';
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      sql += ' AND usage_date <= ?';
      params.push(options.end_date);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    return await db.all(sql, ...params);
  }

  static async transitionStatus(id, targetStatus, operator, options = {}) {
    const ledger = await this.findById(id);
    if (!ledger) {
      throw new Error('台账记录不存在');
    }
    
    if (!this.canTransition(ledger.status, targetStatus)) {
      throw new Error(`无法从 ${ledger.status} 状态转换到 ${targetStatus} 状态`);
    }
    
    const now = moment().toISOString();
    const oldStatus = ledger.status;
    const newVersion = ledger.version + 1;
    
    const updateData = {
      status: targetStatus,
      updated_at: now,
      version: newVersion
    };
    
    if (targetStatus === LEDGER_STATUS.CONFIRMED) {
      updateData.confirmed_at = now;
      updateData.confirmed_by = operator.name;
      
      const implant = await Implant.findById(ledger.implant_id);
      if (implant && ledger.stock_after === implant.current_stock) {
        await Implant.updateStock(ledger.implant_id, -ledger.usage_quantity);
        updateData.stock_after = implant.current_stock - ledger.usage_quantity;
      }
    }
    
    if (options.change_reason) {
      updateData.change_reason = options.change_reason;
    }
    
    if (options.supervisor_comment) {
      updateData.supervisor_comment = options.supervisor_comment;
    }
    
    const updates = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updateData), id];
    
    await db.run(`UPDATE traceability_ledgers SET ${updates} WHERE id = ?`, ...values);
    
    let auditRemark = options.remark || '状态变更';
    if (targetStatus === LEDGER_STATUS.CONFIRMED) {
      auditRemark += '，库存已扣减';
    }
    
    await AuditLog.create({
      ledger_id: id,
      action: `status_change_${oldStatus}_to_${targetStatus}`,
      old_value: { status: oldStatus, version: ledger.version },
      new_value: { status: targetStatus, version: newVersion, ...updateData },
      changed_fields: Object.keys(updateData),
      operator_id: operator.id,
      operator_name: operator.name,
      operator_role: operator.role,
      remark: auditRemark
    });
    
    return this.findById(id);
  }

  static async submit(id, operator) {
    return this.transitionStatus(id, LEDGER_STATUS.SUBMITTED, operator, {
      remark: '提交审核'
    });
  }

  static async reject(id, operator, reason) {
    return this.transitionStatus(id, LEDGER_STATUS.REJECTED, operator, {
      change_reason: reason,
      remark: '驳回申请'
    });
  }

  static async confirm(id, operator) {
    return this.transitionStatus(id, LEDGER_STATUS.CONFIRMED, operator, {
      remark: '审核通过'
    });
  }

  static async markReadonly(id, operator) {
    return this.transitionStatus(id, LEDGER_STATUS.READONLY, operator, {
      remark: '标记为只读审计'
    });
  }

  static async getSummary(options = {}) {
    let sql = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(usage_quantity) as total_quantity
      FROM traceability_ledgers 
      WHERE 1=1
    `;
    const params = [];
    
    if (options.start_date) {
      sql += ' AND usage_date >= ?';
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      sql += ' AND usage_date <= ?';
      params.push(options.end_date);
    }
    
    sql += ' GROUP BY status';
    
    const results = await db.all(sql, ...params);
    
    const summary = {
      total: 0,
      by_status: {},
      total_quantity: 0
    };
    
    results.forEach(row => {
      summary.by_status[row.status] = row.count;
      summary.total += row.count;
      summary.total_quantity += row.total_quantity || 0;
    });
    
    return summary;
  }

  static async getDetailedRecords(options = {}) {
    let sql = `
      SELECT 
        tl.*,
        i.product_name,
        i.manufacturer,
        i.current_stock as implant_current_stock,
        a.patient_phone,
        a.treatment_type,
        si.supplier_name,
        si.invoice_date
      FROM traceability_ledgers tl
      LEFT JOIN implants i ON tl.implant_id = i.id
      LEFT JOIN appointments a ON tl.appointment_id = a.id
      LEFT JOIN supplier_invoices si ON tl.invoice_id = si.id
      WHERE 1=1
    `;
    const params = [];
    
    if (options.status) {
      sql += ' AND tl.status = ?';
      params.push(options.status);
    }
    
    if (options.start_date) {
      sql += ' AND tl.usage_date >= ?';
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      sql += ' AND tl.usage_date <= ?';
      params.push(options.end_date);
    }
    
    sql += ' ORDER BY tl.created_at DESC';
    
    return await db.all(sql, ...params);
  }
}

module.exports = { TraceabilityLedger, LEDGER_STATUS };
