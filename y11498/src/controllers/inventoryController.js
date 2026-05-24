const { db, generateNo } = require('../models/db');
const auditTrailService = require('../services/auditTrailService');
const dirtyRecordService = require('../services/dirtyRecordService');

class InventoryController {
  async createDiff(req, res) {
    try {
      const data = req.body;
      const diffNo = data.diff_no || generateNo('DIFF');
      const rawData = JSON.stringify(data);

      const requiredFields = ['diff_date', 'diff_type', 'diff_amount'];
      const dirtyRecords = [];

      const result = await db.insert('inventory_diffs', {
        diff_no: diffNo,
        diff_date: data.diff_date,
        diff_type: data.diff_type,
        diff_amount: data.diff_amount,
        related_payment_no: data.related_payment_no,
        related_refund_no: data.related_refund_no,
        related_invoice_no: data.related_invoice_no,
        related_application_no: data.related_application_no,
        description: data.description,
        reporter: data.reporter,
        status: data.status || 'pending',
        raw_data: rawData
      });

      const missingFieldRecords = await dirtyRecordService.checkMissingFields(
        'inventory_diffs', data, requiredFields, result.lastID, diffNo
      );
      dirtyRecords.push(...missingFieldRecords);

      const diff = await db.findById('inventory_diffs', result.lastID);

      await auditTrailService.logCreate(
        'INVENTORY_DIFF',
        'inventory_diffs',
        result.lastID,
        diffNo,
        diff,
        req.body.operator || 'api'
      );

      res.json({
        success: true,
        data: diff,
        dirty_records: dirtyRecords.length,
        message: '盘点差异创建成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getDiffs(req, res) {
    try {
      const { diff_type, status, related_application_no, start_date, end_date } = req.query;
      let sql = 'SELECT * FROM inventory_diffs WHERE 1=1';
      const params = [];

      if (diff_type) { sql += ' AND diff_type = ?'; params.push(diff_type); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (related_application_no) { sql += ' AND related_application_no = ?'; params.push(related_application_no); }
      if (start_date) { sql += ' AND diff_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND diff_date <= ?'; params.push(end_date); }

      sql += ' ORDER BY created_at DESC';
      const diffs = await db.all(sql, params);

      res.json({ success: true, data: diffs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDiffById(req, res) {
    try {
      const diff = await db.findByNo('inventory_diffs', 'diff_no', req.params.no);
      if (!diff) {
        return res.status(404).json({ success: false, error: '盘点差异不存在' });
      }
      res.json({ success: true, data: diff });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateDiff(req, res) {
    try {
      const diffNo = req.params.no;
      const oldData = await db.findByNo('inventory_diffs', 'diff_no', diffNo);
      if (!oldData) {
        return res.status(404).json({ success: false, error: '盘点差异不存在' });
      }

      const data = req.body;
      const updateData = {};
      const allowedFields = ['diff_type', 'diff_amount', 'description', 'status'];
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }
      updateData.updated_at = new Date().toISOString();

      await db.update('inventory_diffs', updateData, 'diff_no = ?', [diffNo]);
      const newData = await db.findByNo('inventory_diffs', 'diff_no', diffNo);

      await auditTrailService.logUpdate(
        'INVENTORY_DIFF',
        'inventory_diffs',
        oldData.id,
        diffNo,
        oldData,
        newData,
        req.body.operator || 'api'
      );

      res.json({ success: true, data: newData, message: '盘点差异更新成功' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new InventoryController();
