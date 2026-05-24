const { db, generateNo, hashContent } = require('../models/db');
const auditTrailService = require('../services/auditTrailService');
const dirtyRecordService = require('../services/dirtyRecordService');
const fs = require('fs');
const path = require('path');

class InvoiceController {
  async createInvoice(req, res) {
    try {
      const data = req.body;
      const invoiceNo = data.invoice_no || generateNo('INV');
      const rawData = JSON.stringify(data);

      const requiredFields = ['invoice_date', 'expense_category', 'total_amount'];
      const dirtyRecords = [];

      const result = await db.insert('invoices', {
        invoice_no: invoiceNo,
        invoice_code: data.invoice_code,
        invoice_date: data.invoice_date,
        seller_name: data.seller_name,
        seller_tax_no: data.seller_tax_no,
        buyer_name: data.buyer_name,
        buyer_tax_no: data.buyer_tax_no,
        invoice_type: data.invoice_type,
        expense_category: data.expense_category,
        expense_item: data.expense_item,
        total_amount: data.total_amount,
        tax_amount: data.tax_amount,
        total_with_tax: data.total_with_tax,
        applicant_id: data.applicant_id,
        applicant_name: data.applicant_name,
        travel_application_no: data.travel_application_no,
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
        hotel_name: data.hotel_name,
        room_count: data.room_count,
        flight_no: data.flight_no,
        departure: data.departure,
        arrival: data.arrival,
        departure_time: data.departure_time,
        arrival_time: data.arrival_time,
        passenger_name: data.passenger_name,
        pdf_path: data.pdf_path,
        pdf_hash: data.pdf_hash,
        raw_data: rawData
      });

      const missingFieldRecords = await dirtyRecordService.checkMissingFields(
        'invoices', data, requiredFields, result.lastID, invoiceNo
      );
      dirtyRecords.push(...missingFieldRecords);

      if (data.check_in_date && data.check_out_date) {
        const crossDateRecords = await dirtyRecordService.checkCrossDate(
          'invoices', data, 'check_in_date', 'check_out_date', result.lastID, invoiceNo
        );
        dirtyRecords.push(...crossDateRecords);
      }

      const invoice = await db.findById('invoices', result.lastID);

      await auditTrailService.logCreate(
        'INVOICE',
        'invoices',
        result.lastID,
        invoiceNo,
        invoice,
        req.body.operator || 'api'
      );

      res.json({
        success: true,
        data: invoice,
        dirty_records: dirtyRecords.length,
        message: '发票创建成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async uploadInvoicePdf(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: '未上传PDF文件' });
      }

      const pdfPath = req.file.path;
      const pdfHash = hashContent(fs.readFileSync(pdfPath));
      const data = req.body;
      const invoiceNo = data.invoice_no || generateNo('INV');

      const existingInvoice = await db.get(
        'SELECT * FROM invoices WHERE pdf_hash = ?',
        [pdfHash]
      );

      if (existingInvoice) {
        return res.status(409).json({
          success: false,
          error: 'PDF文件已存在',
          existing_invoice: existingInvoice
        });
      }

      const result = await db.insert('invoices', {
        invoice_no: invoiceNo,
        invoice_code: data.invoice_code,
        invoice_date: data.invoice_date,
        seller_name: data.seller_name,
        expense_category: data.expense_category || 'other',
        expense_item: data.expense_item,
        total_amount: parseFloat(data.total_amount) || 0,
        tax_amount: parseFloat(data.tax_amount) || 0,
        total_with_tax: parseFloat(data.total_with_tax) || 0,
        applicant_id: data.applicant_id,
        applicant_name: data.applicant_name,
        travel_application_no: data.travel_application_no,
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
        hotel_name: data.hotel_name,
        pdf_path: pdfPath,
        pdf_hash: pdfHash,
        raw_data: JSON.stringify({ ...data, pdfPath, pdfHash })
      });

      const invoice = await db.findById('invoices', result.lastID);

      await auditTrailService.logCreate(
        'INVOICE_PDF',
        'invoices',
        result.lastID,
        invoiceNo,
        invoice,
        req.body.operator || 'api'
      );

      res.json({
        success: true,
        data: invoice,
        message: '发票PDF上传成功'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getInvoices(req, res) {
    try {
      const { applicant_id, expense_category, travel_application_no, start_date, end_date, is_duplicate } = req.query;
      let sql = 'SELECT * FROM invoices WHERE 1=1';
      const params = [];

      if (applicant_id) { sql += ' AND applicant_id = ?'; params.push(applicant_id); }
      if (expense_category) { sql += ' AND expense_category = ?'; params.push(expense_category); }
      if (travel_application_no) { sql += ' AND travel_application_no = ?'; params.push(travel_application_no); }
      if (start_date) { sql += ' AND invoice_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND invoice_date <= ?'; params.push(end_date); }
      if (is_duplicate !== undefined) { sql += ' AND is_duplicate = ?'; params.push(is_duplicate === 'true' ? 1 : 0); }

      sql += ' ORDER BY created_at DESC';
      const invoices = await db.all(sql, params);

      res.json({ success: true, data: invoices });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getInvoiceById(req, res) {
    try {
      const invoice = await db.findByNo('invoices', 'invoice_no', req.params.no);
      if (!invoice) {
        return res.status(404).json({ success: false, error: '发票不存在' });
      }
      res.json({ success: true, data: invoice });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateInvoice(req, res) {
    try {
      const invoiceNo = req.params.no;
      const oldData = await db.findByNo('invoices', 'invoice_no', invoiceNo);
      if (!oldData) {
        return res.status(404).json({ success: false, error: '发票不存在' });
      }

      const data = req.body;
      const updateData = {};
      const allowedFields = ['invoice_code', 'invoice_date', 'seller_name', 'seller_tax_no',
                             'buyer_name', 'buyer_tax_no', 'invoice_type', 'expense_category',
                             'expense_item', 'total_amount', 'tax_amount', 'total_with_tax',
                             'applicant_id', 'applicant_name', 'travel_application_no',
                             'check_in_date', 'check_out_date', 'hotel_name', 'room_count',
                             'flight_no', 'departure', 'arrival', 'departure_time', 'arrival_time',
                             'passenger_name', 'is_duplicate', 'duplicate_group_id'];
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }
      updateData.updated_at = new Date().toISOString();

      await db.update('invoices', updateData, 'invoice_no = ?', [invoiceNo]);

      if (data.applicant_name) {
        await dirtyRecordService.checkNameChange(
          'invoices', data, oldData, 'applicant_name', oldData.id, invoiceNo
        );
      }

      const newData = await db.findByNo('invoices', 'invoice_no', invoiceNo);

      await auditTrailService.logUpdate(
        'INVOICE',
        'invoices',
        oldData.id,
        invoiceNo,
        oldData,
        newData,
        req.body.operator || 'api'
      );

      res.json({ success: true, data: newData, message: '发票更新成功' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async markDuplicate(req, res) {
    try {
      const { invoice_nos, group_id, group_desc } = req.body;
      
      if (!invoice_nos || !Array.isArray(invoice_nos) || invoice_nos.length < 2) {
        return res.status(400).json({ success: false, error: '至少需要2张发票才能标记重复' });
      }

      const groupId = group_id || generateNo('DUP');

      for (const invoiceNo of invoice_nos) {
        await db.update('invoices', {
          is_duplicate: 1,
          duplicate_group_id: groupId
        }, 'invoice_no = ?', [invoiceNo]);
      }

      const invoices = await db.all(
        'SELECT * FROM invoices WHERE invoice_no IN (?)',
        [invoice_nos.join(',')]
      );

      const totalAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const applicants = [...new Set(invoices.map(inv => inv.applicant_name).filter(Boolean))].join(', ');

      await db.insert('duplicate_groups', {
        group_id: groupId,
        group_type: invoices[0]?.expense_category || 'mixed',
        group_desc: group_desc || '重复报销组',
        duplicate_key: groupId,
        invoice_count: invoice_nos.length,
        total_amount: totalAmount,
        involved_applicants: applicants
      });

      for (const invoice of invoices) {
        await auditTrailService.logOperation({
          operationType: 'MARK_DUPLICATE',
          operationModule: 'INVOICE',
          operationDesc: `标记发票为重复: ${groupId}`,
          sourceTable: 'invoices',
          sourceId: invoice.id,
          sourceNo: invoice.invoice_no,
          afterData: { group_id: groupId }
        });
      }

      res.json({
        success: true,
        data: {
          group_id: groupId,
          invoice_count: invoice_nos.length,
          total_amount: totalAmount,
          involved_applicants: applicants,
          invoices
        },
        message: '发票已标记为重复报销'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getDuplicateGroups(req, res) {
    try {
      const { is_resolved, group_type } = req.query;
      let sql = 'SELECT * FROM duplicate_groups WHERE 1=1';
      const params = [];

      if (is_resolved !== undefined) {
        sql += ' AND is_resolved = ?';
        params.push(is_resolved === 'true' ? 1 : 0);
      }
      if (group_type) {
        sql += ' AND group_type = ?';
        params.push(group_type);
      }

      sql += ' ORDER BY created_at DESC';
      const groups = await db.all(sql, params);

      for (const group of groups) {
        group.invoices = await db.all(
          'SELECT * FROM invoices WHERE duplicate_group_id = ?',
          [group.group_id]
        );
      }

      res.json({ success: true, data: groups });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new InvoiceController();
