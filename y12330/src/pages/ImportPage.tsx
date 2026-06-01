import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { sampleInteractions, sampleTags, sampleActivities } from '@/utils/sampleData'
import { generateQualityReport, type QualityReportResult } from '@/utils/quality'
import type { InteractionEdge, UserTag, ActivityRecord, DataSourceMeta } from '@/types'
import {
  Upload, Tags, Activity, AlertTriangle, AlertCircle,
  FileWarning, Database, Clock, ChevronDown, ChevronUp, FlaskConical,
} from 'lucide-react'

interface FileInfo { fileName: string; rowCount: number; version: string }

function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line => line.split(',').map(s => s.trim()))
}

function parseInteractions(text: string): InteractionEdge[] {
  const rows = parseCSV(text).slice(1)
  return rows.map(r => ({ source: r[0], target: r[1], weight: parseFloat(r[2]), timestamp: r[3] }))
}

function parseTags(text: string): UserTag[] {
  const rows = parseCSV(text).slice(1)
  return rows.map(r => ({ userId: r[0], tags: r[1].split('|') }))
}

function parseActivities(text: string): ActivityRecord[] {
  const rows = parseCSV(text).slice(1)
  return rows.map(r => ({ userId: r[0], activityType: r[1], timestamp: r[2] }))
}

const CARD_CONFIGS = [
  { key: 'interaction' as const, icon: Upload, title: '互动边', type: 'interaction' as const },
  { key: 'tag' as const, icon: Tags, title: '用户标签', type: 'tag' as const },
  { key: 'activity' as const, icon: Activity, title: '活动记录', type: 'activity' as const },
]

