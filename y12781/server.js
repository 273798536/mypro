const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs');
const { initDB, run, get, all, beginTransaction, commit, rollback } = require('./db');
const {
  calculateAbsorptionRate,
  judgeFromRate,
  getHumanReadableIssues,
  normalizeTemperature,
  checkMassPrecision
} = require('./business-logic');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const EXPORT_DIR = path.join(__dirname, 'exports');
if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/exports', express.static(EXPORT_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${dayjs().format('YYYYMMDD_HHmmss')}_${file.originalname}`)
});
const upload = multer({ storage });

function generateBatchNo() {
  return 'BATCH' + dayjs().format('YYYYMMDDHHmmss');
}

app.get('/api/batches', (req, res) => {
  const batches = all(`
    SELECT b.*,
      (SELECT COUNT(*) FROM absorption_records r WHERE r.batch_id = b.id) as record_count,
      (SELECT COUNT(*) FROM status_transitions t WHERE t.batch_id = b.id) as transition_count
    FROM import_batches b ORDER BY b.import_time DESC
  `);
  res.json({ success: true, data: batches });
});

app.get('/api/batches/:id', (req, res) => {
  const batch = get('SELECT * FROM import_batches WHERE id = ?', [req.params.id]);
  if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });
  const records = all('SELECT * FROM absorption_records WHERE batch_id = ? ORDER BY id', [req.params.id]);
  const transitions = all('SELECT * FROM status_transitions WHERE batch_id = ? ORDER BY transition_time', [req.params.id]);
  const reviews = all('SELECT * FROM review_logs WHERE batch_id = ? ORDER BY review_time DESC', [req.params.id]);
  const anomalies = all('SELECT * FROM anomaly_traces WHERE batch_id = ? ORDER BY trace_time DESC', [req.params.id]);
  res.json({ success: true, data: { batch, records, transitions, reviews, anomalies } });
});

app.get('/api/records/:id', (req, res) => {
  const record = get('SELECT * FROM absorption_records WHERE id = ?', [req.params.id]);
  if (!record) return res.status(404).json({ success: false, message: '记录不存在' });
  const reviews = all('SELECT * FROM review_logs WHERE record_id = ? ORDER BY review_time DESC', [req.params.id]);
  const anomalies = all('SELECT * FROM anomaly_traces WHERE record_id = ? ORDER BY trace_time DESC', [req.params.id]);
  res.json({ success: true, data: { record, reviews, anomalies } });
});

