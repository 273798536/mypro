import { getDb } from "../db.js";
import type { Consignment, AppraisalRecord } from "../../shared/types.js";

export function listConsignments(): Consignment[] {
  const db = getDb();
  return db.prepare("SELECT * FROM consignments ORDER BY created_at DESC").all() as Consignment[];
}

export function getConsignmentDetail(id: string): {
  consignment: Consignment;
  appraisalRecords: AppraisalRecord[];
} | null {
  const db = getDb();
  const consignment = db.prepare("SELECT * FROM consignments WHERE id = ?").get(id) as Consignment | undefined;
  if (!consignment) return null;
  const appraisalRecords = db
    .prepare("SELECT * FROM appraisal_records WHERE consignment_id = ? ORDER BY created_at")
    .all(id) as AppraisalRecord[];
  return { consignment, appraisalRecords };
}
