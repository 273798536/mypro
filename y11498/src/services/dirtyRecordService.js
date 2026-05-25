const { db } = require('../models/db');
const auditTrailService = require('./auditTrailService');

const DIRTY_TYPES = {
  MISSING_FIELD: 'missing_field',
  CROSS_DATE: 'cross_date',
  NAME_CHANGE: 'name_change',
  AMOUNT_CONFLICT: 'amount_conflict',
  QUANTITY_CONFLICT: 'quantity_conflict',
  DUPLICATE_RECORD: 'duplicate_record'
};

class DirtyRecordService {
  getDirtyTypes() {
    return DIRTY_TYPES;
  }

  async recordDirtyRecord(options) {
    const {
      sourceTable,
      sourceId,
      sourceNo,
      dirtyType,
      dirtyDescription,
      fieldName,
      expectedValue,
      actualValue,
      rawData,
      correctionSuggestion
    } = options;

    const existing = await db.get(
      `SELECT id FROM dirty_records 
       WHERE source_table = ? AND source_id = ? AND dirty_type = ? AND field_name = ? AND is_corrected = 0
       LIMIT 1`,
      [sourceTable, sourceId, dirtyType, fieldName || '']
    );
    if (existing) {
      return { lastID: existing.id, changes: 0, skipped: true };
    }

    const result = await db.insert('dirty_records', {
      source_table: sourceTable,
      source_id: sourceId,
      source_no: sourceNo,
      dirty_type: dirtyType,
      dirty_description: dirtyDescription,
      field_name: fieldName,
      expected_value: expectedValue,
      actual_value: actualValue,
      raw_data: JSON.stringify(rawData),
      correction_suggestion: correctionSuggestion
    });

    await auditTrailService.logOperation({
      operationType: 'DIRTY_RECORD',
      operationModule: 'DIRTY',
      operationDesc: `标记脏记录: ${dirtyType}`,
      sourceTable,
      sourceId,
      sourceNo,
      afterData: { dirtyType, dirtyDescription, fieldName }
    });

    return result;
  }

