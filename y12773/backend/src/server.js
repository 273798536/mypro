const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const statusFlow = {
  IMPORTED: { label: '已导入', next: ['UNDER_REVIEW'], color: 'default' },
  UNDER_REVIEW: { label: '复核中', next: ['CONFIRMED', 'REJECTED'], color: 'processing' },
  CONFIRMED: { label: '已确认', next: ['REPORTED'], color: 'success' },
  REJECTED: { label: '已驳回', next: ['UNDER_REVIEW'], color: 'error' },
  REPORTED: { label: '已报告', next: [], color: 'purple' }
};

function now() {
  return new Date().toISOString();
}

function evaluateConclusion(testValue, limitValue) {
  if (testValue == null || limitValue == null) return '待确认';
  return testValue <= limitValue ? '通过' : '不通过';
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: now() });
});

app.get('/api/batches', (req, res) => {
  const { keyword, status } = req.query;
  let sql = `
    SELECT rb.*, 
           COUNT(pt.id) as test_count,
           SUM(CASE WHEN pt.result_status = 'IMPORTED' THEN 1 ELSE 0 END) as imported_count,
           SUM(CASE WHEN pt.result_status = 'UNDER_REVIEW' THEN 1 ELSE 0 END) as reviewing_count,
           SUM(CASE WHEN pt.result_status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_count,
           SUM(CASE WHEN pt.result_status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
           SUM(CASE WHEN pt.result_status = 'REPORTED' THEN 1 ELSE 0 END) as reported_count
    FROM reagent_batches rb
    LEFT JOIN pesticide_tests pt ON pt.batch_id = rb.id
    WHERE 1=1
  `;
  const params = [];
  if (keyword) {
    sql += ' AND (rb.batch_no LIKE ? OR rb.reagent_name LIKE ? OR rb.manufacturer LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  sql += ' GROUP BY rb.id ORDER BY rb.updated_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/batches/:id', (req, res) => {
  const batch = db.prepare('SELECT * FROM reagent_batches WHERE id = ?').get(req.params.id);
  if (!batch) return res.status(404).json({ error: '批次不存在' });
  const tests = db.prepare(`
    SELECT pt.*, statusFlow.label as status_label
    FROM pesticide_tests pt
    WHERE pt.batch_id = ?
    ORDER BY pt.test_item
  `).all(req.params.id);
  res.json({ ...batch, tests });
});

app.get('/api/tests', (req, res) => {
  const { status, keyword } = req.query;
  let sql = `
    SELECT pt.*, rb.batch_no, rb.reagent_name, rb.manufacturer, rb.specification,
           sf.label as status_label, sf.color as status_color
    FROM pesticide_tests pt
    JOIN reagent_batches rb ON rb.id = pt.batch_id
    LEFT JOIN (
      SELECT 'IMPORTED' as status, '已导入' as label, 'default' as color
      UNION ALL SELECT 'UNDER_REVIEW', '复核中', 'processing'
      UNION ALL SELECT 'CONFIRMED', '已确认', 'success'
      UNION ALL SELECT 'REJECTED', '已驳回', 'error'
      UNION ALL SELECT 'REPORTED', '已报告', 'purple'
    ) sf ON sf.status = pt.result_status
    WHERE 1=1
  `;
  const params = [];
  if (status && status !== 'ALL') {
    sql += ' AND pt.result_status = ?';
    params.push(status);
  }
  if (keyword) {
    sql += ' AND (rb.batch_no LIKE ? OR rb.reagent_name LIKE ? OR pt.test_item LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  sql += ' ORDER BY pt.updated_at DESC LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get('/api/tests/:id/history', (req, res) => {
  const rows = db.prepare(`
    SELECT rh.*, 
           sf1.label as from_label, sf1.color as from_color,
           sf2.label as to_label, sf2.color as to_color
    FROM review_history rh
    LEFT JOIN (
      SELECT 'IMPORTED' as status, '已导入' as label, 'default' as color
      UNION ALL SELECT 'UNDER_REVIEW', '复核中', 'processing'
      UNION ALL SELECT 'CONFIRMED', '已确认', 'success'
      UNION ALL SELECT 'REJECTED', '已驳回', 'error'
      UNION ALL SELECT 'REPORTED', '已报告', 'purple'
    ) sf1 ON sf1.status = rh.from_status
    LEFT JOIN (
      SELECT 'IMPORTED' as status, '已导入' as label, 'default' as color
      UNION ALL SELECT 'UNDER_REVIEW', '复核中', 'processing'
      UNION ALL SELECT 'CONFIRMED', '已确认', 'success'
      UNION ALL SELECT 'REJECTED', '已驳回', 'error'
      UNION ALL SELECT 'REPORTED', '已报告', 'purple'
    ) sf2 ON sf2.status = rh.to_status
    WHERE rh.test_id = ?
    ORDER BY rh.created_at DESC
  `).all(req.params.id);
  res.json(rows);
});

app.post('/api/tests/:id/review', (req, res) => {
  const { id } = req.params;
  const { to_status, review_reason, review_comment, reviewer, test_value, limit_value, conclusion } = req.body;

  const test = db.prepare('SELECT * FROM pesticide_tests WHERE id = ?').get(id);
  if (!test) return res.status(404).json({ error: '检测记录不存在' });

  const allowed = statusFlow[test.result_status]?.next || [];
  if (!allowed.includes(to_status)) {
    return res.status(400).json({ error: `不允许从 ${test.result_status} 变更到 ${to_status}` });
  }

  const newConclusion = conclusion || (test_value != null && limit_value != null
    ? evaluateConclusion(test_value, limit_value)
    : test.conclusion);

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO review_history 
      (test_id, from_status, to_status, reviewer, review_reason, review_comment,
       old_value, new_value, old_conclusion, new_conclusion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, test.result_status, to_status, reviewer || '未知',
           review_reason || '', review_comment || '',
           test.test_value, test_value ?? test.test_value,
           test.conclusion, newConclusion, now());

    db.prepare(`
      UPDATE pesticide_tests SET
        result_status = ?,
        test_value = COALESCE(?, test_value),
        limit_value = COALESCE(?, limit_value),
        conclusion = ?,
        reviewer = COALESCE(?, reviewer),
        review_reason = COALESCE(?, review_reason),
        review_comment = COALESCE(?, review_comment),
        reviewed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(to_status, test_value, limit_value, newConclusion,
           reviewer, review_reason, review_comment, now(), now(), id);
  });

  tx();
  const updated = db.prepare('SELECT * FROM pesticide_tests WHERE id = ?').get(id);
  res.json(updated);
});

app.post('/api/import', (req, res) => {
  const { records, file_name, operator } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: '导入数据为空' });
  }

  let importCount = 0;
  let updateCount = 0;
  let skipCount = 0;
  const errors = [];

  const tx = db.transaction(() => {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r.batch_no || !r.reagent_name) {
        errors.push({ row: i + 1, msg: '批次号和试剂名称必填' });
        skipCount++;
        continue;
      }

      let batch = db.prepare(
        'SELECT * FROM reagent_batches WHERE batch_no = ? AND reagent_name = ?'
      ).get(r.batch_no, r.reagent_name);

      const ts = now();
      if (!batch) {
        const info = db.prepare(`
          INSERT INTO reagent_batches
          (batch_no, reagent_name, specification, manufacturer, arrival_date,
           quantity, unit, supplier, remark, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(r.batch_no, r.reagent_name, r.specification || '', r.manufacturer || '',
               r.arrival_date || '', r.quantity || 0, r.unit || '',
               r.supplier || '', r.remark || '', ts, ts);
        batch = { id: info.lastInsertRowid };
        importCount++;
      } else {
        db.prepare(`
          UPDATE reagent_batches SET
            specification = COALESCE(?, specification),
            manufacturer = COALESCE(?, manufacturer),
            arrival_date = COALESCE(?, arrival_date),
            quantity = COALESCE(?, quantity),
            unit = COALESCE(?, unit),
            supplier = COALESCE(?, supplier),
            remark = COALESCE(?, remark),
            updated_at = ?
          WHERE id = ?
        `).run(r.specification, r.manufacturer, r.arrival_date,
               r.quantity, r.unit, r.supplier, r.remark, ts, batch.id);
      }

      if (r.test_item) {
        const conclusion = evaluateConclusion(r.test_value, r.limit_value);
        let testRec = db.prepare(
          'SELECT * FROM pesticide_tests WHERE batch_id = ? AND test_item = ?'
        ).get(batch.id, r.test_item);

        if (!testRec) {
          db.prepare(`
            INSERT INTO pesticide_tests
            (batch_id, test_item, test_value, limit_value, unit, test_method,
             test_date, tester, result_status, conclusion, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IMPORTED', ?, ?, ?)
          `).run(batch.id, r.test_item, r.test_value ?? null, r.limit_value ?? null,
                 r.unit || '', r.test_method || '', r.test_date || '',
                 r.tester || '', conclusion, ts, ts);
          if (batch) updateCount;
        } else {
          db.prepare(`
            UPDATE pesticide_tests SET
              test_value = COALESCE(?, test_value),
              limit_value = COALESCE(?, limit_value),
              unit = COALESCE(?, unit),
              test_method = COALESCE(?, test_method),
              test_date = COALESCE(?, test_date),
              tester = COALESCE(?, tester),
              conclusion = ?,
              updated_at = ?
            WHERE id = ?
          `).run(r.test_value, r.limit_value, r.unit, r.test_method,
                 r.test_date, r.tester, conclusion, ts, testRec.id);
          updateCount++;
        }
      }
    }

    db.prepare(`
      INSERT INTO import_logs (file_name, import_count, update_count, skip_count, operator, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(file_name || 'manual', importCount, updateCount, skipCount, operator || '未知', now());
  });

  tx();
  res.json({ importCount, updateCount, skipCount, errors });
});

app.get('/api/dashboard', (req, res) => {
  const stats = db.prepare(`
    SELECT result_status, COUNT(*) as cnt
    FROM pesticide_tests
    GROUP BY result_status
  `).all();

  const batchStats = db.prepare('SELECT COUNT(*) as total FROM reagent_batches').get();

  const abnormal = db.prepare(`
    SELECT pt.*, rb.batch_no, rb.reagent_name
    FROM pesticide_tests pt
    JOIN reagent_batches rb ON rb.id = pt.batch_id
    WHERE pt.result_status IN ('REJECTED', 'UNDER_REVIEW')
       OR pt.conclusion = '不通过'
    ORDER BY pt.updated_at DESC
    LIMIT 20
  `).all();

  res.json({
    stats,
    totalBatches: batchStats.total,
    abnormal
  });
});

app.get('/api/export', (req, res) => {
  const { format = 'json' } = req.query;
  const rows = db.prepare(`
    SELECT 
      rb.batch_no as '批次号',
      rb.reagent_name as '试剂名称',
      rb.specification as '规格',
      rb.manufacturer as '生产厂家',
      rb.arrival_date as '到货日期',
      rb.quantity as '数量',
      rb.unit as '单位',
      rb.supplier as '供应商',
      pt.test_item as '检测项目',
      pt.test_value as '检测值',
      pt.limit_value as '限值',
      pt.unit as '检测单位',
      pt.test_method as '检测方法',
      pt.test_date as '检测日期',
      pt.tester as '检测人',
      CASE pt.result_status
        WHEN 'IMPORTED' THEN '已导入'
        WHEN 'UNDER_REVIEW' THEN '复核中'
        WHEN 'CONFIRMED' THEN '已确认'
        WHEN 'REJECTED' THEN '已驳回'
        WHEN 'REPORTED' THEN '已报告'
      END as '状态',
      pt.conclusion as '结论',
      pt.reviewer as '复核人',
      pt.review_reason as '修正原因',
      pt.review_comment as '复核意见',
      pt.reviewed_at as '复核时间'
    FROM pesticide_tests pt
    JOIN reagent_batches rb ON rb.id = pt.batch_id
    ORDER BY rb.batch_no, pt.test_item
  `).all();

  if (format === 'csv') {
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = r[h] == null ? '' : String(r[h]);
        return v.includes(',') || v.includes('"') || v.includes('\n')
          ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','))
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="pesticide_report_${Date.now()}.csv"`);
    res.send('\uFEFF' + csv);
  } else {
    res.json(rows);
  }
});

app.get('/api/status-flow', (req, res) => {
  res.json(statusFlow);
});

app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`农药残留批次追踪系统已启动: http://localhost:${PORT}`);
});
