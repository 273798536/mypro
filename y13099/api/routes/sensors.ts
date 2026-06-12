import { Router, Request, Response } from "express";
import { db, jsonParse } from "../db.ts";
import { SensorRecord } from "../../shared/types.ts";

const router = Router();

function buildSensorFromRow(row: Record<string, unknown>): SensorRecord {
  return {
    id: String(row.id),
    deviceCode: String(row.device_code),
    type: String(row.type),
    timestamp: String(row.timestamp),
    rawReading: Number(row.raw_reading),
    unit: String(row.unit),
    corridorSegmentIndex: Number(row.corridor_segment_index),
    metadata: jsonParse<Record<string, unknown>>(String(row.metadata_json)),
  };
}

router.get("/", (req: Request, res: Response) => {
  const { planId, type } = req.query;
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (planId) {
    conditions.push(
      "id IN (SELECT sensor_record_id FROM timeline_node WHERE plan_id = ? AND sensor_record_id IS NOT NULL)"
    );
    params.push(planId);
  }
  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }

  const where = conditions.join(" AND ");
  const rows = db
    .prepare(`SELECT * FROM sensor_record WHERE ${where} ORDER BY timestamp DESC`)
    .all(...params) as Record<string, unknown>[];

  res.json({
    records: rows.map(buildSensorFromRow),
  });
});

router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const row = db.prepare("SELECT * FROM sensor_record WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    res.status(404).json({ error: "Sensor record not found" });
    return;
  }
  res.json({
    record: buildSensorFromRow(row),
  });
});

export default router;