  async checkMissingFields(table, data, requiredFields, sourceId, sourceNo) {
    const dirtyRecords = [];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        const record = await this.recordDirtyRecord({
          sourceTable: table,
          sourceId,
          sourceNo,
          dirtyType: DIRTY_TYPES.MISSING_FIELD,
          dirtyDescription: `缺少必填字段: ${field}`,
          fieldName: field,
          expectedValue: '非空值',
          actualValue: String(data[field]),
          rawData: data,
          correctionSuggestion: `请补充字段 ${field} 的值`
        });
        if (record && !record.skipped) {
          dirtyRecords.push(record);
        }
      }
    }
    return dirtyRecords;
  }

  async checkCrossDate(table, data, dateField1, dateField2, sourceId, sourceNo) {
    const dirtyRecords = [];
    const date1 = data[dateField1];
    const date2 = data[dateField2];
    
    if (date1 && date2 && new Date(date1) > new Date(date2)) {
      const record = await this.recordDirtyRecord({
        sourceTable: table,
        sourceId,
        sourceNo,
        dirtyType: DIRTY_TYPES.CROSS_DATE,
        dirtyDescription: `日期逻辑错误: ${dateField1} 晚于 ${dateField2}`,
        fieldName: `${dateField1},${dateField2}`,
        expectedValue: `${dateField1} <= ${dateField2}`,
        actualValue: `${date1} > ${date2}`,
        rawData: data,
        correctionSuggestion: `请检查并修正日期范围`
      });
      if (record && !record.skipped) {
        dirtyRecords.push(record);
      }
    }
    return dirtyRecords;
  }

  async checkNameChange(table, newData, oldData, nameField, sourceId, sourceNo) {
    const dirtyRecords = [];
    if (oldData && oldData[nameField] && newData[nameField] !== oldData[nameField]) {
      const record = await this.recordDirtyRecord({
        sourceTable: table,
        sourceId,
        sourceNo,
        dirtyType: DIRTY_TYPES.NAME_CHANGE,
        dirtyDescription: `名称变更: ${nameField}`,
        fieldName: nameField,
        expectedValue: oldData[nameField],
        actualValue: newData[nameField],
        rawData: { oldData, newData },
        correctionSuggestion: `请确认名称变更是否合理，如需保留变更请备注原因`
      });
      if (record && !record.skipped) {
        dirtyRecords.push(record);
      }
    }
    return dirtyRecords;
  }

  async checkAmountConflict(table, data1, data2, amountField, desc1, desc2, sourceId, sourceNo) {
    const dirtyRecords = [];
    const amount1 = parseFloat(data1[amountField]) || 0;
    const amount2 = parseFloat(data2[amountField]) || 0;
    
    if (Math.abs(amount1 - amount2) > 0.01) {
      const record = await this.recordDirtyRecord({
        sourceTable: table,
        sourceId: sourceId || data1.id,
        sourceNo: sourceNo || data1.invoice_no || data1.payment_no,
        dirtyType: DIRTY_TYPES.AMOUNT_CONFLICT,
        dirtyDescription: `金额冲突: ${desc1} vs ${desc2}`,
        fieldName: amountField,
        expectedValue: String(amount1),
        actualValue: String(amount2),
        rawData: { data1, data2 },
        correctionSuggestion: `请核对并修正金额，差异: ${(amount2 - amount1).toFixed(2)}`
      });
      if (record && !record.skipped) {
        dirtyRecords.push(record);
      }
    }
    return dirtyRecords;
  }

  async checkQuantityConflict(table, data, quantityField, expectedQuantity, sourceId, sourceNo) {
    const dirtyRecords = [];
    const actualQuantity = parseInt(data[quantityField]) || 0;
    const expected = parseInt(expectedQuantity) || 0;
    
    if (expected > 0 && actualQuantity !== expected) {
      const record = await this.recordDirtyRecord({
        sourceTable: table,
        sourceId: sourceId || data.id,
        sourceNo: sourceNo || data.invoice_no,
        dirtyType: DIRTY_TYPES.QUANTITY_CONFLICT,
        dirtyDescription: `数量冲突: ${quantityField}`,
        fieldName: quantityField,
        expectedValue: String(expected),
        actualValue: String(actualQuantity),
        rawData: data,
        correctionSuggestion: `请核对数量，实际: ${actualQuantity}，期望: ${expected}`
      });
      if (record && !record.skipped) {
        dirtyRecords.push(record);
      }
    }
    return dirtyRecords;
  }

  async checkInvoiceDirtyRecords(invoice) {
    const dirtyRecords = [];
    const { id, invoice_no } = invoice;

    const requiredInvoiceFields = ['invoice_date', 'expense_category', 'total_amount'];
    const missingResults = await this.checkMissingFields('invoices', invoice, requiredInvoiceFields, id, invoice_no);
    dirtyRecords.push(...missingResults);

    if (invoice.check_in_date && invoice.check_out_date) {
      const crossDateResults = await this.checkCrossDate(
        'invoices', invoice, 'check_in_date', 'check_out_date', id, invoice_no
      );
      dirtyRecords.push(...crossDateResults);
    }

    return dirtyRecords;
  }

  async checkAllExistingData() {
    const dirtyRecords = [];

    const invoices = await db.all('SELECT * FROM invoices');
    for (const invoice of invoices) {
      const results = await this.checkInvoiceDirtyRecords(invoice);
      dirtyRecords.push(...results);
    }

    const applications = await db.all('SELECT * FROM travel_applications');
    for (const app of applications) {
      const requiredFields = ['applicant_id', 'applicant_name', 'travel_start_date', 'travel_end_date', 'travel_destination'];
      const missingResults = await this.checkMissingFields(
        'travel_applications', app, requiredFields, app.id, app.application_no
      );
      dirtyRecords.push(...missingResults);

      const crossDateResults = await this.checkCrossDate(
        'travel_applications', app, 'travel_start_date', 'travel_end_date', app.id, app.application_no
      );
      dirtyRecords.push(...crossDateResults);
    }

    return dirtyRecords;
  }

  async correctDirtyRecord(id, correctionNote, correctedBy = 'system') {
    const dirtyRecord = await db.findById('dirty_records', id);
    if (!dirtyRecord) {
      throw new Error('脏记录不存在');
    }

    await db.update('dirty_records', {
      is_corrected: 1,
      correction_note: correctionNote,
      corrected_by: correctedBy,
      corrected_at: new Date().toISOString()
    }, 'id = ?', [id]);

    await auditTrailService.logUpdate(
      'DIRTY_RECORD',
      'dirty_records',
      id,
      dirtyRecord.source_no,
      dirtyRecord,
      { ...dirtyRecord, is_corrected: 1, correction_note: correctionNote },
      correctedBy
    );

    return db.findById('dirty_records', id);
  }

  async getDirtyRecords(filters = {}) {
    let sql = 'SELECT * FROM dirty_records WHERE 1=1';
    const params = [];

    if (filters.dirtyType) {
      sql += ' AND dirty_type = ?';
      params.push(filters.dirtyType);
    }
    if (filters.sourceTable) {
      sql += ' AND source_table = ?';
      params.push(filters.sourceTable);
    }
    if (filters.isCorrected !== undefined) {
      sql += ' AND is_corrected = ?';
      params.push(filters.isCorrected ? 1 : 0);
    }
    if (filters.sourceNo) {
      sql += ' AND source_no = ?';
      params.push(filters.sourceNo);
    }

    sql += ' ORDER BY created_at DESC';
    return db.all(sql, params);
  }

  async getDirtyRecordById(id) {
    return db.findById('dirty_records', id);
  }

  async getDirtyStatistics() {
    const stats = await db.all(`
      SELECT 
        dirty_type,
        COUNT(*) as count,
        SUM(CASE WHEN is_corrected = 1 THEN 1 ELSE 0 END) as corrected_count
      FROM dirty_records
      GROUP BY dirty_type
    `);

    const total = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_corrected = 1 THEN 1 ELSE 0 END) as total_corrected
      FROM dirty_records
    `);

    return {
      breakdown: stats,
      total: total.total || 0,
      totalCorrected: total.total_corrected || 0,
      totalPending: (total.total || 0) - (total.total_corrected || 0)
    };
  }
}

module.exports = new DirtyRecordService();
