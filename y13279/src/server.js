const express = require('express');
const path = require('path');
const { getDb, initSchema } = require('./db');

initSchema();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function ensureRows(stmt, params) {
  return stmt.all(...params);
}

// ========== GIS 点位 ==========

app.get('/api/gis-points', (req, res) => {
  const db = getDb();
  const points = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM opinion_entries o WHERE o.gis_point_id = p.id) AS opinion_count,
      (SELECT COUNT(*) FROM capacity_alerts c WHERE c.gis_point_id = p.id AND c.resolved = 0) AS unresolved_alerts
    FROM gis_points p ORDER BY p.updated_at DESC
  `).all();
  res.json(points);
});

app.get('/api/gis-points/:id', (req, res) => {
  const db = getDb();
  const point = db.prepare('SELECT * FROM gis_points WHERE id = ?').get(req.params.id);
  if (!point) return res.status(404).json({ error: '点位不存在' });
  res.json(point);
});

app.post('/api/gis-points', (req, res) => {
  const db = getDb();
  const { name, longitude, latitude, address, notes } = req.body;
  if (!name || longitude == null || latitude == null) {
    return res.status(400).json({ error: 'name, longitude, latitude 必填' });
  }
  const r = db.prepare(
    'INSERT INTO gis_points (name, longitude, latitude, address, notes) VALUES (?,?,?,?,?)'
  ).run(name, longitude, latitude, address || '', notes || '');
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/gis-points/:id', (req, res) => {
  const db = getDb();
  const { name, longitude, latitude, address, notes } = req.body;
  db.prepare(
    `UPDATE gis_points SET name=?, longitude=?, latitude=?, address=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`
  ).run(name, longitude, latitude, address, notes, req.params.id);
  res.json({ updated: true });
});

app.delete('/api/gis-points/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM gis_points WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// ========== 意见录入 & 版本覆盖链 ==========

app.get('/api/opinions', (req, res) => {
  const db = getDb();
  const { gis_point_id } = req.query;
  if (!gis_point_id) return res.status(400).json({ error: 'gis_point_id 必填' });
  const opinions = db.prepare(`
    SELECT o.*, p.status AS processing_status, p.markdown_report
    FROM opinion_entries o
    LEFT JOIN processing_records p ON p.opinion_entry_id = o.id
    WHERE o.gis_point_id = ?
    ORDER BY o.version ASC
  `).all(gis_point_id);
  res.json(opinions);
});

app.post('/api/opinions', (req, res) => {
  const db = getDb();
  const { gis_point_id, content, supersedes_id, source_description } = req.body;
  if (!gis_point_id || !content) {
    return res.status(400).json({ error: 'gis_point_id, content 必填' });
  }

  const insertOpinion = db.transaction(() => {
    const maxVer = db.prepare(
      'SELECT MAX(version) AS mv FROM opinion_entries WHERE gis_point_id = ?'
    ).get(gis_point_id);
    const nextVer = (maxVer.mv || 0) + 1;

    const r = db.prepare(
      'INSERT INTO opinion_entries (gis_point_id, content, version, supersedes_id, source_description) VALUES (?,?,?,?,?)'
    ).run(gis_point_id, content, nextVer, supersedes_id || null, source_description || '');

    db.prepare(
      'INSERT INTO processing_records (opinion_entry_id, status, changed_judgments) VALUES (?,?,?)'
    ).run(r.lastInsertRowid, 'pending', '');

    if (supersedes_id) {
      const old = db.prepare(
        'SELECT content FROM opinion_entries WHERE id = ?'
      ).get(supersedes_id);
      if (old) {
        const chainNote = `v${nextVer - 1}→v${nextVer}: 旧意见「${old.content.slice(0, 40)}…」被新意见覆盖`;
        db.prepare(
          'UPDATE processing_records SET changed_judgments = ? WHERE opinion_entry_id = ?'
        ).run(chainNote, r.lastInsertRowid);
      }
    }

    return r.lastInsertRowid;
  });

  const newId = insertOpinion();
  res.status(201).json({ id: newId });
});

// ========== 处理记录 & Markdown 报告 ==========

app.get('/api/processing-records', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db.prepare(`
      SELECT r.*, o.gis_point_id, o.content AS opinion_content, o.version AS opinion_version,
        g.name AS gis_point_name, g.address AS gis_point_address
      FROM processing_records r
      JOIN opinion_entries o ON o.id = r.opinion_entry_id
      JOIN gis_points g ON g.id = o.gis_point_id
      WHERE r.status = ?
      ORDER BY r.updated_at DESC
    `).all(status);
  } else {
    rows = db.prepare(`
      SELECT r.*, o.gis_point_id, o.content AS opinion_content, o.version AS opinion_version,
        g.name AS gis_point_name, g.address AS gis_point_address
      FROM processing_records r
      JOIN opinion_entries o ON o.id = r.opinion_entry_id
      JOIN gis_points g ON g.id = o.gis_point_id
      ORDER BY r.updated_at DESC
    `).all();
  }
  res.json(rows);
});

app.put('/api/processing-records/:id', (req, res) => {
  const db = getDb();
  const { status, markdown_report, changed_judgments } = req.body;
  const existing = db.prepare('SELECT * FROM processing_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '记录不存在' });

  const newStatus = status || existing.status;
  const newReport = markdown_report !== undefined ? markdown_report : existing.markdown_report;
  const newJudgments = changed_judgments !== undefined ? changed_judgments : existing.changed_judgments;
  const processedAt = newStatus === 'processed' ? "datetime('now','localtime')" : (existing.processed_at || null);

  if (processedAt && processedAt !== existing.processed_at) {
    db.prepare(
      `UPDATE processing_records SET status=?, markdown_report=?, changed_judgments=?, processed_at=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?`
    ).run(newStatus, newReport, newJudgments, req.params.id);
  } else {
    db.prepare(
      `UPDATE processing_records SET status=?, markdown_report=?, changed_judgments=?, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(newStatus, newReport, newJudgments, req.params.id);
  }

  res.json({ updated: true });
});

