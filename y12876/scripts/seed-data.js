const Database = require('../lib/db');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'classroom.db');

async function seed() {
  const db = new Database(dbPath);
  await db.init();

  const insertZone = db.prepare(`
    INSERT INTO no_go_zones (name, description, zone_type, tide_sensitive, tide_threshold, tide_rule)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertCoord = db.prepare(`
    INSERT INTO no_go_zone_coords (zone_id, lon, lat, "order") VALUES (?, ?, ?, ?)
  `);
  const insertVessel = db.prepare(`
    INSERT INTO vessels (name, mmsi, vessel_type, length, width, draft) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertTrack = db.prepare(`
    INSERT INTO vessel_tracks (vessel_id, track_time, lon, lat, speed, heading, depth, source_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTideStation = db.prepare(`
    INSERT INTO tide_stations (name, lon, lat, reference_level) VALUES (?, ?, ?, ?)
  `);
  const insertTidePred = db.prepare(`
    INSERT INTO tide_predictions (station_id, pred_time, height, calc_version) VALUES (?, ?, ?, ?)
  `);
  const insertWave = db.prepare(`
    INSERT INTO wave_forecasts (forecast_time, valid_time, lon, lat, wave_height, wave_period, wind_speed, received_at, is_delayed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAquaLog = db.prepare(`
    INSERT INTO aquaculture_logs (log_date, farm_name, cage_count, feeding_amount, temperature, mortality, source_file, is_missing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProfile = db.prepare(`
    INSERT INTO seabed_profiles (profile_name, start_lon, start_lat, end_lon, end_lat, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertProfilePoint = db.prepare(`
    INSERT INTO seabed_profile_points (profile_id, distance, depth, lon, lat) VALUES (?, ?, ?, ?, ?)
  `);

  console.log('正在填充示例数据...');

  const runTransaction = db.transaction(() => {
    const zone1 = insertZone.run(
      '东海养殖区A',
      '深水网箱养殖区，低潮时水深不足禁止通航（潮高<1.9米禁入）',
      'aquaculture',
      1,
      1.9,
      'low_tide_forbidden'
    ).lastInsertRowid;
    const zone1Coords = [
      [121.52, 29.82], [121.68, 29.82],
      [121.68, 29.98], [121.52, 29.98]
    ];
    zone1Coords.forEach((c, i) => insertCoord.run(zone1, c[0], c[1], i));

    const zone2 = insertZone.run(
      '舟山航道禁锚区',
      '主航道，禁止抛锚',
      'fairway',
      0,
      null,
      null
    ).lastInsertRowid;
    const zone2Coords = [
      [122.02, 30.12], [122.28, 30.12],
      [122.28, 30.23], [122.02, 30.23]
    ];
    zone2Coords.forEach((c, i) => insertCoord.run(zone2, c[0], c[1], i));

    const zone3 = insertZone.run(
      '国家级水产种质资源保护区',
      '产卵期禁航保护区',
      'reserve',
      0,
      null,
      null
    ).lastInsertRowid;
    const zone3Coords = [
      [122.52, 30.32], [122.68, 30.32],
      [122.68, 30.48], [122.52, 30.48]
    ];
    zone3Coords.forEach((c, i) => insertCoord.run(zone3, c[0], c[1], i));

    const v1 = insertVessel.run('浙渔12345', '412345678', 'fishing', 45, 8, 3.5).lastInsertRowid;
    const v2 = insertVessel.run('远顺号', '412345679', 'cargo', 120, 20, 7.8).lastInsertRowid;
    const v3 = insertVessel.run('海巡01', '412345680', 'patrol', 60, 10, 4.2).lastInsertRowid;

    const startTime = new Date('2024-06-14T22:00:00Z');

    for (let i = 0; i < 30; i++) {
      const t = new Date(startTime.getTime() + i * 12 * 60 * 1000);
      const lon = 121.50 + i * 0.006;
      const lat = 29.87 + (i >= 10 && i <= 22 ? 0.08 : Math.sin(i * 0.3) * 0.02);
      insertTrack.run(v1, t.toISOString(), lon, lat, 7.5 + Math.random() * 2, 95 + Math.random() * 10, 28 + Math.random() * 8, 'track_20240615_zheyu12345.csv');
    }

    for (let i = 0; i < 25; i++) {
      const t = new Date(startTime.getTime() + i * 15 * 60 * 1000);
      const lon = 122.02 + i * 0.010;
      const lat = 30.14 + (i >= 6 && i <= 16 ? 0.05 : 0);
      insertTrack.run(v2, t.toISOString(), lon, lat, 11 + Math.random() * 3, 88 + Math.random() * 5, 42 + Math.random() * 10, 'track_20240615_yuanshun.csv');
    }

    for (let i = 0; i < 20; i++) {
      const t = new Date(startTime.getTime() + i * 20 * 60 * 1000);
      const lon = 122.40 + i * 0.012;
      const lat = 30.30 + Math.sin(i * 0.5) * 0.04;
      insertTrack.run(v3, t.toISOString(), lon, lat, 14 + Math.random() * 4, i * 20, 38 + Math.random() * 12, 'track_20240615_haixun01.csv');
    }

    const station1 = insertTideStation.run('舟山验潮站', 122.1, 30.2, 1.2).lastInsertRowid;
    const station2 = insertTideStation.run('石浦验潮站', 121.95, 29.2, 1.0).lastInsertRowid;

    for (let h = 0; h < 24; h++) {
      const t = new Date(Date.UTC(2024, 5, 14, h, 0, 0));
      const height1 = 1.6 + Math.sin((h - 3) * Math.PI / 6) * 1.0;
      insertTidePred.run(station1, t.toISOString(), Math.max(0.3, height1), 'v1');
      const t2 = new Date(Date.UTC(2024, 5, 15, h, 0, 0));
      const height2 = 1.6 + Math.sin((h - 15) * Math.PI / 6) * 1.0;
      insertTidePred.run(station1, t2.toISOString(), Math.max(0.3, height2), 'v1');
    }

    for (let h = 0; h < 24; h++) {
      const t = new Date(Date.UTC(2024, 5, 14, h, 0, 0));
      const height1 = 1.4 + Math.sin((h - 4) * Math.PI / 6) * 0.9;
      insertTidePred.run(station2, t.toISOString(), Math.max(0.2, height1), 'v1');
      const t2 = new Date(Date.UTC(2024, 5, 15, h, 0, 0));
      const height2 = 1.4 + Math.sin((h - 16) * Math.PI / 6) * 0.9;
      insertTidePred.run(station2, t2.toISOString(), Math.max(0.2, height2), 'v1');
    }

    const fcstTime = new Date(Date.UTC(2024, 5, 14, 18, 0, 0));
    for (let h = 0; h < 24; h++) {
      const validT = new Date(startTime.getTime() + h * 3600 * 1000);
      const isDelayed = h >= 4 && h < 12 ? 1 : 0;
      const receivedAt = isDelayed
        ? new Date(startTime.getTime() + (h + 6) * 3600 * 1000)
        : new Date(startTime.getTime() - 2 * 3600 * 1000);

      insertWave.run(
        fcstTime.toISOString(),
        validT.toISOString(),
        121.6, 29.9,
        1.0 + Math.sin(h * 0.25) * 0.4,
        5.5 + Math.random() * 2,
        7 + Math.random() * 5,
        receivedAt.toISOString(),
        isDelayed
      );

      insertWave.run(
        fcstTime.toISOString(),
        validT.toISOString(),
        122.1, 30.15,
        1.3 + Math.sin(h * 0.3) * 0.5,
        6 + Math.random() * 2,
        9 + Math.random() * 4,
        receivedAt.toISOString(),
        isDelayed
      );
    }

    const farmNames = ['东海养殖场A区', '舟山深水网箱基地', '象山港养殖区'];
    for (let d = 0; d < 3; d++) {
      const date = new Date(startTime.getTime() + d * 86400 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      farmNames.forEach((farm, idx) => {
        const isMissing = d === 0 && idx === 1;
        if (isMissing) {
          insertAquaLog.run(dateStr, farm, null, null, null, 0, `aqua_${dateStr}_${farm}.xlsx`, 1);
        } else {
          insertAquaLog.run(
            dateStr, farm,
            50 + idx * 20,
            800 + Math.random() * 200,
            22 + Math.random() * 3,
            Math.floor(Math.random() * 5),
            `aqua_${dateStr}_${farm}.xlsx`,
            0
          );
        }
      });
    }

    const prof1 = insertProfile.run(
      '东海大陆架剖面AA',
      121.0, 29.5,
      123.0, 30.5,
      '横跨东海大陆架的典型地形剖面'
    ).lastInsertRowid;

    const profileData = [
      [0, 20], [5, 30], [10, 45], [15, 55], [20, 60], [25, 58],
      [30, 50], [35, 70], [40, 85], [45, 95], [50, 100],
      [55, 95], [60, 80], [65, 65], [70, 50], [75, 40],
      [80, 35], [85, 45], [90, 55], [95, 50], [100, 45],
      [105, 55], [110, 70], [115, 90], [120, 105], [125, 120]
    ];

    profileData.forEach(([dist, depth], i) => {
      const ratio = i / (profileData.length - 1);
      const lon = 121.0 + ratio * 2.0;
      const lat = 29.5 + ratio * 1.0;
      insertProfilePoint.run(prof1, dist * 1.852, depth, lon, lat);
    });

    const prof2 = insertProfile.run(
      '近岸浅海剖面BB',
      121.3, 29.7,
      122.0, 29.9,
      '近岸养殖区附近浅海地形'
    ).lastInsertRowid;

    const shallowData = [
      [0, 8], [2, 12], [4, 15], [6, 18], [8, 22], [10, 25],
      [12, 20], [14, 15], [16, 18], [18, 25], [20, 30],
      [22, 28], [24, 22], [26, 18], [28, 15], [30, 12]
    ];

    shallowData.forEach(([dist, depth], i) => {
      const ratio = i / (shallowData.length - 1);
      const lon = 121.3 + ratio * 0.7;
      const lat = 29.7 + ratio * 0.2;
      insertProfilePoint.run(prof2, dist * 1.852, depth, lon, lat);
    });
  });

  runTransaction();

  console.log('示例数据填充完成！');
  console.log('  - 禁航区: 3个 (1个潮汐敏感)');
  console.log('  - 船舶: 3艘, 轨迹点: 75个');
  console.log('    · 浙渔12345 (渔船): 穿越养殖区，潮汐影响越界判断');
  console.log('    · 远顺号 (货船): 擦过航道禁锚区');
  console.log('    · 海巡01 (执法船): 正常航行，无越界');
  console.log('  - 潮汐站: 2个, 潮汐预报(v1): 48条');
  console.log('  - 风浪预报: 48条 (含16条晚到数据)');
  console.log('  - 养殖日志: 9条 (含1条缺失，轨迹当天)');
  console.log('  - 海底地形剖面: 2条');

  db.close();
}

seed().catch(e => {
  console.error('填充失败:', e.message);
  process.exit(1);
});
