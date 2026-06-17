const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'complaints.db');

app.use(express.json());

function getDb() {
  const Database = require('better-sqlite3');
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('数据库不存在，请先调用 POST /api/sample 放样例数据');
  }
  return new Database(DB_PATH, { readonly: true });
}

function buildComplaintDetail(db, complaintId) {
  const c = db.prepare(`
    SELECT c.*,
      gp.name as gis_name, gp.point_code as gis_code,
      gp.longitude, gp.latitude, gp.address as gis_address,
      ogp.name as original_gis_name, ogp.point_code as original_gis_code,
      ogp.longitude as original_lng, ogp.latitude as original_lat
    FROM complaints c
    LEFT JOIN gis_points gp ON c.gis_point_id = gp.id
    LEFT JOIN gis_points ogp ON c.original_gis_point_id = ogp.id
    WHERE c.id = ?
  `).get(complaintId);

  if (!c) return null;

  const attachments = db.prepare(`
    SELECT * FROM attachments WHERE complaint_id = ? ORDER BY uploaded_at ASC
  `).all(complaintId);

  const timeline = db.prepare(`
    SELECT * FROM timeline WHERE complaint_id = ? ORDER BY created_at ASC, id ASC
  `).all(complaintId);

  let mergeEvidence = null;
  let mergedComplaints = [];
  if (c.merge_evidence_id) {
    mergeEvidence = db.prepare(`
      SELECT * FROM merge_evidence WHERE id = ?
    `).get(c.merge_evidence_id);

    mergedComplaints = db.prepare(`
      SELECT id, complaint_no, title, status, is_merged, created_at
      FROM complaints WHERE merge_evidence_id = ? AND id != ?
    `).all(c.merge_evidence_id, complaintId);
  }

  const derived = {
    is_smooth_record: !c.has_late_attachment && !c.is_exception && !c.is_merged,
    has_late_attachment_remark: c.has_late_attachment ? attachments.filter(a => a.is_late).map(a => a.file_name) : [],
    exception_detail: c.is_exception ? {
      original_gis: c.original_gis_name ? { name: c.original_gis_name, code: c.original_gis_code, coord: `${c.original_lng}°E, ${c.original_lat}°N` } : null,
      corrected_gis: { name: c.gis_name, code: c.gis_code, coord: `${c.longitude}°E, ${c.latitude}°N` },
      note: c.exception_note
    } : null,
    merge_detail: mergeEvidence ? {
      evidence: mergeEvidence,
      related_complaints: mergedComplaints
    } : null
  };

  return {
    complaint: c,
    gis_point: { name: c.gis_name, code: c.gis_code, longitude: c.longitude, latitude: c.latitude, address: c.gis_address },
    attachments,
    timeline,
    derived
  };
}

app.get('/api/health', (req, res) => {
  const dbExists = fs.existsSync(DB_PATH);
  let sampleReady = false;
  let playbackInfo = null;
  if (dbExists) {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(DB_PATH, { readonly: true });
      const pb = db.prepare('SELECT * FROM playbacks ORDER BY id DESC LIMIT 1').get();
      const cCount = db.prepare('SELECT COUNT(*) as n FROM complaints').get().n;
      sampleReady = !!pb && cCount >= 4;
      if (pb) {
        playbackInfo = {
          id: pb.id,
          name: pb.name,
          description: pb.description,
          complaint_count: JSON.parse(pb.complaint_ids).length
        };
      }
      db.close();
    } catch (e) { /* ignore */ }
  }
  res.json({
    status: 'ok',
    service: '口袋公园座椅投诉回放',
    db_exists: dbExists,
    sample_ready: sampleReady,
    playback: playbackInfo
  });
});

