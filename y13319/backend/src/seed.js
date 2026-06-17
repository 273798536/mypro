const db = require('./db');
const { logHistory } = require('./utils');

function seed() {
  db.exec(`DELETE FROM change_history; DELETE FROM manual_corrections;
           DELETE FROM anomaly_queue; DELETE FROM samples; DELETE FROM dataset_versions;`);

  const categories = ['表面划痕', '尺寸偏差', '装配错位', '焊点缺失', '颜色不均', '正常品'];
  const anomalyTypes = ['样本泄漏', '标注错误', '重复样本', '图像模糊', '脏数据'];

  const versionStmt = db.prepare(`INSERT INTO dataset_versions
    (version_name, description, sample_count, created_by, created_at)
    VALUES (?, ?, ?, ?, ?)`);

  const v1 = versionStmt.run('v1.0.0-20260515', '5月中旬基线版本，首次上线', 0, 'algorithm_team', '2026-05-15 10:00:00');
  const v2 = versionStmt.run('v1.1.0-20260610', '6月扩充1000条新样本，模型微调', 0, 'algorithm_team', '2026-06-10 14:30:00');

  const sampleStmt = db.prepare(`INSERT INTO samples
    (sample_id, version_id, image_path, category_gt, category_pred, confidence, is_correct, anomaly_type, anomaly_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  for (let i = 1; i <= 500; i++) {
    const gt = categories[Math.floor(Math.random() * categories.length)];
    const isAnomaly = i % 47 === 0 || i % 91 === 0;
    const isWrong = !isAnomaly && (Math.random() < 0.12);
    const pred = isWrong
      ? categories[(categories.indexOf(gt) + 1 + Math.floor(Math.random() * 3)) % categories.length]
      : gt;
    const confidence = isWrong ? (0.55 + Math.random() * 0.25) : (0.85 + Math.random() * 0.14);
    const anomaly = isAnomaly ? anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)] : null;
    sampleStmt.run(`SAMPLE-${String(i).padStart(5, '0')}`, v1.lastInsertRowid,
      `/images/v1/${i}.jpg`, gt, pred, Number(confidence.toFixed(4)),
      anomaly ? 0 : (gt === pred ? 1 : 0), anomaly, anomaly);
  }

  for (let i = 1; i <= 650; i++) {
    let gt, anomaly = null;
    const idx = i > 500 ? i : i;
    const isAnomaly = (i % 53 === 0 && i > 400) || (i % 107 === 0);
    const isNew = i > 480;
    if (i > 500) {
      gt = categories[Math.floor(Math.random() * categories.length)];
    } else if (i % 89 === 0) {
      gt = categories[(categories.indexOf(categories[i % categories.length]) + 2) % categories.length];
    } else {
      const s = db.prepare('SELECT category_gt FROM samples WHERE sample_id = ? AND version_id = ?')
        .get(`SAMPLE-${String(i).padStart(5, '0')}`, v1.lastInsertRowid);
      gt = s ? s.category_gt : categories[0];
    }
    const isWrong = !isAnomaly && (Math.random() < 0.09);
    const pred = isWrong
      ? categories[(categories.indexOf(gt) + 2) % categories.length]
      : gt;
    const confidence = isWrong ? (0.58 + Math.random() * 0.22) : (0.88 + Math.random() * 0.11);
    anomaly = isAnomaly ? anomalyTypes[Math.floor(Math.random() * 2)] : null;
    sampleStmt.run(`SAMPLE-${String(idx).padStart(5, '0')}`, v2.lastInsertRowid,
      `/images/v2/${idx}.jpg`, gt, pred, Number(confidence.toFixed(4)),
      anomaly ? 0 : (gt === pred ? 1 : 0), anomaly, anomaly);
  }

  db.prepare('UPDATE dataset_versions SET sample_count = 500 WHERE id = ?').run(v1.lastInsertRowid);
  db.prepare('UPDATE dataset_versions SET sample_count = 650 WHERE id = ?').run(v2.lastInsertRowid);

  const corrStmt = db.prepare(`INSERT INTO manual_corrections
    (sample_id, version_id, source, field_mapping_version, raw_payload,
     category_before, category_after, status, corrected_by, corrected_at, review_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  corrStmt.run('SAMPLE-00023', v2.lastInsertRowid, '排班A组-早班', 'v1',
    JSON.stringify({ '来源': '早班复核', '处理状态': '已复核', '修正后类别': '表面划痕', '原始标注': '正常品' }),
    '正常品', '表面划痕', 'confirmed', 'scheduler_zhang', '2026-06-12 09:15:00', '复检照片确认有划痕');
  corrStmt.run('SAMPLE-00045', v2.lastInsertRowid, '排班B组-中班', 'v1',
    JSON.stringify({ '数据来源': '中班抽检', '状态': '待复核', '修正结果': '尺寸偏差', '原类别': '正常品' }),
    '正常品', '尺寸偏差', 'pending', 'scheduler_li', '2026-06-12 15:40:00', null);
  corrStmt.run('SAMPLE-00108', v2.lastInsertRowid, '未知来源', 'v1',
    JSON.stringify({ 'source': 'unknown_export', 'status': 'approved', 'category_after': '焊点缺失' }),
    '正常品', '焊点缺失', 'confirmed', 'scheduler_wang', '2026-06-13 08:20:00', 'X光图确认');
  corrStmt.run('SAMPLE-00215', v2.lastInsertRowid, '排班A组-早班', 'v1',
    JSON.stringify({ '来源': '人工复核', '处理状态': '驳回', '修正后类别': '正常品', '原始标注': '表面划痕' }),
    '表面划痕', '正常品', 'rejected', 'scheduler_zhang', '2026-06-13 10:00:00', '图像反光误判');
  corrStmt.run('SAMPLE-00089', v1.lastInsertRowid, '历史数据', 'v1',
    JSON.stringify({ '来源': 'v1遗留', '状态': '已确认', 'category_before': '正常品', 'category_after': '装配错位' }),
    '正常品', '装配错位', 'confirmed', 'scheduler_old', '2026-05-28 11:00:00', null);

  const anomStmt = db.prepare(`INSERT INTO anomaly_queue
    (sample_id, version_id, anomaly_type, severity, description, status, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  anomStmt.run('SAMPLE-00047', v2.lastInsertRowid, '样本泄漏', 'critical', '该样本在训练集中出现，版本v1,v2均存在', 'open', '2026-06-11 16:20:00');
  anomStmt.run('SAMPLE-00091', v2.lastInsertRowid, '样本泄漏', 'high', '疑似训练集第12批次重复', 'open', '2026-06-11 16:25:00');
  anomStmt.run('SAMPLE-00212', v2.lastInsertRowid, '图像模糊', 'normal', '对焦不清，边缘无法辨识', 'resolved', '2026-06-12 09:30:00');
  anomStmt.run('SAMPLE-00159', v1.lastInsertRowid, '标注错误', 'medium', '类别与图像明显不符', 'open', '2026-05-20 14:00:00');

  logHistory('version', String(v2.lastInsertRowid), v2.lastInsertRowid, 'update', 'sample_count', '500', '650', 'algorithm', '6月扩样完成');
  logHistory('sample', 'SAMPLE-00023', v2.lastInsertRowid, 'update', 'category_gt', '正常品', '表面划痕', 'scheduler_zhang', '人工确认前后变化记录');
  logHistory('sample', 'SAMPLE-00045', v2.lastInsertRowid, 'update', 'is_correct', '1', '0', 'system', '算法预判错误，进入复核队列');
  logHistory('correction', '1', v2.lastInsertRowid, 'update', 'status', 'pending', 'confirmed', 'reviewer_ning', '阿宁复核通过');

  console.log('[种子数据] 插入完成！');
  console.log(`  - 版本: 2个 (v1:500条, v2:650条)`);
  console.log(`  - 人工修正: 5条`);
  console.log(`  - 异常队列: 4条`);
  console.log(`  - 历史记录已注入`);
}

seed();
