const db = require('../db/database');

function getAllBatches() {
  return db.prepare(`
    SELECT id, batch_no, name, status, description, created_at, updated_at, current_version
    FROM inspection_batches
    ORDER BY created_at DESC
  `).all();
}

function getBatchById(id) {
  return db.prepare(`
    SELECT id, batch_no, name, status, description, created_at, updated_at, current_version
    FROM inspection_batches
    WHERE id = ?
  `).get(id);
}

function getBatchByNo(batchNo) {
  return db.prepare(`
    SELECT id, batch_no, name, status, description, created_at, updated_at, current_version
    FROM inspection_batches
    WHERE batch_no = ?
  `).get(batchNo);
}

function createBatch(batchNo, name, description) {
  const result = db.prepare(`
    INSERT INTO inspection_batches (batch_no, name, description, status)
    VALUES (?, ?, ?, 'imported')
  `).run(batchNo, name, description || '');
  return getBatchById(result.lastInsertRowid);
}

function updateBatchStatus(batchId, status) {
  db.prepare(`
    UPDATE inspection_batches
    SET status = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(status, batchId);
  return getBatchById(batchId);
}

function getBatchMaterials(batchId, version) {
  const ver = version || db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId).current_version;

  const buoyData = db.prepare(`
    SELECT * FROM buoy_data WHERE batch_id = ? AND version = ?
    ORDER BY buoy_id
  `).all(batchId, ver);

  const tideTables = db.prepare(`
    SELECT * FROM tide_tables WHERE batch_id = ? AND version = ?
    ORDER BY tide_date
  `).all(batchId, ver);

  const weatherForecasts = db.prepare(`
    SELECT * FROM weather_forecasts WHERE batch_id = ? AND version = ?
    ORDER BY forecast_date
  `).all(batchId, ver);

  const violations = db.prepare(`
    SELECT * FROM restricted_zone_violations WHERE batch_id = ? AND version = ?
    ORDER BY violation_time
  `).all(batchId, ver);

  const photos = db.prepare(`
    SELECT * FROM inspection_photos WHERE batch_id = ? AND version = ?
    ORDER BY photo_no
  `).all(batchId, ver);

  const aquaLogs = db.prepare(`
    SELECT * FROM aquaculture_logs WHERE batch_id = ? AND version = ?
    ORDER BY log_date
  `).all(batchId, ver);

  const duplicates = db.prepare(`
    SELECT * FROM duplicate_tracking WHERE batch_id = ?
    ORDER BY material_type, material_key
  `).all(batchId);

  return {
    version: ver,
    buoyData,
    tideTables,
    weatherForecasts,
    restrictedZoneViolations: violations,
    inspectionPhotos: photos,
    aquacultureLogs: aquaLogs,
    duplicateTracking: duplicates
  };
}

function getVersionHistory(batchId) {
  const assessments = db.prepare(`
    SELECT DISTINCT version FROM risk_assessments WHERE batch_id = ?
    ORDER BY version
  `).all(batchId);

  const reviewRecords = db.prepare(`
    SELECT * FROM review_records WHERE batch_id = ?
    ORDER BY created_at DESC
  `).all(batchId);

  return {
    versions: assessments.map(a => a.version),
    reviewRecords
  };
}

module.exports = {
  getAllBatches,
  getBatchById,
  getBatchByNo,
  createBatch,
  updateBatchStatus,
  getBatchMaterials,
  getVersionHistory
};
