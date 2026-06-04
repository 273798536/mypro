import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "../data.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS levels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'confirmed')),
      grid_width INTEGER NOT NULL DEFAULT 10,
      grid_height INTEGER NOT NULL DEFAULT 10,
      cell_size INTEGER NOT NULL DEFAULT 40,
      snap_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rule_configs (
      id TEXT PRIMARY KEY,
      level_id TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      color_range_min TEXT NOT NULL,
      color_range_max TEXT NOT NULL,
      color_range_name TEXT NOT NULL,
      parameters TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS color_violations (
      id TEXT PRIMARY KEY,
      level_id TEXT NOT NULL,
      rule_config_id TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'fixed', 'suppressed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE,
      FOREIGN KEY (rule_config_id) REFERENCES rule_configs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conclusions (
      id TEXT PRIMARY KEY,
      level_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source_draft_ids TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'rejected')),
      dedup_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS annotation_drafts (
      id TEXT PRIMARY KEY,
      level_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'missing' CHECK(status IN ('missing', 'partial', 'complete')),
      linked_conclusion_ids TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS violation_affected_conclusions (
      violation_id TEXT NOT NULL,
      conclusion_id TEXT NOT NULL,
      PRIMARY KEY (violation_id, conclusion_id),
      FOREIGN KEY (violation_id) REFERENCES color_violations(id) ON DELETE CASCADE,
      FOREIGN KEY (conclusion_id) REFERENCES conclusions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS change_history (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('level', 'violation', 'conclusion', 'draft')),
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'merge')),
      before_data TEXT,
      after_data TEXT,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_levels_status ON levels(status);
    CREATE INDEX IF NOT EXISTS idx_violations_level ON color_violations(level_id);
    CREATE INDEX IF NOT EXISTS idx_violations_status ON color_violations(status);
    CREATE INDEX IF NOT EXISTS idx_conclusions_level ON conclusions(level_id);
    CREATE INDEX IF NOT EXISTS idx_conclusions_dedup ON conclusions(dedup_hash);
    CREATE INDEX IF NOT EXISTS idx_drafts_level ON annotation_drafts(level_id);
    CREATE INDEX IF NOT EXISTS idx_history_entity ON change_history(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_history_created ON change_history(created_at);
  `);
}

export function recordChange(
  entityType: "level" | "violation" | "conclusion" | "draft",
  entityId: string,
  action: "create" | "update" | "delete" | "merge",
  beforeData: Record<string, unknown> | null,
  afterData: Record<string, unknown> | null,
  description: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO change_history (id, entity_type, entity_id, action, before_data, after_data, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuid(),
    entityType,
    entityId,
    action,
    beforeData ? JSON.stringify(beforeData) : null,
    afterData ? JSON.stringify(afterData) : null,
    description
  );
}

export function seedData(): void {
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as cnt FROM levels").get() as { cnt: number };
  if (count.cnt > 0) return;

  const now = new Date().toISOString();

  const insertLevel = db.prepare(`
    INSERT INTO levels (id, name, description, status, grid_width, grid_height, cell_size, snap_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRule = db.prepare(`
    INSERT INTO rule_configs (id, level_id, rule_type, color_range_min, color_range_max, color_range_name, parameters)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertViolation = db.prepare(`
    INSERT INTO color_violations (id, level_id, rule_config_id, violation_type, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertConclusion = db.prepare(`
    INSERT INTO conclusions (id, level_id, content, source_draft_ids, status, dedup_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDraft = db.prepare(`
    INSERT INTO annotation_drafts (id, level_id, name, content, status, linked_conclusion_ids, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAffected = db.prepare(`
    INSERT INTO violation_affected_conclusions (violation_id, conclusion_id)
    VALUES (?, ?)
  `);

  const seed = db.transaction(() => {
    const level1Id = uuid();
    const level2Id = uuid();
    const level3Id = uuid();

    insertLevel.run(level1Id, "入门关卡-色彩基础", "学习基本颜色范围识别", "confirmed", 10, 10, 40, 1, now, now);
    insertLevel.run(level2Id, "进阶关卡-色调辨析", "区分相似色调的细微差异", "review", 12, 12, 35, 1, now, now);
    insertLevel.run(level3Id, "高级关卡-综合检测", "复杂场景下的颜色越界综合分析", "draft", 15, 15, 30, 0, now, now);

    const rule1Id = uuid();
    const rule2Id = uuid();
    const rule3Id = uuid();
    const rule4Id = uuid();

    insertRule.run(rule1Id, level1Id, "color_range", "[0,0,0]", "[255,100,100]", "暖红色区", '{"tolerance": 5}');
    insertRule.run(rule2Id, level1Id, "color_range", "[0,100,0]", "[100,255,100]", "绿色区", '{"tolerance": 3}');
    insertRule.run(rule3Id, level2Id, "color_range", "[200,150,0]", "[255,200,50]", "金色区", '{"tolerance": 2}');
    insertRule.run(rule4Id, level3Id, "color_range", "[0,0,200]", "[50,50,255]", "深蓝区", '{"tolerance": 4}');

    const v1Id = uuid();
    const v2Id = uuid();
    const v3Id = uuid();
    const v4Id = uuid();
    const v5Id = uuid();

    insertViolation.run(v1Id, level1Id, rule1Id, "out_of_range", "像素(3,5)的RGB值超出暖红色区上限", "open", now);
    insertViolation.run(v2Id, level1Id, rule2Id, "out_of_range", "像素(7,2)的RGB值低于绿色区下限", "fixed", now);
    insertViolation.run(v3Id, level2Id, rule3Id, "threshold_exceeded", "金色区容差超标2倍", "open", now);
    insertViolation.run(v4Id, level3Id, rule4Id, "out_of_range", "区域(10-12,8-10)超出深蓝区范围", "open", now);
    insertViolation.run(v5Id, level3Id, rule4Id, "threshold_exceeded", "深蓝区边界像素容差超标", "suppressed", now);

    const c1Id = uuid();
    const c2Id = uuid();
    const c3Id = uuid();
    const c4Id = uuid();
    const c5Id = uuid();
    const c6Id = uuid();
    const c7Id = uuid();
    const c8Id = uuid();
    const c9Id = uuid();

    const dedupHash1 = "dedup_lvl1_warm_red";
    const dedupHash2 = "dedup_lvl1_green";
    const dedupHash3 = "dedup_lvl2_gold";
    const dedupHash4 = "dedup_lvl3_blue";
    const dedupHash5 = "dedup_lvl3_blue_boundary";

    insertConclusion.run(c1Id, level1Id, "暖红色区存在越界像素", JSON.stringify([]), "confirmed", dedupHash1, now);
    insertConclusion.run(c2Id, level1Id, "暖红色区边界存在超标", JSON.stringify([]), "pending", dedupHash1, now);
    insertConclusion.run(c3Id, level1Id, "绿色区像素值偏低", JSON.stringify([]), "confirmed", dedupHash2, now);
    insertConclusion.run(c4Id, level2Id, "金色区容差超标", JSON.stringify([]), "pending", dedupHash3, now);
    insertConclusion.run(c5Id, level2Id, "金色区需重新标定", JSON.stringify([]), "pending", dedupHash3, now);
    insertConclusion.run(c6Id, level3Id, "深蓝区存在大面积越界", JSON.stringify([]), "pending", dedupHash4, now);
    insertConclusion.run(c7Id, level3Id, "深蓝区边界需复查", JSON.stringify([]), "pending", dedupHash5, now);
    insertConclusion.run(c8Id, level3Id, "深蓝区越界区域(10-12,8-10)需要修正", JSON.stringify([]), "pending", dedupHash4, now);
    insertConclusion.run(c9Id, level3Id, "深蓝区边界容差超标", JSON.stringify([]), "rejected", dedupHash5, now);

    insertAffected.run(v1Id, c1Id);
    insertAffected.run(v1Id, c2Id);
    insertAffected.run(v2Id, c3Id);
    insertAffected.run(v3Id, c4Id);
    insertAffected.run(v3Id, c5Id);
    insertAffected.run(v4Id, c6Id);
    insertAffected.run(v4Id, c8Id);
    insertAffected.run(v5Id, c7Id);
    insertAffected.run(v5Id, c9Id);

    const d1Id = uuid();
    const d2Id = uuid();
    const d3Id = uuid();
    const d4Id = uuid();
    const d5Id = uuid();
    const d6Id = uuid();
    const d7Id = uuid();

    insertDraft.run(d1Id, level1Id, "暖红色区标注", "标注暖红色区越界像素位置", "complete", JSON.stringify([c1Id, c2Id]), now);
    insertDraft.run(d2Id, level1Id, "绿色区标注", "标注绿色区偏差像素", "complete", JSON.stringify([c3Id]), now);
    insertDraft.run(d3Id, level2Id, "金色区标注", "待补充金色区容差分析", "partial", JSON.stringify([c4Id]), now);
    insertDraft.run(d4Id, level2Id, "金色区重新标定说明", "需要详细标定流程", "missing", JSON.stringify([c5Id]), now);
    insertDraft.run(d5Id, level3Id, "深蓝区标注", "标注深蓝区越界区域", "partial", JSON.stringify([c6Id, c8Id]), now);
    insertDraft.run(d6Id, level3Id, "深蓝区边界标注", "边界复查标注", "missing", JSON.stringify([c7Id]), now);
    insertDraft.run(d7Id, level3Id, "深蓝区容差标注", "", "missing", JSON.stringify([c9Id]), now);

    recordChange("level", level1Id, "create", null, { name: "入门关卡-色彩基础" }, "种子数据：创建入门关卡");
    recordChange("level", level2Id, "create", null, { name: "进阶关卡-色调辨析" }, "种子数据：创建进阶关卡");
    recordChange("level", level3Id, "create", null, { name: "高级关卡-综合检测" }, "种子数据：创建高级关卡");
  });

  seed();
}
