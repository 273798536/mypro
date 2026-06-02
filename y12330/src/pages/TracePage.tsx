import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, ChevronDown, ChevronRight, Download, FileJson, FileSpreadsheet, ArrowRight, Database, Cpu, Shield } from 'lucide-react'
import { useStore } from '@/store'
import { exportToCSV, exportToJSON, formatCommunityResults, formatTraceResults } from '@/utils/export'
import type { TraceChain, DataSourceMeta, AnomalyRecord } from '@/types'

const scoreBadge: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400',
  B: 'bg-accent/20 text-accent',
  C: 'bg-warn/20 text-warn',
  D: 'bg-danger/20 text-danger',
}

const anomalyTypeBadge: Record<string, string> = {
  isolated: 'bg-danger/20 text-danger',
  noise: 'bg-warn/20 text-warn',
  missing_tag: 'bg-muted/20 text-muted',
}

type ExportFormat = 'csv' | 'json'

export default function TracePage() {
  const navigate = useNavigate()
  const { clusterResult, traceChains } = useStore()
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set())
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')

  if (!clusterResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield className="w-12 h-12 text-muted" />
        <p className="text-muted text-lg">请先执行聚类分析</p>
        <button onClick={() => navigate('/cluster')}
          className="text-accent hover:underline flex items-center gap-1">
          前往聚类分析 <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const toggleChain = (id: string) => {
    setExpandedChains(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const getPreviewRows = (data: any[]) => {
    if (data.length === 0) return '无数据'
    const preview = data.slice(0, 3)
    if (exportFormat === 'json') {
      return JSON.stringify(preview, null, 2)
    }
    const headers = Object.keys(preview[0])
    const rows = [headers.join(','), ...preview.map(r => headers.map(h => String(r[h] ?? '')).join(','))]
    return rows.join('\n')
  }

  const communityRows = formatCommunityResults(clusterResult)
  const traceRows = formatTraceResults(traceChains)

  const communityPreview = getPreviewRows(communityRows)
  const tracePreview = getPreviewRows(traceRows)

  const handleExportCommunity = () => {
    if (exportFormat === 'csv') exportToCSV(communityRows, 'community_results')
    else exportToJSON(communityRows, 'community_results')
  }

  const handleExportTrace = () => {
    if (exportFormat === 'csv') exportToCSV(traceRows, 'trace_records')
    else exportToJSON(traceRows, 'trace_records')
  }

  const chainForCommunity = (communityId: string): TraceChain | undefined =>
    traceChains.find(tc => tc.communityId === communityId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="w-6 h-6 text-accent" />结果溯源
        </h1>
        <p className="text-muted mt-1">从结果追到谱聚类参数、社群评分和异常节点</p>
      </div>

      <div className="space-y-3">
        {clusterResult.communities.map(community => {
          const chain = chainForCommunity(community.id)
          const isOpen = expandedChains.has(community.id)
          return (
            <div key={community.id} className="bg-bg-card rounded-xl p-4">
              <button onClick={() => toggleChain(community.id)}
                className="w-full flex items-center gap-3 text-left">
                {isOpen ? <ChevronDown className="w-5 h-5 text-accent" /> : <ChevronRight className="w-5 h-5 text-muted" />}
                <span className="font-semibold">{community.id}</span>
                <span className="text-xs text-muted">{community.nodes.length} 节点</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadge[community.score]}`}>
                  {community.score}
                </span>
              </button>

              {isOpen && (
                <div className="ml-4 mt-3 space-y-0 border-l-2 border-accent/30 pl-4">
                  <div className="py-2">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <Shield className="w-4 h-4 text-accent" />社群评分
                    </div>
                    <div className="ml-6 text-sm text-muted space-y-0.5">
                      <p>模块度: {community.modularity.toFixed(3)}</p>
                      <p>密度: {community.density.toFixed(3)}</p>
                      <p>评分: <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadge[community.score]}`}>{community.score}</span></p>
                    </div>
                  </div>

                  {chain && (
                    <>
                      <div className="py-2">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <Cpu className="w-4 h-4 text-accent" />聚类参数
                        </div>
                        <div className="ml-6 text-sm text-muted space-y-0.5">
                          <p>K: {chain.clusterParams.k}</p>
                          <p>相似度阈值: {chain.clusterParams.similarityThreshold}</p>
                          <p>权重衰减: {chain.clusterParams.weightDecay}</p>
                          <p>数据集版本: {clusterResult.datasetVersion}</p>
                        </div>
                      </div>

                      <div className="py-2">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <Database className="w-4 h-4 text-accent" />数据源版本
                        </div>
                        <div className="ml-6 space-y-1">
                          {chain.dataSourceMetas.map(ds => (
                            <div key={ds.id} className="text-xs text-muted bg-bg rounded px-2 py-1.5 flex items-center justify-between">
                              <span>{ds.fileName} <span className="text-muted/60">({ds.version})</span></span>
                              <span className="text-muted/60">{ds.rowCount} 行 · {ds.type}</span>
                            </div>
                          ))}
                          {chain.dataSourceMetas.length === 0 && <p className="text-xs text-muted/60">无数据源</p>}
                        </div>
                      </div>

                      <div className="py-2">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <Shield className="w-4 h-4 text-accent" />质量检测记录
                        </div>
                        <div className="ml-6 space-y-1">
                          {chain.qualityRecords.map((rec, idx) => (
                            <div key={`${rec.nodeId}-${rec.type}-${idx}`} className="text-xs bg-bg rounded px-2 py-1.5 flex items-center gap-2">
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${anomalyTypeBadge[rec.type]}`}>
                                {rec.type}
                              </span>
                              <span className="text-muted">{rec.nodeId}</span>
                              <span className="text-muted/60 flex-1">{rec.description}</span>
                            </div>
                          ))}
                          {chain.qualityRecords.length === 0 && <p className="text-xs text-muted/60">无异常记录</p>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-bg-card rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5 text-accent" />导出面板
        </h2>

        <div className="flex items-center gap-3">
          <label className="text-sm text-muted">格式:</label>
          <select value={exportFormat} onChange={e => setExportFormat(e.target.value as ExportFormat)}
            className="bg-bg rounded-lg px-3 py-1.5 text-sm border border-border-dim">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          {exportFormat === 'csv' ? <FileSpreadsheet className="w-4 h-4 text-muted" /> : <FileJson className="w-4 h-4 text-muted" />}
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted">社群结果预览 (前3行)</p>
          <pre className="bg-bg rounded-lg p-3 font-mono text-xs text-muted overflow-x-auto max-h-40">{communityPreview}</pre>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted">溯源记录预览 (前3行)</p>
          <pre className="bg-bg rounded-lg p-3 font-mono text-xs text-muted overflow-x-auto max-h-40">{tracePreview}</pre>
        </div>

        <div className="flex gap-3">
          <button onClick={handleExportCommunity}
            className="bg-accent hover:bg-accent-dim text-bg font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />导出社群结果
          </button>
          <button onClick={handleExportTrace}
            className="bg-bg border border-border-dim hover:border-accent text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />导出溯源记录
          </button>
        </div>
      </div>
    </div>
  )
}
