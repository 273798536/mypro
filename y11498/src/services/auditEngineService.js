const { db, generateNo } = require('../models/db');
const auditTrailService = require('./auditTrailService');
const dirtyRecordService = require('./dirtyRecordService');

class AuditEngineService {
  async detectDuplicateInvoices(options = {}) {
    const { startDate, endDate, expenseCategory, sharedTripGroupId, skipExisting = true } = options;
    
    let sql = `
      SELECT i.*, ta.shared_trip_group_id
      FROM invoices i
      LEFT JOIN travel_applications ta ON i.travel_application_no = ta.application_no
      WHERE 1=1
    `;
    const params = [];

    if (startDate) { sql += ' AND i.invoice_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND i.invoice_date <= ?'; params.push(endDate); }
    if (expenseCategory) { sql += ' AND i.expense_category = ?'; params.push(expenseCategory); }
    if (sharedTripGroupId) { sql += ' AND ta.shared_trip_group_id = ?'; params.push(sharedTripGroupId); }

    const invoices = await db.all(sql, params);
    const duplicateGroups = [];
    const processedInvoices = new Set();

    for (let i = 0; i < invoices.length; i++) {
      const inv1 = invoices[i];
      if (processedInvoices.has(inv1.invoice_no)) continue;

      if (skipExisting && inv1.is_duplicate && inv1.duplicate_group_id) {
        processedInvoices.add(inv1.invoice_no);
        continue;
      }

      const duplicates = [inv1];
      processedInvoices.add(inv1.invoice_no);

      for (let j = i + 1; j < invoices.length; j++) {
        const inv2 = invoices[j];
        if (processedInvoices.has(inv2.invoice_no)) continue;

        const isDuplicate = this.isDuplicateInvoice(inv1, inv2);
        if (isDuplicate) {
          duplicates.push(inv2);
          processedInvoices.add(inv2.invoice_no);
        }
      }

      if (duplicates.length >= 2) {
        const duplicateKey = this.generateDuplicateKey(inv1);

        const existingGroup = await db.get(
          'SELECT group_id FROM duplicate_groups WHERE duplicate_key = ? LIMIT 1',
          [duplicateKey]
        );

        if (existingGroup && skipExisting) {
          for (const inv of duplicates) {
            await db.update('invoices', {
              is_duplicate: 1,
              duplicate_group_id: existingGroup.group_id
            }, 'invoice_no = ?', [inv.invoice_no]);
          }
          continue;
        }

        const groupId = existingGroup ? existingGroup.group_id : generateNo('DUP');
        const totalAmount = duplicates.reduce((sum, inv) => sum + inv.total_amount, 0);
        const applicants = [...new Set(duplicates.map(inv => inv.applicant_name).filter(Boolean))].join(', ');

        const groupDesc = this.generateGroupDescription(inv1, duplicates);

        if (!existingGroup) {
          await db.insert('duplicate_groups', {
            group_id: groupId,
            group_type: inv1.expense_category || 'mixed',
            group_desc: groupDesc,
            duplicate_key: duplicateKey,
            invoice_count: duplicates.length,
            total_amount: totalAmount,
            involved_applicants: applicants
          });
        }

        for (const inv of duplicates) {
          await db.update('invoices', {
            is_duplicate: 1,
            duplicate_group_id: groupId
          }, 'invoice_no = ?', [inv.invoice_no]);

          await dirtyRecordService.recordDirtyRecord({
            sourceTable: 'invoices',
            sourceId: inv.id,
            sourceNo: inv.invoice_no,
            dirtyType: 'duplicate_record',
            dirtyDescription: groupDesc,
            fieldName: 'duplicate_detection',
            expectedValue: '唯一发票',
            actualValue: `与${duplicates.length - 1}张发票重复`,
            rawData: inv,
            correctionSuggestion: '请核实重复报销情况，保留有效单据'
          });
        }

        duplicateGroups.push({
          group_id: groupId,
          group_type: inv1.expense_category || 'mixed',
          group_desc: groupDesc,
          invoice_count: duplicates.length,
          total_amount: totalAmount,
          involved_applicants: applicants,
          invoices: duplicates
        });
      }
    }

    return {
      total_invoices_checked: invoices.length,
      duplicate_groups_found: duplicateGroups.length,
      total_duplicate_amount: duplicateGroups.reduce((sum, g) => sum + g.total_amount, 0),
      groups: duplicateGroups
    };
  }

