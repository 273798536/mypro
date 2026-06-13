import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '..', 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(path.join(dataDir, 'museum.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    cabinetNo TEXT NOT NULL,
    floor TEXT NOT NULL,
    unit TEXT NOT NULL,
    lightParams TEXT NOT NULL DEFAULT '{}',
    anomalyType TEXT NOT NULL DEFAULT 'normal',
    anomalyLevel TEXT NOT NULL DEFAULT 'none',
    status TEXT NOT NULL DEFAULT 'pending',
    judgment TEXT NOT NULL DEFAULT '',
    originalJudgment TEXT NOT NULL DEFAULT '',
    hasDirtyData INTEGER NOT NULL DEFAULT 0,
    dirtyDataNote TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    recordId TEXT NOT NULL REFERENCES records(id),
    originalFilename TEXT NOT NULL,
    storedFilename TEXT NOT NULL,
    captureTime TEXT,
    deviceInfo TEXT,
    exifData TEXT NOT NULL DEFAULT '{}',
    uploadedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    recordId TEXT NOT NULL REFERENCES records(id),
    photoId TEXT REFERENCES photos(id),
    type TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT '{}',
    content TEXT NOT NULL DEFAULT '',
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,
    recordId TEXT NOT NULL REFERENCES records(id),
    action TEXT NOT NULL,
    oldValue TEXT NOT NULL DEFAULT '',
    newValue TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    operatorName TEXT NOT NULL,
    operatorRole TEXT NOT NULL DEFAULT '',
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    configSnapshot TEXT NOT NULL DEFAULT '{}',
    recordCount INTEGER NOT NULL DEFAULT 0,
    generatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

const PHOTO_URL = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=museum+display+cabinet+light+inspection+photo&image_size=landscape_4_3'

function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM records').get() as { c: number }
  if (count.c > 0) return

  const insertRecord = db.prepare(`
    INSERT INTO records (id, cabinetNo, floor, unit, lightParams, anomalyType, anomalyLevel, status, judgment, originalJudgment, hasDirtyData, dirtyDataNote, createdAt, updatedAt)
    VALUES (@id, @cabinetNo, @floor, @unit, @lightParams, @anomalyType, @anomalyLevel, @status, @judgment, @originalJudgment, @hasDirtyData, @dirtyDataNote, @createdAt, @updatedAt)
  `)

  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, recordId, originalFilename, storedFilename, captureTime, deviceInfo, exifData, uploadedAt)
    VALUES (@id, @recordId, @originalFilename, @storedFilename, @captureTime, @deviceInfo, @exifData, @uploadedAt)
  `)

  const insertAnnotation = db.prepare(`
    INSERT INTO annotations (id, recordId, photoId, type, position, content, createdBy, createdAt)
    VALUES (@id, @recordId, @photoId, @type, @position, @content, @createdBy, @createdAt)
  `)

  const insertHistory = db.prepare(`
    INSERT INTO history_entries (id, recordId, action, oldValue, newValue, reason, operatorName, operatorRole, timestamp)
    VALUES (@id, @recordId, @action, @oldValue, @newValue, @reason, @operatorName, @operatorRole, @timestamp)
  `)

  const transaction = db.transaction(() => {
    const records = [
      { id: uuidv4(), cabinetNo: 'A-101', floor: '1层', unit: '1F-ZoneA', lightParams: '{"brightness":80,"colorTemp":4000,"schedule":"08:00-18:00"}', anomalyType: 'normal', anomalyLevel: 'none', status: 'reviewed', judgment: '正常通过', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-01 09:15:00', updatedAt: '2026-06-01 09:15:00' },
      { id: uuidv4(), cabinetNo: 'A-102', floor: '1层', unit: '1F-ZoneA', lightParams: '{"brightness":75,"colorTemp":3800,"schedule":"08:00-18:00"}', anomalyType: 'normal', anomalyLevel: 'none', status: 'reviewed', judgment: '正常通过', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-01 09:22:00', updatedAt: '2026-06-01 09:22:00' },
      { id: uuidv4(), cabinetNo: 'A-201', floor: '1层', unit: '1F-ZoneA', lightParams: '{"brightness":82,"colorTemp":4200,"schedule":"08:00-18:00"}', anomalyType: 'normal', anomalyLevel: 'none', status: 'reviewed', judgment: '正常通过', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-01 09:30:00', updatedAt: '2026-06-01 09:30:00' },
      { id: uuidv4(), cabinetNo: 'B-301', floor: '2层', unit: '2F-ZoneB', lightParams: '{"brightness":0,"colorTemp":0,"schedule":"08:00-18:00","flickerRate":12.5}', anomalyType: 'flicker', anomalyLevel: 'high', status: 'reviewed', judgment: '灯光闪烁异常，需更换驱动器', originalJudgment: '灯光闪烁异常，建议检查电源线', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-02 10:05:00', updatedAt: '2026-06-03 14:30:00' },
      { id: uuidv4(), cabinetNo: 'B-302', floor: '2层', unit: '2F-ZoneB', lightParams: '{"brightness":45,"colorTemp":3500,"schedule":"08:00-18:00","flickerRate":8.3}', anomalyType: 'flicker', anomalyLevel: 'medium', status: 'reviewed', judgment: '轻微闪烁，建议观察', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-02 10:12:00', updatedAt: '2026-06-02 10:12:00' },
      { id: uuidv4(), cabinetNo: 'C-101', floor: '2层', unit: '2F-ZoneC', lightParams: '{"brightness":150,"colorTemp":5500,"schedule":"08:00-18:00"}', anomalyType: 'brightness_abnormal', anomalyLevel: 'high', status: 'reviewed', judgment: '亮度过高，超出标准值80%，需调整', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-02 11:00:00', updatedAt: '2026-06-02 11:00:00' },
      { id: uuidv4(), cabinetNo: 'C-102', floor: '2层', unit: '2F-ZoneC', lightParams: '{"brightness":20,"colorTemp":2800,"schedule":"08:00-18:00"}', anomalyType: 'brightness_abnormal', anomalyLevel: 'medium', status: 'reviewed', judgment: '亮度过低，展品照明不足', originalJudgment: '亮度偏低，建议更换灯管', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-02 11:15:00', updatedAt: '2026-06-04 09:00:00' },
      { id: uuidv4(), cabinetNo: 'D-201', floor: '3层', unit: '3F-ZoneD', lightParams: '{"brightness":78,"colorTemp":3900,"schedule":"09:00-17:00","actualOnTime":"03:00"}', anomalyType: 'off_schedule', anomalyLevel: 'high', status: 'reviewed', judgment: '非计划时段开启，疑似定时器故障', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-03 08:20:00', updatedAt: '2026-06-03 08:20:00' },
      { id: uuidv4(), cabinetNo: 'D-202', floor: '3层', unit: '3F-ZoneD', lightParams: '{"brightness":77,"colorTemp":4000,"schedule":"09:00-17:00","actualOffTime":"22:30"}', anomalyType: 'off_schedule', anomalyLevel: 'low', status: 'reviewed', judgment: '关闭时间延后，需检查定时设置', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-03 08:35:00', updatedAt: '2026-06-03 08:35:00' },
      { id: uuidv4(), cabinetNo: 'E-501', floor: '3层/B区', unit: '3F-SecB', lightParams: '{"brightness":81,"colorTemp":4100,"schedule":"08:00-18:00"}', anomalyType: 'normal', anomalyLevel: 'none', status: 'rejudged', judgment: '已处理（含异常）', originalJudgment: '正常通过', hasDirtyData: 1, dirtyDataNote: '楼层编号格式不一致：floor字段为"3层/B区"混用中英文与斜杠，unit字段为"3F-SecB"与同层其他记录格式不同；需统一为"3层"和"3F-ZoneB"', createdAt: '2026-06-03 09:00:00', updatedAt: '2026-06-05 10:00:00' },
      { id: uuidv4(), cabinetNo: 'E-502', floor: '3层/B区', unit: '3F-SecB', lightParams: '{"brightness":60,"colorTemp":3200,"schedule":"08:00-18:00","flickerRate":15.0}', anomalyType: 'flicker', anomalyLevel: 'high', status: 'rejudged', judgment: '已处理（含异常）', originalJudgment: '灯光闪烁严重，需立即维修', hasDirtyData: 1, dirtyDataNote: '楼层编号"3层/B区"不符合规范格式，unit"3F-SecB"与标准命名不一致', createdAt: '2026-06-03 09:20:00', updatedAt: '2026-06-05 11:00:00' },
      { id: uuidv4(), cabinetNo: 'F-101', floor: '1层', unit: '1F-ZoneF', lightParams: '{"brightness":79,"colorTemp":3950,"schedule":"08:00-18:00"}', anomalyType: 'normal', anomalyLevel: 'none', status: 'pending', judgment: '', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-04 08:10:00', updatedAt: '2026-06-04 08:10:00' },
      { id: uuidv4(), cabinetNo: 'F-201', floor: '2层', unit: '2F-ZoneF', lightParams: '{"brightness":85,"colorTemp":4500,"schedule":"08:00-18:00","flickerRate":5.1}', anomalyType: 'flicker', anomalyLevel: 'low', status: 'pending', judgment: '', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-04 09:30:00', updatedAt: '2026-06-04 09:30:00' },
      { id: uuidv4(), cabinetNo: 'G-301', floor: '3层', unit: '3F-ZoneG', lightParams: '{"brightness":200,"colorTemp":6000,"schedule":"08:00-18:00"}', anomalyType: 'brightness_abnormal', anomalyLevel: 'high', status: 'pending', judgment: '', originalJudgment: '', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-05 07:45:00', updatedAt: '2026-06-05 07:45:00' },
      { id: uuidv4(), cabinetNo: 'A-301', floor: '1层', unit: '1F-ZoneA', lightParams: '{"brightness":76,"colorTemp":3850,"schedule":"08:00-18:00","actualOnTime":"06:00"}', anomalyType: 'off_schedule', anomalyLevel: 'medium', status: 'reviewed', judgment: '提前开启，检查定时器设置', originalJudgment: '非计划开启，疑似故障', hasDirtyData: 0, dirtyDataNote: '', createdAt: '2026-06-05 08:00:00', updatedAt: '2026-06-06 10:00:00' },
    ]

    for (const r of records) {
      insertRecord.run(r)
    }

    const allRecords = db.prepare('SELECT id, cabinetNo, anomalyType, status, createdAt FROM records').all() as { id: string; cabinetNo: string; anomalyType: string; status: string; createdAt: string }[]

    for (const rec of allRecords) {
      const photoId = uuidv4()
      insertPhoto.run({
        id: photoId,
        recordId: rec.id,
        originalFilename: `${rec.cabinetNo}_inspection.jpg`,
        storedFilename: PHOTO_URL,
        captureTime: rec.createdAt,
        deviceInfo: 'Nikon D850 / 24-70mm f/2.8',
        exifData: JSON.stringify({ ISO: 400, shutterSpeed: '1/60', aperture: 'f/4.0', whiteBalance: 'auto' }),
        uploadedAt: rec.createdAt,
      })

      if (rec.anomalyType !== 'normal') {
        insertAnnotation.run({
          id: uuidv4(),
          recordId: rec.id,
          photoId,
          type: 'arrow',
          position: JSON.stringify({ x: 320, y: 240 }),
          content: `检测到${rec.anomalyType === 'flicker' ? '灯光闪烁' : rec.anomalyType === 'brightness_abnormal' ? '亮度异常' : '非计划时段运行'}异常区域`,
          createdBy: '系统自动标注',
          createdAt: rec.createdAt,
        })
      }

      if (rec.cabinetNo === 'C-102' || rec.cabinetNo === 'A-301' || rec.cabinetNo === 'B-301' || rec.cabinetNo.startsWith('E-5')) {
        const recData = db.prepare('SELECT judgment, originalJudgment FROM records WHERE id = ?').get(rec.id) as { judgment: string; originalJudgment: string }
        if (recData.originalJudgment && recData.originalJudgment !== recData.judgment) {
          insertHistory.run({
            id: uuidv4(),
            recordId: rec.id,
            action: 'rejudge',
            oldValue: recData.originalJudgment,
            newValue: recData.judgment,
            reason: rec.cabinetNo.startsWith('E-5') ? '数据规范问题导致重新审核' : '现场复检后修正判定',
            operatorName: rec.cabinetNo.startsWith('E-5') ? '李老师' : '王老师',
            operatorRole: 'senior_reviewer',
            timestamp: rec.createdAt,
          })
        }
      }
    }

    const firstRec = allRecords[0]
    if (firstRec) {
      const photo = db.prepare('SELECT id FROM photos WHERE recordId = ?').get(firstRec.id) as { id: string } | undefined
      insertAnnotation.run({
        id: uuidv4(),
        recordId: firstRec.id,
        photoId: photo?.id ?? null,
        type: 'rect',
        position: JSON.stringify({ x: 100, y: 150, width: 200, height: 120 }),
        content: '灯具安装位置标注',
        createdBy: '张工',
        createdAt: '2026-06-01 09:30:00',
      })
    }

    const secondRec = allRecords[1]
    if (secondRec) {
      const photo = db.prepare('SELECT id FROM photos WHERE recordId = ?').get(secondRec.id) as { id: string } | undefined
      insertAnnotation.run({
        id: uuidv4(),
        recordId: secondRec.id,
        photoId: photo?.id ?? null,
        type: 'circle',
        position: JSON.stringify({ x: 250, y: 180, radius: 50 }),
        content: '色温均匀度测量点',
        createdBy: '赵工',
        createdAt: '2026-06-01 09:40:00',
      })
    }
  })

  transaction()
}

seed()

export default db
