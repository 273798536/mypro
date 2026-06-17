const db = require('../db/database');
const batchService = require('./batchService');
const reportService = require('./reportService');

function getCurrentVersion(batchId) {
  const r = db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId);
  return r ? r.current_version : null;
}

function toCsvValue(val) {
  if (val === null || val === undefined) return '';
  let s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rowsToCsv(rows, columns) {
  const header = columns.map(c => toCsvValue(c.label || c.key)).join(',');
  const body = rows.map(r => columns.map(c => toCsvValue(r[c.key])).join(',')).join('\n');
  return '\uFEFF' + header + '\n' + body;
}

function exportJson(batchId, version) {
  const ver = version || getCurrentVersion(batchId);
  const batch = batchService.getBatchById(batchId);
  const materials = batchService.getBatchMaterials(batchId, ver);
  const risk = db.prepare('SELECT * FROM risk_assessments WHERE batch_id = ? AND version = ? ORDER BY id DESC LIMIT 1').get(batchId, ver);
  const report = db.prepare('SELECT report_no, generated_at FROM reports WHERE batch_id = ? AND version = ? ORDER BY id DESC LIMIT 1').get(batchId, ver);
  const history = batchService.getVersionHistory(batchId);

  return {
    export_info: {
      exported_at: new Date().toLocaleString('zh-CN'),
      type: 'full_batch_export'
    },
    batch: {
      id: batch.id,
      batch_no: batch.batch_no,
      name: batch.name,
      status: batch.status,
      description: batch.description,
      current_version: batch.current_version,
      exported_version: ver,
      created_at: batch.created_at,
      updated_at: batch.updated_at
    },
    materials: {
      buoy_data: materials.buoyData,
      tide_tables: materials.tideTables,
      weather_forecasts: materials.weatherForecasts,
      restricted_zone_violations: materials.restrictedZoneViolations,
      inspection_photos: materials.inspectionPhotos,
      aquaculture_logs: materials.aquacultureLogs,
      duplicate_tracking: materials.duplicateTracking
    },
    risk_assessment: risk ? {
      version: risk.version,
      risk_level: risk.risk_level,
      risk_score: risk.risk_score,
      risk_factors: JSON.parse(risk.risk_factors || '[]'),
      risk_details: JSON.parse(risk.risk_details || '[]'),
      assessment_basis: risk.assessment_basis,
      assessment_note: risk.assessment_note,
      assessor: risk.assessor,
      assessed_at: risk.assessed_at
    } : null,
    report: report || null,
    review_records: history.reviewRecords
  };
}

function exportCsv(batchId, version) {
  const ver = version || getCurrentVersion(batchId);
  const data = exportJson(batchId, ver);
  const files = {};

  files['_批次信息.csv'] = rowsToCsv(
    [{
      '批次号': data.batch.batch_no,
      '批次名称': data.batch.name,
      '状态': data.batch.status,
      '说明': data.batch.description,
      '当前版本': 'v' + data.batch.current_version,
      '导出版本': 'v' + data.batch.exported_version,
      '创建时间': data.batch.created_at,
      '更新时间': data.batch.updated_at
    }],
    [
      { key: '批次号', label: '批次号' },
      { key: '批次名称', label: '批次名称' },
      { key: '状态', label: '状态' },
      { key: '说明', label: '说明' },
      { key: '当前版本', label: '当前版本' },
      { key: '导出版本', label: '导出版本' },
      { key: '创建时间', label: '创建时间' },
      { key: '更新时间', label: '更新时间' }
    ]
  );

  files['1_浮标数据.csv'] = rowsToCsv(
    data.materials.buoy_data.map(b => ({
      '浮标ID': b.buoy_id,
      '位置': b.location,
      '水深_m': b.water_depth,
      '流速_mps': b.flow_velocity,
      '浪高_m': b.wave_height,
      '水温_℃': b.water_temperature,
      '风速_mps': b.wind_speed,
      '风向': b.wind_direction,
      '记录时间': b.record_time,
      '是否有效': b.is_valid ? '是' : '否',
      '复核状态': b.review_status,
      '复核人': b.reviewer,
      '复核时间': b.reviewed_at,
      '复核意见': b.review_comment,
      '导入备注': b.import_note,
      '数据来源': b.source
    })),
    ['浮标ID','位置','水深_m','流速_mps','浪高_m','水温_℃','风速_mps','风向','记录时间','是否有效','复核状态','复核人','复核时间','复核意见','导入备注','数据来源'].map(k => ({ key: k, label: k }))
  );

  files['2_潮汐表.csv'] = rowsToCsv(
    data.materials.tide_tables.map(t => ({
      '日期': t.tide_date,
      '港口': t.port_name,
      '高潮时间': t.high_tide_time,
      '高潮位_m': t.high_tide_level,
      '低潮时间': t.low_tide_time,
      '低潮位_m': t.low_tide_level,
      '旧备注': t.old_remark,
      '复核状态': t.review_status,
      '复核人': t.reviewer,
      '复核意见': t.review_comment
    })),
    ['日期','港口','高潮时间','高潮位_m','低潮时间','低潮位_m','旧备注','复核状态','复核人','复核意见'].map(k => ({ key: k, label: k }))
  );

  files['3_气象预报.csv'] = rowsToCsv(
    data.materials.weather_forecasts.map(w => ({
      '预报日期': w.forecast_date,
      '天气': w.weather_condition,
      '风力': w.wind_force,
      '风向': w.wind_direction,
      '能见度_km': w.visibility,
      '大雾预警': w.fog_warning ? '是' : '否',
      '复核状态': w.review_status,
      '复核人': w.reviewer,
      '复核意见': w.review_comment
    })),
    ['预报日期','天气','风力','风向','能见度_km','大雾预警','复核状态','复核人','复核意见'].map(k => ({ key: k, label: k }))
  );

  files['4_禁航区越界.csv'] = rowsToCsv(
    data.materials.restricted_zone_violations.map(v => ({
      '船名': v.vessel_name,
      'MMSI': v.vessel_mmsi,
      '越界时间': v.violation_time,
      '区域名称': v.zone_name,
      '区域类型': v.zone_type,
      '持续_分钟': v.duration_minutes,
      '侵入距离_km': v.intrusion_distance,
      '复核状态': v.review_status,
      '复核人': v.reviewer,
      '复核意见': v.review_comment
    })),
    ['船名','MMSI','越界时间','区域名称','区域类型','持续_分钟','侵入距离_km','复核状态','复核人','复核意见'].map(k => ({ key: k, label: k }))
  );

  files['5_巡检照片.csv'] = rowsToCsv(
    data.materials.inspection_photos.map(p => ({
      '照片编号': p.photo_no,
      '类型': p.photo_type,
      '位置': p.location,
      '拍摄时间': p.taken_time,
      '文件名': p.file_name,
      '是否缺失': p.is_missing ? '是' : '否',
      '缺失原因': p.missing_reason,
      '复核状态': p.review_status,
      '复核人': p.reviewer,
      '复核意见': p.review_comment
    })),
    ['照片编号','类型','位置','拍摄时间','文件名','是否缺失','缺失原因','复核状态','复核人','复核意见'].map(k => ({ key: k, label: k }))
  );

  files['6_养殖日志.csv'] = rowsToCsv(
    data.materials.aquaculture_logs.map(a => ({
      '日期': a.log_date,
      '内容': a.log_content,
      '是否补录': a.is_supplementary ? '是' : '否',
      '复核状态': a.review_status,
      '复核人': a.reviewer,
      '复核意见': a.review_comment
    })),
    ['日期','内容','是否补录','复核状态','复核人','复核意见'].map(k => ({ key: k, label: k }))
  );

  files['7_重复上报追踪.csv'] = rowsToCsv(
    data.materials.duplicate_tracking.map(d => ({
      '材料类型': d.material_type,
      '关键字': d.material_key,
      '出现次数': d.duplicate_count,
      '首次发现': d.first_seen_at,
      '最近出现': d.last_seen_at,
      '状态': d.status,
      '处理结论': d.resolution
    })),
    ['材料类型','关键字','出现次数','首次发现','最近出现','状态','处理结论'].map(k => ({ key: k, label: k }))
  );

  if (data.risk_assessment) {
    const r = data.risk_assessment;
    files['8_风险评估.csv'] = rowsToCsv([{
      '版本': 'v' + r.version,
      '风险等级': r.risk_level === 'high' ? '高风险' : r.risk_level === 'medium' ? '中风险' : '低风险',
      '风险分值': r.risk_score,
      '风险因素': r.risk_factors.join('、'),
      '详细风险项': r.risk_details.join('；'),
      '评估依据': r.assessment_basis,
      '评估说明': r.assessment_note,
      '评估人': r.assessor,
      '评估时间': r.assessed_at
    }], ['版本','风险等级','风险分值','风险因素','详细风险项','评估依据','评估说明','评估人','评估时间'].map(k => ({ key: k, label: k })));
  }

  files['9_复核操作记录.csv'] = rowsToCsv(
    data.review_records.map(r => ({
      '版本变化': `v${r.version_from} → v${r.version_to}`,
      '材料类型': r.material_type,
      '操作类型': r.action,
      '旧值': r.old_value,
      '新值': r.new_value,
      '复核人': r.reviewer,
      '复核意见': r.review_comment,
      '操作时间': r.created_at
    })),
    ['版本变化','材料类型','操作类型','旧值','新值','复核人','复核意见','操作时间'].map(k => ({ key: k, label: k }))
  );

  return {
    batch_no: data.batch.batch_no,
    version: ver,
    files
  };
}

function exportReportTxt(batchId, version) {
  const exported = reportService.exportReportText(batchId, version);
  return exported;
}

module.exports = {
  exportJson,
  exportCsv,
  exportReportTxt
};
