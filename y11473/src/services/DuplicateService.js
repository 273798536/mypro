const crypto = require('crypto');
const { ReturnApplication, QualityPhoto, LogisticsReceipt, PriceAdjustment } = require('../models');
const logger = require('../config/logger');

class DuplicateService {
  static generateHash(data) {
    const sorted = Object.keys(data).sort().map(key => `${key}:${data[key]}`).join('|');
    return crypto.createHash('md5').update(sorted).digest('hex');
  }

  static generateReturnApplyHash(data) {
    return this.generateHash({
      apply_no: data.apply_no,
      batch_no: data.batch_no,
      supplier_code: data.supplier_code,
      sku_code: data.sku_code,
      apply_quantity: data.apply_quantity
    });
  }

  static generateQualityPhotoHash(data) {
    return this.generateHash({
      photo_no: data.photo_no || data.photo_hash,
      batch_no: data.batch_no,
      supplier_code: data.supplier_code,
      sku_code: data.sku_code,
      photo_hash: data.photo_hash
    });
  }

  static generateLogisticsReceiptHash(data) {
    return this.generateHash({
      receipt_no: data.receipt_no || data.waybill_no,
      batch_no: data.batch_no,
      supplier_code: data.supplier_code,
      waybill_no: data.waybill_no
    });
  }

  static generatePriceAdjustmentHash(data) {
    return this.generateHash({
      adjust_no: data.adjust_no,
      batch_no: data.batch_no,
      supplier_code: data.supplier_code,
      sku_code: data.sku_code,
      adjusted_price: data.adjusted_price
    });
  }

  static async checkReturnApplyDuplicate(data) {
    const hash = this.generateReturnApplyHash(data);
    const existing = await ReturnApplication.findOne({
      where: { data_hash: hash }
    });
    return existing ? { isDuplicate: true, duplicateId: existing.id, hash } : { isDuplicate: false, hash };
  }

  static async checkQualityPhotoDuplicate(data) {
    const hash = this.generateQualityPhotoHash(data);
    const existing = await QualityPhoto.findOne({
      where: { data_hash: hash }
    });
    return existing ? { isDuplicate: true, duplicateId: existing.id, hash } : { isDuplicate: false, hash };
  }

  static async checkLogisticsReceiptDuplicate(data) {
    const hash = this.generateLogisticsReceiptHash(data);
    const existing = await LogisticsReceipt.findOne({
      where: { data_hash: hash }
    });
    return existing ? { isDuplicate: true, duplicateId: existing.id, hash } : { isDuplicate: false, hash };
  }

  static async checkPriceAdjustmentDuplicate(data) {
    const hash = this.generatePriceAdjustmentHash(data);
    const existing = await PriceAdjustment.findOne({
      where: { data_hash: hash }
    });
    return existing ? { isDuplicate: true, duplicateId: existing.id, hash } : { isDuplicate: false, hash };
  }

  static async markAsDuplicate(Model, recordId, duplicateOfId, transaction) {
    await Model.update(
      { is_duplicate: true, duplicate_of_id: duplicateOfId },
      { where: { id: recordId }, transaction }
    );
    logger.info(`标记重复记录: ${recordId} -> ${duplicateOfId}`);
  }

  static async findDuplicatesByBatch(batchNo, sourceType) {
    const models = {
      return_apply: ReturnApplication,
      quality_photo: QualityPhoto,
      logistics_receipt: LogisticsReceipt,
      price_adjustment: PriceAdjustment
    };
    const Model = models[sourceType];
    if (!Model) return [];
    
    return await Model.findAll({
      where: { batch_no: batchNo, is_duplicate: true },
      attributes: ['id', 'duplicate_of_id', 'created_at']
    });
  }
}

module.exports = DuplicateService;
