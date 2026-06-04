import { Router, type Request, type Response } from "express";
import { getDb, recordChange } from "../db.js";

const router = Router();

router.put("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const violationId = req.params.id;
  const { status, description } = req.body;

  const existing = db.prepare("SELECT * FROM color_violations WHERE id = ?").get(violationId);
  if (!existing) {
    res.status(404).json({
      code: "VIOLATION_NOT_FOUND",
      message: "违例不存在",
      actionableHint: "请检查违例ID是否正确",
    });
    return;
  }

  const before = existing as Record<string, unknown>;

  if (status === "fixed") {
    const affectedRows = db
      .prepare("SELECT conclusion_id FROM violation_affected_conclusions WHERE violation_id = ?")
      .all(violationId);
    const conclusionIds = affectedRows.map((r: Record<string, unknown>) => r.conclusion_id as string);

    if (conclusionIds.length > 0) {
      const placeholders = conclusionIds.map(() => "?").join(",");
      const conclusions = db
        .prepare(`SELECT * FROM conclusions WHERE id IN (${placeholders})`)
        .all(...conclusionIds);

      const missingDraftNames: string[] = [];
      for (const c of conclusions) {
        const row = c as Record<string, unknown>;
        const sourceDraftIds: string[] = JSON.parse((row.source_draft_ids as string) || "[]");
        if (sourceDraftIds.length === 0) {
          const linkedDrafts = db
            .prepare("SELECT * FROM annotation_drafts WHERE linked_conclusion_ids LIKE ?")
            .all(`%"${row.id}"%`);
          if (linkedDrafts.length === 0) {
            missingDraftNames.push(`结论 "${row.content}" 缺少标注草稿`);
          }
        }
      }

      if (missingDraftNames.length > 0) {
        res.status(400).json({
          code: "MISSING_DRAFTS",
          message: "关联的标注草稿缺失，无法修正违例",
          actionableHint: "请先为关联结论补录标注草稿",
          missingDraftNames,
        });
        return;
      }
    }
  }

  const newStatus = status ?? before.status;
  const newDescription = description ?? before.description;

  db.prepare("UPDATE color_violations SET status=?, description=? WHERE id=?").run(
    newStatus,
    newDescription,
    violationId
  );

  const after = db.prepare("SELECT * FROM color_violations WHERE id = ?").get(violationId) as Record<string, unknown>;

  const afterData = {
    id: after.id,
    levelId: after.level_id,
    ruleConfigId: after.rule_config_id,
    violationType: after.violation_type,
    description: after.description,
    status: after.status,
    createdAt: after.created_at,
  };
  const beforeData = {
    id: before.id,
    levelId: before.level_id,
    ruleConfigId: before.rule_config_id,
    violationType: before.violation_type,
    description: before.description,
    status: before.status,
    createdAt: before.created_at,
  };

  recordChange("violation", violationId, "update", beforeData, afterData, `修正违例: 状态从 ${before.status} 变为 ${newStatus}`);

  res.json(afterData);
});

router.post("/check-dedup", (req: Request, res: Response) => {
  const db = getDb();
  const { levelId } = req.body;

  if (!levelId) {
    res.status(400).json({
      code: "MISSING_LEVEL_ID",
      message: "缺少关卡ID",
      actionableHint: "请提供levelId参数",
    });
    return;
  }

  const rows = db
    .prepare("SELECT * FROM conclusions WHERE level_id = ? ORDER BY created_at")
    .all(levelId);

  const hashGroups = new Map<string, Array<Record<string, unknown>>>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const hash = r.dedup_hash as string;
    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash)!.push(r);
  }

  const groups: Array<{
    canonicalId: string;
    duplicateIds: string[];
    content: string;
  }> = [];

  for (const [, rows] of hashGroups) {
    if (rows.length > 1) {
      groups.push({
        canonicalId: rows[0].id as string,
        duplicateIds: rows.slice(1).map((r) => r.id as string),
        content: rows[0].content as string,
      });
    }
  }

  res.json({
    hasDuplicates: groups.length > 0,
    groups,
  });
});

