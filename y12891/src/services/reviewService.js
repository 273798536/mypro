const db = require('../db/database');

function getReviewSummary(batchId, version) {
  const ver = version || db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId).current_version;

  const countBuoy = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending FROM buoy_data WHERE batch_id = ? AND version = ?").get(batchId, ver);
  const countTide = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending FROM tide_tables WHERE batch_id = ? AND version = ?").get(batchId, ver);
  const countWeather = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending FROM weather_forecasts WHERE batch_id = ? AND version = ?").get(batchId, ver);
  const countViolation = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending FROM restricted_zone_violations WHERE batch_id = ? AND version = ?").get(batchId, ver);
  const countPhoto = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending, SUM(is_missing) as missing FROM inspection_photos WHERE batch_id = ? AND version = ?").get(batchId, ver);
  const countAqua = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending FROM aquaculture_logs WHERE batch_id = ? AND version = ?").get(batchId, ver);

  const totalPending = countBuoy.pending + countTide.pending + countWeather.pending + countViolation.pending + countPhoto.pending + countAqua.pending;
  const totalItems = countBuoy.total + countTide.total + countWeather.total + countViolation.total + countPhoto.total + countAqua.total;

  const duplicates = db.prepare("SELECT COUNT(*) as count FROM duplicate_tracking WHERE batch_id = ? AND status = 'pending'").get(batchId);

  return {
    version: ver,
    totalItems,
    pendingItems: totalPending,
    reviewedItems: totalItems - totalPending,
    progress: totalItems > 0 ? Math.round(((totalItems - totalPending) / totalItems) * 100) : 0,
    missingPhotos: countPhoto.missing || 0,
    pendingDuplicates: duplicates.count || 0,
    byType: {
      buoy: countBuoy,
      tide: countTide,
      weather: countWeather,
      violation: countViolation,
      photo: countPhoto,
      aquaculture: countAqua
    }
  };
}