app.post('/api/import', upload.single('file'), (req, res) => {
  try {
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const batchNo = generateBatchNo();
    const importTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const operator = req.body.operator || '配方工程师';
    const remark = req.body.remark || '';

    beginTransaction();
    const batchResult = run(`
      INSERT INTO import_batches (batch_no, file_name, import_time, imported_by, total_records, remark, status)
      VALUES (?, ?, ?, ?, ?, ?, 'imported')
    `, [batchNo, req.file.originalname, importTime, operator, rawRows.length, remark]);
    const batchId = batchResult.lastInsertRowid;

    run(`INSERT INTO status_transitions (batch_id, from_status, to_status, operator, transition_time, comment)
      VALUES (?, 'none', 'imported', ?, ?, '数据文件导入完成')`, [batchId, operator, importTime]);

    let validCount = 0;
    rawRows.forEach((row, idx) => {
      const recordNo = row['记录编号'] || row['编号'] || row['record_no'] || `R${String(idx + 1).padStart(4, '0')}`;
      const sampleName = row['样品名称'] || row['样品'] || row['名称'] || row['sample_name'] || '';
      const sampleBatch = row['样品批次'] || row['批次'] || row['批号'] || row['sample_batch'] || '';
      const testDate = row['测试日期'] || row['日期'] || row['test_date'] || '';

      let temperature = row['测试温度'] || row['温度'] || row['temperature'] || '';
      let temperatureUnit = row['温度单位'] || row['temp_unit'] || row['temperature_unit'] || 'C';

      if (typeof temperature === 'string') {
        const t = temperature.trim();
        const m = t.match(/^([\d.]+)\s*(°?[CFKcfk])?$/);
        if (m) {
          temperature = Number(m[1]);
          if (m[2]) temperatureUnit = m[2].toUpperCase().replace('°', '');
        } else if (t.includes('F')) {
          temperature = Number(t.replace(/[^\d.]/g, ''));
          temperatureUnit = 'F';
        } else if (t.includes('K')) {
          temperature = Number(t.replace(/[^\d.]/g, ''));
          temperatureUnit = 'K';
        } else {
          temperature = Number(t) || null;
        }
      }

      const pressure = row['环境气压'] || row['气压'] || row['pressure'] || 101.325;

      let absorbentMass = row['吸收剂质量'] || row['吸收剂'] || row['absorbent_mass'] || '';
      let absorbentMassUnit = row['质量单位'] || row['mass_unit'] || row['absorbent_mass_unit'] || 'g';
      if (typeof absorbentMass === 'string') {
        const m = absorbentMass.trim().match(/^([\d.]+)\s*(g|mg|kg|G|MG|KG)?$/);
        if (m) {
          absorbentMass = Number(m[1]);
          if (m[2]) absorbentMassUnit = m[2].toLowerCase();
        } else {
          absorbentMass = Number(absorbentMass) || null;
        }
      }

      let gasVolume = row['气体体积'] || row['气量'] || row['gas_volume'] || '';
      let gasVolumeUnit = row['体积单位'] || row['volume_unit'] || row['gas_volume_unit'] || 'L';
      if (typeof gasVolume === 'string') {
        const m = gasVolume.trim().match(/^([\d.]+)\s*(L|ml|mL|m³|m3|l)?$/i);
        if (m) {
          gasVolume = Number(m[1]);
          if (m[2]) gasVolumeUnit = m[2];
        } else {
          gasVolume = Number(gasVolume) || null;
        }
      }

      const absorptionRate = row['吸收效率'] || row['吸收率'] || row['效率'] || row['absorption_rate'] || row['absorption_efficiency'] || null;
      const judgment = row['判定'] || row['结果'] || row['judgment'] || '';
      const importedRemark = row['备注'] || row['remark'] || row['comment'] || '';
      const supplementaryRemark = row['补录备注'] || row['补录'] || row['supplementary_remark'] || '';
      const recordRemark = row['说明'] || row['record_remark'] || '';

      const tempRecord = {
        sample_name: sampleName,
        test_date: testDate,
        temperature, temperature_unit: temperatureUnit,
        pressure, absorbent_mass: absorbentMass, absorbent_mass_unit: absorbentMassUnit,
        gas_volume: gasVolume, gas_volume_unit: gasVolumeUnit,
        absorption_rate: absorptionRate
      };
      const calc = calculateAbsorptionRate(tempRecord);

      if (calc.finalRate !== null) validCount++;

      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const recordResult = run(`
        INSERT INTO absorption_records (
          batch_id, record_no, sample_name, sample_batch, test_date,
          temperature, temperature_unit, pressure,
          absorbent_mass, absorbent_mass_unit, absorbent_mass_precision,
          gas_volume, gas_volume_unit, absorption_rate, calculated_rate,
          judgment, original_judgment, data_quality, quality_issues,
          remark, imported_remark, supplementary_remark, fill_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        batchId, recordNo, sampleName, sampleBatch, testDate,
        temperature, temperatureUnit, Number(pressure),
        absorbentMass, absorbentMassUnit, calc.massPrecision.label,
        gasVolume, gasVolumeUnit,
        absorptionRate ? Number(absorptionRate) : null, calc.calculatedRate,
        calc.judgment, judgment || calc.judgment,
        calc.dataQuality, JSON.stringify([...calc.issues, ...calc.warnings]),
        recordRemark, importedRemark, supplementaryRemark,
        calc.fillStatus, now, now
      ]);

      if (calc.issues.length > 0 || calc.warnings.length > 0) {
        run(`
          INSERT INTO review_logs (record_id, batch_id, reviewer, review_time, review_type, comment, review_result)
          VALUES (?, ?, 'system', ?, 'import_check', ?, 'auto')
        `, [recordResult.lastInsertRowid, batchId, now,
            `自动检测：${calc.issues.length}个问题，${calc.warnings.length}条提醒`]);
      }
    });

    run('UPDATE import_batches SET valid_records = ? WHERE id = ?', [validCount, batchId]);
    commit();

    res.json({
      success: true,
      data: {
        batchId, batchNo,
        totalRecords: rawRows.length,
        validRecords: validCount,
        importTime
      }
    });
  } catch (err) {
    try { rollback(); } catch (e) {}
    console.error('导入失败:', err);
    res.status(500).json({ success: false, message: '导入失败: ' + err.message });
  }
});

app.post('/api/review/:recordId', (req, res) => {
  try {
    const { recordId } = req.params;
    const { fieldName, oldValue, newValue, comment, reviewResult, reviewer, changeJudgment, newJudgment, retestSuggestion } = req.body;

    const record = get('SELECT * FROM absorption_records WHERE id = ?', [recordId]);
    if (!record) return res.status(404).json({ success: false, message: '记录不存在' });

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const reviewerName = reviewer || '配方工程师';

    beginTransaction();

    if (fieldName && fieldName !== 'judgment' && newValue !== undefined) {
      run(`UPDATE absorption_records SET ${fieldName} = ?, updated_at = ? WHERE id = ?`, [newValue, now, Number(recordId)]);

      if (['temperature', 'absorbent_mass', 'gas_volume', 'pressure', 'absorption_rate'].includes(fieldName)) {
        const updated = get('SELECT * FROM absorption_records WHERE id = ?', [recordId]);
        const tmpRec = {
          sample_name: updated.sample_name,
          test_date: updated.test_date,
          temperature: updated.temperature,
          temperature_unit: updated.temperature_unit,
          pressure: updated.pressure,
          absorbent_mass: updated.absorbent_mass,
          absorbent_mass_unit: updated.absorbent_mass_unit,
          gas_volume: updated.gas_volume,
          gas_volume_unit: updated.gas_volume_unit,
          absorption_rate: updated.absorption_rate
        };
        const recalc = calculateAbsorptionRate(tmpRec);
        run('UPDATE absorption_records SET calculated_rate = ?, data_quality = ?, quality_issues = ?, absorbent_mass_precision = ?, fill_status = ?, updated_at = ? WHERE id = ?',
          [recalc.calculatedRate, recalc.dataQuality, JSON.stringify([...recalc.issues, ...recalc.warnings]), recalc.massPrecision.label, recalc.fillStatus, now, Number(recordId)]);
      }
    }

    const recordAfter = get('SELECT * FROM absorption_records WHERE id = ?', [recordId]);
    let beforeJudgment = recordAfter.judgment;
    let afterJudgment = beforeJudgment;
    if (changeJudgment && newJudgment) {
      afterJudgment = newJudgment;
      run('UPDATE absorption_records SET judgment = ?, updated_at = ? WHERE id = ?', [newJudgment, now, Number(recordId)]);
    }

    if (comment || (fieldName && fieldName !== 'judgment') || changeJudgment) {
      run(`
        INSERT INTO review_logs (record_id, batch_id, reviewer, review_time, review_type,
          field_name, old_value, new_value, comment, review_result)
        VALUES (?, ?, ?, ?, 'manual_review', ?, ?, ?, ?, ?)
      `, [Number(recordId), record.batch_id, reviewerName, now,
        fieldName || null,
        oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
        newValue !== undefined && newValue !== null ? String(newValue) : null,
        comment || null,
        reviewResult || 'reviewed'
      ]);
    }

    if (changeJudgment && beforeJudgment !== afterJudgment) {
      run(`
        INSERT INTO anomaly_traces (record_id, batch_id, anomaly_type, field_name,
          before_value, after_value, before_judgment, after_judgment, reason,
          operator, trace_time, is_retest, retest_suggestion)
        VALUES (?, ?, 'judgment_change', 'judgment', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        Number(recordId), record.batch_id,
        oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
        newValue !== undefined && newValue !== null ? String(newValue) : null,
        beforeJudgment, afterJudgment,
        comment || '复核时调整判定结论',
        reviewerName, now,
        retestSuggestion ? 1 : 0,
        retestSuggestion || null
      ]);
    } else if (retestSuggestion) {
      run(`
        INSERT INTO anomaly_traces (record_id, batch_id, anomaly_type, field_name,
          before_judgment, after_judgment, reason, operator, trace_time, is_retest, retest_suggestion)
        VALUES (?, ?, 'retest_suggestion', ?, ?, ?, ?, ?, ?, 1, ?)
      `, [
        Number(recordId), record.batch_id, fieldName || null,
        beforeJudgment, afterJudgment,
        comment || '提出复测建议',
        reviewerName, now, retestSuggestion
      ]);
    }

    commit();
    res.json({ success: true, message: '复核已记录' });
  } catch (err) {
    try { rollback(); } catch (e) {}
    console.error('复核失败:', err);
    res.status(500).json({ success: false, message: '复核失败: ' + err.message });
  }
});

app.post('/api/batches/:id/transition', (req, res) => {
  try {
    const { id } = req.params;
    const { toStatus, operator, comment } = req.body;
    const batch = get('SELECT * FROM import_batches WHERE id = ?', [id]);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const fromStatus = batch.status;

    beginTransaction();
    run('UPDATE import_batches SET status = ? WHERE id = ?', [toStatus, Number(id)]);
    run(`
      INSERT INTO status_transitions (batch_id, from_status, to_status, operator, transition_time, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [Number(id), fromStatus, toStatus, operator || '配方工程师', now, comment || '']);
    commit();

    res.json({ success: true, data: { fromStatus, toStatus, transitionTime: now } });
  } catch (err) {
    try { rollback(); } catch (e) {}
    console.error('状态流转失败:', err);
    res.status(500).json({ success: false, message: '状态流转失败: ' + err.message });
  }
});

app.get('/api/batches/:id/export', (req, res) => {
  try {
    const { id } = req.params;
    const batch = get('SELECT * FROM import_batches WHERE id = ?', [id]);
    if (!batch) return res.status(404).json({ success: false, message: '批次不存在' });

    const records = all('SELECT * FROM absorption_records WHERE batch_id = ? ORDER BY id', [id]);

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['气体吸收效率检测报告'],
      [''],
      ['批次信息'],
      ['批次编号', batch.batch_no],
      ['导入文件', batch.file_name],
      ['导入时间', batch.import_time],
      ['操作人', batch.imported_by],
      ['当前状态', getStatusLabel(batch.status)],
      ['记录总数', records.length],
      [''],
      ['统计摘要'],
      ['判定结果', '数量', '占比']
    ];

    const stats = { '优秀': 0, '合格': 0, '不合格': 0, '未判定': 0 };
    records.forEach(r => { stats[r.judgment] = (stats[r.judgment] || 0) + 1; });
    Object.entries(stats).forEach(([k, v]) => {
      summaryData.push([k, v, `${((v / records.length) * 100).toFixed(1)}%`]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '报告摘要');

    const detailHeader = [
      '记录编号', '样品名称', '样品批次', '测试日期',
      '测试温度(°C)', '温度说明',
      '吸收剂质量(g)', '称量精度说明',
      '气体体积(L)', '环境气压(kPa)',
      '导入吸收率(%)', '重新计算吸收率(%)',
      '最终判定', '数据质量',
      '填写状态', '导入备注', '补录备注', '问题说明'
    ];

    const detailData = [detailHeader];
    records.forEach(r => {
      const tempInfo = normalizeTemperature(r.temperature, r.temperature_unit);
      const massPrec = checkMassPrecision(r.absorbent_mass, r.absorbent_mass_unit);
      const issues = getHumanReadableIssues(r).join('；');

      detailData.push([
        r.record_no, r.sample_name, r.sample_batch, r.test_date,
        tempInfo.celsius !== null ? tempInfo.celsius.toFixed(2) : '',
        tempInfo.note || '温度正常',
        r.absorbent_mass, massPrec.desc,
        r.gas_volume, r.pressure,
        r.absorption_rate ?? '', r.calculated_rate ?? '',
        r.judgment, getDataQualityLabel(r.data_quality),
        getFillStatusLabel(r.fill_status),
        r.imported_remark || '', r.supplementary_remark || '',
        issues
      ]);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
    wsDetail['!cols'] = [
      { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 28 },
      { wch: 14 }, { wch: 40 },
      { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 18 },
      { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, '检测明细');

    const reviewLogs = all(`
      SELECT r.*, a.sample_name, a.record_no
      FROM review_logs r LEFT JOIN absorption_records a ON r.record_id = a.id
      WHERE r.batch_id = ? ORDER BY r.review_time DESC
    `, [id]);

    const traceHeader = ['操作时间', '操作人', '记录编号', '样品名称', '操作类型', '修改字段', '原值', '新值', '复核意见', '结果'];
    const traceData = [traceHeader];
    reviewLogs.forEach(l => {
      traceData.push([
        l.review_time, l.reviewer, l.record_no, l.sample_name,
        getReviewTypeLabel(l.review_type),
        l.field_name || '', l.old_value || '', l.new_value || '',
        l.comment || '', l.review_result || ''
      ]);
    });

    const anomalyLogs = all(`
      SELECT t.*, a.sample_name, a.record_no
      FROM anomaly_traces t LEFT JOIN absorption_records a ON t.record_id = a.id
      WHERE t.batch_id = ? ORDER BY t.trace_time DESC
    `, [id]);

    anomalyLogs.forEach(l => {
      traceData.push([
        l.trace_time, l.operator, l.record_no, l.sample_name,
        '异常留痕-' + getAnomalyTypeLabel(l.anomaly_type),
        l.field_name || '',
        l.before_value !== null ? `${l.before_value}（原判定：${l.before_judgment}）` : l.before_judgment || '',
        l.after_value !== null ? `${l.after_value}（新判定：${l.after_judgment}）` : l.after_judgment || '',
        l.reason || '',
        l.is_retest ? '需复测：' + (l.retest_suggestion || '') : '已留痕'
      ]);
    });

    const wsTrace = XLSX.utils.aoa_to_sheet(traceData);
    wsTrace['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
      { wch: 20 }, { wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTrace, '复核与留痕记录');

    const transitions = all('SELECT * FROM status_transitions WHERE batch_id = ? ORDER BY transition_time', [id]);
    const statusHeader = ['流转时间', '操作人', '原状态', '新状态', '备注'];
    const statusData = [statusHeader];
    transitions.forEach(t => {
      statusData.push([t.transition_time, t.operator, getStatusLabel(t.from_status), getStatusLabel(t.to_status), t.comment || '']);
    });
    const wsStatus = XLSX.utils.aoa_to_sheet(statusData);
    wsStatus['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsStatus, '状态流转记录');

    const fileName = `气体吸收效率报告_${batch.batch_no}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
    const exportPath = path.join(EXPORT_DIR, fileName);
    XLSX.writeFile(wb, exportPath);

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    run(`
      INSERT INTO export_history (batch_id, export_time, exported_by, file_name, record_count, export_type)
      VALUES (?, ?, ?, ?, ?, 'report')
    `, [Number(id), now, req.query.operator || '配方工程师', fileName, records.length]);

    res.json({
      success: true,
      data: { fileName, downloadUrl: `/exports/${fileName}`, exportTime: now }
    });
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ success: false, message: '导出失败: ' + err.message });
  }
});