function UploadCard({
  title, icon: Icon, onFile, fileInfo, onSample,
}: {
  title: string; icon: typeof Upload
  onFile: (text: string, name: string) => void
  fileInfo: FileInfo | null
  onSample: () => void
}) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) { const r = new FileReader(); r.onload = () => onFile(r.result as string, file.name); r.readAsText(file) }
  }, [onFile])

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.csv,.txt'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) { const r = new FileReader(); r.onload = () => onFile(r.result as string, file.name); r.readAsText(file) }
    }
    input.click()
  }, [onFile])

  return (
    <div style={{ background: '#232946' }} className="rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-[#00d4aa]" />
        <h3 className="text-[#e2e8f0] font-semibold">{title}</h3>
      </div>
      {fileInfo ? (
        <div className="space-y-1 text-sm text-[#e2e8f0]">
          <p>文件: {fileInfo.fileName}</p>
          <p>行数: {fileInfo.rowCount}</p>
          <p>版本: <span className="font-mono">{fileInfo.version}</span></p>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragging ? 'border-[#00d4aa] bg-[#00d4aa]/10' : 'border-[#4a5568]'}`}
        >
          <Upload size={28} className="mx-auto mb-2 text-[#4a5568]" />
          <p className="text-[#e2e8f0] text-sm">拖拽文件到此处</p>
          <p className="text-[#4a5568] text-xs mt-1">或点击选择文件 (.csv)</p>
        </div>
      )}
      <button
        onClick={onSample}
        className="mt-3 flex items-center gap-1 text-xs text-[#00d4aa] hover:underline"
      >
        <FlaskConical size={14} /> 加载样例数据
      </button>
    </div>
  )
}

function QualityAlert({
  icon: Icon, color, label, nodes, expanded, onToggle,
}: {
  icon: typeof AlertTriangle; color: string; label: string
  nodes: string[]; expanded: boolean; onToggle: () => void
}) {
  if (nodes.length === 0) return null
  return (
    <div style={{ background: '#232946' }} className="rounded-xl p-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Icon size={18} style={{ color }} />
          <span className="text-[#e2e8f0] font-medium">{label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>
            {nodes.length}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[#4a5568]" /> : <ChevronDown size={16} className="text-[#4a5568]" />}
      </div>
      {expanded && (
        <div className="mt-2 text-xs text-[#e2e8f0] space-y-0.5 pl-7">
          {nodes.map(id => <p key={id} className="font-mono">{id}</p>)}
        </div>
      )}
    </div>
  )
}

export default function ImportPage() {
  const {
    interactions, userTags, activities, dataSourceMetas,
    setInteractions, setUserTags, setActivities, addDataSourceMeta,
    setQualityReport: setStoreQualityReport,
  } = useStore()

  const [fileInfos, setFileInfos] = useState<Record<string, FileInfo | null>>({
    interaction: null, tag: null, activity: null,
  })
  const [qualityReport, setLocalQualityReport] = useState<QualityReportResult | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    isolated: false, noise: false, missing_tag: false,
  })

  const hasData = interactions.length > 0

  useEffect(() => {
    if (!hasData) { setLocalQualityReport(null); setStoreQualityReport(null); return }
    const nodeIds = [...new Set([
      ...interactions.map(e => e.source), ...interactions.map(e => e.target),
      ...userTags.map(t => t.userId), ...activities.map(a => a.userId),
    ])]
    const report = generateQualityReport(nodeIds, interactions, userTags, activities)
    setLocalQualityReport(report)
    setStoreQualityReport({
      isolatedNodes: report.isolatedNodes,
      noiseNodes: report.noiseNodes,
      missingTagNodes: report.missingTagNodes,
      totalNodes: report.totalNodes,
      totalEdges: report.totalEdges,
    })
  }, [interactions, userTags, activities, hasData, setStoreQualityReport])

  const makeMeta = (fileName: string, rowCount: number, type: DataSourceMeta['type']): DataSourceMeta => ({
    id: `${type}-${Date.now()}`, fileName, importTime: new Date().toISOString(),
    version: `v${Date.now()}`, rowCount, type,
  })

  const handleFile = useCallback((type: 'interaction' | 'tag' | 'activity', text: string, name: string) => {
    const version = `v${Date.now()}`
    if (type === 'interaction') {
      const data = parseInteractions(text)
      setInteractions(data)
      addDataSourceMeta(makeMeta(name, data.length, 'interaction'))
      setFileInfos(f => ({ ...f, interaction: { fileName: name, rowCount: data.length, version } }))
    } else if (type === 'tag') {
      const data = parseTags(text)
      setUserTags(data)
      addDataSourceMeta(makeMeta(name, data.length, 'tag'))
      setFileInfos(f => ({ ...f, tag: { fileName: name, rowCount: data.length, version } }))
    } else {
      const data = parseActivities(text)
      setActivities(data)
      addDataSourceMeta(makeMeta(name, data.length, 'activity'))
      setFileInfos(f => ({ ...f, activity: { fileName: name, rowCount: data.length, version } }))
    }
  }, [setInteractions, setUserTags, setActivities, addDataSourceMeta])

  const loadSample = useCallback((type: 'interaction' | 'tag' | 'activity') => {
    const version = `v${Date.now()}`
    if (type === 'interaction') {
      setInteractions(sampleInteractions)
      addDataSourceMeta(makeMeta('sample_interactions.csv', sampleInteractions.length, 'interaction'))
      setFileInfos(f => ({ ...f, interaction: { fileName: 'sample_interactions.csv', rowCount: sampleInteractions.length, version } }))
    } else if (type === 'tag') {
      setUserTags(sampleTags)
      addDataSourceMeta(makeMeta('sample_tags.csv', sampleTags.length, 'tag'))
      setFileInfos(f => ({ ...f, tag: { fileName: 'sample_tags.csv', rowCount: sampleTags.length, version } }))
    } else {
      setActivities(sampleActivities)
      addDataSourceMeta(makeMeta('sample_activities.csv', sampleActivities.length, 'activity'))
      setFileInfos(f => ({ ...f, activity: { fileName: 'sample_activities.csv', rowCount: sampleActivities.length, version } }))
    }
  }, [setInteractions, setUserTags, setActivities, addDataSourceMeta])

  const typeLabel = (t: string) => t === 'interaction' ? '互动边' : t === 'tag' ? '用户标签' : '活动记录'

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#e2e8f0]">数据导入</h1>
        <p className="text-[#4a5568] mt-1">导入互动边、用户标签和活动记录数据</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {CARD_CONFIGS.map(cfg => (
          <UploadCard
            key={cfg.key} title={cfg.title} icon={cfg.icon}
            fileInfo={fileInfos[cfg.key]}
            onFile={(text, name) => handleFile(cfg.type, text, name)}
            onSample={() => loadSample(cfg.type)}
          />
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
          <Database size={18} className="text-[#00d4aa]" /> 数据来源追踪
        </h2>
        {dataSourceMetas.length === 0 ? (
          <p className="text-[#4a5568] text-sm">暂无导入数据</p>
        ) : (
          <div className="space-y-2">
            {dataSourceMetas.map(m => (
              <div key={m.id} style={{ background: '#232946' }} className="rounded-lg p-3 flex items-center gap-4 text-sm text-[#e2e8f0]">
                <Clock size={14} className="text-[#4a5568] shrink-0" />
                <span className="font-medium">{m.fileName}</span>
                <span className="text-[#4a5568]">|</span>
                <span>{typeLabel(m.type)}</span>
                <span className="text-[#4a5568]">|</span>
                <span>{m.rowCount} 行</span>
                <span className="text-[#4a5568]">|</span>
                <span className="font-mono text-xs">{m.version}</span>
                <span className="text-[#4a5568] ml-auto text-xs">{new Date(m.importTime).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {qualityReport && (
        <div>
          <h2 className="text-lg font-semibold text-[#e2e8f0] mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-[#00d4aa]" /> 质量预检
          </h2>
          <div className="space-y-2">
            <QualityAlert
              icon={AlertTriangle} color="#ef4444" label="孤立节点"
              nodes={qualityReport.isolatedNodes}
              expanded={expanded.isolated} onToggle={() => setExpanded(e => ({ ...e, isolated: !e.isolated }))}
            />
            <QualityAlert
              icon={AlertCircle} color="#f59e0b" label="噪声节点"
              nodes={qualityReport.noiseNodes}
              expanded={expanded.noise} onToggle={() => setExpanded(e => ({ ...e, noise: !e.noise }))}
            />
            <QualityAlert
              icon={FileWarning} color="#6b7280" label="缺失标签节点"
              nodes={qualityReport.missingTagNodes}
              expanded={expanded.missing_tag} onToggle={() => setExpanded(e => ({ ...e, missing_tag: !e.missing_tag }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
