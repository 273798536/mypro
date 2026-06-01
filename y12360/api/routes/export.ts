import { Router, type Request, type Response } from "express"
import { getRecordById } from "../services/record.js"
import { generateJsonReport, generateCsvReport } from "../services/export.js"

const router = Router()

router.get("/:id", (req: Request, res: Response) => {
  try {
    const record = getRecordById(req.params.id)
    if (!record) {
      res.status(404).json({ success: false, error: "记录不存在" })
      return
    }
    const format = (req.query.format as string) || "json"

    if (format === "csv") {
      const csv = generateCsvReport([record])
      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", `attachment; filename=pump-report-${record.id}.csv`)
      res.send(csv)
      return
    }

    const json = generateJsonReport(record)
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("Content-Disposition", `attachment; filename=pump-report-${record.id}.json`)
    res.send(json)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post("/", (req: Request, res: Response) => {
  try {
    const { ids, format } = req.body
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: "请选择要导出的记录" })
      return
    }

    const records = ids.map((id: string) => getRecordById(id)).filter(Boolean)
    if (records.length === 0) {
      res.status(404).json({ success: false, error: "未找到有效记录" })
      return
    }

    if (format === "csv") {
      const csv = generateCsvReport(records)
      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", "attachment; filename=pump-report-batch.csv")
      res.send(csv)
      return
    }

    const reports = records.map(r => JSON.parse(generateJsonReport(r)))
    res.setHeader("Content-Type", "application/json; charset=utf-8")
    res.setHeader("Content-Disposition", "attachment; filename=pump-report-batch.json")
    res.send(JSON.stringify(reports, null, 2))
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
