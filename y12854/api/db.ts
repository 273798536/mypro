import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'redtide.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbExists = fs.existsSync(dbPath)
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

if (!dbExists) {
  initSchema()
  seedData()
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS station (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sample (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL REFERENCES station(id),
      sample_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      collector TEXT NOT NULL,
      ph REAL,
      dissolved_oxygen REAL,
      chlorophyll_a REAL,
      salinity REAL,
      temperature REAL,
      turbidity REAL,
      notes TEXT,
      conclusion TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weather_forecast (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL REFERENCES sample(id),
      wind_speed REAL,
      wind_direction TEXT,
      wave_height REAL,
      air_temperature REAL,
      humidity REAL,
      weather_condition TEXT,
      forecast_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buoy_data (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL REFERENCES sample(id),
      is_late INTEGER NOT NULL DEFAULT 0,
      arrived_at TEXT,
      affected_conclusions TEXT,
      water_temperature REAL,
      salinity REAL,
      dissolved_oxygen REAL,
      ph REAL,
      chlorophyll_a REAL,
      turbidity REAL,
      reported_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tide_data (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL REFERENCES sample(id),
      station_id TEXT NOT NULL REFERENCES station(id),
      tide_type TEXT,
      high_tide_time TEXT,
      low_tide_time TEXT,
      high_tide_height REAL,
      low_tide_height REAL,
      timezone TEXT,
      timezone_valid INTEGER NOT NULL DEFAULT 1,
      timezone_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anomaly (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL REFERENCES sample(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      description TEXT NOT NULL,
      resolution TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS aquaculture_log (
      id TEXT PRIMARY KEY,
      station_id TEXT NOT NULL REFERENCES station(id),
      sample_id TEXT REFERENCES sample(id),
      species TEXT,
      activity TEXT,
      mortality REAL,
      observation TEXT,
      reported_by TEXT,
      report_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      performed_by TEXT,
      created_at TEXT NOT NULL
    );
  `)
}

function seedData() {
  const now = new Date().toISOString()

  const stations = [
    { id: uuidv4(), name: '嵊山站', region: '东海', latitude: 30.73, longitude: 122.45 },
    { id: uuidv4(), name: '枸杞站', region: '东海', latitude: 30.72, longitude: 122.43 },
    { id: uuidv4(), name: '花鸟站', region: '东海', latitude: 30.82, longitude: 123.40 },
    { id: uuidv4(), name: '岱山站', region: '东海', latitude: 30.26, longitude: 122.20 },
    { id: uuidv4(), name: '朱家尖站', region: '东海', latitude: 29.91, longitude: 122.40 },
  ]

  const insertStation = db.prepare(`
    INSERT INTO station (id, name, region, latitude, longitude, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const insertSample = db.prepare(`
    INSERT INTO sample (id, station_id, sample_date, status, collector, ph, dissolved_oxygen, chlorophyll_a, salinity, temperature, turbidity, notes, conclusion, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertWeather = db.prepare(`
    INSERT INTO weather_forecast (id, sample_id, wind_speed, wind_direction, wave_height, air_temperature, humidity, weather_condition, forecast_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertBuoy = db.prepare(`
    INSERT INTO buoy_data (id, sample_id, is_late, arrived_at, affected_conclusions, water_temperature, salinity, dissolved_oxygen, ph, chlorophyll_a, turbidity, reported_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertTide = db.prepare(`
    INSERT INTO tide_data (id, sample_id, station_id, tide_type, high_tide_time, low_tide_time, high_tide_height, low_tide_height, timezone, timezone_valid, timezone_error, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertAnomaly = db.prepare(`
    INSERT INTO anomaly (id, sample_id, type, status, description, resolution, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertAquaculture = db.prepare(`
    INSERT INTO aquaculture_log (id, station_id, sample_id, species, activity, mortality, observation, reported_by, report_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (id, action, target_type, target_id, details, performed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    for (const s of stations) {
      insertStation.run(s.id, s.name, s.region, s.latitude, s.longitude, now)
    }

    const [shengshan, gouqi, huaniao, daishan, zhujiajian] = stations

    const samples = [
      { id: uuidv4(), stationId: shengshan.id, date: '2025-05-20T08:00:00+08:00', status: 'pending', collector: '张伟', ph: 8.12, do: 6.8, chl: 3.2, sal: 31.5, temp: 19.2, turb: 2.1, notes: '海水略呈黄褐色', conclusion: '溶解氧偏低，待浮标数据确认' },
      { id: uuidv4(), stationId: shengshan.id, date: '2025-05-18T08:30:00+08:00', status: 'reviewed', collector: '张伟', ph: 8.05, do: 7.2, chl: 1.8, sal: 32.1, temp: 18.8, turb: 1.5, notes: '正常采样', conclusion: '各项指标正常' },
      { id: uuidv4(), stationId: shengshan.id, date: '2025-05-15T09:00:00+08:00', status: 'reviewed', collector: '李明', ph: 8.20, do: 7.5, chl: 2.1, sal: 31.8, temp: 18.5, turb: 1.8, notes: '天气晴好', conclusion: '正常' },
      { id: uuidv4(), stationId: shengshan.id, date: '2025-05-12T08:00:00+08:00', status: 'reviewed', collector: '张伟', ph: 8.08, do: 7.0, chl: 2.5, sal: 31.9, temp: 18.0, turb: 1.6, notes: null, conclusion: '正常' },

      { id: uuidv4(), stationId: gouqi.id, date: '2025-05-21T08:15:00+08:00', status: 'pending', collector: '王芳', ph: 8.18, do: 7.1, chl: 2.8, sal: 31.2, temp: 19.0, turb: 2.3, notes: '潮位数据可能存在时区问题', conclusion: '潮汐关联分析待修正' },
      { id: uuidv4(), stationId: gouqi.id, date: '2025-05-19T08:00:00+08:00', status: 'reviewed', collector: '王芳', ph: 8.10, do: 7.3, chl: 1.5, sal: 32.0, temp: 18.6, turb: 1.2, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: gouqi.id, date: '2025-05-16T08:45:00+08:00', status: 'reviewed', collector: '刘强', ph: 8.15, do: 6.9, chl: 2.0, sal: 31.6, temp: 18.3, turb: 1.9, notes: '多云', conclusion: '正常' },
      { id: uuidv4(), stationId: gouqi.id, date: '2025-05-13T09:00:00+08:00', status: 'reviewed', collector: '王芳', ph: 8.22, do: 7.4, chl: 1.3, sal: 32.2, temp: 17.9, turb: 1.1, notes: null, conclusion: '正常' },

      { id: uuidv4(), stationId: huaniao.id, date: '2025-05-22T07:45:00+08:00', status: 'pending', collector: '陈涛', ph: 8.05, do: 6.5, chl: 8.7, sal: 30.8, temp: 19.5, turb: 3.2, notes: '叶绿素a浓度异常偏高', conclusion: '叶绿素a超标，需补测' },
      { id: uuidv4(), stationId: huaniao.id, date: '2025-05-20T08:00:00+08:00', status: 'reviewed', collector: '陈涛', ph: 8.10, do: 7.0, chl: 2.4, sal: 31.4, temp: 19.1, turb: 1.7, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: huaniao.id, date: '2025-05-17T08:30:00+08:00', status: 'reviewed', collector: '赵丽', ph: 8.14, do: 7.2, chl: 1.9, sal: 31.7, temp: 18.7, turb: 1.4, notes: '阴天', conclusion: '正常' },
      { id: uuidv4(), stationId: huaniao.id, date: '2025-05-14T08:00:00+08:00', status: 'reviewed', collector: '陈涛', ph: 8.19, do: 7.6, chl: 1.6, sal: 32.0, temp: 18.2, turb: 1.3, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: huaniao.id, date: '2025-05-11T09:00:00+08:00', status: 'reviewed', collector: '赵丽', ph: 8.25, do: 7.8, chl: 1.2, sal: 32.3, temp: 17.8, turb: 1.0, notes: null, conclusion: '正常' },

      { id: uuidv4(), stationId: daishan.id, date: '2025-05-21T08:30:00+08:00', status: 'pending', collector: '孙磊', ph: 8.30, do: 7.0, chl: 2.6, sal: 25.3, temp: 19.8, turb: 2.8, notes: '盐度读数可能需要重新校准', conclusion: '盐度异常偏低，需重新校准仪器' },
      { id: uuidv4(), stationId: daishan.id, date: '2025-05-19T08:00:00+08:00', status: 'reviewed', collector: '孙磊', ph: 8.12, do: 7.1, chl: 1.7, sal: 31.5, temp: 19.0, turb: 1.6, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: daishan.id, date: '2025-05-16T09:00:00+08:00', status: 'reviewed', collector: '周婷', ph: 8.08, do: 6.8, chl: 2.2, sal: 31.9, temp: 18.5, turb: 1.8, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: daishan.id, date: '2025-05-13T08:30:00+08:00', status: 'reviewed', collector: '孙磊', ph: 8.16, do: 7.3, chl: 1.4, sal: 32.1, temp: 18.1, turb: 1.3, notes: '小雨转阴', conclusion: '正常' },

      { id: uuidv4(), stationId: zhujiajian.id, date: '2025-05-22T08:00:00+08:00', status: 'reviewed', collector: '吴静', ph: 8.10, do: 7.5, chl: 1.5, sal: 32.0, temp: 19.3, turb: 1.2, notes: '天气晴朗，海况良好', conclusion: '各项指标正常，通过复核' },
      { id: uuidv4(), stationId: zhujiajian.id, date: '2025-05-20T08:30:00+08:00', status: 'reviewed', collector: '吴静', ph: 8.14, do: 7.2, chl: 1.8, sal: 31.8, temp: 18.9, turb: 1.5, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: zhujiajian.id, date: '2025-05-17T08:00:00+08:00', status: 'reviewed', collector: '郑凯', ph: 8.20, do: 7.6, chl: 1.3, sal: 32.2, temp: 18.6, turb: 1.1, notes: null, conclusion: '正常' },
      { id: uuidv4(), stationId: zhujiajian.id, date: '2025-05-14T08:45:00+08:00', status: 'reviewed', collector: '吴静', ph: 8.08, do: 7.0, chl: 2.0, sal: 31.6, temp: 18.3, turb: 1.7, notes: '多云转晴', conclusion: '正常' },
      { id: uuidv4(), stationId: zhujiajian.id, date: '2025-05-11T08:00:00+08:00', status: 'reviewed', collector: '郑凯', ph: 8.18, do: 7.4, chl: 1.6, sal: 31.9, temp: 17.7, turb: 1.4, notes: null, conclusion: '正常' },
    ]

    for (const s of samples) {
      insertSample.run(s.id, s.stationId, s.date, s.status, s.collector, s.ph, s.do, s.chl, s.sal, s.temp, s.turb, s.notes, s.conclusion, now, now)
    }

    const [
      shengshanLate, shengshanOk1, shengshanOk2, shengshanOk3,
      gouqiTz, gouqiOk1, gouqiOk2, gouqiOk3,
      huaniaoAnomaly, huaniaoOk1, huaniaoOk2, huaniaoOk3, huaniaoOk4,
      daishanAnomaly, daishanOk1, daishanOk2, daishanOk3,
      zhujiajianPass, zhujiajianOk1, zhujiajianOk2, zhujiajianOk3, zhujiajianOk4,
    ] = samples

    for (const s of samples) {
      insertWeather.run(
        uuidv4(), s.id,
        3.5 + Math.random() * 8, '东南风',
        0.5 + Math.random() * 2, 20 + Math.random() * 5,
        60 + Math.random() * 30,
        ['晴', '多云', '阴', '小雨'][Math.floor(Math.random() * 4)],
        s.date, now
      )
    }

    insertBuoy.run(
      uuidv4(), shengshanLate.id, 1, null,
      JSON.stringify(['溶解氧浓度判定可能受影响，原结论中"溶解氧偏低"的判定需待浮标数据到达后重新评估']),
      19.0, 31.3, null, 8.10, 3.0, 2.0, null, now
    )

    insertBuoy.run(uuidv4(), shengshanOk1.id, 0, null, null, 18.8, 32.0, 7.2, 8.05, 1.8, 1.5, '2025-05-18T09:30:00+08:00', now)
    insertBuoy.run(uuidv4(), shengshanOk2.id, 0, null, null, 18.5, 31.7, 7.5, 8.20, 2.1, 1.8, '2025-05-15T10:00:00+08:00', now)
    insertBuoy.run(uuidv4(), shengshanOk3.id, 0, null, null, 18.0, 31.8, 7.0, 8.08, 2.5, 1.6, '2025-05-12T09:15:00+08:00', now)

    insertBuoy.run(uuidv4(), gouqiTz.id, 0, null, null, 18.8, 31.1, 7.1, 8.18, 2.8, 2.3, '2025-05-21T09:20:00+08:00', now)
    insertBuoy.run(uuidv4(), gouqiOk1.id, 0, null, null, 18.6, 31.9, 7.3, 8.10, 1.5, 1.2, '2025-05-19T09:00:00+08:00', now)
    insertBuoy.run(uuidv4(), gouqiOk2.id, 0, null, null, 18.3, 31.5, 6.9, 8.15, 2.0, 1.9, '2025-05-16T10:30:00+08:00', now)
    insertBuoy.run(uuidv4(), gouqiOk3.id, 0, null, null, 17.9, 32.1, 7.4, 8.22, 1.3, 1.1, '2025-05-13T10:00:00+08:00', now)

    insertBuoy.run(uuidv4(), huaniaoAnomaly.id, 0, null, null, 19.3, 30.6, 6.5, 8.05, 8.5, 3.0, '2025-05-22T08:30:00+08:00', now)
    insertBuoy.run(uuidv4(), huaniaoOk1.id, 0, null, null, 19.0, 31.3, 7.0, 8.10, 2.4, 1.7, '2025-05-20T09:00:00+08:00', now)
    insertBuoy.run(uuidv4(), huaniaoOk2.id, 0, null, null, 18.7, 31.6, 7.2, 8.14, 1.9, 1.4, '2025-05-17T09:30:00+08:00', now)

    insertBuoy.run(uuidv4(), daishanAnomaly.id, 0, null, null, 19.6, 25.1, 7.0, 8.30, 2.6, 2.8, '2025-05-21T09:30:00+08:00', now)
    insertBuoy.run(uuidv4(), daishanOk1.id, 0, null, null, 19.0, 31.4, 7.1, 8.12, 1.7, 1.6, '2025-05-19T09:15:00+08:00', now)

    insertBuoy.run(uuidv4(), zhujiajianPass.id, 0, null, null, 19.2, 31.9, 7.5, 8.10, 1.5, 1.2, '2025-05-22T09:00:00+08:00', now)
    insertBuoy.run(uuidv4(), zhujiajianOk1.id, 0, null, null, 18.9, 31.7, 7.2, 8.14, 1.8, 1.5, '2025-05-20T09:30:00+08:00', now)

    insertTide.run(
      uuidv4(), shengshanLate.id, shengshan.id, '大潮',
      '2025-05-20T12:30:00+08:00', '2025-05-20T06:15:00+08:00',
      3.85, 0.42, 'Asia/Shanghai', 1, null, now
    )
    insertTide.run(uuidv4(), shengshanOk1.id, shengshan.id, '小潮', '2025-05-18T13:00:00+08:00', '2025-05-18T06:45:00+08:00', 2.95, 0.68, 'Asia/Shanghai', 1, null, now)

    insertTide.run(
      uuidv4(), gouqiTz.id, gouqi.id, '大潮',
      '2025-05-21T04:30:00+00:00', '2025-05-20T22:15:00+00:00',
      3.92, 0.38, 'UTC', 0,
      '潮位时区记录为UTC，但实际采样站位位于东八区(Asia/Shanghai)，时差8小时会导致潮位计算偏移',
      now
    )
    insertTide.run(uuidv4(), gouqiOk1.id, gouqi.id, '小潮', '2025-05-19T12:45:00+08:00', '2025-05-19T06:30:00+08:00', 2.88, 0.72, 'Asia/Shanghai', 1, null, now)

    insertTide.run(uuidv4(), huaniaoAnomaly.id, huaniao.id, '中潮', '2025-05-22T11:45:00+08:00', '2025-05-22T05:30:00+08:00', 3.45, 0.55, 'Asia/Shanghai', 1, null, now)
    insertTide.run(uuidv4(), huaniaoOk1.id, huaniao.id, '小潮', '2025-05-20T12:15:00+08:00', '2025-05-20T06:00:00+08:00', 2.90, 0.70, 'Asia/Shanghai', 1, null, now)

    insertTide.run(uuidv4(), daishanAnomaly.id, daishan.id, '大潮', '2025-05-21T12:00:00+08:00', '2025-05-21T05:45:00+08:00', 3.78, 0.45, 'Asia/Shanghai', 1, null, now)
    insertTide.run(uuidv4(), daishanOk1.id, daishan.id, '中潮', '2025-05-19T11:30:00+08:00', '2025-05-19T05:15:00+08:00', 3.30, 0.58, 'Asia/Shanghai', 1, null, now)

    insertTide.run(uuidv4(), zhujiajianPass.id, zhujiajian.id, '小潮', '2025-05-22T13:00:00+08:00', '2025-05-22T06:30:00+08:00', 2.82, 0.75, 'Asia/Shanghai', 1, null, now)

    insertAnomaly.run(
      uuidv4(), shengshanLate.id, 'supplement', 'pending',
      '浮标数据延迟到达，溶解氧相关结论暂无法确认。浮标数据到达前，该样本的溶解氧判定(偏低)需标记为"待更新"，待数据补全后重新评估。',
      null, now, null
    )

    insertAnomaly.run(
      uuidv4(), gouqiTz.id, 'recalibrate', 'pending',
      '潮汐数据时区错误：记录时区为UTC，但采样站位位于东八区(Asia/Shanghai)，8小时时差导致潮位时间偏移，潮汐关联分析结果不可靠，需修正时区后重新计算。',
      null, now, null
    )

    insertAnomaly.run(
      uuidv4(), huaniaoAnomaly.id, 'supplement', 'pending',
      '叶绿素a浓度达8.7μg/L，远超正常阈值(通常<5μg/L)，疑似赤潮前期信号。需在该站位进行补充采样，确认叶绿素a浓度是否持续升高。',
      null, now, null
    )

    insertAnomaly.run(
      uuidv4(), daishanAnomaly.id, 'recalibrate', 'pending',
      '盐度读数为25.3‰，显著低于该海域正常范围(31-33‰)。浮标数据同步显示盐度25.1‰，与现场读数一致，但该数值在无大量淡水输入的情况下不合理，怀疑电导率传感器需重新校准。',
      null, now, null
    )

    insertAquaculture.run(
      uuidv4(), shengshan.id, shengshanLate.id, '贻贝', '日常巡检', 0.5, '部分贻贝开壳，疑似溶解氧偏低导致', '张伟', '2025-05-20', now
    )
    insertAquaculture.run(
      uuidv4(), huaniao.id, huaniaoAnomaly.id, '紫菜', '采样检测', 2.1, '紫菜颜色变淡，可能受叶绿素异常影响', '陈涛', '2025-05-22', now
    )
    insertAquaculture.run(
      uuidv4(), zhujiajian.id, zhujiajianPass.id, '大黄鱼', '常规监测', 0.0, '养殖区水质正常，鱼类活动正常', '吴静', '2025-05-22', now
    )

    insertAudit.run(uuidv4(), 'sample_create', 'sample', shengshanLate.id, '创建嵊山站采样记录，浮标数据标记为延迟', '系统', now)
    insertAudit.run(uuidv4(), 'anomaly_detected', 'anomaly', shengshanLate.id, '检测到浮标数据延迟，自动创建补测异常记录', '系统', now)
    insertAudit.run(uuidv4(), 'sample_create', 'sample', gouqiTz.id, '创建枸杞站采样记录，潮汐数据时区标记为异常', '系统', now)
    insertAudit.run(uuidv4(), 'anomaly_detected', 'anomaly', gouqiTz.id, '检测到潮汐时区错误，自动创建重新校准异常记录', '系统', now)
    insertAudit.run(uuidv4(), 'sample_create', 'sample', huaniaoAnomaly.id, '创建花鸟站采样记录，叶绿素a浓度异常偏高', '系统', now)
    insertAudit.run(uuidv4(), 'anomaly_detected', 'anomaly', huaniaoAnomaly.id, '叶绿素a超标(8.7μg/L)，自动创建补测异常记录', '系统', now)
    insertAudit.run(uuidv4(), 'sample_create', 'sample', daishanAnomaly.id, '创建岱山站采样记录，盐度读数异常偏低', '系统', now)
    insertAudit.run(uuidv4(), 'anomaly_detected', 'anomaly', daishanAnomaly.id, '盐度异常偏低(25.3‰)，自动创建重新校准异常记录', '系统', now)
    insertAudit.run(uuidv4(), 'sample_review', 'sample', zhujiajianPass.id, '朱家尖站样本通过复核，各项指标正常', '系统', now)
  })

  transaction()
}

export default db
