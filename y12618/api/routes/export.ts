import { Router, type Request, type Response } from "express";
import { getDb } from "../db.js";

const router = Router();

interface ExportLevel {
  id: string;
  name: string;
  description: string;
  status: string;
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  snapEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExportViolation {
  id: string;
  levelId: string;
  ruleConfigId: string;
  violationType: string;
  description: string;
  affectedConclusionIds: string[];
  status: string;
  createdAt: string;
}

interface ExportConclusion {
  id: string;
  levelId: string;
  content: string;
  sourceDraftIds: string[];
  status: string;
  dedupHash: string;
  createdAt: string;
}

interface ExportDraft {
  id: string;
  levelId: string;
  name: string;
  content: string;
  status: string;
  linkedConclusionIds: string[];
  createdAt: string;
}

function mapLevelRow(row: Record<string, unknown>): ExportLevel {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    status: row.status as string,
    gridWidth: row.grid_width as number,
    gridHeight: row.grid_height as number,
    cellSize: row.cell_size as number,
    snapEnabled: !!row.snap_enabled,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function buildExportData(levelIds: string[]) {
  const db = getDb();
  const placeholders = levelIds.map(() => "?").join(",");

  const levels = db
    .prepare(`SELECT * FROM levels WHERE id IN (${placeholders})`)
    .all(...levelIds)
    .map((r: Record<string, unknown>) => mapLevelRow(r));

  const ruleConfigs = db
    .prepare(`SELECT * FROM rule_configs WHERE level_id IN (${placeholders})`)
    .all(...levelIds)
    .map((r: Record<string, unknown>) => ({
      id: r.id as string,
      levelId: r.level_id as string,
      ruleType: r.rule_type as string,
      colorRangeMin: r.color_range_min as string,
      colorRangeMax: r.color_range_max as string,
      colorRangeName: r.color_range_name as string,
      parameters: JSON.parse((r.parameters as string) || "{}"),
      createdAt: r.created_at as string,
    }));

  const violations: ExportViolation[] = db
    .prepare(`SELECT * FROM color_violations WHERE level_id IN (${placeholders})`)
    .all(...levelIds)
    .map((v: Record<string, unknown>) => {
      const affectedRows = db
        .prepare("SELECT conclusion_id FROM violation_affected_conclusions WHERE violation_id = ?")
        .all(v.id);
      return {
        id: v.id as string,
        levelId: v.level_id as string,
        ruleConfigId: v.rule_config_id as string,
        violationType: v.violation_type as string,
        description: v.description as string,
        affectedConclusionIds: affectedRows.map((r: Record<string, unknown>) => r.conclusion_id as string),
        status: v.status as string,
        createdAt: v.created_at as string,
      };
    });

  const conclusions: ExportConclusion[] = db
    .prepare(`SELECT * FROM conclusions WHERE level_id IN (${placeholders})`)
    .all(...levelIds)
    .map((c: Record<string, unknown>) => ({
      id: c.id as string,
      levelId: c.level_id as string,
      content: c.content as string,
      sourceDraftIds: JSON.parse((c.source_draft_ids as string) || "[]") as string[],
      status: c.status as string,
      dedupHash: c.dedup_hash as string,
      createdAt: c.created_at as string,
    }));

  const drafts: ExportDraft[] = db
    .prepare(`SELECT * FROM annotation_drafts WHERE level_id IN (${placeholders})`)
    .all(...levelIds)
    .map((d: Record<string, unknown>) => ({
      id: d.id as string,
      levelId: d.level_id as string,
      name: d.name as string,
      content: d.content as string,
      status: d.status as string,
      linkedConclusionIds: JSON.parse((d.linked_conclusion_ids as string) || "[]") as string[],
      createdAt: d.created_at as string,
    }));

  return { levels, ruleConfigs, violations, conclusions, drafts };
}

router.post("/", (req: Request, res: Response) => {
  const { levelIds, format = "json", includeHistory = false } = req.body;

  if (!Array.isArray(levelIds) || levelIds.length === 0) {
    res.status(400).json({
      code: "MISSING_LEVEL_IDS",
      message: "缺少关卡ID列表",
      actionableHint: "请提供levelIds数组",
    });
    return;
  }

  const data = buildExportData(levelIds);

  if (includeHistory) {
    const db = getDb();
    const conclusionIds = data.conclusions.map((c) => c.id);
    const violationIds = data.violations.map((v) => v.id);
    const draftIds = data.drafts.map((d) => d.id);

    const allEntityIds = [...levelIds, ...violationIds, ...conclusionIds, ...draftIds];
    let history: unknown[] = [];
    if (allEntityIds.length > 0) {
      const histPlaceholders = allEntityIds.map(() => "?").join(",");
      const histRows = db
        .prepare(`SELECT * FROM change_history WHERE entity_id IN (${histPlaceholders}) ORDER BY created_at DESC`)
        .all(...allEntityIds);
      history = histRows.map((r: Record<string, unknown>) => ({
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        action: r.action,
        beforeData: r.before_data ? JSON.parse(r.before_data as string) : null,
        afterData: r.after_data ? JSON.parse(r.after_data as string) : null,
        description: r.description,
        createdAt: r.created_at,
      }));
    }
    (data as Record<string, unknown>).history = history;
  }

  if (format === "csv") {
    const lines: string[] = [];
    for (const level of data.levels) {
      lines.push(`Level: ${level.name}`);
      lines.push(`Status: ${level.status}`);
      lines.push(`Grid: ${level.gridWidth}x${level.gridHeight}, Cell: ${level.cellSize}, Snap: ${level.snapEnabled}`);
      lines.push("");
      const levelConclusions = data.conclusions.filter((c) => c.levelId === level.id);
      if (levelConclusions.length > 0) {
        lines.push("Conclusions:");
        for (const c of levelConclusions) {
          lines.push(`  - [${c.status}] ${c.content}`);
        }
        lines.push("");
      }
      const levelViolations = data.violations.filter((v) => v.levelId === level.id);
      if (levelViolations.length > 0) {
        lines.push("Violations:");
        for (const v of levelViolations) {
          lines.push(`  - [${v.status}] ${v.description}`);
        }
        lines.push("");
      }
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=export.csv");
    res.send(lines.join("\n"));
    return;
  }

  res.json(data);
});

router.post("/consistency", (req: Request, res: Response) => {
  const { levelIds } = req.body;

  if (!Array.isArray(levelIds) || levelIds.length === 0) {
    res.status(400).json({
      code: "MISSING_LEVEL_IDS",
      message: "缺少关卡ID列表",
      actionableHint: "请提供levelIds数组",
    });
    return;
  }

  const db = getDb();
  const placeholders = levelIds.map(() => "?").join(",");

  const conclusions = db
    .prepare(`SELECT * FROM conclusions WHERE level_id IN (${placeholders})`)
    .all(...levelIds);

  const differences: Array<{
    field: string;
    uiValue: string;
    exportValue: string;
    conclusionId: string;
  }> = [];

  for (const c of conclusions) {
    const row = c as Record<string, unknown>;
    const conclusionId = row.id as string;
    const dbStatus = row.status as string;

    const violationRows = db
      .prepare(
        `SELECT cv.status, cv.id FROM color_violations cv
         JOIN violation_affected_conclusions vac ON cv.id = vac.violation_id
         WHERE vac.conclusion_id = ?`
      )
      .all(conclusionId);

    let expectedStatus = dbStatus;
    if (violationRows.length > 0) {
      const allFixed = violationRows.every((v: Record<string, unknown>) => v.status === "fixed");
      const anyOpen = violationRows.some(
        (v: Record<string, unknown>) => v.status === "open"
      );
      const anySuppressed = violationRows.every(
        (v: Record<string, unknown>) => v.status === "suppressed" || v.status === "fixed"
      );

      if (allFixed && dbStatus !== "confirmed") {
        expectedStatus = "confirmed";
      } else if (anyOpen && dbStatus === "confirmed") {
        expectedStatus = "pending";
      } else if (anySuppressed && dbStatus === "pending") {
        expectedStatus = "rejected";
      }
    }

    if (expectedStatus !== dbStatus) {
      differences.push({
        field: "status",
        uiValue: expectedStatus,
        exportValue: dbStatus,
        conclusionId,
      });
    }
  }

  res.json({
    isConsistent: differences.length === 0,
    differences,
  });
});

export default router;
