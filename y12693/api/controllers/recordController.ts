import { Request, Response } from "express";
import {
  getAllRecords,
  getRecordById,
  updateRecord,
  getRecordHistory,
  importRecord,
  exportRecords,
  getTraceChain,
} from "../services/dataStore.js";
import type { RecordFilter, LightRecord } from "../../shared/types";

export function listRecords(req: Request, res: Response) {
  const filter: RecordFilter = {
    hasUnitErrors: req.query.hasUnitErrors === "true" ? true : req.query.hasUnitErrors === "false" ? false : undefined,
    hasRiskNotes: req.query.hasRiskNotes === "true" ? true : req.query.hasRiskNotes === "false" ? false : undefined,
    hasDuplicate: req.query.hasDuplicate === "true" ? true : req.query.hasDuplicate === "false" ? false : undefined,
    isTransparentOcclusionMisread: req.query.isTransparentOcclusionMisread === "true" ? true : undefined,
    status: (req.query.status as any) ?? undefined,
    batchNo: (req.query.batchNo as string) ?? undefined,
  };
  const records = getAllRecords(filter);
  res.json({ success: true, data: records });
}

export function getRecord(req: Request, res: Response) {
  const rec = getRecordById(req.params.id);
  if (!rec) {
    res.status(404).json({ success: false, error: "记录不存在" });
    return;
  }
  res.json({ success: true, data: rec });
}

export function putRecord(req: Request, res: Response) {
  const updates: Partial<LightRecord> = req.body;
  const operator = req.body.operator ?? "当前讲解员";
  const updated = updateRecord(req.params.id, updates, operator);
  if (!updated) {
    res.status(404).json({ success: false, error: "记录不存在" });
    return;
  }
  res.json({ success: true, data: updated });
}

export function listHistory(req: Request, res: Response) {
  const history = getRecordHistory(req.params.id);
  res.json({ success: true, data: history });
}

export function postImport(req: Request, res: Response) {
  const payload = req.body;
  const result = importRecord(payload);
  res.json({
    success: true,
    record: result.record,
    isDuplicate: result.isDuplicate,
    existingRecordId: result.existingId,
    message: result.isDuplicate ? "检测到重复记录，已合并到已有记录" : "导入成功",
  });
}

export function getExport(req: Request, res: Response) {
  const format = (req.query.format as "csv" | "json") ?? "json";
  const ids = req.query.ids ? (req.query.ids as string).split(",") : undefined;
  const content = exportRecords(format, ids);
  const filename = `light-records-${Date.now()}.${format}`;
  res.setHeader(
    "Content-Type",
    format === "csv" ? "text/csv; charset=utf-8" : "application/json"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(content);
}

export function getTrace(req: Request, res: Response) {
  const chain = getTraceChain(req.params.id);
  if (!chain) {
    res.status(404).json({ success: false, error: "记录不存在" });
    return;
  }
  res.json({ success: true, data: chain });
}