router.post("/merge", (req: Request, res: Response) => {
  const db = getDb();
  const { canonicalId, duplicateIds } = req.body;

  if (!canonicalId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
    res.status(400).json({
      code: "INVALID_MERGE_PARAMS",
      message: "合并参数无效",
      actionableHint: "请提供canonicalId和duplicateIds数组",
    });
    return;
  }

  const canonical = db.prepare("SELECT * FROM conclusions WHERE id = ?").get(canonicalId);
  if (!canonical) {
    res.status(404).json({
      code: "CONCLUSION_NOT_FOUND",
      message: "目标结论不存在",
      actionableHint: "请检查canonicalId是否正确",
    });
    return;
  }

  const canonicalRow = canonical as Record<string, unknown>;
  const canonicalSourceDraftIds: string[] = JSON.parse((canonicalRow.source_draft_ids as string) || "[]");

  const mergedDraftIds = new Set(canonicalSourceDraftIds);
  const mergedDescriptions: string[] = [];

  for (const dupId of duplicateIds) {
    const dup = db.prepare("SELECT * FROM conclusions WHERE id = ?").get(dupId);
    if (!dup) continue;

    const dupRow = dup as Record<string, unknown>;
    const dupSourceDraftIds: string[] = JSON.parse((dupRow.source_draft_ids as string) || "[]");

    for (const draftId of dupSourceDraftIds) {
      mergedDraftIds.add(draftId);
    }

    mergedDescriptions.push(`合并结论 ${dupId}: ${dupRow.content}`);

    const dupDrafts = db
      .prepare("SELECT * FROM annotation_drafts WHERE linked_conclusion_ids LIKE ?")
      .all(`%"${dupId}"%`);

    for (const d of dupDrafts) {
      const draftRow = d as Record<string, unknown>;
      const linkedIds: string[] = JSON.parse((draftRow.linked_conclusion_ids as string) || "[]");
      const updated = linkedIds.map((id) => (id === dupId ? canonicalId : id));
      if (!updated.includes(canonicalId)) {
        updated.push(canonicalId);
      }
      db.prepare("UPDATE annotation_drafts SET linked_conclusion_ids=? WHERE id=?").run(
        JSON.stringify(updated),
        draftRow.id
      );
    }

    db.prepare("DELETE FROM violation_affected_conclusions WHERE conclusion_id=?").run(dupId);
    db.prepare("DELETE FROM conclusions WHERE id=?").run(dupId);

    recordChange(
      "conclusion",
      dupId,
      "delete",
      { id: dupId, content: dupRow.content, status: dupRow.status },
      null,
      `合并删除重复结论: ${dupRow.content}`
    );
  }

  const beforeCanonical = {
    id: canonicalRow.id,
    content: canonicalRow.content,
    sourceDraftIds: canonicalSourceDraftIds,
    status: canonicalRow.status,
  };

  db.prepare("UPDATE conclusions SET source_draft_ids=? WHERE id=?").run(
    JSON.stringify(Array.from(mergedDraftIds)),
    canonicalId
  );

  const afterCanonical = db.prepare("SELECT * FROM conclusions WHERE id = ?").get(canonicalId) as Record<string, unknown>;

  recordChange(
    "conclusion",
    canonicalId,
    "merge",
    beforeCanonical,
    {
      id: afterCanonical.id,
      content: afterCanonical.content,
      sourceDraftIds: JSON.parse((afterCanonical.source_draft_ids as string) || "[]"),
      status: afterCanonical.status,
    },
    `合并重复结论到 ${canonicalId}: ${mergedDescriptions.join("; ")}`
  );

  res.json({
    id: afterCanonical.id,
    levelId: afterCanonical.level_id,
    content: afterCanonical.content,
    sourceDraftIds: JSON.parse((afterCanonical.source_draft_ids as string) || "[]"),
    status: afterCanonical.status,
    dedupHash: afterCanonical.dedup_hash,
    createdAt: afterCanonical.created_at,
  });
});

export default router;
