import { Router, Request, Response } from "express";
import { db, jsonParse, jsonStringify } from "../db.ts";
import {
  Plan,
  PlanDetail,
  TimelineNode,
  Conclusion,
  ConclusionBasis,
  ActionItem,
  RejudgeRequest,
  PlanStatus,
  WithdrawalLink,
  STATUS_LABEL_MAP,
} from "../../shared/types.ts";
import crypto from "crypto";

const router = Router();

function buildPlanFromRow(row: Record<string, unknown>): Plan {
  return {
    id: String(row.id),
    corridorCode: String(row.corridor_code),
    corridorName: String(row.corridor_name),
    status: row.status as PlanStatus,
    sensorSourceSummary: String(row.sensor_source_summary),
    conclusionSummary: String(row.conclusion_summary),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function buildTimelineNodeFromRow(row: Record<string, unknown>): TimelineNode {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    type: row.type as TimelineNode["type"],
    title: String(row.title),
    timestamp: String(row.timestamp),
    sensorRecordId: row.sensor_record_id ? String(row.sensor_record_id) : undefined,
    corridorSegmentIndex:
      row.corridor_segment_index != null
        ? Number(row.corridor_segment_index)
        : undefined,
    detail: jsonParse<Record<string, unknown>>(String(row.detail_json)),
  };
}

function getFilterSnapshot(query: Record<string, unknown>): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const filters = ["status", "corridorCode", "from", "to", "sensorType"];
  filters.forEach((key) => {
    if (query[key]) {
      snapshot[key] = String(query[key]);
    }
  });
  return snapshot;
}

