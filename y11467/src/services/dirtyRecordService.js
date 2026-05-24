const moment = require('moment');
const {
  dirtyRecordDAO,
  sampleTransferOrderDAO,
  sizeModificationOpinionDAO,
  fabricInventoryDAO,
  retryQueueDAO,
  db
} = require('../dao');

const REQUIRED_FIELDS = {
  transfer: ['order_no', 'style_code', 'quantity', 'transfer_date'],
  size: ['style_code', 'size', 'after_value', 'modify_date'],
  fabric: ['style_code', 'fabric_code', 'in_out_type', 'quantity', 'operation_date']
};

class DirtyRecordService {
  async detectAndCreateDirtyRecords(queueId, recordType, records) {
    const dirtyRecords = [];

    for (const record of records) {
      const issues = this.analyzeRecord(recordType, record);
      
      if (issues.length > 0) {
        const errorType = this.determineErrorType(issues);
        const errorFields = issues.map(i => i.field);
        const errorMessage = issues.map(i => i.message).join('; ');
        const suggestion = this.generateSuggestion(errorType, issues, record);

        const dirtyId = await dirtyRecordDAO.createDirty(
          queueId,
          recordType,
          record,
          errorType,
          errorFields,
          errorMessage,
          suggestion
        );

        dirtyRecords.push({ dirtyId, record, issues });
      }
    }

    return dirtyRecords;
  }

  analyzeRecord(recordType, record) {
    const issues = [];
    const required = REQUIRED_FIELDS[recordType] || [];

    for (const field of required) {
      if (!record[field] && record[field] !== 0) {
        issues.push({
          type: 'missing_field',
          field,
          message: `缺少必填字段: ${field}`
        });
      }
    }

    const dateField = recordType === 'transfer' ? 'transfer_date' : 
                      recordType === 'size' ? 'modify_date' : 'operation_date';
    
    if (record[dateField]) {
      const crossDayIssue = this.checkCrossDay(record[dateField]);
      if (crossDayIssue) {
        issues.push(crossDayIssue);
      }
    }

    if (recordType === 'fabric') {
      const conflictIssue = this.checkQuantityConflict(record);
      if (conflictIssue) {
        issues.push(conflictIssue);
      }
    }

    const nameChangeIssue = this.checkNameChange(recordType, record);
    if (nameChangeIssue) {
      issues.push(nameChangeIssue);
    }

    return issues;
  }

