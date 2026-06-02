import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { include_mapping, include_diff } = req.body

    const scores = db.prepare("SELECT * FROM source_materials WHERE type = 'score' ORDER BY created_at").all() as Record<string, unknown>[]
    const allMappings = db.prepare('SELECT * FROM score_annotation_mapping').all() as Record<string, unknown>[]
    const aliasGroups = db.prepare('SELECT group_id, standard_name, GROUP_CONCAT(alias_name) as aliases FROM fingering_aliases GROUP BY group_id').all() as Record<string, unknown>[]

    let report = `古琴指法谱系检索报告\n生成时间：${new Date().toISOString()}\n${'='.repeat(40)}\n\n`

    report += `一、曲谱清单（共${scores.length}种）\n\n`
    for (const s of scores) {
      report += `  · ${String(s.title)} [${String(s.version)}] — 来源：${String(s.source_file)}\n`
    }

    if (include_mapping !== false) {
      report += `\n二、对应关系映射\n\n`
      const materials = db.prepare('SELECT * FROM source_materials').all() as Record<string, unknown>[]
      const matMap = new Map(materials.map((m: Record<string, unknown>) => [String(m.id), m]))

      for (const mapping of allMappings) {
        const score = matMap.get(String(mapping.score_id))
        const annotation = matMap.get(String(mapping.annotation_id))
        if (score && annotation) {
          report += `  ${String(score.title)} ↔ ${String(annotation.title)} → ${String(mapping.report_section ?? '未分类')}\n`
        }
      }
    }

    report += `\n三、指法异名摘要\n\n`
    for (const group of aliasGroups) {
      report += `  标准名：${String(group.standard_name)}  异名：${String(group.aliases ?? '').replace(/,/g, '、')}\n`
    }

    let diffSnapshots: Record<string, unknown>[] = []
    if (include_diff) {
      diffSnapshots = db.prepare(`
        SELECT * FROM change_snapshots
        ORDER BY created_at DESC
      `).all() as Record<string, unknown>[]

      if (diffSnapshots.length > 0) {
        report += `\n四、变更记录\n\n`
        for (const snap of diffSnapshots) {
          report += `  [${String(snap.created_at)}] ${String(snap.entity_type)}.${String(snap.field)}: "${String(snap.old_value)}" → "${String(snap.new_value)}" ${snap.reason ? '(' + String(snap.reason) + ')' : ''}\n`
        }
      }
    }

    const mappingEntries = allMappings.map((m: Record<string, unknown>) => {
      const materials = db.prepare('SELECT * FROM source_materials').all() as Record<string, unknown>[]
      const matMap = new Map(materials.map((mat: Record<string, unknown>) => [String(mat.id), mat]))
      const score = matMap.get(String(m.score_id))
      const annotation = matMap.get(String(m.annotation_id))
      return {
        score: score ? String(score.title) : String(m.score_id),
        annotation: annotation ? String(annotation.title) : String(m.annotation_id),
        report: String(m.report_section ?? ''),
      }
    })

    res.json({
      success: true,
      data: {
        report,
        mappings: mappingEntries,
        diffSnapshots,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate report' })
  }
})

export default router
