const db = require('../config/database');
const ReturnBatch = require('../models/ReturnBatch');
const ReturnApplication = require('../models/ReturnApplication');
const StatusHistory = require('../models/StatusHistory');
const DataConsistencyService = require('./DataConsistencyService');
const { generateSignature } = require('../utils/common');

class AutoCheckService {
  static async runAllChecks() {
    const results = {
      timestamp: Math.floor(Date.now() / 1000),
      checks: {}
    };

    results.checks.duplicate_import = await this.checkDuplicateImport();
    results.checks.exception_retention = await this.checkExceptionRetention();
    results.checks.restart_history = await this.checkRestartHistory();
    results.checks.export_consistency = await this.checkExportConsistency();
    results.checks.summary_consistency = await this.checkSummaryConsistency();

    results.all_passed = Object.values(results.checks).every(c => c.passed);

    return results;
  }

  static async checkDuplicateImport() {
    try {
      const batches = await ReturnBatch.findAll();
      const batchNos = new Set();
      const duplicates = [];

      for (const batch of batches) {
        if (batchNos.has(batch.batch_no)) {
          duplicates.push(batch.batch_no);
        }
        batchNos.add(batch.batch_no);
      }

      const reentryHistories = await new Promise((resolve, reject) => {
        db.all(`SELECT COUNT(*) as count FROM status_history WHERE is_reentry = 1`, (err, row) => {
          if (err) reject(err);
          else resolve(row[0].count);
        });
      });

      return {
        passed: duplicates.length === 0,
        message: duplicates.length === 0 
          ? '无重复批次' 
          : `发现重复批次: ${duplicates.join(', ')}`,
        duplicate_count: duplicates.length,
        reentry_history_count: reentryHistories,
        details: duplicates
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  static async checkExceptionRetention() {
    try {
      const exceptions = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM return_applications WHERE exception_reserved = 1`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const results = [];
      for (const app of exceptions) {
        const batches = await ReturnBatch.findByApplicationId(app.id);
        const attachments = await new Promise((resolve, reject) => {
          db.all(`SELECT COUNT(*) as count FROM attachments WHERE application_id = ? AND is_exception = 1`, 
            [app.id], (err, row) => {
            if (err) reject(err);
            else resolve(row[0].count);
          });
        });

        const historyCount = await new Promise((resolve, reject) => {
          db.all(`SELECT COUNT(*) as count FROM status_history WHERE application_id = ? AND operation_type = 'MEMBER_CANCEL'`, 
            [app.id], (err, row) => {
            if (err) reject(err);
            else resolve(row[0].count);
          });
        });

        results.push({
          application_id: app.id,
          application_no: app.application_no,
          batch_count: batches.length,
          exception_attachment_count: attachments,
          member_cancel_history: historyCount > 0,
          member_canceled_at: app.member_canceled_at
        });
      }

      const allValid = results.every(r => r.member_cancel_history && r.member_canceled_at);

      return {
        passed: allValid,
        message: allValid ? '所有异常保留数据完整' : '部分异常保留数据不完整',
        exception_count: exceptions.length,
        details: results
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  static async checkRestartHistory() {
    try {
      const dbExists = await new Promise((resolve) => {
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='return_batches'`, 
          (err, row) => resolve(!!row));
      });

      const batchCount = await new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM return_batches`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      const historyCount = await new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM status_history`, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      return {
        passed: dbExists,
        message: dbExists ? '数据库持久化正常' : '数据库表不存在',
        batch_count: batchCount,
        history_count: historyCount,
        persistence_verified: batchCount > 0 || historyCount > 0 || dbExists
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  static async checkExportConsistency() {
    try {
      const batches = await ReturnBatch.findAll({ limit: 100 });
      
      if (batches.length === 0) {
        return {
          passed: true,
          message: '无数据可检查',
          record_count: 0
        };
      }

      const exportData = batches.map(b => ({
        batch_no: b.batch_no,
        product_code: b.product_code,
        quantity: b.quantity,
        amount: b.amount,
        status: b.status
      }));

      const sourceForComparison = batches.map(b => ({
        batch_no: b.batch_no,
        product_code: b.product_code,
        quantity: b.quantity,
        amount: b.amount,
        status: b.status
      }));

      const consistency = await DataConsistencyService.verifyExportConsistency(exportData, sourceForComparison);

      const detailChecks = [];
      for (const batch of batches.slice(0, 10)) {
        const detail = await ReturnBatch.getDetailed(batch.id);
        const history = await StatusHistory.getFullHistory(batch.id);
        
        const detailSig = generateSignature({
          status: detail.status,
          quantity: detail.quantity,
          amount: detail.amount
        });
        
        const batchSig = generateSignature({
          status: batch.status,
          quantity: batch.quantity,
          amount: batch.amount
        });

        detailChecks.push({
          batch_id: batch.id,
          consistent: detailSig === batchSig,
          has_history: history.length > 0
        });
      }

      const allDetailsConsistent = detailChecks.every(c => c.consistent);
      const allHasHistory = detailChecks.every(c => c.has_history);

      return {
        passed: consistency.consistent && allDetailsConsistent && allHasHistory,
        message: (consistency.consistent && allDetailsConsistent && allHasHistory) 
          ? '导出数据与详情数据一致' 
          : '数据一致性检查失败',
        export_consistent: consistency.consistent,
        details_consistent: allDetailsConsistent,
        has_history: allHasHistory,
        record_count: batches.length,
        checked_count: detailChecks.length,
        signature_match: consistency.export_signature === consistency.source_signature
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  static async checkSummaryConsistency() {
    try {
      const summary = await DataConsistencyService.safeGetBatchSummary();
      
      const directSum = await new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count, SUM(quantity) as total_quantity, SUM(amount) as total_amount 
                FROM return_batches`, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const validCountMatch = summary.total_count + summary.invalid_count === directSum.count;
      
      return {
        passed: validCountMatch,
        message: validCountMatch ? '汇总数据与明细数据一致' : '汇总数据与明细数据不一致',
        summary_count: summary.total_count,
        invalid_count: summary.invalid_count,
        direct_count: directSum.count,
        summary_quantity: summary.total_quantity,
        summary_amount: summary.total_amount,
        direct_quantity: directSum.total_quantity || 0,
        direct_amount: directSum.total_amount || 0
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }
}

module.exports = AutoCheckService;
