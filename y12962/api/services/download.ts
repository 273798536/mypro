import { getRun, listDelayMetrics } from '../repository/runsRepo.js'
import {
  listIssues, listSchemaDiffsByRun, listIndexSuggestionsByRun,
  listPermissionsByRun, listHandlingOpinions, listReviewHistory,
} from '../repository/issuesRepo.js'
import { ISSUE_TYPE_LABEL, SEVERITY_LABEL } from '@shared/types'
import type { Issue, IssueType } from '@shared/types'

export function buildReport(runId: string): { filename: string; content: string } | null {
  const run = getRun(runId)
  if (!run) return null
  const delays = listDelayMetrics(runId)
  const issues = listIssues({ runId })
  const schemaDiffs = listSchemaDiffsByRun(runId)
  const indexSuggestions = listIndexSuggestionsByRun(runId)
  const permissions = listPermissionsByRun(runId)

  const L: string[] = []
  L.push('===========================================================')
  L.push('读写分离延迟看板 · 巡检复核报告')
  L.push('-----------------------------------------------------------')
  L.push(`运行 ID (run_id) : ${run.runId}`)
  L.push(`数据源 (source_db): ${run.sourceDb}`)
  L.push(`开始时间         : ${run.startedAt}`)
  L.push(`完成时间         : ${run.completedAt ?? '(未完成)'}`)
  L.push(`状态             : ${run.status}`)
  L.push(`延迟实例数       : ${run.delayCount}`)
  L.push(`Schema 差异数    : ${run.schemaDiffCount}`)
  L.push(`索引建议数       : ${run.indexSuggestionCount}`)
  L.push(`异常数           : ${run.issueCount}`)
  L.push('===========================================================')
  L.push('')
  L.push('【一、复制延迟 (延迟看板总览)】')
  L.push('实例                       延迟(s)  阈值(s)  采集时间')
  for (const d of delays) {
    L.push(`${pad(d.dbInstance, 26)} ${pad(String(d.delaySeconds), 8)} ${pad(String(d.thresholdSeconds), 8)} ${d.capturedAt}`)
  }
  L.push('')
  L.push('【二、Schema 对比 (与索引建议共用本批记录)】')
  if (schemaDiffs.length === 0) {
    L.push('(无)')
  } else {
    for (const s of schemaDiffs) {
      L.push(`- [${s.objectType}] ${s.objectName}`)
      L.push(`    master : ${s.masterDef ?? '-'}`)
      L.push(`    replica: ${s.replicaDef ?? '-'}`)
      L.push(`    说明   : ${s.diffSummary ?? '-'}`)
      if (s.issueId) L.push(`    关联异常: #${s.issueId}`)
    }
  }
  L.push('')
  L.push('【三、索引建议 (与 Schema 对比共用本批记录)】')
  if (indexSuggestions.length === 0) {
    L.push('(无)')
  } else {
    for (const i of indexSuggestions) {
      L.push(`- 表 ${i.tableName} 列(${i.columns}) 建议[${i.adviceType}]`)
      L.push(`    原因: ${i.reason ?? '-'}`)
      L.push(`    影响: ${i.impact ?? '-'}`)
      if (i.issueId) L.push(`    关联异常: #${i.issueId}`)
    }
  }
  L.push('')
  L.push('【四、异常清单与复核状态】')
  for (const iss of issues) {
    writeIssueBlock(L, iss)
    const opinions = listHandlingOpinions(iss.id)
    if (opinions.length > 0) {
      L.push('  └─ 处理意见:')
      for (const op of opinions) {
        L.push(`       · [${SEVERITY_LABEL[op.priority]}] ${op.opinionText}`)
        L.push(`         建议: ${op.recommendedAction} (提出人: ${op.createdBy ?? '-'})`)
      }
    }
    const history = listReviewHistory(iss.id)
    if (history.length > 0) {
      L.push('  └─ 复核历史 (谁改的/何时/为何):')
      for (const h of history) {
        L.push(`       · ${h.changedAt} ${h.reviewer} ${h.action} (${h.previousStatus ?? '-'} → ${iss.status})`)
        L.push(`         理由: ${h.reason ?? '-'}`)
      }
    } else {
      L.push('  └─ 复核历史: (暂无，待复核)')
    }
    L.push('')
  }
  L.push('【五、权限清单 (异常回溯终点)】')
  if (permissions.length === 0) {
    L.push('(无)')
  } else {
    for (const p of permissions) {
      L.push(`- ${p.dbUser}@${p.host}`)
      L.push(`    权限: ${p.privileges}`)
      L.push(`    授权人: ${p.grantedBy ?? '-'}  授权时间: ${p.grantedAt ?? '-'}`)
    }
  }
  L.push('')
  L.push('===========================================================')
  L.push('说明: 本报告与界面共用同一批 run 记录，Schema 对比与索引建议')
  L.push('      均来自 run_id 所代表的同一次采集，不会各算各的。')
  L.push(`导出时间: ${new Date().toISOString()}`)
  L.push('===========================================================')

  const content = L.join('\n')
  const safeRun = run.runId.replace(/[^a-zA-Z0-9-]/g, '')
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
  const filename = `rwsplit_report_${safeRun}_${stamp}.txt`
  return { filename, content }
}

function writeIssueBlock(L: string[], iss: Issue): void {
  const typeLabel: Record<IssueType, string> = ISSUE_TYPE_LABEL
  L.push(`[异常 #${iss.id}] ${typeLabel[iss.type]} / ${SEVERITY_LABEL[iss.severity]} / 状态=${iss.status}`)
  L.push(`  实例: ${iss.dbInstance}  库表: ${iss.schemaName ?? '-'}.${iss.tableName ?? '-'}`)
  L.push(`  详情: ${iss.detail}`)
  L.push(`  检出时间: ${iss.detectedAt}`)
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}
