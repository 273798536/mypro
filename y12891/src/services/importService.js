const db = require('../db/database');

function getCurrentVersion(batchId) {
  const row = db.prepare('SELECT current_version FROM inspection_batches WHERE id = ?').get(batchId);
  return row ? row.current_version : null;
}

function detectDuplicate(batchId, materialType, materialKey) {
  const existing = db.prepare(`
    SELECT id, duplicate_count FROM duplicate_tracking
    WHERE batch_id = ? AND material_type = ? AND material_key = ?
  `).get(batchId, materialType, materialKey);

  if (existing) {
    db.prepare(`
      UPDATE duplicate_tracking
      SET duplicate_count = duplicate_count + 1,
          last_seen_at = datetime('now', 'localtime'),
          status = CASE WHEN status = 'resolved' THEN 'pending' ELSE status END
      WHERE id = ?
    `).run(existing.id);
    return { isDuplicate: true, id: existing.id, count: existing.duplicate_count + 1 };
  }

  db.prepare(`
    INSERT INTO duplicate_tracking (batch_id, material_type, material_key, duplicate_count)
    VALUES (?, ?, ?, 1)
  `).run(batchId, materialType, materialKey);

  return { isDuplicate: false, count: 1 };
}

function importBuoyData(batchId, records, opts = {}) {
  const ver = getCurrentVersion(batchId);
  if (!ver) throw new Error('批次不存在');

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('浮标数据不能为空');
  }

  const insertStmt = db.prepare(`
    INSERT INTO buoy_data (
      batch_id, version, buoy_id, location, water_depth, flow_velocity,
      wave_height, water_temperature, wind_speed, wind_direction,
      record_time, is_valid, review_status, import_note, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let duplicates = [];
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      if (!r.buoy_id) throw new Error(`第${i + 1}条缺少buoy_id`);

      const is_valid = r.is_valid === undefined ? 1 : (r.is_valid ? 1 : 0);
      const hasIssue = (r.water_depth !== null && r.water_depth !== undefined && r.water_depth < 0) || is_valid === 0;
      let note = r.import_note || '';
      if (hasIssue && !note) {
        if (is_valid === 0) note = '导入时标记为无效';
        else if (r.water_depth < 0) note = '水深为负值，异常数据';
      }

      insertStmt.run(
        batchId, ver,
        r.buoy_id,
        r.location || null,
        r.water_depth !== undefined ? r.water_depth : null,
        r.flow_velocity !== undefined ? r.flow_velocity : null,
        r.wave_height !== undefined ? r.wave_height : null,
        r.water_temperature !== undefined ? r.water_temperature : null,
        r.wind_speed !== undefined ? r.wind_speed : null,
        r.wind_direction || null,
        r.record_time || null,
        is_valid,
        'pending',
        note,
        r.source || '导入'
      );

      const dupKey = `${r.buoy_id}_${r.record_time ? r.record_time.substring(0, 10) : 'nodate'}`;
      const dupCheck = detectDuplicate(batchId, 'buoy', dupKey);
      if (dupCheck.isDuplicate || dupCheck.count > 1) {
        duplicates.push({ index: i, buoy_id: r.buoy_id, duplicate_count: dupCheck.count });
      }

      inserted++;
    } catch (e) {
      errors.push({ index: i, error: e.message, record: r });
    }
  }

  db.prepare("UPDATE inspection_batches SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);

  return {
    success: inserted > 0,
    inserted,
    total: records.length,
    duplicates,
    errors,
    version: ver
  };
}

function importTideTables(batchId, records) {
  const ver = getCurrentVersion(batchId);
  if (!ver) throw new Error('批次不存在');
  if (!Array.isArray(records) || records.length === 0) throw new Error('潮汐表数据不能为空');

  const stmt = db.prepare(`
    INSERT INTO tide_tables (
      batch_id, version, tide_date, high_tide_time, high_tide_level,
      low_tide_time, low_tide_level, port_name, old_remark, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  let inserted = 0;
  let errors = [];
  const seenDates = new Set();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      if (!r.tide_date) throw new Error(`第${i + 1}条缺少tide_date`);

      if (seenDates.has(r.tide_date)) {
        const key = `tide_${r.tide_date}`;
        detectDuplicate(batchId, 'tide', key);
      }
      seenDates.add(r.tide_date);

      stmt.run(
        batchId, ver,
        r.tide_date,
        r.high_tide_time || null,
        r.high_tide_level !== undefined ? r.high_tide_level : null,
        r.low_tide_time || null,
        r.low_tide_level !== undefined ? r.low_tide_level : null,
        r.port_name || null,
        r.old_remark || null
      );
      inserted++;
    } catch (e) {
      errors.push({ index: i, error: e.message });
    }
  }

  db.prepare("UPDATE inspection_batches SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);

  return { success: inserted > 0, inserted, total: records.length, errors, version: ver };
}

