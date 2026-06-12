import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS schemes (
    id TEXT PRIMARY KEY,
    scheme_no TEXT NOT NULL UNIQUE,
    bridge_tunnel_name TEXT NOT NULL,
    point_coord TEXT NOT NULL,
    scheme_type TEXT NOT NULL,
    conclusion TEXT NOT NULL DEFAULT 'pending',
    has_gap INTEGER NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    supplementary_note TEXT DEFAULT '',
    final_conclusion TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS timeline_entries (
    id TEXT PRIMARY KEY,
    scheme_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    event TEXT NOT NULL,
    is_gap INTEGER NOT NULL DEFAULT 0,
    gap_reason TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (scheme_id) REFERENCES schemes(id)
  );

  CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,
    scheme_id TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT NOT NULL,
    reason TEXT,
    operator TEXT NOT NULL,
    FOREIGN KEY (scheme_id) REFERENCES schemes(id)
  );

  CREATE INDEX IF NOT EXISTS idx_schemes_conclusion ON schemes(conclusion);
  CREATE INDEX IF NOT EXISTS idx_schemes_bridge ON schemes(bridge_tunnel_name);
  CREATE INDEX IF NOT EXISTS idx_schemes_has_gap ON schemes(has_gap);
  CREATE INDEX IF NOT EXISTS idx_timeline_scheme ON timeline_entries(scheme_id);
  CREATE INDEX IF NOT EXISTS idx_history_scheme ON history_entries(scheme_id);
