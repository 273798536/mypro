import { Router, type Request, type Response } from "express";
import { v4 as uuid } from "uuid";
import { getDb, recordChange } from "../db.js";

const router = Router();

function mapLevelRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    gridWidth: row.grid_width,
    gridHeight: row.grid_height,
    cellSize: row.cell_size,
    snapEnabled: !!row.snap_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM levels ORDER BY created_at DESC").all();
  res.json(rows.map(mapLevelRow));
});

router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare("SELECT * FROM levels WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({
      code: "LEVEL_NOT_FOUND",
      message: "关卡不存在",
      actionableHint: "请检查关卡ID是否正确",
    });
    return;
  }
  res.json(mapLevelRow(row as Record<string, unknown>));
});

router.post("/", (req: Request, res: Response) => {
  const db = getDb();
  const id = uuid();
  const {
    name = "",
    description = "",
    status = "draft",
    gridWidth = 10,
    gridHeight = 10,
    cellSize = 40,
    snapEnabled = false,
  } = req.body;

  if (!name) {
    res.status(400).json({
      code: "MISSING_NAME",
      message: "关卡名称不能为空",
      actionableHint: "请提供name字段",
    });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO levels (id, name, description, status, grid_width, grid_height, cell_size, snap_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, description, status, gridWidth, gridHeight, cellSize, snapEnabled ? 1 : 0, now, now);

  const level = mapLevelRow(
    db.prepare("SELECT * FROM levels WHERE id = ?").get(id) as Record<string, unknown>
  );
  recordChange("level", id, "create", null, level, `创建关卡: ${name}`);

  res.status(201).json(level);
});

router.put("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM levels WHERE id = ?").get(req.params.id);
  if (!existing) {
    res.status(404).json({
      code: "LEVEL_NOT_FOUND",
      message: "关卡不存在",
      actionableHint: "请检查关卡ID是否正确",
    });
    return;
  }

  const before = mapLevelRow(existing as Record<string, unknown>);
  const {
    name = before.name,
    description = before.description,
    status = before.status,
    gridWidth = before.gridWidth,
    gridHeight = before.gridHeight,
    cellSize = before.cellSize,
    snapEnabled = before.snapEnabled,
  } = req.body;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE levels SET name=?, description=?, status=?, grid_width=?, grid_height=?, cell_size=?, snap_enabled=?, updated_at=?
     WHERE id=?`
  ).run(name, description, status, gridWidth, gridHeight, cellSize, snapEnabled ? 1 : 0, now, req.params.id);

  const after = mapLevelRow(
    db.prepare("SELECT * FROM levels WHERE id = ?").get(req.params.id) as Record<string, unknown>
  );
  recordChange("level", req.params.id, "update", before, after, `更新关卡: ${name}`);

  res.json(after);
});

router.get("/:id/violations", (req: Request, res: Response) => {
  const db = getDb();
  const levelId = req.params.id;

  const level = db.prepare("SELECT id FROM levels WHERE id = ?").get(levelId);
  if (!level) {
    res.status(404).json({
      code: "LEVEL_NOT_FOUND",
      message: "关卡不存在",
      actionableHint: "请检查关卡ID是否正确",
    });
    return;
  }

  const violations = db
    .prepare("SELECT * FROM color_violations WHERE level_id = ? ORDER BY created_at")
    .all(levelId);

  const result = violations.map((v: Record<string, unknown>) => {
    const affectedRows = db
      .prepare("SELECT conclusion_id FROM violation_affected_conclusions WHERE violation_id = ?")
      .all(v.id);
    return {
      id: v.id,
      levelId: v.level_id,
      ruleConfigId: v.rule_config_id,
      violationType: v.violation_type,
      description: v.description,
      affectedConclusionIds: affectedRows.map((r: Record<string, unknown>) => r.conclusion_id),
      status: v.status,
      createdAt: v.created_at,
    };
  });

  const conclusionIds = new Set<string>();
  for (const v of result) {
    for (const cid of v.affectedConclusionIds as string[]) {
      conclusionIds.add(cid);
    }
  }

  let affectedConclusions: unknown[] = [];
  if (conclusionIds.size > 0) {
    const placeholders = Array.from(conclusionIds).map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT * FROM conclusions WHERE id IN (${placeholders})`)
      .all(...Array.from(conclusionIds));
    affectedConclusions = rows.map((c: Record<string, unknown>) => ({
      id: c.id,
      levelId: c.level_id,
      content: c.content,
      sourceDraftIds: JSON.parse((c.source_draft_ids as string) || "[]"),
      status: c.status,
      dedupHash: c.dedup_hash,
      createdAt: c.created_at,
    }));
  }

  res.json({ violations: result, affectedConclusions });
});

router.get("/:id/conclusions", (req: Request, res: Response) => {
  const db = getDb();
  const levelId = req.params.id;

  const level = db.prepare("SELECT id FROM levels WHERE id = ?").get(levelId);
  if (!level) {
    res.status(404).json({
      code: "LEVEL_NOT_FOUND",
      message: "关卡不存在",
      actionableHint: "请检查关卡ID是否正确",
    });
    return;
  }

  const rows = db.prepare("SELECT * FROM conclusions WHERE level_id = ? ORDER BY created_at").all(levelId);
  const conclusions = rows.map((c: Record<string, unknown>) => ({
    id: c.id,
    levelId: c.level_id,
    content: c.content,
    sourceDraftIds: JSON.parse((c.source_draft_ids as string) || "[]"),
    status: c.status,
    dedupHash: c.dedup_hash,
    createdAt: c.created_at,
  }));

  res.json(conclusions);
});

router.get("/:id/drafts", (req: Request, res: Response) => {
  const db = getDb();
  const levelId = req.params.id;

  const level = db.prepare("SELECT id FROM levels WHERE id = ?").get(levelId);
  if (!level) {
    res.status(404).json({
      code: "LEVEL_NOT_FOUND",
      message: "关卡不存在",
      actionableHint: "请检查关卡ID是否正确",
    });
    return;
  }

  const rows = db.prepare("SELECT * FROM annotation_drafts WHERE level_id = ? ORDER BY created_at").all(levelId);
  const drafts = rows.map((d: Record<string, unknown>) => ({
    id: d.id,
    levelId: d.level_id,
    name: d.name,
    content: d.content,
    status: d.status,
    linkedConclusionIds: JSON.parse((d.linked_conclusion_ids as string) || "[]"),
    createdAt: d.created_at,
  }));

  res.json(drafts);
});

router.post("/:id/drafts", (req: Request, res: Response) => {
  const db = getDb();
  const levelId = req.params.id;
  const { name, content = "", status = "missing", linkedConclusionIds = [] } = req.body;

  if (!name) {
    res.status(400).json({
      code: "MISSING_NAME",
      message: "标注草稿名称不能为空",
      actionableHint: "请提供name字段",
    });
    return;
  }

  const level = db.prepare("SELECT id FROM levels WHERE id = ?").get(levelId);
  if (!level) {
    res.status(404).json({
      code: "LEVEL_NOT_FOUND",
      message: "关卡不存在",
      actionableHint: "请检查关卡ID是否正确",
    });
    return;
  }

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO annotation_drafts (id, level_id, name, content, status, linked_conclusion_ids, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, levelId, name, content, status, JSON.stringify(linkedConclusionIds), now);

  const draft = {
    id,
    levelId,
    name,
    content,
    status,
    linkedConclusionIds,
    createdAt: now,
  };

  recordChange("draft", id, "create", null, draft, `补录标注草稿: ${name}`);

  res.status(201).json(draft);
});

export default router;