router.get("/", (req: Request, res: Response) => {
  const { status, corridorCode, from, to } = req.query;
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (corridorCode) {
    conditions.push("corridor_code LIKE ?");
    params.push(`%${corridorCode}%`);
  }
  if (from) {
    conditions.push("created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("created_at <= ?");
    params.push(to);
  }

  const where = conditions.join(" AND ");
  const plans = db
    .prepare(`SELECT * FROM plan WHERE ${where} ORDER BY updated_at DESC LIMIT 50`)
    .all(...params) as Record<string, unknown>[];
  const total = db
    .prepare(`SELECT COUNT(*) as cnt FROM plan WHERE ${where}`)
    .get(...params) as { cnt: number };

  res.json({
    plans: plans.map(buildPlanFromRow),
    total: total.cnt,
    filterSnapshot: getFilterSnapshot(req.query),
  });
});

router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const planRow = db.prepare("SELECT * FROM plan WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!planRow) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const timelineRows = db
    .prepare("SELECT * FROM timeline_node WHERE plan_id = ? ORDER BY timestamp DESC")
    .all(id) as Record<string, unknown>[];

  const conclusionRow = db
    .prepare("SELECT * FROM conclusion WHERE plan_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(id) as Record<string, unknown> | undefined;

  let conclusion: Conclusion | null = null;
  if (conclusionRow) {
    const basisRows = db
      .prepare(
        `SELECT cb.*, sr.device_code as sensor_device_code, sr.timestamp as sensor_timestamp, sr.raw_reading
         FROM conclusion_basis cb
         JOIN sensor_record sr ON cb.sensor_record_id = sr.id
         WHERE cb.conclusion_id = ?`
      )
      .all(String(conclusionRow.id)) as Record<string, unknown>[];

    const actionRows = db
      .prepare("SELECT * FROM action_item WHERE plan_id = ?")
      .all(id) as Record<string, unknown>[];

    conclusion = {
      id: String(conclusionRow.id),
      planId: String(conclusionRow.plan_id),
      result: conclusionRow.result as PlanStatus,
      createdAt: String(conclusionRow.created_at),
      basis: basisRows.map((row) => ({
        id: String(row.id),
        conclusionId: String(row.conclusion_id),
        sensorRecordId: String(row.sensor_record_id),
        sensorDeviceCode: String(row.sensor_device_code),
        sensorTimestamp: String(row.sensor_timestamp),
        rawReading: Number(row.raw_reading),
        interpretation: String(row.interpretation),
      })) as ConclusionBasis[],
      actionItems: actionRows.map((row) => ({
        id: String(row.id),
        planId: String(row.plan_id),
        type: row.type as "release" | "supplement",
        description: String(row.description),
        materialRef: row.material_ref ? String(row.material_ref) : undefined,
      })) as ActionItem[],
    };
  }

  const withdrawalRow = db
    .prepare("SELECT * FROM withdrawal_link WHERE plan_id = ? LIMIT 1")
    .get(id) as Record<string, unknown> | undefined;

  let withdrawalLink: Omit<WithdrawalLink, "id"> | null = null;
  if (withdrawalRow) {
    withdrawalLink = {
      planId: String(withdrawalRow.plan_id),
      withdrawalRecordId: String(withdrawalRow.withdrawal_record_id),
      withdrawalReason: String(withdrawalRow.withdrawal_reason),
      supplementedMaterialIds: jsonParse<string[]>(
        String(withdrawalRow.supplemented_material_ids_json)
      ),
      finalConclusionId: String(withdrawalRow.final_conclusion_id),
      finalConclusionText: conclusion?.actionItems
        .filter((a) => a.type === "release")
        .map((a) => a.description)
        .join("；") || STATUS_LABEL_MAP[conclusion?.result || "pass"],
    };
  }

  const actionRows = db
    .prepare("SELECT * FROM action_item WHERE plan_id = ?")
    .all(id) as Record<string, unknown>[];

  const planDetail: PlanDetail = {
    ...buildPlanFromRow(planRow),
    timeline: timelineRows.map(buildTimelineNodeFromRow),
    withdrawalLink,
    conclusion,
    actionSummary: actionRows.map((row) => ({
      id: String(row.id),
      planId: String(row.plan_id),
      type: row.type as "release" | "supplement",
      description: String(row.description),
      materialRef: row.material_ref ? String(row.material_ref) : undefined,
    })) as ActionItem[],
  };

  res.json({ plan: planDetail });
});

router.post("/:id/rejudge", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as RejudgeRequest;

  const planRow = db.prepare("SELECT * FROM plan WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!planRow) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE plan SET status = ?, updated_at = datetime('now'), conclusion_summary = ? WHERE id = ?"
    ).run(body.newStatus, body.reason, id);

    const nodeId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO timeline_node (id, plan_id, type, title, timestamp, detail_json)
       VALUES (?, ?, 'rejudge', '方案改判', datetime('now'), ?)`
    ).run(
      nodeId,
      id,
      jsonStringify({
        operator: "方案经理-小赵",
        reason: body.reason,
        supplementedMaterials: body.supplementedMaterials,
        newStatus: STATUS_LABEL_MAP[body.newStatus],
      })
    );

    db.prepare("DELETE FROM action_item WHERE plan_id = ?").run(id);
    body.supplementedMaterials.forEach((material, idx) => {
      const actionId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO action_item (id, plan_id, type, description, material_ref)
         VALUES (?, ?, 'supplement', ?, ?)`
      ).run(
        actionId,
        id,
        material,
        `SUPP-${id.substring(0, 8)}-${String(idx + 1).padStart(2, "0")}`
      );
    });

    if (body.newStatus === "pass") {
      const actionId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO action_item (id, plan_id, type, description, material_ref)
         VALUES (?, ?, 'release', ?, ?)`
      ).run(
        actionId,
        id,
        `改判后准予放行，状态已更新为：${STATUS_LABEL_MAP[body.newStatus]}`,
        null
      );
    }

    db.prepare("DELETE FROM conclusion WHERE plan_id = ?").run(id);
    const conclusionId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO conclusion (id, plan_id, result, created_at, action_items_json)
       VALUES (?, ?, ?, datetime('now'), '[]')`
    ).run(conclusionId, id, body.newStatus);

    if (body.newStatus === "pass" && planRow.status === "withdrawn") {
      const existingWithdrawal = db
        .prepare("SELECT * FROM withdrawal_link WHERE plan_id = ?")
        .get(id);
      if (existingWithdrawal) {
        db.prepare(
          "UPDATE withdrawal_link SET final_conclusion_id = ? WHERE plan_id = ?"
        ).run(conclusionId, id);
      } else {
        const withdrawnNode = db
          .prepare(
            "SELECT id FROM timeline_node WHERE plan_id = ? AND type = 'withdrawn' ORDER BY timestamp DESC LIMIT 1"
          )
          .get(id) as { id: string } | undefined;
        if (withdrawnNode) {
          db.prepare(
            `INSERT INTO withdrawal_link (id, plan_id, withdrawal_record_id, withdrawal_reason, supplemented_material_ids_json, final_conclusion_id)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            crypto.randomUUID(),
            id,
            withdrawnNode.id,
            body.reason,
            jsonStringify(body.supplementedMaterials),
            conclusionId
          );
        }
      }
    }
  });

  tx();

  const detailRes = db
    .prepare("SELECT * FROM plan WHERE id = ?")
    .get(id) as Record<string, unknown>;
  const timelineRows = db
    .prepare("SELECT * FROM timeline_node WHERE plan_id = ? ORDER BY timestamp DESC")
    .all(id) as Record<string, unknown>[];

  res.json({
    plan: {
      ...buildPlanFromRow(detailRes),
      timeline: timelineRows.map(buildTimelineNodeFromRow),
      withdrawalLink: null,
      conclusion: null,
      actionSummary: [],
    },
  });
});

router.get("/:id/history", (req: Request, res: Response) => {
  const { id } = req.params;
  const rows = db
    .prepare("SELECT * FROM timeline_node WHERE plan_id = ? ORDER BY timestamp DESC")
    .all(id) as Record<string, unknown>[];
  res.json({
    nodes: rows.map(buildTimelineNodeFromRow),
  });
});

export default router;