  isDuplicateInvoice(inv1, inv2) {
    let matchScore = 0;
    const category = inv1.expense_category;

    if (inv1.pdf_hash && inv1.pdf_hash === inv2.pdf_hash) {
      return true;
    }

    if (category === 'accommodation' || category === '住宿') {
      if (inv1.hotel_name && inv1.hotel_name === inv2.hotel_name) matchScore += 30;
      if (inv1.check_in_date && inv1.check_in_date === inv2.check_in_date) matchScore += 30;
      if (inv1.check_out_date && inv1.check_out_date === inv2.check_out_date) matchScore += 30;
      if (Math.abs(inv1.total_amount - inv2.total_amount) < 0.01) matchScore += 30;
      
      if (inv1.shared_trip_group_id && inv1.shared_trip_group_id === inv2.shared_trip_group_id) {
        matchScore += 40;
      }
    } else if (category === 'transportation' || category === '交通') {
      if (inv1.flight_no && inv1.flight_no === inv2.flight_no) matchScore += 40;
      if (inv1.departure && inv1.departure === inv2.departure) matchScore += 20;
      if (inv1.arrival && inv1.arrival === inv2.arrival) matchScore += 20;
      if (inv1.departure_time && inv1.departure_time === inv2.departure_time) matchScore += 30;
      if (Math.abs(inv1.total_amount - inv2.total_amount) < 0.01) matchScore += 20;
      
      if (inv1.shared_trip_group_id && inv1.shared_trip_group_id === inv2.shared_trip_group_id) {
        matchScore += 40;
      }
    } else {
      if (inv1.invoice_no && inv1.invoice_no === inv2.invoice_no) matchScore += 100;
      if (inv1.seller_name && inv1.seller_name === inv2.seller_name) matchScore += 20;
      if (inv1.invoice_date && inv1.invoice_date === inv2.invoice_date) matchScore += 20;
      if (Math.abs(inv1.total_amount - inv2.total_amount) < 0.01) matchScore += 30;
    }

    return matchScore >= 80;
  }

  generateDuplicateKey(invoice) {
    const category = invoice.expense_category;
    if (category === 'accommodation' || category === '住宿') {
      return `ACC_${invoice.hotel_name || 'UNKNOWN'}_${invoice.check_in_date || ''}_${invoice.check_out_date || ''}_${invoice.total_amount}`;
    } else if (category === 'transportation' || category === '交通') {
      return `TRANS_${invoice.flight_no || invoice.departure + '_' + invoice.arrival}_${invoice.departure_time || invoice.invoice_date}`;
    }
    return `GEN_${invoice.invoice_no || invoice.seller_name}_${invoice.invoice_date}_${invoice.total_amount}`;
  }

  generateGroupDescription(invoice, duplicates) {
    const category = invoice.expense_category;
    const applicantNames = [...new Set(duplicates.map(inv => inv.applicant_name).filter(Boolean))];
    
    if (category === 'accommodation' || category === '住宿') {
      return `住宿重复报销 - ${invoice.hotel_name} ${invoice.check_in_date}至${invoice.check_out_date}，涉及${applicantNames.length}人: ${applicantNames.join(', ')}`;
    } else if (category === 'transportation' || category === '交通') {
      return `交通重复报销 - ${invoice.departure}->${invoice.arrival} ${invoice.departure_time || invoice.invoice_date}，涉及${applicantNames.length}人: ${applicantNames.join(', ')}`;
    }
    return `重复报销 - 涉及${applicantNames.length}人: ${applicantNames.join(', ')}`;
  }

