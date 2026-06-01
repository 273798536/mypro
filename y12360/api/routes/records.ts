import { Router, type Request, type Response } from "express"
import { createRecord, updateRecord, getRecordById, getRecords, advanceStatus, deleteRecord } from "../services/record.js"
import { compareRecords } from "../services/record.js"
import type { CalculateRequest, RecordFilter, RecordStatus } from "../../shared/types.js"

const router = Router()

router.post("/calculate", (req: Request, res: Response) => {
  try {
    const body = req.body as CalculateRequest
    if (!body.ratedSpeed || !body.targetSpeed) {
      res.status(400).json({ success: false, error: "缺少必需参数：ratedSpeed, targetSpeed" })
      return
    }
    const record = createRecord(body)
    res.status(201).json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get("/records", (req: Request, res: Response) => {
  try {
    const filter: RecordFilter = {
      status: req.query.status as RecordStatus | undefined,
      source: req.query.source as string | undefined,
      keyword: req.query.keyword as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
    }
    const result = getRecords(filter)
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get("/records/:id", (req: Request, res: Response) => {
  try {
    const record = getRecordById(req.params.id)
    if (!record) {
      res.status(404).json({ success: false, error: "记录不存在" })
      return
    }
    res.json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.put("/records/:id", (req: Request, res: Response) => {
  try {
    const body = req.body as CalculateRequest
    const record = updateRecord(req.params.id, body)
    if (!record) {
      res.status(404).json({ success: false, error: "记录不存在" })
      return
    }
    res.json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.patch("/records/:id/status", (req: Request, res: Response) => {
  try {
    const { status, operator, comment } = req.body
    if (!status || !operator) {
      res.status(400).json({ success: false, error: "缺少必需参数：status, operator" })
      return
    }
    const record = advanceStatus(req.params.id, status as RecordStatus, operator, comment)
    if (!record) {
      res.status(404).json({ success: false, error: "记录不存在" })
      return
    }
    res.json({ success: true, data: record })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete("/records/:id", (req: Request, res: Response) => {
  try {
    const ok = deleteRecord(req.params.id)
    if (!ok) {
      res.status(404).json({ success: false, error: "记录不存在" })
      return
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post("/compare", (req: Request, res: Response) => {
  try {
    const { recordIds, name } = req.body
    if (!recordIds || !Array.isArray(recordIds) || recordIds.length < 2) {
      res.status(400).json({ success: false, error: "至少需要2条记录进行对比" })
      return
    }
    const result = compareRecords(recordIds, name || "方案对比")
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
