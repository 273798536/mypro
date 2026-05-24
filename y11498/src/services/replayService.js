const { db, generateNo } = require('../models/db');
const auditEngineService = require('./auditEngineService');
const auditTrailService = require('./auditTrailService');
const dirtyRecordService = require('./dirtyRecordService');

class ReplayService {
  async startReplaySession(options = {}) {
    const { sessionName, startDate, endDate, createdBy = 'system' } = options;
    
    const sessionId = generateNo('REPLAY');
    
    await db.insert('replay_sessions', {
      session_id: sessionId,
      session_name: sessionName || `回放会话_${new Date().toISOString().split('T')[0]}`,
      start_date: startDate,
      end_date: endDate,
      status: 'running',
      created_by: createdBy
    });

    const duplicateResult = await auditEngineService.detectDuplicateInvoices({ startDate, endDate });
    const reconcileResult = await auditEngineService.reconcilePayments({ startDate, endDate });
    const dirtyRecords = await dirtyRecordService.getDirtyRecords({ isCorrected: false });

    const anomalyCount = duplicateResult.duplicate_groups_found + 
                        reconcileResult.discrepancy_count + 
                        dirtyRecords.length;

    await db.update('replay_sessions', {
      status: 'completed',
      anomaly_count: anomalyCount,
      completed_at: new Date().toISOString()
    }, 'session_id = ?', [sessionId]);

    await auditTrailService.logReplay(sessionId, anomalyCount, createdBy);

    return {
      session_id: sessionId,
      anomaly_count: anomalyCount,
      duplicate_detection: duplicateResult,
      payment_reconciliation: reconcileResult,
      pending_dirty_records: dirtyRecords,
      message: '回放完成'
    };
  }

  async getReplaySessions(options = {}) {
    const { status, limit = 100 } = options;
    let sql = 'SELECT * FROM replay_sessions WHERE 1=1';
    const params = [];

    if (status) { sql += ' AND status = ?'; params.push(status); }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return db.all(sql, params);
  }

  async getReplaySession(sessionId) {
    const session = await db.findByNo('replay_sessions', 'session_id', sessionId);
    if (!session) {
      throw new Error('回放会话不存在');
    }
    return session;
  }

  async getReplayAnomalies(sessionId) {
    const session = await db.findByNo('replay_sessions', 'session_id', sessionId);
    if (!session) {
      throw new Error('回放会话不存在');
    }

    const duplicateGroups = await db.all(`
      SELECT dg.*, 
        (SELECT COUNT(*) FROM invoices i WHERE i.duplicate_group_id = dg.group_id) as invoice_count,
        (SELECT SUM(total_amount) FROM invoices i WHERE i.duplicate_group_id = dg.group_id) as total_amount
      FROM duplicate_groups dg
      WHERE dg.created_at BETWEEN ? AND ?
      ORDER BY dg.created_at DESC
    `, [session.start_date || '2000-01-01', session.end_date || '2099-12-31']);

    const dirtyRecords = await dirtyRecordService.getDirtyRecords({
      isCorrected: false
    });

    const discrepancies = await db.all(`
      SELECT 
        'no_payment' as type,
        i.invoice_no as record_no,
        i.total_amount as amount,
        '发票无对应付款记录' as description,
        i.created_at
      FROM invoices i
      LEFT JOIN payment_flows p ON i.invoice_no = p.invoice_no
      WHERE p.id IS NULL
      AND i.created_at BETWEEN ? AND ?
      UNION ALL
      SELECT
        'payment_no_invoice' as type,
        p.payment_no as record_no,
        p.amount as amount,
        '付款无对应发票记录' as description,
        p.created_at
      FROM payment_flows p
      LEFT JOIN invoices i ON p.invoice_no = i.invoice_no
      WHERE i.id IS NULL AND p.invoice_no IS NOT NULL
      AND p.created_at BETWEEN ? AND ?
    `, [session.start_date || '2000-01-01', session.end_date || '2099-12-31',
        session.start_date || '2000-01-01', session.end_date || '2099-12-31']);

    return {
      session_id: sessionId,
      duplicate_groups: duplicateGroups,
      dirty_records: dirtyRecords,
      reconciliation_discrepancies: discrepancies,
      total_anomalies: duplicateGroups.length + dirtyRecords.length + discrepancies.length
    };
  }

  async recalculateAfterCorrection() {
    const dirtyStats = await dirtyRecordService.getDirtyStatistics();
    
    const allInvoices = await db.all('SELECT * FROM invoices');
    const allPayments = await db.all('SELECT * FROM payment_flows');

    let totalInvoiceAmount = 0;
    let totalPaymentAmount = 0;
    let duplicateInvoiceCount = 0;
    let duplicateAmount = 0;

    for (const inv of allInvoices) {
      totalInvoiceAmount += inv.total_amount || 0;
      if (inv.is_duplicate) {
        duplicateInvoiceCount++;
        duplicateAmount += inv.total_amount || 0;
      }
    }

    for (const pay of allPayments) {
      totalPaymentAmount += pay.amount || 0;
    }

    return {
      recalculated_at: new Date().toISOString(),
      total_invoices: allInvoices.length,
      total_invoice_amount: totalInvoiceAmount,
      total_payments: allPayments.length,
      total_payment_amount: totalPaymentAmount,
      net_amount: totalInvoiceAmount - totalPaymentAmount,
      duplicate_invoice_count: duplicateInvoiceCount,
      duplicate_amount: duplicateAmount,
      dirty_records: dirtyStats,
      message: '重新汇总完成'
    };
  }
}

module.exports = new ReplayService();
