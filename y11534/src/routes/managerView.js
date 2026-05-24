const express = require('express');
const db = require('../database/connection');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { getAuditLogs } = require('../services/auditService');
const { getWorkflowStats } = require('../services/workflowService');

const router = express.Router();

router.get('/overview', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    const result = {};
    
    const schedulesPromise = new Promise((resolve) => {
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.DRAFT}' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.SUBMITTED}' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.APPROVED}' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty_count,
          SUM(CASE WHEN is_training = 1 THEN 1 ELSE 0 END) as training_count
        FROM teller_schedules
      `, [], (err, row) => resolve(err ? {} : row));
    });
    
    const leavesPromise = new Promise((resolve) => {
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.DRAFT}' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.SUBMITTED}' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.APPROVED}' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty_count,
          SUM(days_count) as total_days
        FROM leave_forms
      `, [], (err, row) => resolve(err ? {} : row));
    });
    
    const forecastsPromise = new Promise((resolve) => {
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.DRAFT}' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.SUBMITTED}' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.APPROVED}' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty_count,
          SUM(expected_customers) as total_customers,
          SUM(expected_transactions) as total_transactions
        FROM business_forecasts
      `, [], (err, row) => resolve(err ? {} : row));
    });
    
    const billsPromise = new Promise((resolve) => {
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.DRAFT}' THEN 1 ELSE 0 END) as draft_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.SUBMITTED}' THEN 1 ELSE 0 END) as submitted_count,
          SUM(CASE WHEN status = '${config.RECORD_STATUS.APPROVED}' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty_count,
          SUM(amount) as total_amount
        FROM supplier_bills
      `, [], (err, row) => resolve(err ? {} : row));
    });
    
    const [schedules, leaves, forecasts, bills] = await Promise.all([
      schedulesPromise,
      leavesPromise,
      forecastsPromise,
      billsPromise
    ]);
    
    result.schedules = schedules;
    result.leaves = leaves;
    result.forecasts = forecasts;
    result.bills = bills;
    
    result.pendingReview = {
      schedules: schedules.submitted_count || 0,
      leaves: leaves.submitted_count || 0,
      forecasts: forecasts.submitted_count || 0,
      bills: bills.submitted_count || 0
    };
    
    result.dirtyRecords = {
      schedules: schedules.dirty_count || 0,
      leaves: leaves.dirty_count || 0,
      forecasts: forecasts.dirty_count || 0,
      bills: bills.dirty_count || 0
    };
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/changes/recent', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    db.all(`
      SELECT 
        wr.*,
        CASE wr.record_type
          WHEN 'teller_schedules' THEN '柜员排班'
          WHEN 'leave_forms' THEN '请假单'
          WHEN 'business_forecasts' THEN '业务量预测'
          WHEN 'supplier_bills' THEN '供应商对账单'
          ELSE wr.record_type
        END as record_type_name
      FROM workflow_records wr
      ORDER BY wr.created_at DESC
      LIMIT ?
    `, [parseInt(limit)], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/role-distribution', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    db.all(`
      SELECT 
        role,
        COUNT(*) as count,
        CASE role
          WHEN '${config.ROLES.DATA_ENTRY}' THEN '录入员'
          WHEN '${config.ROLES.REVIEWER}' THEN '复核员'
          WHEN '${config.ROLES.SUPERVISOR}' THEN '主管'
          WHEN '${config.ROLES.VIEW_ONLY}' THEN '只读查看'
          ELSE role
        END as role_name
      FROM users
      WHERE status = 'active'
      GROUP BY role
    `, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/branch/stats', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    const result = {};
    
    const schedulesByBranch = new Promise((resolve) => {
      db.all(`
        SELECT branch, COUNT(*) as count, SUM(CASE WHEN is_training = 1 THEN 1 ELSE 0 END) as training_count
        FROM teller_schedules
        GROUP BY branch
      `, [], (err, rows) => resolve(err ? [] : rows));
    });
    
    const leavesByBranch = new Promise((resolve) => {
      db.all(`
        SELECT branch, COUNT(*) as count, SUM(days_count) as total_days
        FROM leave_forms
        GROUP BY branch
      `, [], (err, rows) => resolve(err ? [] : rows));
    });
    
    const billsByBranch = new Promise((resolve) => {
      db.all(`
        SELECT branch, COUNT(*) as count, SUM(amount) as total_amount
        FROM supplier_bills
        GROUP BY branch
      `, [], (err, rows) => resolve(err ? [] : rows));
    });
    
    const [schedules, leaves, bills] = await Promise.all([
      schedulesByBranch,
      leavesByBranch,
      billsByBranch
    ]);
    
    result.schedules = schedules;
    result.leaves = leaves;
    result.bills = bills;
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/conflicts/list', authenticate, requireRole(config.ROLES.SUPERVISOR, config.ROLES.VIEW_ONLY), async (req, res) => {
  try {
    const conflicts = [];
    
    db.all(`
      SELECT 
        id,
        'teller_schedules' as table_name,
        '柜员排班' as module_name,
        batch_no,
        teller_name,
        branch,
        dirty_type,
        dirty_details,
        created_at
      FROM teller_schedules
      WHERE is_dirty = 1
      UNION ALL
      SELECT 
        id,
        'leave_forms' as table_name,
        '请假单' as module_name,
        batch_no,
        teller_name,
        branch,
        dirty_type,
        dirty_details,
        created_at
      FROM leave_forms
      WHERE is_dirty = 1
      UNION ALL
      SELECT 
        id,
        'supplier_bills' as table_name,
        '供应商对账单' as module_name,
        batch_no,
        supplier_name as teller_name,
        branch,
        dirty_type,
        dirty_details,
        created_at
      FROM supplier_bills
      WHERE is_dirty = 1
      ORDER BY created_at DESC
    `, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
