const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { TraceabilityLedger } = require('../models/TraceabilityLedger');
const AuditLog = require('../models/AuditLog');

class DirectorViewService {
  static async generateDailyView(date = null) {
    const targetDate = date || moment().format('YYYY-MM-DD');
    const now = moment().toISOString();
    
    const ledgerSummary = await TraceabilityLedger.getSummary({
      start_date: `${targetDate} 00:00:00`,
      end_date: `${targetDate} 23:59:59`
    });
    
    const roleDistribution = await db.all(`
      SELECT 
        al.operator_role,
        COUNT(DISTINCT al.ledger_id) as ledger_count,
        COUNT(*) as action_count
      FROM audit_logs al
      WHERE al.operation_time >= ? AND al.operation_time <= ?
      GROUP BY al.operator_role
    `, `${targetDate} 00:00:00`, `${targetDate} 23:59:59`);
    
    const changeReasonStats = await db.all(`
      SELECT 
        tl.change_reason,
        COUNT(*) as count
      FROM traceability_ledgers tl
      WHERE tl.change_reason IS NOT NULL
        AND tl.usage_date >= ? AND tl.usage_date <= ?
      GROUP BY tl.change_reason
    `, `${targetDate} 00:00:00`, `${targetDate} 23:59:59`);
    
    const totalAmount = await db.get(`
      SELECT 
        COALESCE(SUM(ii.unit_price * tl.usage_quantity), 0) as total
      FROM traceability_ledgers tl
      LEFT JOIN invoice_items ii ON tl.implant_batch_number = ii.batch_number
      WHERE tl.usage_date >= ? AND tl.usage_date <= ?
        AND tl.status != 'rejected'
    `, `${targetDate} 00:00:00`, `${targetDate} 23:59:59`);
    
    const viewData = {
      id: uuidv4(),
      view_date: targetDate,
      total_ledgers: ledgerSummary.total,
      pending_approval: ledgerSummary.by_status.submitted || 0,
      rejected_count: ledgerSummary.by_status.rejected || 0,
      confirmed_count: ledgerSummary.by_status.confirmed || 0,
      total_implants_used: ledgerSummary.total_quantity,
      total_amount: totalAmount.total,
      role_distribution: JSON.stringify(roleDistribution),
      change_reason_stats: JSON.stringify(changeReasonStats),
      generated_at: now
    };
    
    const existing = await db.get(`
      SELECT id FROM director_views WHERE view_date = ?
    `, targetDate);
    
    if (existing) {
      await db.run(`
        UPDATE director_views SET
          total_ledgers = ?,
          pending_approval = ?,
          rejected_count = ?,
          confirmed_count = ?,
          total_implants_used = ?,
          total_amount = ?,
          role_distribution = ?,
          change_reason_stats = ?,
          generated_at = ?
        WHERE view_date = ?
      `,
        viewData.total_ledgers,
        viewData.pending_approval,
        viewData.rejected_count,
        viewData.confirmed_count,
        viewData.total_implants_used,
        viewData.total_amount,
        viewData.role_distribution,
        viewData.change_reason_stats,
        viewData.generated_at,
        targetDate
      );
    } else {
      await db.run(`
        INSERT INTO director_views (
          id, view_date, total_ledgers, pending_approval, rejected_count,
          confirmed_count, total_implants_used, total_amount,
          role_distribution, change_reason_stats, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        viewData.id,
        viewData.view_date,
        viewData.total_ledgers,
        viewData.pending_approval,
        viewData.rejected_count,
        viewData.confirmed_count,
        viewData.total_implants_used,
        viewData.total_amount,
        viewData.role_distribution,
        viewData.change_reason_stats,
        viewData.generated_at
      );
    }
    
    return this.formatViewData(viewData);
  }

  static formatViewData(viewData) {
    return {
      ...viewData,
      role_distribution: viewData.role_distribution ? JSON.parse(viewData.role_distribution) : [],
      change_reason_stats: viewData.change_reason_stats ? JSON.parse(viewData.change_reason_stats) : []
    };
  }

  static async getViewByDate(date) {
    const view = await db.get(`
      SELECT * FROM director_views WHERE view_date = ?
    `, date);
    
    if (!view) {
      return this.generateDailyView(date);
    }
    
    return this.formatViewData(view);
  }

  static async getRecentViews(limit = 7) {
    const views = await db.all(`
      SELECT * FROM director_views 
      ORDER BY view_date DESC 
      LIMIT ?
    `, limit);
    
    return views.map(v => this.formatViewData(v));
  }

  static async getSensitiveFieldReport(options = {}) {
    const records = await db.all(`
      SELECT 
        tl.id,
        tl.ledger_no,
        tl.patient_name,
        tl.patient_name as original_patient_name,
        tl.sensitive_fields_masked,
        tl.change_reason,
        al.operation_time as mask_time,
        al.operator_name as masked_by
      FROM traceability_ledgers tl
      LEFT JOIN audit_logs al ON tl.id = al.ledger_id AND al.action LIKE '%mask%'
      WHERE 1=1
      ORDER BY tl.created_at DESC
    `);
    
    return records.map(r => ({
      ...r,
      patient_name_masked: r.sensitive_fields_masked ? this.maskName(r.patient_name) : r.patient_name
    }));
  }

  static maskName(name) {
    if (!name || name.length <= 1) return name;
    return name[0] + '*'.repeat(name.length - 1);
  }

  static async getAuditTrailSummary(options = {}) {
    let sql = `
      SELECT 
        al.ledger_id,
        tl.ledger_no,
        COUNT(*) as change_count,
        MIN(al.operation_time) as first_change,
        MAX(al.operation_time) as last_change,
        GROUP_CONCAT(DISTINCT al.operator_name) as operators
      FROM audit_logs al
      LEFT JOIN traceability_ledgers tl ON al.ledger_id = tl.id
      WHERE al.ledger_id IS NOT NULL
    `;
    const params = [];
    
    if (options.start_date) {
      sql += ' AND al.operation_time >= ?';
      params.push(options.start_date);
    }
    
    if (options.end_date) {
      sql += ' AND al.operation_time <= ?';
      params.push(options.end_date);
    }
    
    sql += ' GROUP BY al.ledger_id ORDER BY change_count DESC';
    
    return await db.all(sql, ...params);
  }
}

module.exports = DirectorViewService;
