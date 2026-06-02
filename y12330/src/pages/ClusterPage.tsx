import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Play, Loader2, ChevronDown, ChevronUp, AlertTriangle, ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { spectralCluster } from '@/utils/clustering'
import type { CommunityResult } from '@/utils/clustering'
import { explainImpact } from '@/utils/quality'
import type { AnomalyRecord, ClusterResult, GraphNode, GraphEdge, TraceChain, QualityReport } from '@/types'

const scoreBadge: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400',
  B: 'bg-accent/20 text-accent',
  C: 'bg-warn/20 text-warn',
  D: 'bg-danger/20 text-danger',
}

const anomalyBadge: Record<string, string> = {
  isolated: 'bg-danger/20 text-danger',
  noise: 'bg-warn/20 text-warn',
  missing_tag: 'bg-muted/20 text-muted',
}

export default function ClusterPage() {
  const navigate = useNavigate()
  const {
    interactions, userTags, activities, clusterParams, datasetVersion,
    isClustering, clusterResult, qualityReport,
    setClusterParams, setIsClustering, setClusterResult,
    setQualityReport, addTraceChain, clearTraceChains, setGraphData, setSelectedNodeId,
  } = useStore()

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleRun = async () => {
    setIsClustering(true)
    clearTraceChains()

    await new Promise(r => setTimeout(r, 100))

    const nodeSet = new Set<string>()
    interactions.forEach(e => { nodeSet.add(e.source); nodeSet.add(e.target) })
    userTags.forEach(t => nodeSet.add(t.userId))
    activities.forEach(a => nodeSet.add(a.userId))
    const nodeIds = Array.from(nodeSet)

    const edges = interactions.map(e => ({ source: e.source, target: e.target, weight: e.weight }))
    const communityResults: CommunityResult[] = spectralCluster(nodeIds, edges, clusterParams)

    const anomalyMap = new Map<string, AnomalyRecord[]>()
    const isolated = new Set(qualityReport?.isolatedNodes ?? [])
    const noise = new Set(qualityReport?.noiseNodes ?? [])
    const missing = new Set(qualityReport?.missingTagNodes ?? [])

    const allAnomalies: AnomalyRecord[] = []
    communityResults.forEach(c => {
      c.nodes.forEach(nodeId => {
        const types: AnomalyRecord[] = []
        if (isolated.has(nodeId)) types.push({ nodeId, type: 'isolated', description: explainImpact('isolated', nodeId, [c.id]), affectedCommunities: [c.id] })
        if (noise.has(nodeId)) types.push({ nodeId, type: 'noise', description: explainImpact('noise', nodeId, [c.id]), affectedCommunities: [c.id] })
        if (missing.has(nodeId)) types.push({ nodeId, type: 'missing_tag', description: explainImpact('missing_tag', nodeId, [c.id]), affectedCommunities: [c.id] })
        if (types.length > 0) {
          anomalyMap.set(nodeId, types)
          allAnomalies.push(...types)
        }
      })
    })

    const communities = communityResults.map(c => ({
      id: c.id,
      nodes: c.nodes,
      modularity: c.modularity,
      density: c.density,
      score: c.score,
      anomalies: c.nodes.flatMap(nid => anomalyMap.get(nid) ?? []),
    }))

    const qr: QualityReport = {
      isolatedNodes: [...isolated],
      noiseNodes: [...noise],
      missingTagNodes: [...missing],
      totalNodes: nodeIds.length,
      totalEdges: edges.length,
    }

    const result: ClusterResult = {
      id: `cluster-${Date.now()}`,
      params: { ...clusterParams },
      communities,
      qualityReport: qr,
      createdAt: new Date().toISOString(),
      datasetVersion,
    }

    const communityOf = new Map<string, string>()
    communities.forEach(c => c.nodes.forEach(n => communityOf.set(n, c.id)))

    const graphNodes: GraphNode[] = nodeIds.map(nid => ({
      id: nid,
      community: communityOf.get(nid) ?? '',
      anomalies: anomalyMap.get(nid) ?? [],
      tags: userTags.find(t => t.userId === nid)?.tags ?? [],
      activities: activities.filter(a => a.userId === nid),
    }))

    const graphEdges: GraphEdge[] = edges.map(e => ({ source: e.source, target: e.target, weight: e.weight }))

    communities.forEach(c => {
      const chain: TraceChain = {
        resultId: result.id,
        communityId: c.id,
        clusterParams: { ...clusterParams },
        clusterResultId: result.id,
        dataSourceMetas: useStore.getState().dataSourceMetas,
        qualityRecords: c.anomalies,
      }
      addTraceChain(chain)
    })

    setClusterResult(result)
    setQualityReport(qr)
    setGraphData(graphNodes, graphEdges)
    setIsClustering(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Cpu className="w-6 h-6 text-accent" />聚类分析</h1>
        <p className="text-muted mt-1">配置参数并执行谱聚类</p>
      </div>

      <div className="bg-bg-card rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">K（聚类数）</label>
          <div className="flex items-center gap-3">
            <input type="range" min={2} max={10} value={clusterParams.k}
              onChange={e => setClusterParams({ k: +e.target.value })}
              className="flex-1 accent-accent" />
            <input type="number" min={2} max={10} value={clusterParams.k}
              onChange={e => setClusterParams({ k: Math.max(2, Math.min(10, +e.target.value)) })}
              className="w-16 bg-bg rounded-lg px-2 py-1 text-center text-sm border border-border-dim" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">相似度阈值</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={1} step={0.05} value={clusterParams.similarityThreshold}
              onChange={e => setClusterParams({ similarityThreshold: +e.target.value })}
              className="flex-1 accent-accent" />
            <input type="number" min={0} max={1} step={0.05} value={clusterParams.similarityThreshold}
              onChange={e => setClusterParams({ similarityThreshold: Math.max(0, Math.min(1, +e.target.value)) })}
              className="w-16 bg-bg rounded-lg px-2 py-1 text-center text-sm border border-border-dim" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">权重衰减系数</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={2} step={0.1} value={clusterParams.weightDecay}
              onChange={e => setClusterParams({ weightDecay: +e.target.value })}
              className="flex-1 accent-accent" />
            <input type="number" min={0} max={2} step={0.1} value={clusterParams.weightDecay}
              onChange={e => setClusterParams({ weightDecay: Math.max(0, Math.min(2, +e.target.value)) })}
              className="w-16 bg-bg rounded-lg px-2 py-1 text-center text-sm border border-border-dim" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">参数版本: {datasetVersion}</span>
          <button onClick={handleRun} disabled={isClustering}
            className="bg-accent hover:bg-accent-dim text-bg font-semibold px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
            {isClustering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            执行谱聚类
          </button>
        </div>
      </div>

      {isClustering && (
        <div className="bg-bg-card rounded-xl p-8 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
          <p className="text-muted">正在执行谱聚类...</p>
        </div>
      )}

      {!isClustering && clusterResult && (
        <div className="bg-bg-card rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">社群评分</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted border-b border-border-dim">
                <th className="text-left py-2">社群ID</th>
                <th className="text-center py-2">节点数</th>
                <th className="text-center py-2">边数</th>
                <th className="text-center py-2">模块度</th>
                <th className="text-center py-2">密度</th>
                <th className="text-center py-2">评分</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {clusterResult.communities.map(c => {
                const edgeCount = interactions.filter(e =>
                  c.nodes.includes(e.source) && c.nodes.includes(e.target)
                ).length
                return (
                  <tr key={c.id} className="border-b border-border-dim/50 hover:bg-bg-hover transition-colors">
                    <td className="py-2">
                      <button onClick={() => { setSelectedNodeId(null); navigate('/graph') }}
                        className="text-accent hover:underline cursor-pointer">
                        {c.id}
                      </button>
                    </td>
                    <td className="text-center py-2">{c.nodes.length}</td>
                    <td className="text-center py-2">{edgeCount}</td>
                    <td className="text-center py-2">{c.modularity.toFixed(3)}</td>
                    <td className="text-center py-2">{c.density.toFixed(3)}</td>
                    <td className="text-center py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadge[c.score]}`}>
                        {c.score}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => toggleRow(c.id)} className="text-muted hover:text-white">
                        {expandedRows.has(c.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {Array.from(expandedRows).map(cid => {
            const comm = clusterResult.communities.find(c => c.id === cid)
            if (!comm) return null
            return (
              <div key={`exp-${cid}`} className="mt-2 p-3 bg-bg rounded-lg text-sm">
                <p className="text-muted mb-1">节点列表:</p>
                <div className="flex flex-wrap gap-2">
                  {comm.nodes.map(nid => (
                    <button key={nid} onClick={() => { setSelectedNodeId(nid); navigate('/graph') }}
                      className="bg-bg-hover rounded px-2 py-0.5 text-xs hover:text-accent transition-colors">
                      {nid}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isClustering && clusterResult && <AnomalySection
        clusterResult={clusterResult}
        onNodeClick={setSelectedNodeId}
        navigate={navigate}
      />}
    </div>
  )
}

interface AnomalySectionProps {
  clusterResult: ClusterResult
  onNodeClick: (id: string | null) => void
  navigate: (path: string) => void
}

function AnomalySection({ clusterResult, onNodeClick, navigate }: AnomalySectionProps) {
  const allAnomaly: AnomalyRecord[] = clusterResult.communities.flatMap(c => c.anomalies)
  const unique = new Map<string, AnomalyRecord>()
  allAnomaly.forEach(a => unique.set(`${a.nodeId}-${a.type}`, a))
  const items = Array.from(unique.values())

  if (items.length === 0) return null

  return (
    <div className="bg-bg-card rounded-xl p-5">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warn" />异常节点
      </h2>
      <div className="space-y-2">
        {items.map(a => (
          <div key={`${a.nodeId}-${a.type}`}
            className="flex items-center gap-3 bg-bg rounded-lg p-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${anomalyBadge[a.type]}`}>
              {a.type}
            </span>
            <button onClick={() => { onNodeClick(a.nodeId); navigate('/graph') }}
              className="text-accent hover:underline text-sm">
              {a.nodeId}
            </button>
            <span className="text-muted text-xs flex-1">{explainImpact(a.type, a.nodeId, a.affectedCommunities)}</span>
            <ArrowRight className="w-4 h-4 text-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
