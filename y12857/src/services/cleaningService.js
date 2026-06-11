const db = require('../models/db');
const batchService = require('./batchService');

const DRIFT_SPEED_THRESHOLD = 0.5;
const DRIFT_DISTANCE_THRESHOLD = 500;

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const detectDriftAnomalies = (batchId) => {
  const points = db.prepare(`
    SELECT * FROM ais_points
    WHERE batch_id = ?
    ORDER BY mmsi, timestamp
  `).all(batchId);

  const byMmsi = {};
  for (const p of points) {
    if (!byMmsi[p.mmsi]) byMmsi[p.mmsi] = [];
    byMmsi[p.mmsi].push(p);
  }

  const anomalies = [];
  const updateStmt = db.prepare(`
    UPDATE ais_points
    SET is_drift_anomaly = 1, drift_reason = ?, drift_distance = ?
    WHERE id = ?
  `);

  const insertAnomaly = db.prepare(`
    INSERT INTO drift_anomalies
    (batch_id, ais_point_id, mmsi, anomaly_type, severity, description, risk_level, risk_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((anomalyList) => {
    for (const a of anomalyList) {
      const result = insertAnomaly.run(
        batchId, a.aisPointId, a.mmsi, a.type, a.severity,
        a.description, a.riskLevel, a.riskReason
      );
      updateStmt.run(a.reason, a.distance, a.aisPointId);
      a.id = result.lastInsertRowid;
    }
  });

  for (const mmsi of Object.keys(byMmsi)) {
    const track = byMmsi[mmsi];
    for (let i = 1; i < track.length; i++) {
      const prev = track[i - 1];
      const curr = track[i];
      const dist = haversine(prev.lat, prev.lon, curr.lat, curr.lon);
      const timeDiff = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000;
      const speedKmh = timeDiff > 0 ? (dist / timeDiff) * 3.6 : 0;

      if (curr.speed !== undefined && curr.speed !== null) {
        const reportedSpeed = curr.speed * 1.852;
        if (reportedSpeed < DRIFT_SPEED_THRESHOLD && dist > DRIFT_DISTANCE_THRESHOLD) {
          const severity = dist > 2000 ? 'high' : dist > 1000 ? 'medium' : 'low';
          const riskLevel = severity === 'high' ? 'high' : severity === 'medium' ? 'medium' : 'low';
          anomalies.push({
            aisPointId: curr.id,
            mmsi: curr.mmsi,
            type: 'speed_discrepancy',
            severity,
            description: `船速 ${curr.speed.toFixed(2)} 节，但位移 ${dist.toFixed(0)} 米，疑似漂移`,
            reason: '船速与位移不符',
            distance: dist,
            riskLevel,
            riskReason: `船舶报告航速过低但位移较大，可能存在锚泊漂移或 AIS 异常`,
          });
        }
      }

      if (speedKmh > 60) {
        anomalies.push({
          aisPointId: curr.id,
          mmsi: curr.mmsi,
          type: 'abnormal_speed',
          severity: 'high',
          description: `计算航速 ${speedKmh.toFixed(1)} km/h，超出正常范围`,
          reason: '瞬时航速异常',
          distance: dist,
          riskLevel: 'high',
          riskReason: '航速异常偏高，可能存在 AIS 数据跳点或设备故障',
        });
      }

      if (dist > 5000 && timeDiff < 3600) {
        anomalies.push({
          aisPointId: curr.id,
          mmsi: curr.mmsi,
          type: 'position_jump',
          severity: 'medium',
          description: `1小时内位移 ${dist.toFixed(0)} 米，疑似位置跳变`,
          reason: '位置跳变异常',
          distance: dist,
          riskLevel: 'medium',
          riskReason: '短时间内位置变化过大，可能存在 AIS 定位异常',
        });
      }
    }
  }

  insertMany(anomalies);

  batchService.updateBatchStats(batchId, { anomaly_count: anomalies.length });
  return anomalies;
};

const calculateRiskLevels = (batchId) => {
  const waterRecords = db.prepare(`
    SELECT * FROM water_quality WHERE batch_id = ?
  `).all(batchId);

  const anomalies = db.prepare(`
    SELECT * FROM drift_anomalies WHERE batch_id = ?
  `).all(batchId);

  const hasWaterData = waterRecords.length > 0 && waterRecords.some(w => !w.is_missing);
  const missingCount = waterRecords.filter(w => w.is_missing).length;

  const updateStmt = db.prepare(`
    UPDATE drift_anomalies SET risk_level = ?, risk_reason = ? WHERE id = ?
  `);

  const insertRiskReport = db.prepare(`
    INSERT INTO risk_reports (batch_id, anomaly_id, report_no, risk_level, title, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateMany = db.transaction(() => {
    for (const anomaly of anomalies) {
      let riskLevel = anomaly.risk_level || 'low';
      let riskReason = anomaly.risk_reason || '';

      if (hasWaterData) {
        const nearbyWater = waterRecords.filter(w => {
          if (w.is_missing) return false;
          const dist = haversine(
            w.lat || 0, w.lon || 0,
            getPointLat(anomaly.ais_point_id),
            getPointLon(anomaly.ais_point_id)
          );
          return dist < 10000;
        });

        if (nearbyWater.length > 0) {
          const badWater = nearbyWater.filter(w => {
            return (w.dissolved_oxygen !== null && w.dissolved_oxygen < 5) ||
              (w.ph !== null && (w.ph < 6.5 || w.ph > 8.5));
          });
          if (badWater.length > 0 && anomaly.severity === 'high') {
            riskLevel = 'high';
            riskReason += '；附近水质异常，叠加漂移风险';
          }
        }
      } else {
        riskReason += '（水质数据缺失，风险分层仅基于轨迹分析）';
      }

      updateStmt.run(riskLevel, riskReason, anomaly.id);

      const reportNo = `RISK-${batchId}-${anomaly.id.toString().padStart(4, '0')}`;
      const title = `${anomaly.mmsi} - ${getAnomalyTypeLabel(anomaly.anomaly_type)}风险通报`;
      const content = `
船舶MMSI：${anomaly.mmsi}
异常类型：${getAnomalyTypeLabel(anomaly.anomaly_type)}
严重程度：${anomaly.severity}
风险等级：${riskLevel}
异常描述：${anomaly.description}
风险分析：${riskReason}
检测时间：${anomaly.detected_at}
      `.trim();

      insertRiskReport.run(batchId, anomaly.id, reportNo, riskLevel, title, content);
    }
  });

  updateMany();

  return {
    totalAnomalies: anomalies.length, waterGapCount: missingCount, hasWaterData };
};

const getPointLat = (pointId) => {
  const p = db.prepare('SELECT lat FROM ais_points WHERE id = ?').get(pointId);
  return p ? p.lat : 0;
};

const getPointLon = (pointId) => {
  const p = db.prepare('SELECT lon FROM ais_points WHERE id = ?').get(pointId);
  return p ? p.lon : 0;
};

const getAnomalyTypeLabel = (type) => {
  const labels = {
    speed_discrepancy: '速度不符',
    abnormal_speed: '航速异常',
    position_jump: '位置跳变',
  };
  return labels[type] || type;
};

const runCleaning = (batchId) => {
  const batch = batchService.getBatchById(batchId);
  if (!batch) throw new Error('批次不存在');

  batchService.updateBatchStatus(batchId, 'cleaning');

  const anomalies = detectDriftAnomalies(batchId);
  const riskResult = calculateRiskLevels(batchId);

  batchService.updateBatchStatus(batchId, 'cleaned');

  return {
    batch: batchService.getBatchById(batchId),
    anomalyCount: anomalies.length,
    waterGapCount: riskResult.waterGapCount,
  };
};

const listAnomalies = (batchId, riskLevel = null, limit = 100, offset = 0) => {
  let sql = 'SELECT * FROM drift_anomalies WHERE batch_id = ?';
  const params = [batchId];
  if (riskLevel) {
    sql += ' AND risk_level = ?';
    params.push(riskLevel);
  }
  sql += ' ORDER BY severity DESC, detected_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.prepare(sql).all(...params);
};

const getAnomalyDetail = (anomalyId) => {
  const anomaly = db.prepare('SELECT * FROM drift_anomalies WHERE id = ?').get(anomalyId);
  if (!anomaly) return null;

  const point = db.prepare('SELECT * FROM ais_points WHERE id = ?').get(anomaly.ais_point_id);
  const riskReport = db.prepare('SELECT * FROM risk_reports WHERE anomaly_id = ?').get(anomalyId);
  const reviews = db.prepare('SELECT * FROM review_opinions WHERE anomaly_id = ? ORDER BY created_at DESC').all(anomalyId);

  return {
    anomaly,
    point,
    riskReport,
    reviews,
  };
};

module.exports = {
  runCleaning,
  listAnomalies,
  getAnomalyDetail,
  getAnomalyTypeLabel,
  haversine,
};
