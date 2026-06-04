import { Router, type Request, type Response } from "express";
import { getDb } from "../db.js";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const db = getDb();
  const { entityType, entityId } = req.query;

  let sql = "SELECT * FROM change_history WHERE 1=1";
  const params: unknown[] = [];

  if (entityType) {
    sql += " AND entity_type = ?";
    params.push(entityType);
  }
  if (entityId) {
    sql += " AND entity_id = ?";
    params.push(entityId);
  }

  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params);

  const history = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    beforeData: r.before_data ? JSON.parse(r.before_data as string) : null,
    afterData: r.after_data ? JSON.parse(r.after_data as string) : null,
    description: r.description,
    createdAt: r.created_at,
  }));

  res.json(history);
});

router.get("/:entityType/:entityId", (req: Request, res: Response) => {
  const db = getDb();
  const { entityType, entityId } = req.params;

  const rows = db
    .prepare("SELECT * FROM change_history WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC")
    .all(entityType, entityId);

  const history = rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    beforeData: r.before_data ? JSON.parse(r.before_data as string) : null,
    afterData: r.after_data ? JSON.parse(r.after_data as string) : null,
    description: r.description,
    createdAt: r.created_at,
  }));

  res.json(history);
});

export default router;
