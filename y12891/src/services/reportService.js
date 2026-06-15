const db = require('../db/database');
const riskService = require('./riskService');

function generateReport(batchId, generator, version) {
  const batch = db.prepare('SELECT * FROM inspection_batches WHERE id = ?').get(batchId);
  if (!batch) throw new Error('批次不存在');

  const ver = version || batch.current_version;
  const risk = riskService.getAssessmentByVersion(batchId, ver);

  if (!risk) {
    throw new Error('该版本尚无风险评估结果，请先完成风险评估');
  }

  const materials = getMaterialsForReport(batchId, ver);
  const duplicates = db.prepare('SELECT * FROM duplicate_tracking WHERE batch_id = ?').all(batchId);

  const reportContent = buildReportContent(batch, risk, materials, duplicates);
  const reportNo = `${batch.batch_no}-R${ver}`;

  const result = db.prepare(`
    INSERT INTO reports (batch_id, version, report_no, report_content, duplicate_materials, generated_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(batchId, ver, reportNo, JSON.stringify(reportContent), JSON.stringify(duplicates), generator || '系统');

  db.prepare("UPDATE inspection_batches SET status = 'reported', updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);

  return {
    id: result.lastInsertRowid,
    reportNo,
    batchId,
    version: ver,
    reportContent,
    duplicateCount: duplicates.length,
    generatedAt: new Date().toISOString()
  };
}

function getMaterialsForReport(batchId, version) {
  const buoy = db.prepare('SELECT * FROM buoy_data WHERE batch_id = ? AND version = ? ORDER BY buoy_id').all(batchId, version);
  const tide = db.prepare('SELECT * FROM tide_tables WHERE batch_id = ? AND version = ? ORDER BY tide_date').all(batchId, version);
  const weather = db.prepare('SELECT * FROM weather_forecasts WHERE batch_id = ? AND version = ? ORDER BY forecast_date').all(batchId, version);
  const violations = db.prepare('SELECT * FROM restricted_zone_violations WHERE batch_id = ? AND version = ? ORDER BY violation_time').all(batchId, version);
  const photos = db.prepare('SELECT * FROM inspection_photos WHERE batch_id = ? AND version = ? ORDER BY photo_no').all(batchId, version);
  const aqua = db.prepare('SELECT * FROM aquaculture_logs WHERE batch_id = ? AND version = ? ORDER BY log_date').all(batchId, version);

  const missingPhotos = photos.filter(p => p.is_missing === 1);
  const invalidBuoy = buoy.filter(b => b.is_valid === 0);

  return {
    buoy: { total: buoy.length, valid: buoy.length - invalidBuoy.length, invalid: invalidBuoy.length, items: buoy },
    tide: { total: tide.length, items: tide },
    weather: { total: weather.length, items: weather },
    violations: { total: violations.length, items: violations },
    photos: { total: photos.length, available: photos.length - missingPhotos.length, missing: missingPhotos.length, missingItems: missingPhotos, items: photos },
    aquaculture: { total: aqua.length, supplementary: aqua.filter(a => a.is_supplementary).length, items: aqua }
  };
}

function buildReportContent(batch, risk, materials, duplicates) {
  const levelText = { high: '高风险', medium: '中风险', low: '低风险' };

  let content = `港区危险品泊位检查报告\n`;
  content += `========================\n\n`;
  content += `报告编号: ${batch.batch_no}-R${risk.version}\n`;
  content += `检查批次: ${batch.batch_no}\n`;
  content += `检查名称: ${batch.name}\n`;
  content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

  content += `一、风险评估结论\n`;
  content += `----------------\n`;
  content += `风险等级: ${levelText[risk.risk_level] || risk.risk_level}\n`;
  content += `风险分值: ${risk.risk_score} 分\n`;
  content += `评估依据: ${risk.assessment_basis}\n`;
  content += `评估说明: ${risk.assessment_note}\n\n`;

  if (risk.risk_factors && risk.risk_factors.length > 0) {
    content += `风险因素: \n`;
    risk.risk_factors.forEach((f, i) => {
      content += `  ${i + 1}. ${f}\n`;
    });
    content += '\n';
  }

  content += `二、材料核查情况\n`;
  content += `----------------\n`;
  content += `1. 浮标数据: ${materials.buoy.valid}条有效 / ${materials.buoy.total}条总计`;
  if (materials.buoy.invalid > 0) {
    content += ` (${materials.buoy.invalid}条无效)`;
  }
  content += `\n`;

  content += `2. 潮汐表: ${materials.tide.total}条\n`;
  const oldRemarkCount = materials.tide.items.filter(t => t.old_remark).length;
  if (oldRemarkCount > 0) {
    content += `   注: 有${oldRemarkCount}条潮汐表带旧版备注，需注意时效性\n`;
  }

  content += `3. 气象预报: ${materials.weather.total}天\n`;
  content += `4. 禁航区越界: ${materials.violations.total}起\n`;
  content += `5. 巡检照片: ${materials.photos.available}张可用 / ${materials.photos.total}张总计`;
  if (materials.photos.missing > 0) {
    content += ` (缺${materials.photos.missing}张)`;
  }
  content += `\n`;

  content += `6. 养殖日志: ${materials.aquaculture.total}条`;
  if (materials.aquaculture.supplementary > 0) {
    content += ` (其中${materials.aquaculture.supplementary}条为临时补录)`;
  }
  content += `\n\n`;

  if (duplicates && duplicates.length > 0) {
    content += `三、重复上报追踪\n`;
    content += `------------------\n`;
    content += `本次检查共发现 ${duplicates.length} 条疑似重复上报记录:\n\n`;

    duplicates.forEach((d, i) => {
      const statusText = d.status === 'resolved' ? `已处理 - ${d.resolution}` : '待确认';
      content += `  ${i + 1}. [${d.material_type}] ${d.material_key}\n`;
      content += `     出现次数: ${d.duplicate_count}次\n`;
      content += `     状态: ${statusText}\n`;
      content += `     首次发现: ${d.first_seen_at}\n\n`;
    });
  }

  if (materials.photos.missing > 0) {
    content += `四、待补充材料清单\n`;
    content += `--------------------\n`;
    content += `以下照片缺失，建议科研助理尽快补充:\n\n`;

    materials.photos.missingItems.forEach((p, i) => {
      content += `  ${i + 1}. ${p.photo_no} - ${p.photo_type} (${p.location})\n`;
      if (p.missing_reason) {
        content += `     原因: ${p.missing_reason}\n`;
      }
      content += `\n`;
    });
  }

  return {
    title: '港区危险品泊位检查报告',
    reportNo: `${batch.batch_no}-R${risk.version}`,
    batch,
    risk,
    materials,
    duplicates,
    plainText: content
  };
}

function getLatestReport(batchId) {
  const report = db.prepare(`
    SELECT * FROM reports
    WHERE batch_id = ?
    ORDER BY version DESC, id DESC
    LIMIT 1
  `).get(batchId);

  if (!report) return null;

  return {
    ...report,
    report_content: JSON.parse(report.report_content || '{}'),
    duplicate_materials: JSON.parse(report.duplicate_materials || '[]')
  };
}

function getReportByVersion(batchId, version) {
  const report = db.prepare(`
    SELECT * FROM reports
    WHERE batch_id = ? AND version = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(batchId, version);

  if (!report) return null;

  return {
    ...report,
    report_content: JSON.parse(report.report_content || '{}'),
    duplicate_materials: JSON.parse(report.duplicate_materials || '[]')
  };
}

function getAllReports(batchId) {
  const reports = db.prepare(`
    SELECT * FROM reports
    WHERE batch_id = ?
    ORDER BY version DESC
  `).all(batchId);

  return reports.map(r => ({
    ...r,
    report_content: JSON.parse(r.report_content || '{}'),
    duplicate_materials: JSON.parse(r.duplicate_materials || '[]')
  }));
}

function exportReportText(batchId, version) {
  const report = version ? getReportByVersion(batchId, version) : getLatestReport(batchId);
  if (!report) throw new Error('报告不存在');

  return {
    reportNo: report.report_no,
    content: report.report_content.plainText,
    generatedAt: report.generated_at
  };
}

module.exports = {
  generateReport,
  getLatestReport,
  getReportByVersion,
  getAllReports,
  exportReportText
};
