const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const { getOperationLogs, getRecordHistory } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/logs', requireRole('supervisor', 'review'), async (req, res) => {
  try {
    const { table_name, record_id, user_id, operation_type, limit = 50 } = req.query;
    
    const logs = await getOperationLogs({
      table_name,
      record_id: record_id ? Number(record_id) : undefined,
      user_id: user_id ? Number(user_id) : undefined,
      operation_type,
      limit: Number(limit)
    });
    
    res.json(logs.map(log => ({
      ...log,
      before_data: log.before_data ? JSON.parse(log.before_data) : null,
      after_data: log.after_data ? JSON.parse(log.after_data) : null,
      diff_summary: log.diff_summary ? JSON.parse(log.diff_summary) : null
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/work-order/:id/timeline', requireRole('supervisor', 'review'), (req, res) => {
  const orderId = req.params.id;
  
  db.get('SELECT * FROM work_orders WHERE id = ?', [orderId], async (err, workOrder) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!workOrder) return res.status(404).json({ error: '工单不存在' });
    
    try {
      const orderLogs = await getRecordHistory('work_orders', orderId);
      const photoLogs = await getOperationLogs({ table_name: 'inspection_photos', record_id: null });
      const hotlineLogs = await getOperationLogs({ table_name: 'repair_hotlines', record_id: null });
      const partLogs = await getOperationLogs({ table_name: 'spare_parts', record_id: null });
      const receiptLogs = await getOperationLogs({ table_name: 'external_receipts', record_id: null });
      
      const timeline = [
        ...orderLogs.map(l => ({ ...l, category: '工单' })),
        ...photoLogs.map(l => ({ ...l, category: '巡检照片' })),
        ...hotlineLogs.map(l => ({ ...l, category: '报修热线' })),
        ...partLogs.map(l => ({ ...l, category: '备件' })),
        ...receiptLogs.map(l => ({ ...l, category: '外部回执' }))
      ]
      .filter(l => l.record_id == orderId || 
        (l.before_data && JSON.parse(l.before_data || '{}').work_order_id == orderId) ||
        (l.after_data && JSON.parse(l.after_data || '{}').work_order_id == orderId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      res.json({
        work_order: workOrder,
        timeline: timeline.map(item => ({
          ...item,
          before_data: item.before_data ? JSON.parse(item.before_data) : null,
          after_data: item.after_data ? JSON.parse(item.after_data) : null,
          diff_summary: item.diff_summary ? JSON.parse(item.diff_summary) : null
        })),
        steps: timeline.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

router.get('/road-section/:roadName/merge-analysis', requireRole('supervisor', 'review'), (req, res) => {
  const roadName = req.params.roadName;
  
  db.all(
    `SELECT wo.*, 
      (SELECT COUNT(*) FROM inspection_photos WHERE work_order_id = wo.id) as photo_count,
      (SELECT COUNT(*) FROM repair_hotlines WHERE work_order_id = wo.id) as hotline_count,
      (SELECT COUNT(*) FROM spare_parts WHERE work_order_id = wo.id) as part_count,
      (SELECT COUNT(*) FROM external_receipts WHERE work_order_id = wo.id) as receipt_count
     FROM work_orders wo 
     WHERE road_section LIKE ? 
     ORDER BY created_at`,
    [`%${roadName}%`],
    (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const analysis = {
        road_section: roadName,
        total_orders: orders.length,
        status_breakdown: {},
        fault_type_breakdown: {},
        suggested_merge: orders.length > 1,
        orders: orders
      };
      
      orders.forEach(o => {
        analysis.status_breakdown[o.status] = (analysis.status_breakdown[o.status] || 0) + 1;
        analysis.fault_type_breakdown[o.fault_type] = (analysis.fault_type_breakdown[o.fault_type] || 0) + 1;
      });
      
      res.json(analysis);
    }
  );
});

router.get('/abnormal-summary', requireRole('supervisor', 'review'), (req, res) => {
  db.all('SELECT * FROM inspection_photos WHERE is_abnormal = 1', (err, abnormalPhotos) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.all('SELECT * FROM spare_parts WHERE is_qualified = 0', (err, unqualifiedParts) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all('SELECT * FROM external_receipts WHERE has_exception = 1', (err, exceptionReceipts) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const workOrderIds = new Set([
          ...abnormalPhotos.map(p => p.work_order_id),
          ...unqualifiedParts.map(p => p.work_order_id),
          ...exceptionReceipts.map(r => r.work_order_id)
        ]);
        
        res.json({
          summary: {
            abnormal_photos: abnormalPhotos.length,
            unqualified_parts: unqualifiedParts.length,
            exception_receipts: exceptionReceipts.length,
            affected_work_orders: workOrderIds.size
          },
          details: {
            abnormal_photos: abnormalPhotos,
            unqualified_parts: unqualifiedParts,
            exception_receipts: exceptionReceipts
          }
        });
      });
    });
  });
});

module.exports = router;