  async reconcilePayments(options = {}) {
    const { startDate, endDate, writeDirtyRecords = true } = options;
    const discrepancies = [];

    let invoiceSql = 'SELECT * FROM invoices WHERE 1=1';
    let paymentSql = 'SELECT * FROM payment_flows WHERE 1=1';
    const params = [];

    if (startDate) {
      invoiceSql += ' AND invoice_date >= ?';
      paymentSql += ' AND payment_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      invoiceSql += ' AND invoice_date <= ?';
      paymentSql += ' AND payment_date <= ?';
      params.push(startDate ? params[params.length - 1] : endDate);
    }

    const invoices = await db.all(invoiceSql, params);
    const payments = await db.all(paymentSql, params);

    for (const invoice of invoices) {
      const matchingPayments = payments.filter(p => p.invoice_no === invoice.invoice_no);
      const totalPaid = matchingPayments.reduce((sum, p) => sum + p.amount, 0);

      if (matchingPayments.length === 0) {
        discrepancies.push({
          type: 'no_payment',
          invoice_no: invoice.invoice_no,
          invoice_amount: invoice.total_amount,
          paid_amount: 0,
          difference: invoice.total_amount,
          description: '发票无对应付款记录'
        });

        if (writeDirtyRecords) {
          await dirtyRecordService.recordDirtyRecord({
            sourceTable: 'invoices',
            sourceId: invoice.id,
            sourceNo: invoice.invoice_no,
            dirtyType: 'amount_conflict',
            dirtyDescription: '发票无对应付款记录',
            fieldName: 'payment_mapping',
            expectedValue: '有对应付款记录',
            actualValue: '无付款记录',
            rawData: invoice,
            correctionSuggestion: '请补录付款流水或核实发票有效性'
          });
        }
      } else if (Math.abs(totalPaid - invoice.total_amount) > 0.01) {
        const diff = invoice.total_amount - totalPaid;
        discrepancies.push({
          type: 'amount_mismatch',
          invoice_no: invoice.invoice_no,
          invoice_amount: invoice.total_amount,
          paid_amount: totalPaid,
          difference: diff,
          description: `发票金额与付款金额不一致，差异: ${diff.toFixed(2)}`
        });

        if (writeDirtyRecords) {
          await dirtyRecordService.checkAmountConflict(
            'invoices',
            invoice,
            { ...invoice, total_amount: totalPaid, _source: 'payment' },
            'total_amount',
            '发票金额',
            '付款金额',
            invoice.id,
            invoice.invoice_no
          );
        }
      }
    }

    for (const payment of payments) {
      if (payment.invoice_no) {
        const matchingInvoice = invoices.find(i => i.invoice_no === payment.invoice_no);
        if (!matchingInvoice) {
          discrepancies.push({
            type: 'payment_no_invoice',
            payment_no: payment.payment_no,
            paid_amount: payment.amount,
            description: '付款无对应发票记录'
          });

          if (writeDirtyRecords) {
            await dirtyRecordService.recordDirtyRecord({
              sourceTable: 'payment_flows',
              sourceId: payment.id,
              sourceNo: payment.payment_no,
              dirtyType: 'amount_conflict',
              dirtyDescription: '付款无对应发票记录',
              fieldName: 'invoice_mapping',
              expectedValue: '有对应发票',
              actualValue: '无发票记录',
              rawData: payment,
              correctionSuggestion: '请补录发票或核实付款有效性'
            });
          }
        }
      }
    }

    return {
      total_invoices: invoices.length,
      total_payments: payments.length,
      discrepancy_count: discrepancies.length,
      total_discrepancy_amount: discrepancies.reduce((sum, d) => sum + Math.abs(d.difference || d.paid_amount), 0),
      discrepancies
    };
  }

  async runFullAudit(options = {}) {
    const auditNo = generateNo('AUDIT');
    const { startDate, endDate, createdBy = 'system', checkExistingData = true } = options;

    if (checkExistingData) {
      await dirtyRecordService.checkAllExistingData();
    }

    const duplicateResult = await this.detectDuplicateInvoices({ startDate, endDate, skipExisting: true });
    const reconcileResult = await this.reconcilePayments({ startDate, endDate, writeDirtyRecords: true });
    const dirtyStats = await dirtyRecordService.getDirtyStatistics();

    let totalInvoices = await db.get('SELECT COUNT(*) as count FROM invoices');
    let totalPayments = await db.get('SELECT COUNT(*) as count FROM payment_flows');
    let totalRefunds = await db.get('SELECT COUNT(*) as count FROM refund_flows');
    let totalAmount = await db.get('SELECT SUM(total_amount) as sum FROM invoices');

    const summary = {
      duplicate_detection: duplicateResult,
      payment_reconciliation: reconcileResult,
      dirty_records: dirtyStats
    };

    await db.insert('audit_results', {
      audit_no: auditNo,
      audit_date: new Date().toISOString().split('T')[0],
      audit_type: 'full_audit',
      total_invoices: totalInvoices.count || 0,
      total_payments: totalPayments.count || 0,
      total_refunds: totalRefunds.count || 0,
      total_amount: totalAmount.sum || 0,
      duplicate_invoice_count: duplicateResult.duplicate_groups_found,
      duplicate_amount: duplicateResult.total_duplicate_amount,
      dirty_record_count: dirtyStats.total,
      reconciliation_diff_amount: reconcileResult.total_discrepancy_amount,
      result_summary: JSON.stringify(summary),
      created_by: createdBy
    });

    await auditTrailService.logAuditRun(auditNo, summary, createdBy);

    return {
      audit_no: auditNo,
      summary,
      message: '稽核执行完成'
    };
  }

  async getAuditHistory(options = {}) {
    const { auditType, startDate, endDate, limit = 100 } = options;
    let sql = 'SELECT * FROM audit_results WHERE 1=1';
    const params = [];

    if (auditType) { sql += ' AND audit_type = ?'; params.push(auditType); }
    if (startDate) { sql += ' AND audit_date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND audit_date <= ?'; params.push(endDate); }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const results = await db.all(sql, params);
    return results.map(r => ({
      ...r,
      result_summary: r.result_summary ? JSON.parse(r.result_summary) : null
    }));
  }

  async getAuditById(auditNo) {
    const result = await db.findByNo('audit_results', 'audit_no', auditNo);
    if (result && result.result_summary) {
      result.result_summary = JSON.parse(result.result_summary);
    }
    return result;
  }
}

module.exports = new AuditEngineService();
