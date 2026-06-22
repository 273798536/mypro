import { useGraphStore } from '@/stores/graph'
import { useFieldMappingStore } from '@/stores/fieldMapping'
import CopyBlock from '@/components/CopyBlock'
import { FileText, Terminal, Database, History } from 'lucide-react'

const DEFAULT_SAMPLE = {
  nodes: [
    { id: 'A', label: 'A', x: 300, y: 80 },
    { id: 'B', label: 'B', x: 180, y: 180 },
    { id: 'C', label: 'C', x: 420, y: 180 },
    { id: 'D', label: 'D', x: 120, y: 300 },
    { id: 'E', label: 'E', x: 240, y: 300 },
    { id: 'F', label: 'F', x: 360, y: 300 },
    { id: 'G', label: 'G', x: 480, y: 300 },
  ],
  edges: [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' },
    { source: 'B', target: 'E' },
    { source: 'C', target: 'F' },
    { source: 'C', target: 'G' },
    { source: 'D', target: 'E' },
  ],
}

export default function Handover() {
  const { snapshots, paramVersions, nodes, edges, currentParams } = useGraphStore()
  const { mappings, history } = useFieldMappingStore()

  const latestSnapshot = snapshots[snapshots.length - 1]

  const sampleData = JSON.stringify({
    nodes: DEFAULT_SAMPLE.nodes,
    edges: DEFAULT_SAMPLE.edges,
  }, null, 2)

  const runCommand = `# 图论割点参数沙盘 - 运行命令
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 构建生产版本
npm run build

# 当前参数配置
# 根节点: ${currentParams.rootId || '自动'}
# 阈值偏移: ${currentParams.thresholdOffset}
# 单位换算系数: ${currentParams.unitScale}`

  const fieldMappingSummary = mappings.length > 0
    ? mappings.map(m => `${m.originalField} → ${m.guessedField} [${m.status}] ${m.reason}`).join('\n')
    : '# 暂无字段映射记录\n# 请先在"字段对齐"页面导入数据并解析'

  const latestResult = latestSnapshot
    ? `# 最新计算结果 (${latestSnapshot.paramVersion.version})
# 时间: ${latestSnapshot.createdAt}
# 割点: ${latestSnapshot.cutVertices.join(', ') || '无'}
# 节点中间值:
${latestSnapshot.intermediates.map(im =>
    `${im.nodeId}: dfn=${im.dfn} low=${im.low} parent=${im.parent || '(根)'} children=${im.childCount} → ${im.cutVertexJudgment.conclusion === 'is_cut' ? '割点' : '非割点'}`
  ).join('\n')}
${latestSnapshot.boundaryWarnings.length > 0 ? '\n# 边界提示:\n' + latestSnapshot.boundaryWarnings.map(w => `- ${w.humanMessage}`).join('\n') : ''}`
    : '# 暂无计算结果\n# 请先在"计算沙盘"中运行一次计算'

  const currentGraphData = nodes.length > 0
    ? JSON.stringify({ nodes, edges }, null, 2)
    : sampleData

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 flex flex-col min-w-0 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={16} className="text-cyan-400" />
            <h2 className="text-sm font-medium text-slate-200">可复制命令</h2>
          </div>
          <CopyBlock content={runCommand} language="bash" title="运行命令" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-cyan-400" />
            <h2 className="text-sm font-medium text-slate-200">真实样本数据</h2>
          </div>
          <CopyBlock content={currentGraphData} language="json" title="图数据 (可直接粘贴到沙盘验证)" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-cyan-400" />
            <h2 className="text-sm font-medium text-slate-200">字段映射记录</h2>
          </div>
          <CopyBlock content={fieldMappingSummary} language="text" title="字段映射摘要" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-amber-400" />
            <h2 className="text-sm font-medium text-slate-200">最新计算结果</h2>
          </div>
          <CopyBlock content={latestResult} language="text" title="计算结果" />
        </div>
      </div>

      <div className="w-80 flex flex-col border-l border-slate-700/40 pl-4">
        <div className="flex items-center gap-2 mb-3">
          <History size={14} className="text-slate-400" />
          <h2 className="text-sm font-medium text-slate-200">参数变更日志</h2>
        </div>
        {paramVersions.length === 0 ? (
          <div className="text-xs text-slate-600">暂无参数变更记录</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {paramVersions.slice().reverse().map((pv, idx) => (
              <div key={idx} className="p-3 bg-slate-800/50 rounded border border-slate-700/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-cyan-300">{pv.version}</span>
                  <span className="text-[10px] text-slate-500">{new Date(pv.timestamp).toLocaleString('zh-CN')}</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">{pv.changes}</div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-500">根</span>
                    <span className="text-slate-300 ml-1">{pv.rootId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">偏移</span>
                    <span className="text-slate-300 ml-1">{pv.thresholdOffset}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">换算</span>
                    <span className="text-slate-300 ml-1">×{pv.unitScale}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700/40">
          <h3 className="text-xs font-medium text-slate-300 mb-2">交接要点</h3>
          <div className="space-y-2 text-[10px] text-slate-400 leading-relaxed">
            <div className="p-2 bg-slate-800/50 rounded">
              <div className="text-slate-300 font-medium mb-0.5">字段对齐</div>
              {mappings.length > 0
                ? `${mappings.filter(m => m.status === 'confirmed').length}个已确认, ${mappings.filter(m => m.status === 'pending').length}个待确认, ${mappings.filter(m => m.status === 'rejected').length}个已拒绝`
                : '尚未进行字段映射'}
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <div className="text-slate-300 font-medium mb-0.5">计算快照</div>
              共 {snapshots.length} 次计算, {snapshots.length > 0 ? `最新 ${latestSnapshot?.cutVertices.length} 个割点` : '尚无结果'}
            </div>
            <div className="p-2 bg-slate-800/50 rounded">
              <div className="text-slate-300 font-medium mb-0.5">操作历史</div>
              字段映射操作 {history.length} 条, 参数版本 {paramVersions.length} 个
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
