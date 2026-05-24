const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const router = express.Router();

router.use(authenticate);

const ensureExportDir = () => {
  const exportDir = path.resolve('./exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  return exportDir;
};

router.get('/work-orders', requireRole('review', 'supervisor'), (req, res) => {
  const { status, format = 'json' } = req.query;
  
  let sql = 'SELECT * FROM work_orders WHERE 1=1';
  const params = [];
  
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (format === 'csv') {
      const exportDir = ensureExportDir();
      const filename = `work_orders_${Date.now()}.csv`;
      const filePath = path.join(exportDir, filename);
      
      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'id', title: 'ID' },
          { id: 'order_no', title: '工单号' },
          { id: 'road_section', title: '路段' },
          { id: 'light_count', title: '灯具数量' },
          { id: 'fault_type', title: '故障类型' },
          { id: 'status', title: '状态' },
          { id: 'description', title: '描述' },
          { id: 'location', title: '位置' },
          { id: 'created_at', title: '创建时间' }
        ]
      });
      
      csvWriter.writeRecords(rows)
        .then(() => {
          res.json({
            message: '导出成功',
            filename,
            filepath: filePath,
            count: rows.length
          });
        })
        .catch(err => res.status(500).json({ error: err.message }));
    } else {
      const exportDir = ensureExportDir();
      const filename = `work_orders_${Date.now()}.json`;
      const filePath = path.join(exportDir, filename);
      
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
      
      res.json({
        message: '导出成功',
        filename,
        filepath: filePath,
        count: rows.length
      });
    }
  });
});

router.get('/full-report/:workOrderId', requireRole('review', 'supervisor'), (req, res) => {
  const orderId = req.params.workOrderId;
  
  db.get('SELECT * FROM work_orders WHERE id = ?', [orderId], (err, workOrder) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!workOrder) return res.status(404).json({ error: '工单不存在' });
    
    db.all('SELECT * FROM inspection_photos WHERE work_order_id = ? ORDER BY created_at', [orderId], (err, photos) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all('SELECT * FROM repair_hotlines WHERE work_order_id = ? ORDER BY call_time', [orderId], (err, hotlines) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all('SELECT * FROM spare_parts WHERE work_order_id = ? ORDER BY created_at', [orderId], (err, parts) => {
          if (err) return res.status(500).json({ error: err.message });
          
          db.all('SELECT * FROM external_receipts WHERE work_order_id = ? ORDER BY created_at', [orderId], (err, receipts) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const report = {
              generated_at: new Date().toISOString(),
              work_order: workOrder,
              inspection_photos_count: photos.length,
              abnormal_photos_count: photos.filter(p => p.is_abnormal).length,
              repair_hotlines_count: hotlines.length,
              spare_parts_count: parts.length,
              unqualified_parts_count: parts.filter(p => !p.is_qualified).length,
              external_receipts_count: receipts.length,
              exception_receipts_count: receipts.filter(r => r.has_exception).length,
              details: {
                inspection_photos: photos,
                repair_hotlines: hotlines,
                spare_parts: parts,
                external_receipts: receipts
              }
            };
            
            const exportDir = ensureExportDir();
            const filename = `report_${workOrder.order_no}_${Date.now()}.json`;
            const filePath = path.join(exportDir, filename);
            
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
            
            res.json({
              message: '报告生成成功',
              filename,
              filepath: filePath,
              report
            });
          });
        });
      });
    });
  });
});

router.get('/summary', requireRole('supervisor'), (req, res) => {
  db.get('SELECT COUNT(*) as total FROM work_orders', (err, totalResult) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as pending FROM work_orders WHERE status = ?', ['pending'], (err, pendingResult) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT COUNT(*) as approved FROM work_orders WHERE status = ?', ['approved'], (err, approvedResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT COUNT(*) as bad_data FROM bad_data_records WHERE is_resolved = 0', (err, badDataResult) => {
          if (err) return res.status(500).json({ error: err.message });
          
          db.all('SELECT road_section, COUNT(*) as count FROM work_orders GROUP BY road_section ORDER BY count DESC', (err, sectionStats) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const summary = {
              generated_at: new Date().toISOString(),
              total_work_orders: totalResult.total,
              pending_count: pendingResult.pending,
              approved_count: approvedResult.approved,
              unresolved_bad_data: badDataResult.bad_data,
              by_road_section: sectionStats
            };
            
            const exportDir = ensureExportDir();
            const filename = `summary_${Date.now()}.json`;
            const filePath = path.join(exportDir, filename);
            
            fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
            
            res.json({
              message: '汇总报告生成成功',
              filename,
              filepath: filePath,
              summary
            });
          });
        });
      });
    });
  });
});

module.exports = router;