function importWeatherForecasts(batchId, records) {
  const ver = getCurrentVersion(batchId);
  if (!ver) throw new Error('批次不存在');
  if (!Array.isArray(records) || records.length === 0) throw new Error('气象预报数据不能为空');

  const stmt = db.prepare(`
    INSERT INTO weather_forecasts (
      batch_id, version, forecast_date, weather_condition, wind_force,
      wind_direction, visibility, fog_warning, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  let inserted = 0;
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      if (!r.forecast_date) throw new Error(`第${i + 1}条缺少forecast_date`);
      stmt.run(
        batchId, ver,
        r.forecast_date,
        r.weather_condition || null,
        r.wind_force || null,
        r.wind_direction || null,
        r.visibility !== undefined ? r.visibility : null,
        r.fog_warning ? 1 : 0
      );
      inserted++;
    } catch (e) {
      errors.push({ index: i, error: e.message });
    }
  }

  db.prepare("UPDATE inspection_batches SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);
  return { success: inserted > 0, inserted, total: records.length, errors, version: ver };
}

function importViolations(batchId, records) {
  const ver = getCurrentVersion(batchId);
  if (!ver) throw new Error('批次不存在');
  if (!Array.isArray(records) || records.length === 0) throw new Error('禁航区越界数据不能为空');

  const stmt = db.prepare(`
    INSERT INTO restricted_zone_violations (
      batch_id, version, vessel_name, vessel_mmsi, violation_time,
      zone_name, zone_type, duration_minutes, intrusion_distance, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  let inserted = 0;
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      if (!r.zone_name) throw new Error(`第${i + 1}条缺少zone_name`);
      stmt.run(
        batchId, ver,
        r.vessel_name || '未知船舶',
        r.vessel_mmsi || null,
        r.violation_time || null,
        r.zone_name,
        r.zone_type || null,
        r.duration_minutes !== undefined ? r.duration_minutes : null,
        r.intrusion_distance !== undefined ? r.intrusion_distance : null
      );
      inserted++;
    } catch (e) {
      errors.push({ index: i, error: e.message });
    }
  }

  db.prepare("UPDATE inspection_batches SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);
  return { success: inserted > 0, inserted, total: records.length, errors, version: ver };
}

function importPhotos(batchId, records) {
  const ver = getCurrentVersion(batchId);
  if (!ver) throw new Error('批次不存在');
  if (!Array.isArray(records) || records.length === 0) throw new Error('巡检照片数据不能为空');

  const stmt = db.prepare(`
    INSERT INTO inspection_photos (
      batch_id, version, photo_no, photo_type, location, taken_time,
      file_path, file_name, is_missing, missing_reason, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `);

  let inserted = 0;
  let missingCount = 0;
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      if (!r.photo_no) throw new Error(`第${i + 1}条缺少photo_no`);
      const isMissing = r.is_missing ? 1 : 0;
      if (isMissing) missingCount++;

      stmt.run(
        batchId, ver,
        r.photo_no,
        r.photo_type || null,
        r.location || null,
        r.taken_time || null,
        r.file_path || null,
        r.file_name || null,
        isMissing,
        r.missing_reason || null
      );
      inserted++;
    } catch (e) {
      errors.push({ index: i, error: e.message });
    }
  }

  db.prepare("UPDATE inspection_batches SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);
  return { success: inserted > 0, inserted, total: records.length, missingCount, errors, version: ver };
}