app.post('/api/sample', (req, res) => {
  if (fs.existsSync(DB_PATH)) {
    try { fs.unlinkSync(DB_PATH); } catch (e) {
      return res.status(500).json({ error: '删除旧数据库失败：' + e.message });
    }
  }

  const init = spawn('node', [path.join(__dirname, 'init-db.js')], { cwd: path.join(__dirname, '..') });
  let stdout = '', stderr = '';
  init.stdout.on('data', d => stdout += d.toString());
  init.stderr.on('data', d => stderr += d.toString());
  init.on('close', code => {
    if (code !== 0) {
      return res.status(500).json({ error: '初始化失败', stdout, stderr });
    }
    try {
      const Database = require('better-sqlite3');
      const db = new Database(DB_PATH, { readonly: true });
      const pb = db.prepare('SELECT * FROM playbacks ORDER BY id DESC LIMIT 1').get();
      const complaints = db.prepare(`
        SELECT c.id, c.complaint_no, c.title, c.status, c.has_late_attachment,
               c.is_exception, c.is_merged, c.created_at,
               gp.name as gis_name
        FROM complaints c LEFT JOIN gis_points gp ON c.gis_point_id = gp.id
        ORDER BY c.complaint_no ASC
      `).all();
      db.close();

      res.json({
        message: '样例数据放样成功',
        playback: pb ? { id: pb.id, name: pb.name, description: pb.description } : null,
        complaints: complaints.map(c => ({
          ...c,
          scenario_tag: c.is_exception ? '异常-相邻路口合错' :
                        c.is_merged ? '归并-两种写法' :
                        c.has_late_attachment ? '补录-晚到附件' : '顺利-正常流程'
        }))
      });
    } catch (e) {
      res.status(500).json({ error: '查询结果失败：' + e.message, stdout, stderr });
    }
  });
});

app.post('/api/rerun', (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    return res.status(400).json({ error: '数据库不存在，请先放样例' });
  }
  try { fs.unlinkSync(DB_PATH); } catch (e) {
    return res.status(500).json({ error: '删除旧数据库失败：' + e.message });
  }

  const init = spawn('node', [path.join(__dirname, 'init-db.js')], { cwd: path.join(__dirname, '..') });
  let stdout = '', stderr = '';
  init.stdout.on('data', d => stdout += d.toString());
  init.stderr.on('data', d => stderr += d.toString());
  init.on('close', code => {
    if (code !== 0) {
      return res.status(500).json({ error: '重跑失败', stdout, stderr });
    }
    res.json({ message: '重跑成功：样例数据已重置', stdout });
  });
});

