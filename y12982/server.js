const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { get, all, run, generateId, recordAudit, DB_PATH } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'graph-db-inspection', timestamp: new Date().toISOString() });
});

app.get('/api/slow-queries', async (req, res) => {
  try {
    const { status, severity, batch_id, limit = 50, offset = 0 } = req.query;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (severity) {
      whereClauses.push('severity = ?');
      params.push(severity);
    }
    if (batch_id) {
      whereClauses.push('batch_id = ?');
      params.push(batch_id);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as cnt FROM slow_queries ${whereSql}`, params);
    const rows = await all(`
      SELECT * FROM slow_queries ${whereSql}
      ORDER BY execution_time_ms DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ total: totalRow.cnt, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/slow-queries/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM slow_queries WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.status(404).json({ error: '慢查询记录不存在' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches', async (req, res) => {
  try {
    const { status, batch_type, limit = 20, offset = 0 } = req.query;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (batch_type) {
      whereClauses.push('batch_type = ?');
      params.push(batch_type);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as cnt FROM inspection_batches ${whereSql}`, params);
    const rows = await all(`
      SELECT * FROM inspection_batches ${whereSql}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ total: totalRow.cnt, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/batches/:batchId', async (req, res) => {
  try {
    const batch = await get('SELECT * FROM inspection_batches WHERE batch_id = ?', [req.params.batchId]);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const items = await all('SELECT * FROM inspection_items WHERE batch_id = ? ORDER BY severity DESC', [req.params.batchId]);
    const slowQueries = await all('SELECT * FROM slow_queries WHERE batch_id = ? ORDER BY execution_time_ms DESC', [req.params.batchId]);
    const backups = await all('SELECT * FROM backup_records WHERE batch_id = ?', [req.params.batchId]);

    res.json({ batch, items, slowQueries, backups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches', async (req, res) => {
  try {
    const { batch_type, operator, remark } = req.body;
    const batchId = generateId('BATCH');
    const startTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      INSERT INTO inspection_batches 
      (batch_id, batch_type, start_time, status, operator, remark)
      VALUES (?, ?, ?, 'running', ?, ?)
    `, [batchId, batch_type, startTime, operator, remark || '']);

    await recordAudit('create', 'inspection_batch', batchId, null, 'created', operator, '创建巡检批次', req.ip);

    res.status(201).json({ batch_id: batchId, status: 'running' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inspection-items', async (req, res) => {
  try {
    const { status, severity, batch_id, item_type, limit = 50, offset = 0 } = req.query;

    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('ii.status = ?');
      params.push(status);
    }
    if (severity) {
      whereClauses.push('ii.severity = ?');
      params.push(severity);
    }
    if (batch_id) {
      whereClauses.push('ii.batch_id = ?');
      params.push(batch_id);
    }
    if (item_type) {
      whereClauses.push('ii.item_type = ?');
      params.push(item_type);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as cnt FROM inspection_items ii ${whereSql}`, params);
    const rows = await all(`
      SELECT ii.*, sq.query_text, sq.execution_time_ms, sq.lock_wait_time_ms
      FROM inspection_items ii
      LEFT JOIN slow_queries sq ON ii.slow_query_id = sq.id
      ${whereSql}
      ORDER BY 
        CASE ii.severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          WHEN 'info' THEN 3 
          ELSE 4 
        END,
        ii.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ total: totalRow.cnt, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inspection-items/:itemId', async (req, res) => {
  try {
    const item = await get(`
      SELECT ii.*, sq.query_text, sq.execution_time_ms, sq.lock_wait_time_ms,
             sq.query_type, sq.execute_time, sq.database_name
      FROM inspection_items ii
      LEFT JOIN slow_queries sq ON ii.slow_query_id = sq.id
      WHERE ii.item_id = ?
    `, [req.params.itemId]);

    if (!item) {
      return res.status(404).json({ error: '巡检条目不存在' });
    }

    const auditTrail = await all(`
      SELECT * FROM audit_trail 
      WHERE target_type = 'inspection_item' AND target_id = ?
      ORDER BY created_at DESC
    `, [req.params.itemId]);

    res.json({ item, audit_trail: auditTrail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inspection-items/:itemId/status', async (req, res) => {
  try {
    const { status, handler, handle_opinion, operator } = req.body;

    const item = await get('SELECT * FROM inspection_items WHERE item_id = ?', [req.params.itemId]);
    if (!item) {
      return res.status(404).json({ error: '巡检条目不存在' });
    }

    const oldStatus = item.status;
    const handleTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      UPDATE inspection_items 
      SET status = ?, handler = ?, handle_opinion = ?, handle_time = ?
      WHERE item_id = ?
    `, [status, handler || item.handler, handle_opinion || item.handle_opinion, handleTime, req.params.itemId]);

    await recordAudit(
      'status_change',
      'inspection_item',
      req.params.itemId,
      oldStatus,
      status,
      operator || handler || 'system',
      handle_opinion || '',
      req.ip
    );

    if (item.slow_query_id) {
      const slowQueryStatusMap = {
        'resolved': 'resolved',
        'approved': 'approved',
        'pending': 'pending',
        'ignored': 'ignored'
      };
      if (slowQueryStatusMap[status]) {
        await run('UPDATE slow_queries SET status = ? WHERE id = ?',
          [slowQueryStatusMap[status], item.slow_query_id]);
      }
    }

    res.json({ success: true, status, item_id: req.params.itemId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const { review_status, limit = 20, offset = 0 } = req.query;

    let whereClauses = [];
    let params = [];

    if (review_status) {
      whereClauses.push('review_status = ?');
      params.push(review_status);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as cnt FROM inspection_reports ${whereSql}`, params);
    const rows = await all(`
      SELECT * FROM inspection_reports ${whereSql}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ total: totalRow.cnt, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/:reportId', async (req, res) => {
  try {
    const report = await get('SELECT * FROM inspection_reports WHERE report_id = ?', [req.params.reportId]);
    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }

    const batch = await get('SELECT * FROM inspection_batches WHERE batch_id = ?', [report.batch_id]);
    const items = await all('SELECT * FROM inspection_items WHERE batch_id = ? ORDER BY severity DESC', [report.batch_id]);

    res.json({ report, batch, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/:reportId/review', async (req, res) => {
  try {
    const { review_status, reviewer, reason } = req.body;

    const report = await get('SELECT * FROM inspection_reports WHERE report_id = ?', [req.params.reportId]);
    if (!report) {
      return res.status(404).json({ error: '报告不存在' });
    }

    const oldStatus = report.review_status;
    const reviewTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await run(`
      UPDATE inspection_reports 
      SET review_status = ?, reviewer = ?, review_time = ?
      WHERE report_id = ?
    `, [review_status, reviewer, reviewTime, req.params.reportId]);

    await recordAudit(
      'review',
      'inspection_report',
      req.params.reportId,
      oldStatus,
      review_status,
      reviewer,
      reason || '',
      req.ip
    );

    res.json({ success: true, review_status, report_id: req.params.reportId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-trail', async (req, res) => {
  try {
    const { target_type, target_id, operator, limit = 50, offset = 0 } = req.query;

    let whereClauses = [];
    let params = [];

    if (target_type) {
      whereClauses.push('target_type = ?');
      params.push(target_type);
    }
    if (target_id) {
      whereClauses.push('target_id = ?');
      params.push(target_id);
    }
    if (operator) {
      whereClauses.push('operator = ?');
      params.push(operator);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as cnt FROM audit_trail ${whereSql}`, params);
    const rows = await all(`
      SELECT * FROM audit_trail ${whereSql}
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ total: totalRow.cnt, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/statistics/dashboard', async (req, res) => {
  try {
    const pendingItems = (await get("SELECT COUNT(*) as cnt FROM inspection_items WHERE status = 'pending'")).cnt;
    const criticalItems = (await get("SELECT COUNT(*) as cnt FROM inspection_items WHERE severity = 'critical' AND status != 'resolved'")).cnt;
    const totalSlowQueries = (await get('SELECT COUNT(*) as cnt FROM slow_queries')).cnt;
    const totalBatches = (await get('SELECT COUNT(*) as cnt FROM inspection_batches')).cnt;

    const bySeverity = await all(`
      SELECT severity, COUNT(*) as count 
      FROM inspection_items 
      GROUP BY severity
    `);

    const byStatus = await all(`
      SELECT status, COUNT(*) as count 
      FROM inspection_items 
      GROUP BY status
    `);

    const recentBatches = await all(`
      SELECT batch_id, batch_type, status, slow_query_count, created_at
      FROM inspection_batches
      ORDER BY created_at DESC LIMIT 5
    `);

    res.json({
      pending_items: pendingItems,
      critical_items: criticalItems,
      total_slow_queries: totalSlowQueries,
      total_batches: totalBatches,
      by_severity: bySeverity,
      by_status: byStatus,
      recent_batches: recentBatches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backup-records', async (req, res) => {
  try {
    const { batch_id, verification_status, limit = 20, offset = 0 } = req.query;

    let whereClauses = [];
    let params = [];

    if (batch_id) {
      whereClauses.push('batch_id = ?');
      params.push(batch_id);
    }
    if (verification_status) {
      whereClauses.push('verification_status = ?');
      params.push(verification_status);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const totalRow = await get(`SELECT COUNT(*) as cnt FROM backup_records ${whereSql}`, params);
    const rows = await all(`
      SELECT * FROM backup_records ${whereSql}
      ORDER BY backup_time DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    res.json({ total: totalRow.cnt, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`图数据库关系巡检服务已启动`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  API路径: /api/`);
  console.log(`  前端界面: /`);
  console.log(`  数据库: ${DB_PATH}`);
});

module.exports = app;
