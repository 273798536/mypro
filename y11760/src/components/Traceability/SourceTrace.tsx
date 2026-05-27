import { Database, History, AlertCircle, ChevronRight } from 'lucide-react'
import { useTraceStore } from '../../stores/traceStore'
import { useGraphStore } from '../../stores/graphStore'
import { enterprises, persons, guaranteeContracts, riskLabels, investigationReports } from '../../data/mockData'
import type { DataSource, DataRevision } from '../../types'

const sourceConfig: Record<DataSource, { color: string; icon: string; description: string }> = {
  '工商登记': { color: '#3B82F6', icon: '🏢', description: '来自国家企业信用信息公示系统' },
  '股权穿透': { color: '#F59E0B', icon: '🔗', description: '通过股权结构逐层穿透分析' },
  '合同库': { color: '#10B981', icon: '📄', description: '来自担保合同管理系统' },
  '核心系统': { color: '#6366F1', icon: '💳', description: '来自银行核心业务系统' },
  '风控模型': { color: '#EF4444', icon: '⚠️', description: '由风控模型自动计算标记' },
  '尽调团队': { color: '#EC4899', icon: '👥', description: '来自尽调团队实地调查报告' },
}

function SourceLegend() {
  return (
    <div className="bg-[#1a1a2e] rounded-lg p-4">
      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Database size={14} />
        数据来源说明
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(sourceConfig).map(([source, config]) => (
          <div key={source} className="flex items-start gap-2">
            <span className="text-lg">{config.icon}</span>
            <div>
              <div
                className="text-xs font-semibold"
                style={{ color: config.color }}
              >
                {source}
              </div>
              <div className="text-[10px] text-gray-500">{config.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RevisionItem({ revision }: { revision: DataRevision }) {
  const targetEnt = enterprises.find((e) => e.id === revision.targetEntityId)
  const targetPer = persons.find((p) => p.id === revision.targetEntityId)
  const targetName = targetEnt?.name ?? targetPer?.name ?? revision.targetEntityId

  return (
    <div className="bg-[#1a1a2e] rounded-lg p-3 border-l-2 border-yellow-500/50">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white font-medium">{targetName}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            <span className="text-yellow-400">{revision.targetField}</span>
            {' · 操作人：'}{revision.operator}
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          {new Date(revision.timestamp).toLocaleString('zh-CN')}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 text-sm">
        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded line-through">
          {revision.oldValue}
        </span>
        <ChevronRight size={14} className="text-gray-500" />
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
          {revision.newValue}
        </span>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        <span className="text-gray-500">原因：</span>{revision.reason}
      </div>

      {revision.sourceRef && (
        <div className="mt-1 text-xs text-gray-500">
          <span className="text-gray-500">参考：</span>
          <span className="text-blue-400">{revision.sourceRef}</span>
        </div>
      )}
    </div>
  )
}

function DataSourceDisplay({ source, value }: { source: DataSource; value: string }) {
  const config = sourceConfig[source]
  return (
    <div className="flex items-start gap-2 bg-[#1a1a2e] rounded p-2">
      <span className="text-lg">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold"
            style={{ color: config.color }}
          >
            {source}
          </span>
        </div>
        <div className="text-sm text-gray-300 mt-0.5 truncate">{value}</div>
        <div className="text-[10px] text-gray-500">{config.description}</div>
      </div>
    </div>
  )
}

function EnterpriseSourceTrace({ nodeId }: { nodeId: string }) {
  const enterprise = enterprises.find((e) => e.id === nodeId)
  const contracts = guaranteeContracts.filter(
    (c) => c.guarantorId === nodeId || c.guaranteedId === nodeId
  )
  const loans = guaranteeContracts.filter((c) => c.guarantorId === nodeId)
  const risks = riskLabels.filter((r) => r.targetId === nodeId)
  const reports = investigationReports.filter((r) => contracts.some((c) => c.id === r.contractId))

  if (!enterprise) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">{enterprise.name} - 数据溯源</h3>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">基本信息</h4>
        <DataSourceDisplay source={enterprise.dataSource} value={`注册资本${enterprise.registeredCapital}万 · ${enterprise.industry}`} />
      </div>

      {contracts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">担保合同（{contracts.length}条）</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {contracts.map((c) => (
              <DataSourceDisplay
                key={c.id}
                source={c.dataSource}
                value={`${c.guarantorId === nodeId ? '对外担保' : '被担保'} ${c.guaranteeAmount}万 · ${c.guaranteeType}`}
              />
            ))}
          </div>
        </div>
      )}

      {risks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            风险标签（{risks.length}条）
          </h4>
          <div className="space-y-2">
            {risks.map((r) => (
              <DataSourceDisplay
                key={r.id}
                source={r.source}
                value={`[${r.severity === 'high' ? '高' : r.severity === 'medium' ? '中' : '低'}] ${r.labelType}：${r.description}`}
              />
            ))}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">调查报告（{reports.length}份）</h4>
          <div className="space-y-2">
            {reports.map((r) => (
              <DataSourceDisplay
                key={r.id}
                source={r.dataSource}
                value={`${r.title} · ${r.author} · ${r.date}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SourceTrace() {
  const { revisions } = useTraceStore()
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const selectedNode = useGraphStore((s) => s.nodes.find((n) => n.id === selectedNodeId))

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <SourceLegend />

      {revisions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <History size={14} />
            修正痕迹（{revisions.length}条）
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {revisions.map((rev) => (
              <RevisionItem key={rev.id} revision={rev} />
            ))}
          </div>
        </div>
      )}

      {selectedNode && selectedNode.type === 'enterprise' && selectedNodeId && (
        <div className="border-t border-gray-700/50 pt-4">
          <EnterpriseSourceTrace nodeId={selectedNodeId} />
        </div>
      )}

      {!selectedNode && (
        <div className="text-center text-gray-500 py-8">
          <Database size={48} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">点击企业节点查看详细数据溯源</p>
        </div>
      )}
    </div>
  )
}