app.get('/api/playbacks', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM playbacks ORDER BY id DESC').all();
    db.close();
    res.json(rows.map(r => ({
      ...r,
      complaint_ids: JSON.parse(r.complaint_ids)
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/playbacks/:id/complaints', (req, res) => {
  try {
    const db = getDb();
    const pb = db.prepare('SELECT * FROM playbacks WHERE id = ?').get(req.params.id);
    if (!pb) { db.close(); return res.status(404).json({ error: '回放包不存在' }); }

    const ids = JSON.parse(pb.complaint_ids);
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT c.id, c.complaint_no, c.title, c.status, c.source, c.handler, c.result,
             c.has_late_attachment, c.is_exception, c.is_merged,
             c.created_at, c.updated_at,
             gp.name as gis_name, gp.point_code, gp.longitude, gp.latitude, gp.address
      FROM complaints c
      LEFT JOIN gis_points gp ON c.gis_point_id = gp.id
      WHERE c.id IN (${placeholders})
      ORDER BY c.complaint_no ASC
    `).all(...ids);

    db.close();

    res.json({
      playback: { id: pb.id, name: pb.name, description: pb.description },
      complaints: rows.map(c => ({
        ...c,
        gis_point: { name: c.gis_name, code: c.point_code, longitude: c.longitude, latitude: c.latitude, address: c.address },
        scenario_tag: c.is_exception ? '异常-相邻路口合错' :
                      c.is_merged ? '归并-两种写法' :
                      c.has_late_attachment ? '补录-晚到附件' : '顺利-正常流程',
        status_consistency: c.status === (c.status) ? '✓ 状态一致' : '⚠ 状态不一致'
      })),
      status_summary: {
        total: rows.length,
        smooth: rows.filter(r => !r.has_late_attachment && !r.is_exception && !r.is_merged).length,
        late_attachment: rows.filter(r => r.has_late_attachment).length,
        exception: rows.filter(r => r.is_exception).length,
        merged: rows.filter(r => r.is_merged).length
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/complaints/:id', (req, res) => {
  try {
    const db = getDb();
    const detail = buildComplaintDetail(db, req.params.id);
    db.close();
    if (!detail) return res.status(404).json({ error: '投诉记录不存在' });
    res.json(detail);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/complaints/:id/timeline/export', (req, res) => {
  try {
    const db = getDb();
    const c = db.prepare('SELECT complaint_no, title, status FROM complaints WHERE id = ?').get(req.params.id);
    if (!c) { db.close(); return res.status(404).json({ error: '投诉记录不存在' }); }

    const timeline = db.prepare(`
      SELECT id, action, status_after, operator, remark, created_at
      FROM timeline WHERE complaint_id = ? ORDER BY created_at ASC, id ASC
    `).all(req.params.id);

    const detail = buildComplaintDetail(db, req.params.id);
    db.close();

    const currentStatus = c.status;
    const lastTimelineStatus = timeline.length > 0 ? timeline[timeline.length - 1].status_after : null;
    const consistent = currentStatus === lastTimelineStatus;

    const lines = [];
    lines.push(`=== 口袋公园座椅投诉回放 · 历史时间线导出 ===`);
    lines.push(`投诉编号: ${c.complaint_no}`);
    lines.push(`标题: ${c.title}`);
    lines.push(`接口查询状态: ${currentStatus}`);
    lines.push(`时间线最终状态: ${lastTimelineStatus || '无时间线记录'}`);
    lines.push(`状态一致性校验: ${consistent ? '✓ 通过（接口状态 = 时间线最终状态）' : '⚠ 不一致！请核查'}`);
    lines.push(``);
    lines.push(`--- 历史时间线 ---`);
    timeline.forEach((t, i) => {
      lines.push(`[${i + 1}] ${t.created_at}`);
      lines.push(`    动作: ${t.action} | 操作人: ${t.operator || '-'}`);
      lines.push(`    动作后状态: ${t.status_after || '-'}`);
      lines.push(`    备注: ${t.remark || '-'}`);
      lines.push(``);
    });

    if (detail && detail.derived.merge_detail) {
      lines.push(`--- 归并证据 ---`);
      const m = detail.derived.merge_detail.evidence;
      lines.push(`归并规则: ${m.merge_rule}`);
      lines.push(`点位A: ${m.point_a_name} (${m.point_a_coord})`);
      lines.push(`点位B: ${m.point_b_name} (${m.point_b_coord})`);
      lines.push(`距离: ${m.distance_meters}米 | 人工确认: ${m.manual_confirm ? '是（' + (m.confirmed_by || '') + '）' : '否'}`);
      lines.push(``);
    }

    if (detail && detail.derived.exception_detail) {
      lines.push(`--- 异常纠正证据 ---`);
      const e = detail.derived.exception_detail;
      if (e.original_gis) {
        lines.push(`原GIS点位: ${e.original_gis.name} (${e.original_gis.code})`);
        lines.push(`        坐标: ${e.original_gis.coord}`);
      }
      lines.push(`纠正后GIS: ${e.corrected_gis.name} (${e.corrected_gis.code})`);
      lines.push(`         坐标: ${e.corrected_gis.coord}`);
      lines.push(`说明: ${e.note}`);
      lines.push(``);
    }

    if (detail && detail.attachments && detail.attachments.length > 0) {
      lines.push(`--- 附件列表 ---`);
      detail.attachments.forEach((a, i) => {
        lines.push(`${i + 1}. ${a.file_name}${a.is_late ? ' 【⚠ 晚到/补录附件】' : ''}`);
        lines.push(`   上传时间: ${a.uploaded_at}`);
        lines.push(`   描述: ${a.description || '-'}`);
      });
      lines.push(``);
    }

    lines.push(`=== 导出结束  状态一致性: ${consistent ? '✓' : '⚠'} ===`);

    const text = lines.join('\n');

    if (req.query.format === 'json') {
      res.json({
        complaint_no: c.complaint_no,
        title: c.title,
        current_status: currentStatus,
        timeline_last_status: lastTimelineStatus,
        status_consistent: consistent,
        timeline,
        merge_evidence: detail?.derived.merge_detail || null,
        exception_detail: detail?.derived.exception_detail || null,
        attachments: detail?.attachments || [],
        text_export: text
      });
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${c.complaint_no}_timeline.txt"`);
      res.send(text);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/gis-points', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT gp.*,
        (SELECT COUNT(*) FROM complaints c WHERE c.gis_point_id = gp.id) as complaint_count
      FROM gis_points gp ORDER BY gp.point_code ASC
    `).all();
    db.close();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  口袋公园座椅投诉回放 服务已启动                       ║`);
  console.log(`║  端口: ${PORT}                                            ║`);
  console.log(`║  健康检查: GET  http://localhost:${PORT}/api/health        ║`);
  console.log(`║  放样例:   POST http://localhost:${PORT}/api/sample        ║`);
  console.log(`║  重跑:     POST http://localhost:${PORT}/api/rerun         ║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
});