function submitBatchReview(batchId, reviewer, comment) {
  const batch = db.prepare('SELECT * FROM inspection_batches WHERE id = ?').get(batchId);
  if (!batch) throw new Error('批次不存在');

  const tx = db.transaction(() => {
    const tables = [
      { table: 'buoy_data', type: 'buoy' },
      { table: 'tide_tables', type: 'tide' },
      { table: 'weather_forecasts', type: 'weather' },
      { table: 'restricted_zone_violations', type: 'violation' },
      { table: 'inspection_photos', type: 'photo' },
      { table: 'aquaculture_logs', type: 'aquaculture' }
    ];

    for (const t of tables) {
      const pendingCount = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.table} WHERE batch_id = ? AND version = ? AND review_status = 'pending'`).get(batchId, batch.current_version).cnt;
      if (pendingCount > 0) {
        throw new Error(`${t.type}尚有${pendingCount}条待复核，不能提交整批复核`);
      }
    }

    const newVersion = batch.current_version + 1;

    for (const t of tables) {
      const rows = db.prepare(`SELECT * FROM ${t.table} WHERE batch_id = ? AND version = ?`).all(batchId, batch.current_version);
      const cols = Object.keys(rows[0] || {}).filter(c => c !== 'id');
      const placeholders = cols.map(() => '?').join(', ');
      const insert = db.prepare(`INSERT INTO ${t.table} (${cols.join(', ')}) VALUES (${placeholders})`);

      for (const row of rows) {
        const values = cols.map(c => {
          if (c === 'version') return newVersion;
          if (c === 'review_status') return 'pending';
          if (c === 'review_comment') return null;
          if (c === 'reviewer') return null;
          if (c === 'reviewed_at') return null;
          return row[c];
        });
        insert.run(...values);
      }
    }

    db.prepare(`INSERT INTO review_records (batch_id, version_from, version_to, material_type, action, reviewer, review_comment) VALUES (?, ?, ?, 'all', 'batch_submit', ?, ?)`).run(batchId, batch.current_version, newVersion, reviewer, comment || '');

    db.prepare('UPDATE inspection_batches SET current_version = ?, status = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(newVersion, 'reviewing', batchId);
  });

  tx();

  return {
    success: true,
    batchId,
    newVersion: db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId).current_version,
    status: 'reviewing'
  };
}

function reviewSingleItem(batchId, materialType, itemId, reviewResult, reviewer, comment) {
  const typeMap = {
    buoy: { table: 'buoy_data', key: 'id' },
    tide: { table: 'tide_tables', key: 'id' },
    weather: { table: 'weather_forecasts', key: 'id' },
    violation: { table: 'restricted_zone_violations', key: 'id' },
    photo: { table: 'inspection_photos', key: 'id' },
    aquaculture: { table: 'aquaculture_logs', key: 'id' }
  };

  const config = typeMap[materialType];
  if (!config) throw new Error('未知的材料类型: ' + materialType);

  const batch = db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId);
  if (!batch) throw new Error('批次不存在');

  const item = db.prepare(`SELECT * FROM ${config.table} WHERE ${config.key} = ? AND batch_id = ? AND version = ?`).get(itemId, batchId, batch.current_version);
  if (!item) throw new Error('记录不存在');

  const oldStatus = item.review_status;

  db.prepare(`UPDATE ${config.table} SET review_status = ?, review_comment = ?, reviewer = ?, reviewed_at = datetime('now', 'localtime') WHERE ${config.key} = ? AND batch_id = ? AND version = ?`).run(reviewResult, comment || '', reviewer, itemId, batchId, batch.current_version);

  db.prepare(`INSERT INTO review_records (batch_id, version_from, version_to, material_type, material_id, action, old_value, new_value, reviewer, review_comment) VALUES (?, ?, ?, ?, ?, 'review_update', ?, ?, ?, ?)`).run(batchId, batch.current_version, batch.current_version, materialType, itemId, oldStatus, reviewResult, reviewer, comment || '');

  return { success: true, materialType, itemId, reviewResult };
}

function reviewBuoyItem(batchId, buoyId, updates, reviewer, comment) {
  const batch = db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId);
  if (!batch) throw new Error('批次不存在');

  const item = db.prepare('SELECT * FROM buoy_data WHERE id = ? AND batch_id = ? AND version = ?').get(buoyId, batchId, batch.current_version);
  if (!item) throw new Error('浮标数据不存在');

  const oldData = JSON.stringify({
    water_depth: item.water_depth,
    flow_velocity: item.flow_velocity,
    wave_height: item.wave_height,
    is_valid: item.is_valid,
    review_status: item.review_status
  });

  const fields = [];
  const values = [];
  const allowedFields = ['water_depth', 'flow_velocity', 'wave_height', 'water_temperature', 'wind_speed', 'wind_direction', 'location', 'is_valid', 'review_status', 'import_note'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }

  if (fields.length > 0) {
    fields.push('reviewer = ?');
    values.push(reviewer);
    fields.push('reviewed_at = datetime(\'now\', \'localtime\')');
    if (comment) {
      fields.push('review_comment = ?');
      values.push(comment);
    }
    values.push(buoyId, batchId, batch.current_version);

    db.prepare(`UPDATE buoy_data SET ${fields.join(', ')} WHERE id = ? AND batch_id = ? AND version = ?`).run(...values);
  }

  db.prepare(`INSERT INTO review_records (batch_id, version_from, version_to, material_type, material_id, action, old_value, new_value, reviewer, review_comment) VALUES (?, ?, ?, 'buoy', ?, 'buoy_review', ?, ?, ?, ?)`).run(batchId, batch.current_version, batch.current_version, buoyId, oldData, JSON.stringify(updates), reviewer, comment || '');

  return {
    success: true,
    buoyId,
    updates,
    reviewer
  };
}

function getMissingPhotoList(batchId, version) {
  const ver = version || db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId).current_version;

  return db.prepare(`
    SELECT * FROM inspection_photos
    WHERE batch_id = ? AND version = ? AND is_missing = 1
    ORDER BY photo_no
  `).all(batchId, ver);
}

function getDuplicateList(batchId) {
  return db.prepare(`
    SELECT * FROM duplicate_tracking
    WHERE batch_id = ?
    ORDER BY material_type, material_key
  `).all(batchId);
}

function resolveDuplicate(batchId, dupId, resolution, reviewer) {
  db.prepare(`
    UPDATE duplicate_tracking
    SET status = 'resolved', resolution = ?, last_seen_at = datetime('now', 'localtime')
    WHERE id = ? AND batch_id = ?
  `).run(resolution, dupId, batchId);

  return { success: true, dupId, resolution, reviewer };
}

module.exports = {
  getReviewSummary,
  submitBatchReview,
  reviewSingleItem,
  reviewBuoyItem,
  getMissingPhotoList,
  getDuplicateList,
  resolveDuplicate
};
