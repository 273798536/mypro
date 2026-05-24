const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole, filterResponse } = require('../middleware/auth');
const { getBadDataRecords, resolveBadData } = require('../utils/dataValidator');
const { logOperation } = require('../utils/operationLogger');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole('review', 'supervisor'), filterResponse('bad_data_records'), async (req, res) => {
  try {
    const { is_resolved, source_table } = req.query;
    const records = await getBadDataRecords({
      is_resolved: is_resolved !== undefined ? is_resolved === 'true' : undefined,
      source_table
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resolve', requireRole('supervisor'), async (req, res) => {
  const { resolution_note } = req.body;
  
  try {
    const result = await resolveBadData(req.params.id, req.user.id, resolution_note);
    if (!result) {
      return res.status(404).json({ error: '坏数据记录不存在' });
    }
    
    await logOperation('resolve_bad_data', 'bad_data_records', req.params.id, req.user.id, req.user.role, null, { resolved: true, resolution_note }, req.ip);
    
    db.get('SELECT * FROM bad_data_records WHERE id = ?', [req.params.id], (err, record) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        ...record,
        source_data: record.source_data ? JSON.parse(record.source_data) : null
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/retry/:id', requireRole('supervisor'), (req, res) => {
  db.get('SELECT * FROM bad_data_records WHERE id = ?', [req.params.id], async (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(404).json({ error: '记录不存在' });
    
    const sourceData = JSON.parse(record.source_data);
    
    let insertSql = '';
    let params = [];
    
    switch (record.source_table) {
      case 'work_orders':
        insertSql = `INSERT INTO work_orders (order_no, road_section, light_count, fault_type, description, location, entry_user_id, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`;
        params = [
          sourceData.order_no,
          sourceData.road_section,
          sourceData.light_count || 0,
          sourceData.fault_type,
          sourceData.description,
          sourceData.location,
          req.user.id
        ];
        break;
      default:
        return res.status(400).json({ error: '不支持重试该类型的数据' });
    }
    
    db.run(insertSql, params, async function(err) {
      if (err) {
        return res.status(400).json({ error: '重试失败: ' + err.message });
      }
      
      await resolveBadData(req.params.id, req.user.id, '重试成功，数据已插入');
      await logOperation('retry_bad_data', record.source_table, this.lastID, req.user.id, req.user.role, null, sourceData, req.ip);
      
      res.json({
        message: '重试成功',
        new_record_id: this.lastID
      });
    });
  });
});

module.exports = router;
