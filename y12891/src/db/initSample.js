const db = require('./database');

function initSampleData() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM inspection_batches').get();
  if (existing.count > 0) {
    console.log('样本数据已存在，跳过初始化');
    return;
  }

  const insertBatch = db.prepare(`
    INSERT INTO inspection_batches (batch_no, name, status, description, current_version)
    VALUES (?, ?, ?, ?, ?)
  `);

  const batchResult = insertBatch.run(
    'GXWXP-2026-0615',
    '港区危险品泊位检查-2026年6月第2轮',
    'imported',
    '本期检查覆盖3#、5#、7#危险品泊位，含浮标监测、潮汐复核、气象预报、禁航区巡查及泊位照片核查',
    1
  );

  const batchId = batchResult.lastInsertRowid;

  const insertBuoy = db.prepare(`
    INSERT INTO buoy_data (batch_id, version, buoy_id, location, water_depth, flow_velocity, wave_height, water_temperature, wind_speed, wind_direction, record_time, is_valid, review_status, import_note, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const buoyRecords = [
    [batchId, 1, 'FB-003', '3#泊位外航道', 12.5, 1.8, 0.6, 23.4, 6.2, 'NE', '2026-06-14 08:30:00', 1, 'pending', '正常导入', '海洋监测站'],
    [batchId, 1, 'FB-005', '5#泊位锚地', 15.2, 2.1, 0.8, 23.1, 7.5, 'ENE', '2026-06-14 09:15:00', 1, 'pending', '正常导入', '海洋监测站'],
    [batchId, 1, 'FB-007', '7#泊位调头区', null, null, null, null, null, null, '2026-06-14 10:00:00', 0, 'pending', '传感器离线，数据缺失', '海洋监测站'],
    [batchId, 1, 'FB-009', '9#泊位备用', 8.3, 0.5, 0.2, 24.0, 3.1, 'S', '2026-06-13 16:45:00', 1, 'pending', '数据时间超前一天，疑似重复上报', '科研助理补录'],
    [batchId, 1, 'FB-011', '11#系船浮筒', -1.5, 2.8, 1.5, 22.9, 9.8, 'N', '2026-06-14 11:20:00', 1, 'pending', '水深为负值，明显异常需复核', '海洋监测站'],
    [batchId, 1, 'FB-002', '2#引航锚地', 18.6, 1.2, 0.4, 23.5, 5.0, 'E', '2026-06-14 07:00:00', 1, 'pending', '正常导入', '海洋监测站'],
  ];

  for (const record of buoyRecords) {
    insertBuoy.run(...record);
  }

  const insertTide = db.prepare(`
    INSERT INTO tide_tables (batch_id, version, tide_date, high_tide_time, high_tide_level, low_tide_time, low_tide_level, port_name, old_remark, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tideRecords = [
    [batchId, 1, '2026-06-15', '05:32', 4.25, '11:48', 0.82, '港区主港', '备注：2025年同期大潮基准（旧表遗留）', 'pending'],
    [batchId, 1, '2026-06-16', '06:15', 4.12, '12:30', 0.95, '港区主港', '', 'pending'],
    [batchId, 1, '2026-06-17', '07:02', 3.98, '13:15', 1.10, '港区主港', '', 'pending'],
  ];

  for (const record of tideRecords) {
    insertTide.run(...record);
  }

  const insertWeather = db.prepare(`
    INSERT INTO weather_forecasts (batch_id, version, forecast_date, weather_condition, wind_force, wind_direction, visibility, fog_warning, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const weatherRecords = [
    [batchId, 1, '2026-06-15', '多云转晴', '4-5级', '东北风', 8.5, 0, 'pending'],
    [batchId, 1, '2026-06-16', '晴间多云', '3-4级', '偏东风', 10.0, 0, 'pending'],
    [batchId, 1, '2026-06-17', '阴有阵雨', '5-6级', '东南风', 5.0, 0, 'pending'],
  ];

  for (const record of weatherRecords) {
    insertWeather.run(...record);
  }

  const insertViolation = db.prepare(`
    INSERT INTO restricted_zone_violations (batch_id, version, vessel_name, vessel_mmsi, violation_time, zone_name, zone_type, duration_minutes, intrusion_distance, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const violationRecords = [
    [batchId, 1, '远达号', '413256789', '2026-06-14 14:32:00', '5#泊位禁航区', '危险品作业区', 18, 0.5, 'pending'],
    [batchId, 1, '海顺08', '413987654', '2026-06-14 16:05:00', '3#泊位警戒区', '警戒区', 5, 0.2, 'pending'],
    [batchId, 1, '未知船舶', '', '2026-06-14 22:18:00', '7#泊位禁航区', '危险品作业区', null, 0.8, 'pending'],
  ];

  for (const record of violationRecords) {
    insertViolation.run(...record);
  }

  const insertPhoto = db.prepare(`
    INSERT INTO inspection_photos (batch_id, version, photo_no, photo_type, location, taken_time, file_path, file_name, is_missing, missing_reason, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const photoRecords = [
    [batchId, 1, 'P-001', '泊位全景', '3#危险品泊位', '2026-06-14 09:00:00', '/photos/3berth_overview.jpg', '3berth_overview.jpg', 0, '', 'pending'],
    [batchId, 1, 'P-002', '靠泊设施', '3#危险品泊位', '2026-06-14 09:12:00', '/photos/3berth_facility.jpg', '3berth_facility.jpg', 0, '', 'pending'],
    [batchId, 1, 'P-003', '消防设备', '5#危险品泊位', '2026-06-14 10:05:00', '/photos/5berth_firefighting.jpg', '5berth_firefighting.jpg', 0, '', 'pending'],
    [batchId, 1, 'P-004', '围油栏', '5#危险品泊位', '', '', '', 1, '相机存储卡损坏，现场照片丢失', 'pending'],
    [batchId, 1, 'P-005', '登船梯', '7#危险品泊位', '2026-06-14 11:30:00', '/photos/7berth_gangway.jpg', '7berth_gangway.jpg', 0, '', 'pending'],
    [batchId, 1, 'P-006', '警示标识', '7#危险品泊位', '', '', '', 1, '雾天拍摄不清，需重拍', 'pending'],
    [batchId, 1, 'P-007', '泊位全景', '7#危险品泊位', '2026-06-14 11:45:00', '/photos/7berth_overview.jpg', '7berth_overview.jpg', 0, '', 'pending'],
  ];

  for (const record of photoRecords) {
    insertPhoto.run(...record);
  }

  const insertAqua = db.prepare(`
    INSERT INTO aquaculture_logs (batch_id, version, log_date, log_content, is_supplementary, review_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const aquaRecords = [
    [batchId, 1, '2026-06-10', '近岸养殖区巡查，未见异常', 1, 'pending'],
    [batchId, 1, '2026-06-12', '养殖区浮球检查，加固3处', 1, 'pending'],
    [batchId, 1, '2026-06-14', '配合危险品泊位检查，临时补录', 1, 'pending'],
  ];

  for (const record of aquaRecords) {
    insertAqua.run(...record);
  }

  const insertDup = db.prepare(`
    INSERT INTO duplicate_tracking (batch_id, material_type, material_key, duplicate_count, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertDup.run(batchId, 'buoy', 'FB-009_2026-06-13', 2, 'pending');

  console.log('样本数据初始化完成');
  console.log('批次号: GXWXP-2026-0615');
  console.log('包含材料: 浮标数据6条、潮汐表3条、气象预报3条、禁航区越界3条、巡检照片7条(2张缺失)、养殖日志3条(均为补录)');
  console.log('异常数据: FB-007数据缺失、FB-009疑似重复上报、FB-011水深负值异常');
}

initSampleData();

module.exports = { initSampleData };
