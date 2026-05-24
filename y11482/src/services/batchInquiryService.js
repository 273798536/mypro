const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const AuditService = require('./auditService');

class BatchInquiryService {
  static async createInquiry({
    batchNo,
    potNo = null,
    inquiryReason,
    inquiryType = 'quality',
    initiatedBy = null,
    initiatedByName = 'system'
  }) {
    const inquiryNo = `INQ${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const inquiry = {
      id: uuidv4(),
      inquiry_no: inquiryNo,
      batch_no: batchNo,
      pot_no: potNo,
      inquiry_reason: inquiryReason,
      inquiry_type: inquiryType,
      status: 'processing',
      initiated_by: initiatedBy,
      initiated_at: new Date().toISOString()
    };

    await db('batch_inquiries').insert(inquiry);

    await AuditService.logCreate(
      'batch_inquiries',
      inquiry.id,
      inquiry,
      initiatedBy,
      initiatedByName,
      `创建批次查询: ${inquiryNo}`
    );

    return this.getById(inquiry.id);
  }

  static async getById(id) {
    return db('batch_inquiries').where({ id }).first();
  }

  static async queryBatchRecords(batchNo, potNo = null) {
    let sampleLabelsQuery = db('sample_labels').where('batch_no', batchNo);
    let temperatureQuery = db('temperature_records').where('batch_no', batchNo);
    let complaintsQuery = db('store_complaints').where('batch_no', batchNo);
    let refundsQuery = db('refund_records').where('batch_no', batchNo);
    let inventoryQuery = db('inventory_differences').where('batch_no', batchNo);

    if (potNo) {
      sampleLabelsQuery = sampleLabelsQuery.andWhere('pot_no', potNo);
      temperatureQuery = temperatureQuery.andWhere('pot_no', potNo);
      complaintsQuery = complaintsQuery.andWhere('pot_no', potNo);
      refundsQuery = refundsQuery.andWhere('pot_no', potNo);
      inventoryQuery = inventoryQuery.andWhere('pot_no', potNo);
    }

    const [sampleLabels, temperatureRecords, complaints, refunds, inventoryDiffs] = await Promise.all([
      sampleLabelsQuery,
      temperatureQuery,
      complaintsQuery,
      refundsQuery,
      inventoryQuery
    ]);

    const stores = new Set();
    sampleLabels.forEach(s => s.store_code && stores.add(s.store_code));
    complaints.forEach(c => c.store_code && stores.add(c.store_code));
    refunds.forEach(r => r.store_code && stores.add(r.store_code));
    inventoryDiffs.forEach(i => i.store_code && stores.add(i.store_code));

    const storeBreakdown = {};
    stores.forEach(storeCode => {
      storeBreakdown[storeCode] = {
        storeName: sampleLabels.find(s => s.store_code === storeCode)?.store_name ||
                   complaints.find(c => c.store_code === storeCode)?.store_name ||
                   refunds.find(r => r.store_code === storeCode)?.store_name ||
                   inventoryDiffs.find(i => i.store_code === storeCode)?.store_name,
        sampleLabels: sampleLabels.filter(s => s.store_code === storeCode),
        complaints: complaints.filter(c => c.store_code === storeCode),
        refunds: refunds.filter(r => r.store_code === storeCode),
        inventoryDiffs: inventoryDiffs.filter(i => i.store_code === storeCode)
      };
    });

    return {
      batchNo,
      potNo,
      summary: {
        sampleLabelsCount: sampleLabels.length,
        temperatureRecordsCount: temperatureRecords.length,
        complaintsCount: complaints.length,
        refundsCount: refunds.length,
        refundsTotalAmount: refunds.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0),
        inventoryDiffsCount: inventoryDiffs.length,
        affectedStoresCount: stores.size
      },
      stores: storeBreakdown,
      details: {
        sampleLabels,
        temperatureRecords,
        complaints,
        refunds,
        inventoryDiffs
      }
    };
  }

  static async completeInquiry(id, conclusion, operatorId, operatorName) {
    const inquiry = await this.getById(id);
    if (!inquiry) {
      throw new Error('查询记录不存在');
    }

    const relatedRecords = await this.queryBatchRecords(inquiry.batch_no, inquiry.pot_no);

    await db('batch_inquiries')
      .where({ id })
      .update({
        status: 'completed',
        related_records: JSON.stringify(relatedRecords),
        conclusion,
        completed_at: new Date().toISOString()
      });

    await AuditService.logUpdate(
      'batch_inquiries',
      id,
      inquiry,
      { ...inquiry, status: 'completed', conclusion },
      operatorId,
      operatorName,
      '完成批次查询'
    );

    return this.getById(id);
  }

  static async list(params = {}) {
    const { status, batchNo, inquiryType, startTime, endTime, page = 1, pageSize = 20 } = params;

    let query = db('batch_inquiries').select();

    if (status) {
      query = query.where('status', status);
    }
    if (batchNo) {
      query = query.where('batch_no', batchNo);
    }
    if (inquiryType) {
      query = query.where('inquiry_type', inquiryType);
    }
    if (startTime) {
      query = query.where('initiated_at', '>=', startTime);
    }
    if (endTime) {
      query = query.where('initiated_at', '<=', endTime);
    }

    const total = await query.clone().count('id as count').first().then(r => r.count);
    const items = await query
      .orderBy('initiated_at', 'desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    return {
      items: items.map(item => ({
        ...item,
        related_records: item.related_records ? JSON.parse(item.related_records) : null
      })),
      total,
      page,
      pageSize
    };
  }
}

module.exports = BatchInquiryService;
