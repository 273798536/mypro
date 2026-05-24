const db = require('../config/database');
const { generateSignature, getCurrentTimestamp } = require('../utils/common');
const FailedRecord = require('../models/FailedRecord');

class DataConsistencyService {
  static async generateRecordSignature(recordType, recordId, data) {
    const signature = generateSignature(data);
    
    return new Promise((resolve, reject) => {
      const now = getCurrentTimestamp();
      db.run(`INSERT INTO data_signatures (id, record_type, record_id, signature, created_at) 
              VALUES (?, ?, ?, ?, ?)`,
        [require('uuid').v4(), recordType, recordId, signature, now],
        function(err) {
          if (err) reject(err);
          else resolve(signature);
        }
      );
    });
  }

  static async verifyRecordSignature(recordType, recordId, currentData) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT signature FROM data_signatures WHERE record_type = ? AND record_id = ? ORDER BY created_at DESC LIMIT 1`,
        [recordType, recordId],
        (err, row) => {
          if (err) reject(err);
          else if (!row) resolve({ verified: true, message: '无历史签名记录' });
          else {
            const currentSignature = generateSignature(currentData);
            const isMatch = row.signature === currentSignature;
            resolve({
              verified: isMatch,
              stored_signature: row.signature,
              current_signature: currentSignature,
              message: isMatch ? '数据一致' : '数据已被修改'
            });
          }
        }
      );
    });
  }

  static async validateBatchForSummary(batch) {
    const errors = [];
    
    if (!batch.id) errors.push('缺少批次ID');
    if (!batch.batch_no) errors.push('缺少批次号');
    if (!batch.application_id) errors.push('缺少申请ID');
    if (!batch.product_code) errors.push('缺少产品编码');
    if (!batch.product_name) errors.push('缺少产品名称');
    if (typeof batch.quantity !== 'number' || batch.quantity <= 0) {
      errors.push('数量必须为正数');
    }
    if (typeof batch.unit_price !== 'number' || batch.unit_price < 0) {
      errors.push('单价不能为负数');
    }
    if (typeof batch.amount !== 'number' || batch.amount < 0) {
      errors.push('金额不能为负数');
    }
    
    const expectedAmount = batch.quantity * batch.unit_price;
    if (Math.abs(expectedAmount - batch.amount) > 0.01) {
      errors.push(`金额计算错误: 期望 ${expectedAmount}, 实际 ${batch.amount}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  static async safeGetBatchSummary(filters = {}) {
    const ReturnBatch = require('../models/ReturnBatch');
    const batches = await ReturnBatch.findAll(filters);
    
    const validBatches = [];
    const invalidBatches = [];
    
    for (const batch of batches) {
      const validation = await this.validateBatchForSummary(batch);
      if (validation.valid) {
        validBatches.push(batch);
      } else {
        invalidBatches.push({
          batch: batch,
          errors: validation.errors
        });
        
        await FailedRecord.create({
          record_type: 'INVALID_BATCH',
          record_data: batch,
          error_message: validation.errors.join('; '),
          source: 'DataConsistencyService.safeGetBatchSummary'
        });
      }
    }
    
    const summary = {
      total_count: validBatches.length,
      invalid_count: invalidBatches.length,
      total_quantity: validBatches.reduce((sum, b) => sum + b.quantity, 0),
      total_amount: validBatches.reduce((sum, b) => sum + b.amount, 0),
      valid_batches: validBatches,
      invalid_records: invalidBatches
    };
    
    return summary;
  }

  static async verifyExportConsistency(exportData, sourceData) {
    const exportSignature = generateSignature(exportData);
    const sourceSignature = generateSignature(sourceData);
    
    return {
      consistent: exportSignature === sourceSignature,
      export_signature: exportSignature,
      source_signature: sourceSignature,
      export_record_count: exportData.length,
      source_record_count: sourceData.length
    };
  }

  static async getDataVersion(recordType, recordId) {
    return new Promise((resolve, reject) => {
      db.all(`SELECT signature, created_at FROM data_signatures 
              WHERE record_type = ? AND record_id = ? 
              ORDER BY created_at DESC`,
        [recordType, recordId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = DataConsistencyService;
