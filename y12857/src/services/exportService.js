const db = require('../models/db');
const batchService = require('./batchService');
const cleaningService = require('./cleaningService');
const dayjs = require('dayjs');

const exportReportCsv = (batchId) => {
  const batch = batchService.getBatchById(batchId);
  if (!batch) throw new Error('批次不存在');

  const anomalies = db.prepare(`
    SELECT da.*, ap.lon, ap.lat, ap.timestamp as point_time, ap.speed, ap.course
    FROM drift_anomalies da
    LEFT JOIN ais_points ap ON da.ais_point_id = ap.id
    WHERE da.batch_id = ?
    ORDER BY da.risk_level DESC, da.severity DESC
  `).all(batchId);

  const waterGaps = db.prepare(`
    SELECT * FROM water_quality WHERE batch_id = ? AND is_missing = 1
  `).all(batchId);

  const riskReports = db.prepare(`
    SELECT * FROM risk_reports WHERE batch_id = ?
  `).all(batchId);

  let csv = '\ufeff';
  csv += `船舶 AIS 漂移清洗报告 - ${batch.name}\n`;
  csv += `报告生成时间,${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n`;
  csv += `批次状态,${batch.status}\n`;
  csv += `AIS轨迹点数,${batch.total_ais_points}\n`;
  csv += `水质记录数,${batch.total_water_records}\n`;
  csv += `异常数量,${batch.anomaly_count}\n`;
  csv += `水质缺口数,${batch.water_gap_count}\n\n`;

  csv += '=== 异常明细 ===\n';
  csv += '序号,MMSI,异常类型,严重程度,风险等级,时间,经度,纬度,船速(节),描述,检测时间\n';
  anomalies.forEach((a, i) => {
    csv += `${i + 1},${a.mmsi},${cleaningService.getAnomalyTypeLabel(a.anomaly_type)},${a.severity},${a.risk_level},${a.point_time || ''},${a.lon || ''},${a.lat || ''},${a.speed || ''},"${a.description || ''}",${a.detected_at}\n`;
  });

  csv += '\n=== 风险通报 ===\n';
  csv += '通报编号,风险等级,标题,内容,创建时间\n';
  riskReports.forEach(r => {
    csv += `${r.report_no},${r.risk_level},"${r.title}","${(r.content || '').replace(/\n/g, '; ')}",${r.created_at}\n`;
  });

  if (waterGaps.length > 0) {
    csv += '\n=== 水质数据缺口（需补录） ===\n';
    csv += '站点ID,时间,经度,纬度\n';
    waterGaps.forEach(w => {
      csv += `${w.station_id},${w.timestamp},${w.lon || ''},${w.lat || ''}\n`;
    });
  }

  batchService.updateBatchStatus(batchId, 'exported');

  return {
    filename: `ais_drift_report_${batchId}_${dayjs().format('YYYYMMDD_HHmmss')}.csv`,
    content: csv,
  };
};

const exportReportJson = (batchId) => {
  const batch = batchService.getBatchById(batchId);
  if (!batch) throw new Error('批次不存在');

  const anomalies = db.prepare(`
    SELECT da.*, ap.lon, ap.lat, ap.timestamp as point_time, ap.speed
    FROM drift_anomalies da
    LEFT JOIN ais_points ap ON da.ais_point_id = ap.id
    WHERE da.batch_id = ?
    ORDER BY da.risk_level DESC
  `).all(batchId);

  const riskReports = db.prepare(`
    SELECT * FROM risk_reports WHERE batch_id = ?
  `).all(batchId);

  const reviews = db.prepare(`
    SELECT * FROM review_opinions WHERE batch_id = ? ORDER BY created_at DESC
  `).all(batchId);

  const waterGaps = db.prepare(`
    SELECT * FROM water_quality WHERE batch_id = ? AND is_missing = 1
  `).all(batchId);

  batchService.updateBatchStatus(batchId, 'exported');

  return {
    batch,
    anomalies,
    riskReports,
    reviews,
    waterGaps,
    exportedAt: new Date().toISOString(),
  };
};

module.exports = {
  exportReportCsv,
  exportReportJson,
};
