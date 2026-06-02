import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'

interface DiffEntry {
  lineIndex: number
  leftContent: string
  rightContent: string
  diffType: 'alias' | 'misalignment' | 'mixing'
}

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { source_version, target_version } = req.body

    if (!source_version || !target_version) {
      res.status(400).json({ success: false, error: 'source_version and target_version are required' })
      return
    }

    const sourceScores = db.prepare("SELECT * FROM source_materials WHERE type = 'score' AND version = ?").all(source_version) as Record<string, unknown>[]
    const targetScores = db.prepare("SELECT * FROM source_materials WHERE type = 'score' AND version = ?").all(target_version) as Record<string, unknown>[]

    const leftContent = sourceScores.map((s: Record<string, unknown>) => `【${String(s.title)}】\n${String(s.content)}`).join('\n\n')
    const rightContent = targetScores.map((s: Record<string, unknown>) => `【${String(s.title)}】\n${String(s.content)}`).join('\n\n')

    const diffs: DiffEntry[] = []
    let aliasCount = 0
    let misalignmentCount = 0
    let mixingCount = 0

    const sourceAliases = db.prepare('SELECT * FROM fingering_aliases WHERE version = ?').all(source_version) as Record<string, unknown>[]
    const targetAliases = db.prepare('SELECT * FROM fingering_aliases WHERE version = ?').all(target_version) as Record<string, unknown>[]

    const sourceGroups = new Map<string, Record<string, unknown>>()
    for (const a of sourceAliases) {
      sourceGroups.set(String(a.group_id), a)
    }

    for (const targetAlias of targetAliases) {
      const sourceAlias = sourceGroups.get(String(targetAlias.group_id))
      if (sourceAlias && String(sourceAlias.alias_name) !== String(targetAlias.alias_name)) {
        aliasCount++
        const leftLines = leftContent.split('\n')
        const rightLines = rightContent.split('\n')
        const targetLineIdx = rightLines.findIndex((l: string) => l.includes(String(targetAlias.alias_name)))
        const sourceLineIdx = leftLines.findIndex((l: string) => l.includes(String(sourceAlias.alias_name)))
        if (sourceLineIdx >= 0) {
          diffs.push({
            lineIndex: sourceLineIdx,
            leftContent: String(sourceAlias.alias_name),
            rightContent: String(targetAlias.alias_name),
            diffType: 'alias',
          })
        }
        if (targetLineIdx >= 0) {
          diffs.push({
            lineIndex: targetLineIdx,
            leftContent: String(sourceAlias.alias_name),
            rightContent: String(targetAlias.alias_name),
            diffType: 'alias',
          })
        }
      }
    }

    const sourceMaterials = db.prepare("SELECT * FROM source_materials WHERE type = 'score' AND version = ?").all(source_version) as Record<string, unknown>[]
    const targetMaterials = db.prepare("SELECT * FROM source_materials WHERE type = 'score' AND version = ?").all(target_version) as Record<string, unknown>[]

    for (const sMat of sourceMaterials) {
      const sMappings = db.prepare('SELECT * FROM score_annotation_mapping WHERE score_id = ? OR annotation_id = ?').all(String(sMat.id), String(sMat.id))

      for (const tMat of targetMaterials) {
        const tMappings = db.prepare('SELECT * FROM score_annotation_mapping WHERE score_id = ? OR annotation_id = ?').all(String(tMat.id), String(tMat.id))

        const sSections = new Set(sMappings.map((m: Record<string, unknown>) => String(m.report_section ?? '')))
        const tSections = new Set(tMappings.map((m: Record<string, unknown>) => String(m.report_section ?? '')))

        for (const section of sSections) {
          if (section && tSections.has(section)) {
            misalignmentCount++
            const leftLines = leftContent.split('\n')
            const leftIdx = leftLines.findIndex((l: string) => l.includes(section))
            if (leftIdx >= 0) {
              diffs.push({
                lineIndex: leftIdx,
                leftContent: section,
                rightContent: section,
                diffType: 'misalignment',
              })
            }
          }
        }
      }
    }

    const mixedNotes = db.prepare("SELECT * FROM source_materials WHERE type = 'note'").all() as Record<string, unknown>[]
    for (const note of mixedNotes) {
      const content = String(note.content ?? '')
      if (content.includes('混入') || content.includes('窜入')) {
        mixingCount++
        const leftLines = leftContent.split('\n')
        const rightLines = rightContent.split('\n')
        const mixIdx = rightLines.findIndex((l: string) => l.includes('混入') || l.includes('竄入'))
        if (mixIdx >= 0) {
          diffs.push({
            lineIndex: mixIdx,
            leftContent: '',
            rightContent: '版本混用标记',
            diffType: 'mixing',
          })
        }
      }
    }

    res.json({
      success: true,
      data: {
        leftVersion: source_version,
        rightVersion: target_version,
        leftContent,
        rightContent,
        diffs,
        summary: {
          aliasCount,
          misalignmentCount,
          mixingCount,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to compare versions' })
  }
})

export default router