// ========== 清单看板统计 ==========

app.get('/api/dashboard', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT status, COUNT(*) AS count FROM processing_records GROUP BY status
  `).all();

  const summary = { total: 0, pending: 0, processing: 0, processed: 0, needs_evidence: 0 };
  for (const row of stats) {
    summary[row.status] = row.count;
    summary.total += row.count;
  }

  const unresolvedAlerts = db.prepare(
    'SELECT COUNT(*) AS count FROM capacity_alerts WHERE resolved = 0'
  ).get().count;

  const recentMerges = db.prepare(
    "SELECT COUNT(*) AS count FROM merge_evidences WHERE created_at > datetime('now','localtime','-7 days')"
  ).get().count;

  summary.unresolved_alerts = unresolvedAlerts;
  summary.recent_merges = recentMerges;

  res.json(summary);
});

// ========== 归并证据 ==========

app.get('/api/merge-evidences', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT m.*, g.name AS merged_point_name
    FROM merge_evidences m
    JOIN gis_points g ON g.id = m.merged_gis_point_id
    ORDER BY m.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/merge-evidences', (req, res) => {
  const db = getDb();
  const { merged_gis_point_id, source_gis_point_ids, evidence_markdown, merge_reason } = req.body;
  if (!merged_gis_point_id || !source_gis_point_ids || !evidence_markdown) {
    return res.status(400).json({ error: 'merged_gis_point_id, source_gis_point_ids, evidence_markdown 必填' });
  }
  const sourceIds = Array.isArray(source_gis_point_ids) ? JSON.stringify(source_gis_point_ids) : source_gis_point_ids;
  const r = db.prepare(
    'INSERT INTO merge_evidences (merged_gis_point_id, source_gis_point_ids, evidence_markdown, merge_reason) VALUES (?,?,?,?)'
  ).run(merged_gis_point_id, sourceIds, evidence_markdown, merge_reason || '');
  res.status(201).json({ id: r.lastInsertRowid });
});

// ========== 容量告警溯源 ==========

app.get('/api/capacity-alerts', (req, res) => {
  const db = getDb();
  const { resolved } = req.query;
  let rows;
  if (resolved !== undefined) {
    rows = db.prepare(`
      SELECT c.*, g.name AS gis_point_name, g.address AS gis_point_address, g.notes AS gis_point_notes
      FROM capacity_alerts c
      JOIN gis_points g ON g.id = c.gis_point_id
      WHERE c.resolved = ?
      ORDER BY c.created_at DESC
    `).all(resolved === '1' ? 1 : 0);
  } else {
    rows = db.prepare(`
      SELECT c.*, g.name AS gis_point_name, g.address AS gis_point_address, g.notes AS gis_point_notes
      FROM capacity_alerts c
      JOIN gis_points g ON g.id = c.gis_point_id
      ORDER BY c.created_at DESC
    `).all();
  }
  res.json(rows);
});

app.post('/api/capacity-alerts', (req, res) => {
  const db = getDb();
  const { gis_point_id, alert_type, original_data_ref, detail } = req.body;
  if (!gis_point_id || !original_data_ref) {
    return res.status(400).json({ error: 'gis_point_id, original_data_ref 必填' });
  }
  const r = db.prepare(
    'INSERT INTO capacity_alerts (gis_point_id, alert_type, original_data_ref, detail) VALUES (?,?,?,?)'
  ).run(gis_point_id, alert_type || 'capacity_overflow', original_data_ref, detail || '');
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/capacity-alerts/:id/resolve', (req, res) => {
  const db = getDb();
  db.prepare(
    `UPDATE capacity_alerts SET resolved = 1, resolved_at = datetime('now','localtime') WHERE id = ?`
  ).run(req.params.id);
  res.json({ resolved: true });
});

// ========== 处理链可视化数据 ==========

app.get('/api/chain/:gis_point_id', (req, res) => {
  const db = getDb();
  const point = db.prepare('SELECT * FROM gis_points WHERE id = ?').get(req.params.gis_point_id);
  if (!point) return res.status(404).json({ error: '点位不存在' });

  const opinions = db.prepare(`
    SELECT o.*, r.status AS processing_status, r.markdown_report, r.changed_judgments, r.processed_at
    FROM opinion_entries o
    LEFT JOIN processing_records r ON r.opinion_entry_id = o.id
    WHERE o.gis_point_id = ?
    ORDER BY o.version ASC
  `).all(req.params.gis_point_id);

  const alerts = db.prepare(
    'SELECT * FROM capacity_alerts WHERE gis_point_id = ?'
  ).all(req.params.gis_point_id);

  const merges = db.prepare(
    "SELECT * FROM merge_evidences WHERE source_gis_point_ids LIKE ? OR source_gis_point_ids LIKE ? OR source_gis_point_ids LIKE ? OR merged_gis_point_id = ?"
  ).all(
    `%${req.params.gis_point_id}%`,
    `[${req.params.gis_point_id}%`,
    `%,${req.params.gis_point_id}%`,
    req.params.gis_point_id
  );

  res.json({ point, opinions, alerts, merges });
});

// ========== 导出 Markdown 报告 ==========

app.get('/api/export/markdown', (req, res) => {
  const db = getDb();
  const { gis_point_id } = req.query;

  let md = '# 老街消防公示清单\n\n';
  md += `> 生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

  if (gis_point_id) {
    const point = db.prepare('SELECT * FROM gis_points WHERE id = ?').get(gis_point_id);
    if (!point) return res.status(404).json({ error: '点位不存在' });
    md += `## ${point.name}\n\n`;
    md += `- 地址：${point.address || '未填写'}\n`;
    md += `- 坐标：${point.longitude}, ${point.latitude}\n`;
    md += `- 备注：${point.notes || '无'}\n\n`;

    const opinions = db.prepare(`
      SELECT o.*, r.status AS processing_status, r.markdown_report, r.changed_judgments
      FROM opinion_entries o
      LEFT JOIN processing_records r ON r.opinion_entry_id = o.id
      WHERE o.gis_point_id = ? ORDER BY o.version ASC
    `).all(gis_point_id);

    md += '### 意见处理链\n\n';
    for (const op of opinions) {
      const statusLabel = { pending: '⏳ 待处理', processing: '🔄 处理中', processed: '✅ 已处理', needs_evidence: '📎 待补证据' };
      md += `#### 版本 v${op.version}\n\n`;
      md += `- 意见内容：${op.content}\n`;
      md += `- 状态：${statusLabel[op.processing_status] || op.processing_status}\n`;
      if (op.supersedes_id) md += `- 覆盖版本：v${op.version - 1}\n`;
      if (op.changed_judgments) md += `- 判断变更：${op.changed_judgments}\n`;
      if (op.markdown_report) md += `\n${op.markdown_report}\n`;
      md += '\n';
    }
  } else {
    const points = db.prepare('SELECT * FROM gis_points ORDER BY name').all();
    for (const point of points) {
      md += `## ${point.name}\n\n`;
      const opinions = db.prepare(`
        SELECT o.*, r.status AS processing_status, r.changed_judgments
        FROM opinion_entries o
        LEFT JOIN processing_records r ON r.opinion_entry_id = o.id
        WHERE o.gis_point_id = ? ORDER BY o.version ASC
      `).all(point.id);

      const statusEmoji = { pending: '⏳', processing: '🔄', processed: '✅', needs_evidence: '📎' };
      for (const op of opinions) {
        md += `- v${op.version} ${statusEmoji[op.processing_status] || ''} ${op.content}`;
        if (op.changed_judgments) md += ` [${op.changed_judgments}]`;
        md += '\n';
      }
      md += '\n';
    }

    const alerts = db.prepare(`
      SELECT c.*, g.name AS gis_point_name FROM capacity_alerts c
      JOIN gis_points g ON g.id = c.gis_point_id WHERE c.resolved = 0
    `).all();
    if (alerts.length > 0) {
      md += '## 容量告警\n\n';
      for (const a of alerts) {
        md += `- **${a.gis_point_name}**：${a.detail || a.alert_type}（溯源：${a.original_data_ref}）\n`;
      }
      md += '\n';
    }

    const merges = db.prepare(`
      SELECT m.*, g.name AS merged_point_name FROM merge_evidences m
      JOIN gis_points g ON g.id = m.merged_gis_point_id
    `).all();
    if (merges.length > 0) {
      md += '## 归并记录\n\n';
      for (const m of merges) {
        md += `- 合并至 **${m.merged_point_name}**（来源：${m.source_gis_point_ids}）\n`;
        md += `  > ${m.evidence_markdown}\n`;
      }
    }
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.send(md);
});

app.listen(PORT, () => {
  console.log(`老街消防公示清单系统已启动 → http://localhost:${PORT}`);
});
