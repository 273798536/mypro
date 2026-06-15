const db = require('../db/database');

function assessRisk(batchId, assessor, version) {
  const batch = db.prepare('SELECT * FROM inspection_batches WHERE id = ?').get(batchId);
  if (!batch) throw new Error('批次不存在');

  const ver = version || batch.current_version;

  const buoyData = db.prepare('SELECT * FROM buoy_data WHERE batch_id = ? AND version = ? AND is_valid = 1').all(batchId, ver);
  const violations = db.prepare('SELECT * FROM restricted_zone_violations WHERE batch_id = ? AND version = ?').all(batchId, ver);
  const weather = db.prepare('SELECT * FROM weather_forecasts WHERE batch_id = ? AND version = ?').all(batchId, ver);
  const tides = db.prepare('SELECT * FROM tide_tables WHERE batch_id = ? AND version = ?').all(batchId, ver);
  const photos = db.prepare('SELECT * FROM inspection_photos WHERE batch_id = ? AND version = ?').all(batchId, ver);
  const duplicates = db.prepare("SELECT * FROM duplicate_tracking WHERE batch_id = ? AND status = 'pending'").all(batchId);

  let riskScore = 0;
  const riskFactors = [];
  const details = [];

  const invalidBuoy = db.prepare('SELECT COUNT(*) as cnt FROM buoy_data WHERE batch_id = ? AND version = ? AND is_valid = 0').get(batchId, ver).cnt;
  if (invalidBuoy > 0) {
    riskScore += 15;
    riskFactors.push('浮标数据缺失');
    details.push(`${invalidBuoy}个浮标点数据缺失/无效`);
  }

  const abnormalBuoy = buoyData.filter(b => b.water_depth !== null && b.water_depth < 0).length;
  if (abnormalBuoy > 0) {
    riskScore += 10;
    riskFactors.push('浮标数据异常');
    details.push(`${abnormalBuoy}条浮标数据存在异常值`);
  }

  if (violations.length > 0) {
    const highViolations = violations.filter(v => v.zone_type === '危险品作业区').length;
    riskScore += highViolations * 15;
    riskScore += (violations.length - highViolations) * 5;
    riskFactors.push('禁航区越界');
    details.push(`${violations.length}起越界事件，其中${highViolations}起涉及危险品作业区`);
  }

  const foggyDays = weather.filter(w => w.fog_warning === 1 || (w.visibility !== null && w.visibility < 3)).length;
  if (foggyDays > 0) {
    riskScore += foggyDays * 10;
    riskFactors.push('恶劣气象');
    details.push(`${foggyDays}天预报有雾或低能见度`);
  }

  const highWindDays = weather.filter(w => {
    if (!w.wind_force) return false;
    const match = w.wind_force.match(/(\d+)-?(\d*)级/);
    if (!match) return false;
    const maxForce = parseInt(match[2] || match[1]);
    return maxForce >= 6;
  }).length;
  if (highWindDays > 0) {
    riskScore += highWindDays * 5;
    riskFactors.push('大风天气');
    details.push(`${highWindDays}天预报风力6级以上`);
  }

  const lowTideLevel = Math.min(...tides.map(t => t.low_tide_level || 999));
  if (lowTideLevel < 1.0) {
    riskScore += 10;
    riskFactors.push('低潮位风险');
    details.push(`最低潮位${lowTideLevel.toFixed(2)}米，接近警戒值`);
  }

  const missingPhotos = photos.filter(p => p.is_missing === 1).length;
  if (missingPhotos > 0) {
    riskScore += missingPhotos * 3;
    riskFactors.push('巡检照片缺失');
    details.push(`${missingPhotos}张巡检照片缺失，相关风险评估可能不完整`);
  }

  if (duplicates.length > 0) {
    riskScore += duplicates.length * 3;
    riskFactors.push('重复上报待处理');
    details.push(`${duplicates.length}条重复上报记录待确认`);
  }

  let riskLevel;
  if (riskScore >= 60) riskLevel = 'high';
  else if (riskScore >= 30) riskLevel = 'medium';
  else riskLevel = 'low';

  const assessmentBasis = `基于浮标数据(${buoyData.length}条有效)、禁航区越界(${violations.length}起)、气象预报(${weather.length}天)、潮汐表(${tides.length}天)、巡检照片(${photos.length - missingPhotos}张可用/${photos.length}张总计)综合评估`;

  const assessmentNote = missingPhotos > 0
    ? `注：因${missingPhotos}张巡检照片缺失，部分外观检查项无法完整评估，实际风险可能高于当前评估结果`
    : '所有材料齐全，评估结果完整';

  const result = db.prepare(`
    INSERT INTO risk_assessments (batch_id, version, risk_level, risk_score, risk_factors, risk_details, assessment_basis, assessment_note, assessor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(batchId, ver, riskLevel, riskScore, JSON.stringify(riskFactors), JSON.stringify(details), assessmentBasis, assessmentNote, assessor || '系统');

  db.prepare("UPDATE inspection_batches SET status = 'risk_assessed', updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);

  return {
    id: result.lastInsertRowid,
    batchId,
    version: ver,
    riskLevel,
    riskScore,
    riskFactors,
    details,
    assessmentBasis,
    assessmentNote,
    partialAssessment: missingPhotos > 0,
    missingPhotoCount: missingPhotos
  };
}

function getLatestAssessment(batchId) {
  const assessment = db.prepare(`
    SELECT * FROM risk_assessments
    WHERE batch_id = ?
    ORDER BY version DESC, id DESC
    LIMIT 1
  `).get(batchId);

  if (!assessment) return null;

  return {
    ...assessment,
    risk_factors: JSON.parse(assessment.risk_factors || '[]'),
    risk_details: JSON.parse(assessment.risk_details || '[]')
  };
}

function getAssessmentByVersion(batchId, version) {
  const assessment = db.prepare(`
    SELECT * FROM risk_assessments
    WHERE batch_id = ? AND version = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(batchId, version);

  if (!assessment) return null;

  return {
    ...assessment,
    risk_factors: JSON.parse(assessment.risk_factors || '[]'),
    risk_details: JSON.parse(assessment.risk_details || '[]')
  };
}

function compareRiskVersions(batchId, versionA, versionB) {
  const a = getAssessmentByVersion(batchId, versionA);
  const b = getAssessmentByVersion(batchId, versionB);

  if (!a || !b) {
    throw new Error('指定版本的风险评估不存在');
  }

  const addedFactors = b.risk_factors.filter(f => !a.risk_factors.includes(f));
  const removedFactors = a.risk_factors.filter(f => !b.risk_factors.includes(f));

  return {
    versionA,
    versionB,
    levelA: a.risk_level,
    levelB: b.risk_level,
    levelChanged: a.risk_level !== b.risk_level,
    scoreA: a.risk_score,
    scoreB: b.risk_score,
    scoreDiff: b.risk_score - a.risk_score,
    addedFactors,
    removedFactors,
    commonFactors: b.risk_factors.filter(f => a.risk_factors.includes(f)),
    detailsA: a.risk_details,
    detailsB: b.risk_details,
    noteA: a.assessment_note,
    noteB: b.assessment_note
  };
}

function getAllAssessments(batchId) {
  const assessments = db.prepare(`
    SELECT * FROM risk_assessments
    WHERE batch_id = ?
    ORDER BY version ASC
  `).all(batchId);

  return assessments.map(a => ({
    ...a,
    risk_factors: JSON.parse(a.risk_factors || '[]'),
    risk_details: JSON.parse(a.risk_details || '[]')
  }));
}

module.exports = {
  assessRisk,
  getLatestAssessment,
  getAssessmentByVersion,
  compareRiskVersions,
  getAllAssessments
};
