const { ReturnApplication, QualityPhoto, LogisticsReceipt, PriceAdjustment, sequelize } = require('../models');
const ExceptionService = require('./ExceptionService');
const TraceService = require('./TraceService');
const logger = require('../config/logger');

class ReconciliationService {
  static async reconcileByBatch(batchNo) {
    logger.info(`开始对账批次: ${batchNo}`);
    const results = {
      batchNo,
      totalApplications: 0,
      totalPhotos: 0,
      totalReceipts: 0,
      totalAdjustments: 0,
      mismatches: [],
      missingDocs: [],
      exceptions: []
    };

    const t = await sequelize.transaction();
    try {
      const applications = await ReturnApplication.findAll({
        where: { batch_no: batchNo, is_duplicate: false },
        include: ['qualityPhotos', 'logisticsReceipts', 'priceAdjustments']
      });
      results.totalApplications = applications.length;

      for (const app of applications) {
        const appCheck = await this.checkApplicationIntegrity(app);
        results.mismatches.push(...appCheck.mismatches);
        results.missingDocs.push(...appCheck.missingDocs);
        results.totalPhotos += app.qualityPhotos?.length || 0;
        results.totalReceipts += app.logisticsReceipts?.length || 0;
        results.totalAdjustments += app.priceAdjustments?.length || 0;
      }

      for (const mismatch of results.mismatches) {
        const exception = await ExceptionService.recordDataMismatch(
          mismatch.record, mismatch.field, mismatch.expected, mismatch.actual,
          batchNo, mismatch.record.supplier_code
        );
        results.exceptions.push(exception.id);
      }

      for (const missing of results.missingDocs) {
        const exception = await ExceptionService.recordMissingDocument(
          missing.recordType, missing.recordId, missing.docType,
          batchNo, missing.supplierCode
        );
        results.exceptions.push(exception.id);
      }

      await TraceService.recordReconciliation(
        results.totalApplications + results.totalPhotos + results.totalReceipts + results.totalAdjustments,
        results
      );

      await t.commit();
      logger.info(`对账完成: ${batchNo}, 异常数: ${results.exceptions.length}`);
      return results;
    } catch (error) {
      await t.rollback();
      logger.error(`对账失败: ${batchNo}`, error);
      throw error;
    }
  }

  static async checkApplicationIntegrity(application) {
    const mismatches = [];
    const missingDocs = [];

    if (!application.qualityPhotos || application.qualityPhotos.length === 0) {
      missingDocs.push({
        recordType: 'ReturnApplication',
        recordId: application.id,
        docType: '质检照片',
        supplierCode: application.supplier_code
      });
    }

    if (!application.logisticsReceipts || application.logisticsReceipts.length === 0) {
      missingDocs.push({
        recordType: 'ReturnApplication',
        recordId: application.id,
        docType: '物流回单',
        supplierCode: application.supplier_code
      });
    }

    const totalPhotoQty = (application.qualityPhotos || []).reduce((sum, p) => sum + 1, 0);
    if (totalPhotoQty > 0 && totalPhotoQty < application.apply_quantity * 0.5) {
      mismatches.push({
        record: application,
        field: 'photo_coverage',
        expected: application.apply_quantity,
        actual: totalPhotoQty
      });
    }

    if (application.priceAdjustments && application.priceAdjustments.length > 0) {
      for (const adj of application.priceAdjustments) {
        if (adj.status === 'pending') {
          mismatches.push({
            record: adj,
            field: 'status',
            expected: 'approved',
            actual: adj.status
          });
        }
      }
    }

    const expectedRemaining = application.apply_quantity - (application.supplier_confirm_quantity || 0);
    if (application.remaining_quantity !== expectedRemaining) {
      mismatches.push({
        record: application,
        field: 'remaining_quantity',
        expected: expectedRemaining,
        actual: application.remaining_quantity
      });
    }

    return { mismatches, missingDocs };
  }

  static async reconcileAllBatches() {
    const batches = await ReturnApplication.findAll({
      attributes: ['batch_no'],
      group: ['batch_no'],
      raw: true
    });

    const results = [];
    for (const { batch_no: batchNo } of batches) {
      try {
        const result = await this.reconcileByBatch(batchNo);
        results.push(result);
      } catch (e) {
        logger.error(`批次对账失败: ${batchNo}`, e);
      }
    }
    return results;
  }

  static async getReconciliationReport(batchNo = null) {
    if (batchNo) {
      return await this.reconcileByBatch(batchNo);
    }
    return await this.reconcileAllBatches();
  }
}

module.exports = ReconciliationService;
