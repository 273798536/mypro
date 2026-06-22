import { useGraphStore } from '@/stores/graph'
import GraphCanvas from '@/components/GraphCanvas'
import ComputationLog from '@/components/ComputationLog'
import { useState } from 'react'
import { Play, Download, Trash2, Layers, ArrowLeftRight } from 'lucide-react'
import type { ComputationSnapshot } from '@/types'

export default function Sandbox() {
  const {
    nodes, edges, snapshots, currentParams,
    setParams, runComputation, updateNodePosition, loadSample, addNode, addEdge, removeNode, clearAll,
  } = useGraphStore()

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null)

  const latestSnapshot = snapshots[snapshots.length - 1]
  const cutVertices = latestSnapshot?.cutVertices || []

  const handleRun = () => {
    runComputation()
    setSelectedNode(null)
  }

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges, snapshots, params: currentParams }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cutpoint-sandbox-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddNode = () => {
    const id = String.fromCharCode(65 + nodes.length)
    if (nodes.length >= 26) return
    const x = 100 + Math.random() * 400
    const y = 80 + Math.random() * 300
    addNode({ id, label: id, x, y })
  }

  const handleAddEdge = () => {
    if (nodes.length < 2) return
    const available = nodes.filter(n => !edges.some(e =>
      (e.source === n.id && e.target === selectedNode) ||
      (e.target === n.id && e.source === selectedNode)
    ) && n.id !== selectedNode)
    if (!selectedNode || available.length === 0) return
    addEdge({ source: selectedNode, target: available[0].id })
  }

  const compareSnapshots = compareIds
    ? snapshots.filter(s => compareIds.includes(s.id)).sort((a, b) =>
        snapshots.indexOf(a) - snapshots.indexOf(b)
      ) as [ComputationSnapshot, ComputationSnapshot]
    : null

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-cyan-400" />
            <h2 className="text-sm font-medium text-slate-200">图可视化</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadSample()} className="px-3 py-1 text-xs border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 rounded transition-colors">
              加载示例
            </button>
            <button onClick={handleAddNode} className="px-3 py-1 text-xs border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 rounded transition-colors">
              + 节点
            </button>
            {selectedNode && (
              <button onClick={handleAddEdge} className="px-3 py-1 text-xs border border-cyan-700 text-cyan-400 hover:bg-cyan-900/20 rounded transition-colors">
                + 连边到 {selectedNode}
              </button>
            )}
            {selectedNode && (
              <button onClick={() => removeNode(selectedNode)} className="px-3 py-1 text-xs border border-red-800 text-red-400 hover:bg-red-900/20 rounded transition-colors">
                删除 {selectedNode}
              </button>
            )}
            <button onClick={clearAll} className="px-2 py-1 text-xs text-slate-500 hover:text-red-400 transition-colors" title="清空">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-slate-900/50 rounded-lg p-2">
          {nodes.length === 0 ? (
            <div className="text-sm text-slate-600">点击"加载示例"开始，或手动添加节点</div>
          ) : (
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              cutVertices={cutVertices}
              onNodeDrag={updateNodePosition}
              onNodeClick={setSelectedNode}
              selectedNode={selectedNode}
              width={600}
              height={450}
            />
          )}
        </div>

        {showCompare && compareSnapshots && (
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-amber-700/30">
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeftRight size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-amber-300">重跑对比</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {compareSnapshots.map((snap, idx) => (
                <div key={snap.id}>
                  <div className="text-[10px] text-slate-500 mb-1">{snap.paramVersion.version} · {snap.createdAt.slice(11, 19)}</div>
                  <div className="space-y-0.5">
                    {snap.intermediates.map(im => {
                      const otherSnap = compareSnapshots[1 - idx]
                      const otherIm = otherSnap?.intermediates.find(o => o.nodeId === im.nodeId)
                      const changed = otherIm && (im.dfn !== otherIm.dfn || im.low !== otherIm.low)
                      return (
                        <div key={im.nodeId} className={`flex gap-3 text-[10px] font-mono ${changed ? 'bg-amber-900/20 px-1 rounded' : ''}`}>
                          <span className={cutVertices.includes(im.nodeId) ? 'text-red-400' : 'text-slate-400'}>{im.nodeId}</span>
                          <span className="text-blue-300">dfn={im.dfn}</span>
                          <span className="text-amber-300">low={im.low}</span>
                          {changed && <span className="text-amber-400">←变化</span>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-1 text-[10px] text-red-400">割点: {snap.cutVertices.join(', ') || '无'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-80 flex flex-col gap-3 border-l border-slate-700/40 pl-4">
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <h3 className="text-xs font-medium text-slate-300 mb-3">参数面板</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">根节点</label>
              <select
                value={currentParams.rootId}
                onChange={e => setParams({ rootId: e.target.value })}
                className="w-full bg-[#0d0d1a] border border-slate-700/50 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-600/50"
              >
                <option value="">自动选择</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label || n.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                阈值偏移 <span className="text-amber-400 font-mono">{currentParams.thresholdOffset}</span>
              </label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={currentParams.thresholdOffset}
                onChange={e => setParams({ thresholdOffset: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>-2</span><span>0</span><span>2</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                单位换算系数 <span className="text-amber-400 font-mono">{currentParams.unitScale}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={currentParams.unitScale}
                onChange={e => setParams({ unitScale: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>0.1</span><span>1.0</span><span>3.0</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleRun}
              disabled={nodes.length === 0}
              className="flex-1 px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Play size={12} />
              运行计算
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={snapshots.length === 0}
            className="flex-1 px-2 py-1.5 text-xs border border-slate-600 text-slate-400 hover:text-slate-200 rounded transition-colors disabled:opacity-30 flex items-center justify-center gap-1"
          >
            <Download size={12} />
            导出
          </button>
          {snapshots.length >= 2 && (
            <button
              onClick={() => {
                if (!showCompare) {
                  const lastTwo = snapshots.slice(-2)
                  setCompareIds([lastTwo[0].id, lastTwo[1].id])
                }
                setShowCompare(!showCompare)
              }}
              className={`flex-1 px-2 py-1.5 text-xs border rounded transition-colors flex items-center justify-center gap-1 ${showCompare ? 'border-amber-600 text-amber-400' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}
            >
              <ArrowLeftRight size={12} />
              对比
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0">
          {latestSnapshot ? (
            <ComputationLog steps={latestSnapshot.steps} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-600">
              调整参数后点击"运行计算"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
