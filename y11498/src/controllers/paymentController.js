const { db, generateNo } = require('../models/db');
const auditTrailService = require('../services/auditTrailService');
const dirtyRecordService = require('../services/dirtyRecordService');

class PaymentController {
  async createPayment(req, res) {
    try {
      const data = req.body;
      const paymentNo = data.payment_no || generateNo('PAY');
      const rawData = JSON.stringify(data);

      const requiredFields = ['payment_date', 'amount'];
      const dirtyRecords = [];

      const result = await db.insert('payment_flows', {
        payment_no: paymentNo,
        payment_date: data.payment_date,
        payer_account: data.payer_account,
        payer_name: data.payer_name,
        payee_account: data.payee_account,
        payee_name: data.payee_name,
        amount: data.amount,
        currency: data.currency || 'CNY',
        payment_method: data.payment_method,
        purpose: data.purpose,
        expense_category: data.expense_category,
        applicant_id: data.applicant_id,
        applicant_name: data.applicant_name,
        travel_application_no: data.travel_application_no,
        invoice_no: data.invoice_no,
        raw_data: rawData
      });

      const missingFieldRecords = await dirtyRecordService.checkMissingFields(
        'payment_flows', data, requiredFields, result.lastID, paymentNo
      );
      dirtyRecords.push(...missingFieldRecords);

      const payment = await db.findById('payment_flows', result.lastID);

      await auditTrailService.logCreate(
        'PAYMENT',
        'payment_flows',
        result.lastID,
        paymentNo,
        payment,
        req.body.operator || 'api'
      );

      res.json({
        success: true,
        data: payment,
        dirty_records: dirtyRecords.length,
        message: '付款流水创建成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createRefund(req, res) {
    try {
      const data = req.body;
      const refundNo = data.refund_no || generateNo('REF');
      const rawData = JSON.stringify(data);

      const requiredFields = ['refund_date', 'amount'];
      const dirtyRecords = [];

      const result = await db.insert('refund_flows', {
        refund_no: refundNo,
        refund_date: data.refund_date,
        refund_from_account: data.refund_from_account,
        refund_from_name: data.refund_from_name,
        refund_to_account: data.refund_to_account,
        refund_to_name: data.refund_to_name,
        amount: data.amount,
        currency: data.currency || 'CNY',
        refund_reason: data.refund_reason,
        original_payment_no: data.original_payment_no,
        applicant_id: data.applicant_id,
        applicant_name: data.applicant_name,
        travel_application_no: data.travel_application_no,
        raw_data: rawData
      });

      const missingFieldRecords = await dirtyRecordService.checkMissingFields(
        'refund_flows', data, requiredFields, result.lastID, refundNo
      );
      dirtyRecords.push(...missingFieldRecords);

      const refund = await db.findById('refund_flows', result.lastID);

      await auditTrailService.logCreate(
        'REFUND',
        'refund_flows',
        result.lastID,
        refundNo,
        refund,
        req.body.operator || 'api'
      );

      res.json({
        success: true,
        data: refund,
        dirty_records: dirtyRecords.length,
        message: '退款流水创建成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getPayments(req, res) {
    try {
      const { applicant_id, travel_application_no, invoice_no, start_date, end_date } = req.query;
      let sql = 'SELECT * FROM payment_flows WHERE 1=1';
      const params = [];

      if (applicant_id) { sql += ' AND applicant_id = ?'; params.push(applicant_id); }
      if (travel_application_no) { sql += ' AND travel_application_no = ?'; params.push(travel_application_no); }
      if (invoice_no) { sql += ' AND invoice_no = ?'; params.push(invoice_no); }
      if (start_date) { sql += ' AND payment_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND payment_date <= ?'; params.push(end_date); }

      sql += ' ORDER BY created_at DESC';
      const payments = await db.all(sql, params);

      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRefunds(req, res) {
    try {
      const { applicant_id, travel_application_no, original_payment_no, start_date, end_date } = req.query;
      let sql = 'SELECT * FROM refund_flows WHERE 1=1';
      const params = [];

      if (applicant_id) { sql += ' AND applicant_id = ?'; params.push(applicant_id); }
      if (travel_application_no) { sql += ' AND travel_application_no = ?'; params.push(travel_application_no); }
      if (original_payment_no) { sql += ' AND original_payment_no = ?'; params.push(original_payment_no); }
      if (start_date) { sql += ' AND refund_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND refund_date <= ?'; params.push(end_date); }

      sql += ' ORDER BY created_at DESC';
      const refunds = await db.all(sql, params);

      res.json({ success: true, data: refunds });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPaymentById(req, res) {
    try {
      const payment = await db.findByNo('payment_flows', 'payment_no', req.params.no);
      if (!payment) {
        return res.status(404).json({ success: false, error: '付款流水不存在' });
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getRefundById(req, res) {
    try {
      const refund = await db.findByNo('refund_flows', 'refund_no', req.params.no);
      if (!refund) {
        return res.status(404).json({ success: false, error: '退款流水不存在' });
      }
      res.json({ success: true, data: refund });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new PaymentController();
