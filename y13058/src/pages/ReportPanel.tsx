import { useState } from 'react'
import { useAppStore } from '@/store'
import ReactMarkdown from 'react-markdown'
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileText,
  FolderOpen,
  ShieldAlert,
  User,
  FileDown,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function ReportPanel() {
  const { report } = useAppStore()
  const [viewMode, setViewMode] = useState<'split' | 'markdown' | 'preview'>('split')
  const [copied, setCopied] = useState(false)

  const generateMarkdown = () => {
    const lines: string[] = []

    lines.push(`# ${report.projectName} · 交接报告`)
    lines.push('')
    lines.push(`> 生成时间：${report.generatedAt}  `)
    lines.push(`> 生成人：${report.generatedBy}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // 已处理
    lines.push('## ✅ 已处理')
    lines.push('')
    report.processed.forEach((p) => {
      lines.push(`### ${p.title}`)
      lines.push(`- 处理人：${p.processedBy}`)
      lines.push(`- 处理时间：${p.processedAt}`)
      lines.push(`- 备注：${p.note}`)
      lines.push('')
    })

    // 待补材料
    lines.push('## 📋 待补材料')
    lines.push('')
    if (report.pendingMaterials.length === 0) {
      lines.push('_暂无待补材料_')
      lines.push('')
    } else {
      report.pendingMaterials.forEach((pm) => {
        lines.push(`### ${pm.title}`)
        lines.push(`- 说明：${pm.description}`)
        if (pm.expectedDate) lines.push(`- 预计到位：${pm.expectedDate}`)
        if (pm.contact) lines.push(`- 对接人：${pm.contact}`)
        lines.push('')
      })
    }

    // 人工改判
    lines.push('## ⚠️ 人工改判')
    lines.push('')
    if (report.manualOverrides.length === 0) {
      lines.push('_无人工改判_')
      lines.push('')
    } else {
      report.manualOverrides.forEach((mo) => {
        lines.push(`### 改判记录`)
        lines.push(`- **原判断**：${mo.originalJudgment}`)
        lines.push(`- **改判后**：${mo.overrideJudgment}`)
        lines.push(`- **改判原因**：${mo.reason}`)
        lines.push(`- **改判人**：${mo.overriddenBy}`)
        lines.push(`- **改判时间**：${mo.overriddenAt}`)
        lines.push('')
      })
    }

    // 接手导航
    lines.push('## 🧭 接手导航')
    lines.push('')
    lines.push('### 📁 材料存放位置')
    lines.push('')
    report.navigation.materialPaths.forEach((mp) => {
      lines.push(`- **${mp.label}**：\`${mp.path}\``)
      lines.push(`  - ${mp.description}`)
    })
    lines.push('')

    lines.push('### 🚨 异常位置一览')
    lines.push('')
    report.navigation.anomalyLocations.forEach((al) => {
      lines.push(`- **${al.layerName}** @ \`${al.coordinates}\``)
      lines.push(`  - 关联对象：${al.relatedObject}`)
      lines.push(`  - 说明：${al.description}`)
    })
    lines.push('')

    lines.push('### 📤 重新导出')
    lines.push('')
    report.navigation.exportModes.forEach((em) => {
      lines.push(`- **${em.name}**：${em.description}`)
    })
    lines.push('')

    return lines.join('\n')
  }

  const mdContent = generateMarkdown()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mdContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      /* ignore */
    }
  }

  const handleDownload = () => {
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.projectName.replace(/\s+/g, '_')}_交接报告.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6 min-w-[1200px]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-engineer-800">交接报告</h1>
          <p className="text-sm text-engineer-500 mt-1">
            已处理 / 待补材料 / 人工改判 三分栏，导出 Markdown 给接手同事
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-engineer-200 overflow-hidden bg-white">
            {[
              { mode: 'split', label: '分栏', Icon: ClipboardList },
              { mode: 'preview', label: '预览', Icon: Eye },
              { mode: 'markdown', label: '源码', Icon: EyeOff },
            ].map(({ mode, label, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as typeof viewMode)}
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                  viewMode === mode
                    ? 'bg-engineer-700 text-white'
                    : 'text-engineer-600 hover:bg-engineer-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button onClick={handleCopy} className="btn-eng btn-ghost">
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5 inline text-success-500" />
                已复制
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5 inline" />
                复制 MD
              </>
            )}
          </button>
          <button onClick={handleDownload} className="btn-eng btn-primary">
            <FileDown className="w-4 h-4 mr-1.5 inline" />
            下载 Markdown
          </button>
        </div>
      </header>

      {/* 报告元信息 */}
      <div className="bg-engineer-800 text-white rounded p-4 flex items-center justify-between card-shadow">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-engineer-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-semibold">{report.projectName}</div>
            <div className="text-[11px] text-engineer-300 font-mono mt-0.5 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {report.generatedAt}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {report.generatedBy}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded bg-success-500/20 text-emerald-300 border border-success-500/30">
            已处理 {report.processed.length}
          </span>
          <span className="px-3 py-1 rounded bg-warn-500/20 text-amber-300 border border-warn-500/30">
            待补材料 {report.pendingMaterials.length}
          </span>
          <span className="px-3 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30">
            人工改判 {report.manualOverrides.length}
          </span>
        </div>
      </div>

      {/* 三栏分区 / Markdown 视图 */}
      {viewMode !== 'markdown' && (
        <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {/* 已处理 */}
          <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
            <div className="px-4 py-3 border-l-4 border-success-500 bg-emerald-50/60 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-500" />
              <span className="text-sm font-semibold text-engineer-800">已处理</span>
              <span className="ml-auto tag tag-success">{report.processed.length}</span>
            </div>
            <div className="p-4 space-y-3 max-h-[480px] overflow-auto">
              {report.processed.map((p) => (
                <div key={p.id} className="p-3 rounded border border-engineer-100 hover:border-engineer-200 transition-colors">
                  <div className="text-sm font-medium text-engineer-800">{p.title}</div>
                  <div className="mt-2 text-[11px] text-engineer-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {p.processedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p.processedAt}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-engineer-600 leading-relaxed">{p.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 待补材料 */}
          <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
            <div className="px-4 py-3 border-l-4 border-warn-500 bg-orange-50/60 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-warn-500" />
              <span className="text-sm font-semibold text-engineer-800">待补材料</span>
              <span className="ml-auto tag tag-warn">{report.pendingMaterials.length}</span>
            </div>
            <div className="p-4 space-y-3 max-h-[480px] overflow-auto">
              {report.pendingMaterials.length === 0 ? (
                <div className="text-center py-8 text-engineer-400 text-sm">暂无待补材料</div>
              ) : (
                report.pendingMaterials.map((pm) => (
                  <div key={pm.id} className="p-3 rounded border border-warn-200/60 bg-orange-50/30">
                    <div className="text-sm font-medium text-engineer-800">{pm.title}</div>
                    <p className="mt-1.5 text-xs text-engineer-600 leading-relaxed">{pm.description}</p>
                    <div className="mt-2 text-[11px] text-engineer-500 flex items-center gap-3 flex-wrap">
                      {pm.expectedDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          预计 {pm.expectedDate}
                        </span>
                      )}
                      {pm.contact && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {pm.contact}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 人工改判 */}
          <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
            <div className="px-4 py-3 border-l-4 border-red-500 bg-red-50/60 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-engineer-800">人工改判</span>
              <span className="ml-auto tag" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {report.manualOverrides.length}
              </span>
            </div>
            <div className="p-4 space-y-3 max-h-[480px] overflow-auto">
              {report.manualOverrides.length === 0 ? (
                <div className="text-center py-8 text-engineer-400 text-sm">无人工改判</div>
              ) : (
                report.manualOverrides.map((mo) => (
                  <div key={mo.id} className="p-3 rounded border border-red-200/60 bg-red-50/30">
                    <div className="space-y-1.5">
                      <div>
                        <div className="text-[11px] text-engineer-500 mb-0.5">原判断</div>
                        <div className="text-xs text-engineer-600 line-through">{mo.originalJudgment}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-warn-600 mb-0.5 font-medium">改判后</div>
                        <div className="text-xs text-engineer-800 font-medium">{mo.overrideJudgment}</div>
                      </div>
                      <div className="pt-1.5 border-t border-red-200/50">
                        <div className="text-[11px] text-engineer-500 mb-0.5">改判原因</div>
                        <p className="text-xs text-engineer-700 leading-relaxed">{mo.reason}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-engineer-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {mo.overriddenBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mo.overriddenAt}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* Markdown 源码视图 */}
      {viewMode !== 'preview' && (
        <div className="bg-engineer-900 rounded card-shadow overflow-hidden">
          <div className="px-4 py-2.5 border-b border-engineer-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-engineer-400" />
              <span className="text-xs text-engineer-300 font-mono">交接报告.md</span>
            </div>
            <Download className="w-3.5 h-3.5 text-engineer-500" />
          </div>
          <pre className="p-4 text-xs font-mono text-engineer-200 leading-relaxed max-h-[360px] overflow-auto whitespace-pre-wrap">
{mdContent}
          </pre>
        </div>
      )}

      {/* Markdown 渲染预览（仅在 split 或 preview 模式） */}
      {viewMode !== 'markdown' && (
        <div className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
          <div className="px-4 py-2.5 border-b border-engineer-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-engineer-500" />
            <span className="text-xs font-medium text-engineer-700">Markdown 渲染预览</span>
          </div>
          <div className="p-5 prose prose-sm max-w-none prose-headings:text-engineer-800 prose-p:text-engineer-700 prose-strong:text-engineer-800 prose-code:text-engineer-700 prose-code:bg-engineer-50 prose-code:px-1 prose-code:rounded prose-code:border prose-code:border-engineer-200 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-warn-500 prose-blockquote:text-engineer-600 prose-blockquote:bg-orange-50 prose-blockquote:py-1 prose-blockquote:pr-3 prose-li:text-engineer-700 prose-h2:text-base prose-h3:text-sm">
            <ReactMarkdown>{mdContent}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