function importAquacultureLogs(batchId, records) {
  const ver = getCurrentVersion(batchId);
  if (!ver) throw new Error('批次不存在');
  if (!Array.isArray(records) || records.length === 0) throw new Error('养殖日志数据不能为空');

  const stmt = db.prepare(`
    INSERT INTO aquaculture_logs (
      batch_id, version, log_date, log_content, is_supplementary, review_status
    ) VALUES (?, ?, ?, ?, ?, 'pending')
  `);

  let inserted = 0;
  let supplementaryCount = 0;
  let errors = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    try {
      if (!r.log_date) throw new Error(`第${i + 1}条缺少log_date`);
      const isSup = r.is_supplementary ? 1 : 0;
      if (isSup) supplementaryCount++;

      stmt.run(batchId, ver, r.log_date, r.log_content || null, isSup);
      inserted++;
    } catch (e) {
      errors.push({ index: i, error: e.message });
    }
  }

  db.prepare("UPDATE inspection_batches SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);
  return { success: inserted > 0, inserted, total: records.length, supplementaryCount, errors, version: ver };
}

function importAllFromSample(batchId) {
  const buoyData = [
    { buoy_id: 'FB-003', location: '3#泊位外航道', water_depth: 12.5, flow_velocity: 1.8, wave_height: 0.6, water_temperature: 23.4, wind_speed: 6.2, wind_direction: 'NE', record_time: '2026-06-14 08:30:00', source: '海洋监测站' },
    { buoy_id: 'FB-005', location: '5#泊位锚地', water_depth: 15.2, flow_velocity: 2.1, wave_height: 0.8, water_temperature: 23.1, wind_speed: 7.5, wind_direction: 'ENE', record_time: '2026-06-14 09:15:00', source: '海洋监测站' },
    { buoy_id: 'FB-007', location: '7#泊位调头区', water_depth: null, flow_velocity: null, wave_height: null, is_valid: 0, record_time: '2026-06-14 10:00:00', source: '海洋监测站', import_note: '传感器离线，数据缺失' },
    { buoy_id: 'FB-009', location: '9#泊位备用', water_depth: 8.3, flow_velocity: 0.5, wave_height: 0.2, water_temperature: 24.0, wind_speed: 3.1, wind_direction: 'S', record_time: '2026-06-13 16:45:00', source: '科研助理补录', import_note: '数据时间超前一天，疑似重复上报' },
    { buoy_id: 'FB-011', location: '11#系船浮筒', water_depth: -1.5, flow_velocity: 2.8, wave_height: 1.5, water_temperature: 22.9, wind_speed: 9.8, wind_direction: 'N', record_time: '2026-06-14 11:20:00', source: '海洋监测站', import_note: '水深为负值，明显异常需复核' },
    { buoy_id: 'FB-002', location: '2#引航锚地', water_depth: 18.6, flow_velocity: 1.2, wave_height: 0.4, water_temperature: 23.5, wind_speed: 5.0, wind_direction: 'E', record_time: '2026-06-14 07:00:00', source: '海洋监测站' }
  ];

  const tideTables = [
    { tide_date: '2026-06-15', high_tide_time: '05:32', high_tide_level: 4.25, low_tide_time: '11:48', low_tide_level: 0.82, port_name: '港区主港', old_remark: '备注：2025年同期大潮基准（旧表遗留）' },
    { tide_date: '2026-06-16', high_tide_time: '06:15', high_tide_level: 4.12, low_tide_time: '12:30', low_tide_level: 0.95, port_name: '港区主港' },
    { tide_date: '2026-06-17', high_tide_time: '07:02', high_tide_level: 3.98, low_tide_time: '13:15', low_tide_level: 1.10, port_name: '港区主港' }
  ];

  const weatherForecasts = [
    { forecast_date: '2026-06-15', weather_condition: '多云转晴', wind_force: '4-5级', wind_direction: '东北风', visibility: 8.5, fog_warning: 0 },
    { forecast_date: '2026-06-16', weather_condition: '晴间多云', wind_force: '3-4级', wind_direction: '偏东风', visibility: 10.0, fog_warning: 0 },
    { forecast_date: '2026-06-17', weather_condition: '阴有阵雨', wind_force: '5-6级', wind_direction: '东南风', visibility: 5.0, fog_warning: 0 }
  ];

  const violations = [
    { vessel_name: '远达号', vessel_mmsi: '413256789', violation_time: '2026-06-14 14:32:00', zone_name: '5#泊位禁航区', zone_type: '危险品作业区', duration_minutes: 18, intrusion_distance: 0.5 },
    { vessel_name: '海顺08', vessel_mmsi: '413987654', violation_time: '2026-06-14 16:05:00', zone_name: '3#泊位警戒区', zone_type: '警戒区', duration_minutes: 5, intrusion_distance: 0.2 },
    { vessel_name: '未知船舶', vessel_mmsi: '', violation_time: '2026-06-14 22:18:00', zone_name: '7#泊位禁航区', zone_type: '危险品作业区', duration_minutes: null, intrusion_distance: 0.8 }
  ];

  const photos = [
    { photo_no: 'P-001', photo_type: '泊位全景', location: '3#危险品泊位', taken_time: '2026-06-14 09:00:00', file_path: '/photos/3berth_overview.jpg', file_name: '3berth_overview.jpg', is_missing: 0 },
    { photo_no: 'P-002', photo_type: '靠泊设施', location: '3#危险品泊位', taken_time: '2026-06-14 09:12:00', file_path: '/photos/3berth_facility.jpg', file_name: '3berth_facility.jpg', is_missing: 0 },
    { photo_no: 'P-003', photo_type: '消防设备', location: '5#危险品泊位', taken_time: '2026-06-14 10:05:00', file_path: '/photos/5berth_firefighting.jpg', file_name: '5berth_firefighting.jpg', is_missing: 0 },
    { photo_no: 'P-004', photo_type: '围油栏', location: '5#危险品泊位', is_missing: 1, missing_reason: '相机存储卡损坏，现场照片丢失' },
    { photo_no: 'P-005', photo_type: '登船梯', location: '7#危险品泊位', taken_time: '2026-06-14 11:30:00', file_path: '/photos/7berth_gangway.jpg', file_name: '7berth_gangway.jpg', is_missing: 0 },
    { photo_no: 'P-006', photo_type: '警示标识', location: '7#危险品泊位', is_missing: 1, missing_reason: '雾天拍摄不清，需重拍' },
    { photo_no: 'P-007', photo_type: '泊位全景', location: '7#危险品泊位', taken_time: '2026-06-14 11:45:00', file_path: '/photos/7berth_overview.jpg', file_name: '7berth_overview.jpg', is_missing: 0 }
  ];

  const aquaLogs = [
    { log_date: '2026-06-10', log_content: '近岸养殖区巡查，未见异常', is_supplementary: 1 },
    { log_date: '2026-06-12', log_content: '养殖区浮球检查，加固3处', is_supplementary: 1 },
    { log_date: '2026-06-14', log_content: '配合危险品泊位检查，临时补录', is_supplementary: 1 }
  ];

  const results = {};
  results.buoy = importBuoyData(batchId, buoyData);
  results.tide = importTideTables(batchId, tideTables);
  results.weather = importWeatherForecasts(batchId, weatherForecasts);
  results.violation = importViolations(batchId, violations);
  results.photo = importPhotos(batchId, photos);
  results.aquaculture = importAquacultureLogs(batchId, aquaLogs);

  db.prepare("UPDATE inspection_batches SET status = 'imported', updated_at = datetime('now', 'localtime') WHERE id = ?").run(batchId);

  return {
    success: true,
    batchId,
    message: '6类材料样例数据导入完成',
    details: results
  };
}

module.exports = {
  importBuoyData,
  importTideTables,
  importWeatherForecasts,
  importViolations,
  importPhotos,
  importAquacultureLogs,
  importAllFromSample
};