app.get('/api/anomalies', (req, res) => {
  const anomalies = all(`
    SELECT t.*, a.sample_name, a.record_no, b.batch_no, b.file_name
    FROM anomaly_traces t
    LEFT JOIN absorption_records a ON t.record_id = a.id
    LEFT JOIN import_batches b ON t.batch_id = b.id
    ORDER BY t.trace_time DESC LIMIT 200
  `);
  res.json({ success: true, data: anomalies });
});

app.get('/api/stats/overview', (req, res) => {
  const totalBatches = get('SELECT COUNT(*) as cnt FROM import_batches').cnt;
  const totalRecords = get('SELECT COUNT(*) as cnt FROM absorption_records').cnt;
  const totalExports = get('SELECT COUNT(*) as cnt FROM export_history').cnt;
  const totalAnomalies = get('SELECT COUNT(*) as cnt FROM anomaly_traces').cnt;

  const judgmentStats = all(`
    SELECT judgment, COUNT(*) as cnt FROM absorption_records GROUP BY judgment
  `);

  const qualityStats = all(`
    SELECT data_quality, COUNT(*) as cnt FROM absorption_records GROUP BY data_quality
  `);

  res.json({
    success: true,
    data: {
      totalBatches, totalRecords, totalExports, totalAnomalies,
      judgmentStats, qualityStats
    }
  });
});

function getStatusLabel(s) {
  const map = {
    'none': '未开始', 'imported': '已导入', 'reviewing': '复核中',
    'confirmed': '已确认', 'exported': '已导出报告', 'archived': '已归档'
  };
  return map[s] || s;
}
function getDataQualityLabel(q) {
  return { normal: '正常', warning: '有提醒', error: '异常' }[q] || q;
}
function getFillStatusLabel(s) {
  return { complete: '完整', partial: '部分填写', incomplete: '缺失较多' }[s] || s;
}
function getReviewTypeLabel(t) {
  return { import_check: '导入自动检查', manual_review: '人工复核' }[t] || t;
}
function getAnomalyTypeLabel(t) {
  return { judgment_change: '判定变更', retest_suggestion: '复测建议', data_correction: '数据修正' }[t] || t;
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`气体吸收效率看板已启动: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('启动失败:', err);
});
