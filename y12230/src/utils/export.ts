import * as XLSX from 'xlsx'
import type {
  ProjectLedger,
  ExpenseAggregation,
  ValidationAlert,
} from '@/types'

export function exportAggregationReport(
  projects: ProjectLedger[],
  aggregations: ExpenseAggregation[],
  alerts: ValidationAlert[]
) {
  const wb = XLSX.utils.book_new()

  const summaryData = projects.map((p) => {
    const agg = aggregations.find((a) => a.projectId === p.id)
    return {
      '项目编号': p.code,
      '项目名称': p.name,
      '状态': p.status === 'active' ? '进行中' : '已结束',
      '预算': p.budget,
      '人工费': agg?.laborCost || 0,
      '材料费': agg?.materialCost || 0,
      '其他费用': agg?.otherCost || 0,
      '合计': agg?.totalCost || 0,
      '预算余额': p.budget - (agg?.totalCost || 0),
    }
  })
  const ws1 = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, ws1, '费用归集汇总')

  const alertData = alerts.map((a) => ({
    '异常类型': a.type === 'cross_project' ? '项目串账' : a.type === 'retroactive_entry' ? '工时补录' : '发票缺项',
    '严重程度': a.severity === 'error' ? '错误' : '警告',
    '描述': a.message,
    '影响项目': a.affectedProjectIds.join(', '),
    '说明': a.explanation || '未填写',
    '是否已处理': a.resolved ? '是' : '否',
  }))
  const ws2 = XLSX.utils.json_to_sheet(alertData)
  XLSX.utils.book_append_sheet(wb, ws2, '口径校验报告')

  XLSX.writeFile(wb, `研发费用加计归集_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
