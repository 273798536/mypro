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
        dirtyRecords.push(record);
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
      dirtyRecords.push(record);
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
      dirtyRecords.push(record);
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
        sourceId,
        sourceNo,
        dirtyType: DIRTY_TYPES.AMOUNT_CONFLICT,
        dirtyDescription: `金额冲突: ${desc1} vs ${desc2}`,
        fieldName: amountField,
        expectedValue: String(amount1),
        actualValue: String(amount2),
        rawData: { data1, data2 },
        correctionSuggestion: `请核对并修正金额，差异: ${(amount2 - amount1).toFixed(2)}`
      });
      dirtyRecords.push(record);
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
