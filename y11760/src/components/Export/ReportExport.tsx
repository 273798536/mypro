import { Download, FileText, Loader2 } from 'lucide-react'
import { useState, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useGraphStore } from '../../stores/graphStore'
import { useRiskStore } from '../../stores/riskStore'
import { enterprises, persons, guaranteeContracts, riskLabels, loanBalances, riskScores, investigationReports } from '../../data/mockData'
import { getScoreLevel, getScoreColor } from '../../engines/scoreEngine'

function generateTextReport(): string {
  const { nodes, edges, filters, visibleNodeIds, visibleEdgeIds } = useGraphStore.getState()
  const { alerts } = useRiskStore.getState()

  const visibleNodes = nodes.filter((n) => visibleNodeIds.has(n.id))
  const visibleEdges = edges.filter((e) => visibleEdgeIds.has(e.id))

  const lines: string[] = []
  lines.push('='.repeat(80))
  lines.push('融资担保关系沙盘 - 风险分析报告')
  lines.push('='.repeat(80))
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`)
  lines.push('')

  lines.push('【筛选条件】')
  if (filters.searchQuery) lines.push(`- 搜索关键词：${filters.searchQuery}`)
  lines.push(`- 风险等级：${filters.riskLevels.join('、') || '全部'}`)
  if (filters.industries.length > 0) lines.push(`- 行业：${filters.industries.join('、')}`)
  if (filters.guaranteeTypes.length > 0) lines.push(`- 担保类型：${filters.guaranteeTypes.join('、')}`)
  lines.push('')

  lines.push(`【概览统计】`)
  lines.push(`- 节点总数：${visibleNodes.length}`)
  lines.push(`- 担保合同数：${visibleEdges.length}`)
  lines.push(`- 风险预警数：${alerts.length}`)
  lines.push(`- 未确认风险：${alerts.filter((a) => !a.confirmed).length}`)
  lines.push('')

  lines.push('─'.repeat(80))
  lines.push('【风险预警明细】')
  lines.push('─'.repeat(80))
  lines.push('')

  alerts.forEach((alert, idx) => {
    const severityLabel = alert.severity === 'high' ? '高风险' : alert.severity === 'medium' ? '中风险' : '低风险'
    lines.push(`风险 #${idx + 1} [${severityLabel}] ${alert.title}`)
    lines.push(`  描述：${alert.description}`)
    lines.push(`  关联节点：${alert.relatedNodes.length}个`)
    lines.push(`  状态：${alert.confirmed ? '已确认' : '待确认'}`)

    if (alert.type === 'circular' && 'path' in alert.data) {
      const path = alert.data.path as string[]
      const entNames = path.map((eid) => enterprises.find((e) => e.id === eid)?.name ?? eid)
      lines.push(`  环路：${entNames.join(' → ')}`)
    }
    lines.push('')
  })

  lines.push('─'.repeat(80))
  lines.push('【企业风险评分明细】')
  lines.push('─'.repeat(80))
  lines.push('')

  riskScores.forEach((score) => {
    const ent = enterprises.find((e) => e.id === score.targetId)
    if (!ent) return

    lines.push(`${ent.name}（${score.targetId}）`)
    lines.push(`  总分：${score.totalScore} 分 — ${getScoreLevel(score.totalScore)}`)
    lines.push(`  计算时间：${score.calculatedAt}`)
    lines.push('  ├─ 因子构成：')

    score.factors.forEach((factor) => {
      lines.push(`  │   · ${factor.name}`)
      lines.push(`  │     权重：${(factor.weight * 100).toFixed(0)}%  原始值：${factor.rawValue.toFixed(2)}  贡献：${factor.contribution.toFixed(1)}分`)
      if (factor.anomalySource) {
        lines.push(`  │     ⚠ 异常来源：${factor.anomalySource}`)
      }
    })
    lines.push('')
  })

  lines.push('─'.repeat(80))
  lines.push('【担保合同清单】')
  lines.push('─'.repeat(80))
  lines.push('')

  visibleEdges.forEach((edge) => {
    const src = enterprises.find((e) => e.id === edge.source)
    const tgt = enterprises.find((e) => e.id === edge.target)
    lines.push(`${src?.name ?? edge.source} → ${tgt?.name ?? edge.target}`)
    lines.push(`  金额：${edge.guaranteeAmount.toLocaleString()}万元  类型：${edge.guaranteeType}  状态：${edge.status}`)
    if (edge.isCircular) lines.push(`  ⚠ 循环担保标记`)
    lines.push('')
  })

  lines.push('─'.repeat(80))
  lines.push('【报告声明】')
  lines.push('─'.repeat(80))
  lines.push('')
  lines.push('本报告由融资担保关系沙盘自动生成，数据来源包括：')
  lines.push('- 工商登记 - 企业基本信息')
  lines.push('- 股权穿透 - 实控人关系')
  lines.push('- 合同库 - 担保合同信息')
  lines.push('- 核心系统 - 贷款余额数据')
  lines.push('- 风控模型 - 风险标签与评分')
  lines.push('- 尽调团队 - 调查报告')
  lines.push('')
  lines.push('所有风险标记和评分均基于算法模型，仅供风控人员参考，最终决策请结合人工审查。')
  lines.push('')
  lines.push('='.repeat(80))

  return lines.join('\n')
}

export function ReportExport() {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const exportToTXT = async () => {
    setExporting(true)
    try {
      const content = generateTextReport()
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `担保关系分析报告_${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const content = generateTextReport()
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      pdf.setFont('helvetica')
      pdf.setFontSize(10)

      const lines = content.split('\n')
      let y = 15
      const pageHeight = 280

      lines.forEach((line) => {
        if (y > pageHeight) {
          pdf.addPage()
          y = 15
        }
        if (line.startsWith('='.repeat(80)) || line.startsWith('─'.repeat(80))) {
          pdf.setFont('helvetica', 'bold')
          pdf.setDrawColor(0)
          pdf.line(15, y - 2, 195, y - 2)
        } else if (line.startsWith('【') && line.endsWith('】')) {
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(0, 102, 204)
        } else if (line.includes('⚠')) {
          pdf.setTextColor(239, 68, 68)
        } else {
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(0)
        }
        pdf.text(line, 15, y)
        y += 5
      })

      pdf.save(`担保关系分析报告_${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  const exportToPNG = async () => {
    setExporting(true)
    try {
      const graphElement = document.querySelector('canvas') as HTMLCanvasElement
      if (graphElement) {
        const a = document.createElement('a')
        a.href = graphElement.toDataURL('image/png')
        a.download = `担保关系3D图_${new Date().toISOString().slice(0, 10)}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } finally {
      setExporting(false)
      setShowMenu(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg transition-colors"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {exporting ? '导出中...' : '导出报告'}
      </button>

      {showMenu && (
        <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
          <button
            onClick={exportToTXT}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            <FileText size={14} />
            导出文本报告 (.txt)
          </button>
          <button
            onClick={exportToPDF}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            <FileText size={14} />
            导出PDF报告 (.pdf)
          </button>
          <button
            onClick={exportToPNG}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            <FileText size={14} />
            导出3D图截图 (.png)
          </button>
        </div>
      )}
    </div>
  )
}