  checkCrossDay(dateStr) {
    try {
      const date = moment(dateStr);
      const today = moment().startOf('day');
      const daysDiff = today.diff(date, 'days');

      if (daysDiff > 0) {
        return {
          type: 'cross_day',
          field: 'date',
          message: `记录日期为 ${daysDiff} 天前`,
          detail: { daysDiff, originalDate: dateStr }
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  checkQuantityConflict(record) {
    const quantity = parseFloat(record.quantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      return {
        type: 'quantity_conflict',
        field: 'quantity',
        message: `数量无效: ${record.quantity}`,
        detail: { quantity: record.quantity }
      };
    }

    return null;
  }

  checkNameChange(recordType, record) {
    if (recordType === 'transfer' && record.style_name && record.style_code) {
      const expectedPattern = /^[A-Z]{2}\d{4}$/;
      if (!expectedPattern.test(record.style_code)) {
        return {
          type: 'name_change',
          field: 'style_code',
          message: `款号格式异常: ${record.style_code}`,
          detail: { styleCode: record.style_code, styleName: record.style_name }
        };
      }
    }
    return null;
  }

  determineErrorType(issues) {
    const typePriority = ['quantity_conflict', 'cross_day', 'name_change', 'missing_field'];
    for (const type of typePriority) {
      if (issues.some(i => i.type === type)) {
        return type;
      }
    }
    return 'unknown';
  }

  generateSuggestion(errorType, issues, record) {
    const suggestions = {
      missing_field: () => {
        const fields = issues.filter(i => i.type === 'missing_field').map(i => i.field);
        return `请补充以下字段: ${fields.join(', ')}`;
      },
      cross_day: () => {
        const issue = issues.find(i => i.type === 'cross_day');
        return `跨日记录，请确认日期 ${issue.detail.originalDate} 是否正确，如需调整请更新为当日日期`;
      },
      name_change: () => {
        return `款号/名称可能已变更，请核对最新款号和名称后更新`;
      },
      quantity_conflict: () => {
        return `数量异常，请核对实际数量后修正`;
      }
    };

    const generator = suggestions[errorType];
    return generator ? generator() : '请人工审核该记录';
  }

  async correctDirtyRecord(dirtyId, correctedData, operator) {
    const dirty = await dirtyRecordDAO.getById(dirtyId);
    if (!dirty) {
      throw new Error('脏记录不存在');
    }

    await dirtyRecordDAO.correct(dirtyId, correctedData, operator);

    const queue = await retryQueueDAO.getById(dirty.queue_id);
    const originalData = JSON.parse(dirty.original_data);
    const mergedData = { 
      ...originalData, 
      ...correctedData,
      queue_id: dirty.queue_id,
      style_code: correctedData.style_code || originalData.style_code || (queue && queue.style_code)
    };

    switch (dirty.record_type) {
      case 'transfer':
        await sampleTransferOrderDAO.createWithVersion(mergedData, operator);
        break;
      case 'size':
        await sizeModificationOpinionDAO.createWithVersion(mergedData, operator);
        break;
      case 'fabric':
        await fabricInventoryDAO.createWithVersion(mergedData, operator);
        break;
    }

    if (queue && queue.status === 'manual') {
      await retryQueueDAO.update(dirty.queue_id, {
        status: 'pending',
        next_retry_at: new Date().toISOString()
      });
    }

    return true;
  }

  async getPendingDirtyRecords() {
    const records = await dirtyRecordDAO.getPending();
    return records.map(r => ({
      ...r,
      original_data: JSON.parse(r.original_data),
      error_fields: JSON.parse(r.error_fields),
      corrected_data: r.corrected_data ? JSON.parse(r.corrected_data) : null
    }));
  }

  async autoCorrect(queueId) {
    const dirtyRecords = await dirtyRecordDAO.findAll('WHERE queue_id = ? AND status = ?', [queueId, 'pending']);
    const autoCorrected = [];

    for (const dirty of dirtyRecords) {
      const original = JSON.parse(dirty.original_data);
      const correction = this.tryAutoCorrect(dirty.error_type, original);
      
      if (correction.success) {
        await this.correctDirtyRecord(dirty.id, correction.data, 'system-auto');
        autoCorrected.push({ dirtyId: dirty.id, correction: correction.data });
      }
    }

    return autoCorrected;
  }

  tryAutoCorrect(errorType, record) {
    switch (errorType) {
      case 'cross_day':
        return {
          success: true,
          data: {
            ...record,
            transfer_date: moment().format('YYYY-MM-DD'),
            modify_date: moment().format('YYYY-MM-DD'),
            operation_date: moment().format('YYYY-MM-DD')
          }
        };
      case 'missing_field':
        const filled = { ...record };
        if (!filled.status) filled.status = 'pending';
        if (!filled.round) filled.round = 1;
        return { success: true, data: filled };
      default:
        return { success: false };
    }
  }

  async getDirtyStats() {
    const allDirty = await dirtyRecordDAO.findAll();
    
    const stats = {
      total: allDirty.length,
      pending: 0,
      corrected: 0,
      byType: {},
      byField: {}
    };

    for (const dirty of allDirty) {
      if (dirty.status === 'pending') stats.pending++;
      if (dirty.status === 'corrected') stats.corrected++;

      stats.byType[dirty.error_type] = (stats.byType[dirty.error_type] || 0) + 1;

      const fields = JSON.parse(dirty.error_fields || '[]');
      for (const field of fields) {
        stats.byField[field] = (stats.byField[field] || 0) + 1;
      }
    }

    return stats;
  }
}

module.exports = new DirtyRecordService();