`);

const countRow = db.prepare('SELECT COUNT(*) as cnt FROM schemes').get() as { cnt: number };
if (countRow.cnt === 0) {
  const seedSchemes = [
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-001', bridgeTunnelName: '青山水库大桥', pointCoord: 'K12+350', schemeType: '加固维修', conclusion: 'approved', hasGap: 0, description: '主梁裂缝加固方案，采用碳纤维布包裹加固', supplementaryNote: '', finalConclusion: '通过——方案可行，预算合理' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-002', bridgeTunnelName: '龙门隧道', pointCoord: 'K28+100', schemeType: '病害处置', conclusion: 'pending', hasGap: 1, description: '隧道渗漏水整治方案，存在检测数据缺失', supplementaryNote: '2025年11月检测报告未归档', finalConclusion: '' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-003', bridgeTunnelName: '南河特大桥', pointCoord: 'K45+080', schemeType: '定期检修', conclusion: 'rejected', hasGap: 0, description: '支座更换方案，预算超标', supplementaryNote: '', finalConclusion: '否决——预算超出30%' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-004', bridgeTunnelName: '龙门隧道', pointCoord: 'K29+500', schemeType: '加固维修', conclusion: 'revised', hasGap: 1, description: '衬砌裂缝注浆方案，原方案检测数据有缺段', supplementaryNote: '已补齐2025年8月-10月检测数据', finalConclusion: '改判通过——补充数据后方案可行' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-005', bridgeTunnelName: '青山水库大桥', pointCoord: 'K13+200', schemeType: '病害处置', conclusion: 'approved', hasGap: 0, description: '桥面铺装修复方案', supplementaryNote: '', finalConclusion: '通过——施工方案完善' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-006', bridgeTunnelName: '金沙湾大桥', pointCoord: 'K67+900', schemeType: '定期检修', conclusion: 'pending', hasGap: 1, description: '伸缩缝更换方案，冬季检测数据缺失', supplementaryNote: '2026年1月-2月低温检测数据未采集', finalConclusion: '' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-007', bridgeTunnelName: '翠屏山隧道', pointCoord: 'K82+150', schemeType: '加固维修', conclusion: 'approved', hasGap: 0, description: '仰坡防护加固方案', supplementaryNote: '', finalConclusion: '通过——防护等级满足要求' },
    { id: crypto.randomUUID(), schemeNo: 'QX-2026-008', bridgeTunnelName: '金沙湾大桥', pointCoord: 'K68+300', schemeType: '病害处置', conclusion: 'rejected', hasGap: 0, description: '主塔防腐方案，工艺不成熟', supplementaryNote: '', finalConclusion: '否决——工艺方案需进一步验证' },
  ];

  const insertScheme = db.prepare(`
    INSERT INTO schemes (id, scheme_no, bridge_tunnel_name, point_coord, scheme_type, conclusion, has_gap, description, supplementary_note, final_conclusion, created_at, updated_at)
    VALUES (@id, @schemeNo, @bridgeTunnelName, @pointCoord, @schemeType, @conclusion, @hasGap, @description, @supplementaryNote, @finalConclusion, datetime('now'), datetime('now'))
  `);

  const insertTimeline = db.prepare(`
    INSERT INTO timeline_entries (id, scheme_id, timestamp, event, is_gap, gap_reason, sort_order)
    VALUES (@id, @schemeId, @timestamp, @event, @isGap, @gapReason, @sortOrder)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO history_entries (id, scheme_id, timestamp, action, old_value, new_value, reason, operator)
    VALUES (@id, @schemeId, @timestamp, @action, @oldValue, @newValue, @reason, @operator)
  `);

  const seedData = [
    {
      timeline: [
        { timestamp: '2026-03-01 09:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-03-15 14:30', event: '初审通过', isGap: 0, gapReason: null },
        { timestamp: '2026-04-01 10:00', event: '终审通过', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'conclusion_change', oldValue: '待定', newValue: '通过', reason: '初审通过', operator: '张工' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-03-05 11:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-03-20 16:00', event: '数据检测', isGap: 0, gapReason: null },
        { timestamp: '2026-04-01 00:00', event: '检测数据缺段（2025-11 至今）', isGap: 1, gapReason: '检测设备故障，数据未上传' },
        { timestamp: '2026-05-10 09:00', event: '等待补充数据', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'note_update', oldValue: '', newValue: '2025年11月检测报告未归档', reason: '标记缺段原因', operator: '老何' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-02-20 10:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-03-10 15:00', event: '预算评审', isGap: 0, gapReason: null },
        { timestamp: '2026-03-25 11:00', event: '否决', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'conclusion_change', oldValue: '待定', newValue: '否决', reason: '预算超出30%', operator: '李主任' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-01-15 09:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-02-01 14:00', event: '初审未通过', isGap: 0, gapReason: null },
        { timestamp: '2026-02-15 00:00', event: '检测数据缺段（2025-08 至 2025-10）', isGap: 1, gapReason: '传感器校准期间数据中断' },
        { timestamp: '2026-03-20 10:00', event: '补充数据完成', isGap: 0, gapReason: null },
        { timestamp: '2026-04-05 16:00', event: '改判通过', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'conclusion_change', oldValue: '待定', newValue: '否决', reason: '初审数据不足', operator: '张工' },
        { action: 'note_update', oldValue: '', newValue: '已补齐2025年8月-10月检测数据', reason: '数据归档完成', operator: '老何' },
        { action: 'conclusion_change', oldValue: '否决', newValue: '改判', reason: '补充数据后方案可行', operator: '李主任' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-04-10 09:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-04-25 14:00', event: '审核通过', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'conclusion_change', oldValue: '待定', newValue: '通过', reason: '施工方案完善', operator: '张工' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-05-01 10:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-05-15 14:00', event: '现场勘察', isGap: 0, gapReason: null },
        { timestamp: '2026-06-01 00:00', event: '低温检测数据缺段（2026-01 至 2026-02）', isGap: 1, gapReason: '极端天气停工，数据未采集' },
        { timestamp: '2026-06-10 09:00', event: '等待补充数据', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'note_update', oldValue: '', newValue: '2026年1月-2月低温检测数据未采集', reason: '标记缺段原因', operator: '老何' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-02-10 09:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-03-05 14:00', event: '技术评审', isGap: 0, gapReason: null },
        { timestamp: '2026-03-20 11:00', event: '审核通过', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'conclusion_change', oldValue: '待定', newValue: '通过', reason: '防护等级满足要求', operator: '张工' },
      ],
    },
    {
      timeline: [
        { timestamp: '2026-04-15 10:00', event: '方案创建', isGap: 0, gapReason: null },
        { timestamp: '2026-05-05 15:00', event: '工艺评审', isGap: 0, gapReason: null },
        { timestamp: '2026-05-20 11:00', event: '否决', isGap: 0, gapReason: null },
      ],
      history: [
        { action: 'create', oldValue: null, newValue: '方案创建', reason: null, operator: '老何' },
        { action: 'conclusion_change', oldValue: '待定', newValue: '否决', reason: '工艺方案需进一步验证', operator: '李主任' },
      ],
    },
  ];

  const transaction = db.transaction(() => {
    for (let i = 0; i < seedSchemes.length; i++) {
      const s = seedSchemes[i];
      insertScheme.run(s);

      const seed = seedData[i];
      seed.timeline.forEach((t, idx) => {
        insertTimeline.run({
          id: crypto.randomUUID(),
          schemeId: s.id,
          timestamp: t.timestamp,
          event: t.event,
          isGap: t.isGap,
          gapReason: t.gapReason,
          sortOrder: idx,
        });
      });
      seed.history.forEach((h) => {
        insertHistory.run({
          id: crypto.randomUUID(),
          schemeId: s.id,
          timestamp: new Date().toISOString(),
          action: h.action,
          oldValue: h.oldValue,
          newValue: h.newValue,
          reason: h.reason,
          operator: h.operator,
        });
      });
    }
  });

  transaction();
}

export default db;
