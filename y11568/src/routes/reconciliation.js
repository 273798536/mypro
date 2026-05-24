const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { logOperation } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

const getWorkOrderFullData = (workOrderId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM work_orders WHERE id = ?', [workOrderId], (err, workOrder) => {
      if (err) return reject(err);
      if (!workOrder) return resolve(null);
      
      db.all('SELECT * FROM inspection_photos WHERE work_order_id = ?', [workOrderId], (err, photos) => {
        if (err) return reject(err);
        
        db.all('SELECT * FROM repair_hotlines WHERE work_order_id = ?', [workOrderId], (err, hotlines) => {
          if (err) return reject(err);
          
          db.all('SELECT * FROM spare_parts WHERE work_order_id = ?', [workOrderId], (err, parts) => {
            if (err) return reject(err);
            
            db.all('SELECT * FROM external_receipts WHERE work_order_id = ?', [workOrderId], (err, receipts) => {
              if (err) return reject(err);
              
              resolve({ workOrder, photos, hotlines, parts, receipts });
            });
          });
        });
      });
    });
  });
};

const checkReconciliation = (data) => {
  const issues = [];
  const { workOrder, photos, hotlines, parts, receipts } = data;
  
  if (photos.length === 0) {
    issues.push('缺少巡检照片');
  }
  
  if (hotlines.length === 0) {
    issues.push('缺少报修热线记录');
  }
  
  if (parts.length === 0) {
    issues.push('缺少备件使用记录');
  }
  
  const abnormalPhotos = photos.filter(p => p.is_abnormal === 1);
  if (abnormalPhotos.length > 0) {
    const hasExceptionReceipt = receipts.some(r => r.has_exception === 1);
    if (!hasExceptionReceipt) {
      issues.push(`存在${abnormalPhotos.length}张异常照片，但外部回执未标记异常`);
    }
  }
  
  const unqualifiedParts = parts.filter(p => p.is_qualified === 0);
  if (unqualifiedParts.length > 0) {
    const hasExceptionReceipt = receipts.some(r => r.has_exception === 1);
    if (!hasExceptionReceipt) {
      issues.push(`存在${unqualifiedParts.length}个不合格备件，但外部回执未标记异常`);
    }
  }
  
  return {
    matched: issues.length === 0,
    issues
  };
};

router.post('/check/:workOrderId', requireRole('review', 'supervisor'), async (req, res) => {
  try {
    const data = await getWorkOrderFullData(req.params.workOrderId);
    if (!data) {
      return res.status(404).json({ error: '工单不存在' });
    }
    
    const result = checkReconciliation(data);
    
    db.run(
      `INSERT INTO reconciliation_records (work_order_id, reconciliation_type, status, before_state, operator_user_id, remark) 
       VALUES (?, 'auto_check', ?, ?, ?, ?)`,
      [
        req.params.workOrderId,
        result.matched ? 'matched' : 'mismatched',
        JSON.stringify(data),
        req.user.id,
        result.issues.join('; ')
      ],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          work_order_id: req.params.workOrderId,
          matched: result.matched,
          issues: result.issues,
          reconciliation_id: this.lastID
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch-check', requireRole('review', 'supervisor'), (req, res) => {
  const { status = 'pending' } = req.body;
  
  db.all('SELECT id FROM work_orders WHERE status = ?', [status], async (err, orders) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const results = [];
    for (const order of orders) {
      try {
        const data = await getWorkOrderFullData(order.id);
        if (data) {
          const result = checkReconciliation(data);
          results.push({
            work_order_id: order.id,
            matched: result.matched,
            issues: result.issues
          });
        }
      } catch (e) {
        // continue
      }
    }
    
    const matchedCount = results.filter(r => r.matched).length;
    res.json({
      total: results.length,
      matched: matchedCount,
      mismatched: results.length - matchedCount,
      details: results
    });
  });
});

router.post('/manual-fix/:reconciliationId', requireRole('supervisor'), (req, res) => {
  const { remark } = req.body;
  
  db.get('SELECT * FROM reconciliation_records WHERE id = ?', [req.params.reconciliationId], async (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(404).json({ error: '对账记录不存在' });
    
    const oldRecord = { ...record };
    
    db.run(
      'UPDATE reconciliation_records SET status = ?, operator_user_id = ?, remark = ? WHERE id = ?',
      ['manual_fixed', req.user.id, remark || record.remark, req.params.reconciliationId],
      async function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT * FROM reconciliation_records WHERE id = ?', [req.params.reconciliationId], async (err, newRecord) => {
          await logOperation('manual_fix', 'reconciliation_records', req.params.reconciliationId, req.user.id, req.user.role, oldRecord, newRecord, req.ip);
          res.json(newRecord);
        });
      }
    );
  });
});

router.get('/', requireRole('review', 'supervisor'), (req, res) => {
  const { work_order_id, status } = req.query;
  
  let sql = 'SELECT * FROM reconciliation_records WHERE 1=1';
  const params = [];
  
  if (work_order_id) {
    sql += ' AND work_order_id = ?';
    params.push(work_order_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;
