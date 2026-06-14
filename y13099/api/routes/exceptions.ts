import { Router, Request, Response } from "express";
import { db } from "../db.ts";
import { Plan, STATUS_LABEL_MAP } from "../../shared/types.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

function buildPlanFromRow(row: Record<string, unknown>): Plan {
  return {
    id: String(row.id),
    corridorCode: String(row.corridor_code),
    corridorName: String(row.corridor_name),
    status: row.status as Plan["status"],
    sensorSourceSummary: String(row.sensor_source_summary),
    conclusionSummary: String(row.conclusion_summary),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function getFilterSnapshot(query: Record<string, unknown>): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const filters = ["status", "corridorCode"];
  filters.forEach((key) => {
    if (query[key]) {
      snapshot[key] = String(query[key]);
    }
  });
  return snapshot;
}

router.get("/", (req: Request, res: Response) => {
  const { status, corridorCode } = req.query;
  const conditions: string[] = ["status IN ('exception', 'supplement')"];
  const params: unknown[] = [];

  if (status && status !== "all") {
    conditions.push("status = ?");
    params.push(status);
  }
  if (corridorCode) {
    conditions.push("corridor_code LIKE ?");
    params.push(`%${corridorCode}%`);
  }

  const where = conditions.join(" AND ");
  const plans = db
    .prepare(`SELECT * FROM plan WHERE ${where} ORDER BY updated_at DESC LIMIT 50`)
    .all(...params) as Record<string, unknown>[];

  const stmtPrimarySensor = db.prepare(
    `SELECT sensor_record_id FROM timeline_node
     WHERE plan_id = ? AND sensor_record_id IS NOT NULL
     ORDER BY timestamp DESC LIMIT 1`
  );

  res.json({
    exceptions: plans.map((row) => {
      const plan = buildPlanFromRow(row);
      const sensorRow = stmtPrimarySensor.get(plan.id) as
        | { sensor_record_id: string }
        | undefined;
      if (sensorRow) {
        plan.primarySensorRecordId = sensorRow.sensor_record_id;
      }
      return plan;
    }),
    filterSnapshot: getFilterSnapshot(req.query),
  });
});

router.get("/export", (req: Request, res: Response) => {
  const { format = "json", status, corridorCode } = req.query;
  const conditions: string[] = ["status IN ('exception', 'supplement')"];
  const params: unknown[] = [];

  if (status && status !== "all") {
    conditions.push("status = ?");
    params.push(status);
  }
  if (corridorCode) {
    conditions.push("corridor_code LIKE ?");
    params.push(`%${corridorCode}%`);
  }

  const where = conditions.join(" AND ");
  const rows = db
    .prepare(`SELECT * FROM plan WHERE ${where} ORDER BY updated_at DESC`)
    .all(...params) as Record<string, unknown>[];

  const exportDir = path.resolve(__dirname, "../exports");
  fs.mkdirSync(exportDir, { recursive: true });

  const exportId = crypto.randomUUID().substring(0, 8);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `exception-queue-${timestamp}.${String(format)}`;
  const filePath = path.join(exportDir, fileName);

  const exportData = {
    exportedAt: new Date().toISOString(),
    filterSnapshot: getFilterSnapshot(req.query),
    statusEnum: STATUS_LABEL_MAP,
    records: rows.map((row) => ({
      方案ID: row.id,
      走廊编号: row.corridor_code,
      走廊名称: row.corridor_name,
      状态: STATUS_LABEL_MAP[row.status as keyof typeof STATUS_LABEL_MAP],
      状态代码: row.status,
      传感器来源: row.sensor_source_summary,
      结论摘要: row.conclusion_summary,
      创建时间: row.created_at,
      更新时间: row.updated_at,
    })),
  };

  if (format === "json") {
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), "utf-8");
  } else if (format === "csv") {
    const headers = [
      "方案ID",
      "走廊编号",
      "走廊名称",
      "状态",
      "状态代码",
      "传感器来源",
      "结论摘要",
      "创建时间",
      "更新时间",
    ];
    const csvLines = [headers.join(",")];
    exportData.records.forEach((rec) => {
      const line = headers
        .map((h) => {
          const val = String(rec[h as keyof typeof rec] ?? "");
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",");
      csvLines.push(line);
    });
    fs.writeFileSync(filePath, "\uFEFF" + csvLines.join("\n"), "utf-8");
  }

  const downloadUrl = `/api/exceptions/download/${fileName}`;

  res.json({
    downloadUrl,
    filterSnapshot: getFilterSnapshot(req.query),
    exportedAt: exportData.exportedAt,
    statusEnum: STATUS_LABEL_MAP,
  });
});

router.get("/download/:filename", (req: Request, res: Response) => {
  const { filename } = req.params;
  const exportDir = path.resolve(__dirname, "../exports");
  const filePath = path.join(exportDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.download(filePath, filename);
});

export default router;
