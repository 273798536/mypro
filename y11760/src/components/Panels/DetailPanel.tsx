import { X, Database, ArrowRight, AlertTriangle } from 'lucide-react'
import { useGraphStore } from '../../stores/graphStore'
import { useRiskStore } from '../../stores/riskStore'
import { useTraceStore } from '../../stores/traceStore'
import { enterprises, persons, guaranteeContracts, loanBalances, riskLabels, investigationReports, riskScores } from '../../data/mockData'
import { getScoreColor } from '../../engines/scoreEngine'
import type { DataSource } from '../../types'
import ScoreExplanation from './ScoreExplanation'

const sourceColors: Record<DataSource, string> = {
  '工商登记': '#3B82F6',
  '股权穿透': '#F59E0B',
  '合同库': '#10B981',
  '核心系统': '#6366F1',
  '风控模型': '#EF4444',
  '尽调团队': '#EC4899',
}

function SourceBadge({ source }: { source: DataSource }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: sourceColors[source] + '22', color: sourceColors[source] }}
    >
      {source}
    </span>
  )
}

function EnterpriseDetail({ nodeId }: { nodeId: string }) {
  const enterprise = enterprises.find((e) => e.id === nodeId)
  const loans = loanBalances.filter((l) => l.enterpriseId === nodeId)
  const risks = riskLabels.filter((r) => r.targetId === nodeId)
  const score = riskScores.find((s) => s.targetId === nodeId)
  const guaranteed = guaranteeContracts.filter((c) => c.guarantorId === nodeId)
  const guaranteedBy = guaranteeContracts.filter((c) => c.guaranteedId === nodeId)
  const revisions = useTraceStore((s) => s.getRevisionsForEntity(nodeId))
  const selectNode = useGraphStore((s) => s.selectNode)

  if (!enterprise) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{enterprise.name}</h3>
          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">企业</span>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Database size={12} />
          数据来源：
          <SourceBadge source={enterprise.dataSource} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">统一社会信用代码</div>
          <div className="text-gray-300 font-mono text-xs">{enterprise.registration}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">法定代表人</div>
          <div className="text-gray-300">{enterprise.legalRepresentative}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">所属行业</div>
          <div className="text-gray-300">{enterprise.industry}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-500">注册资本</div>
          <div className="text-gray-300">{enterprise.registeredCapital.toLocaleString()}万</div>
        </div>
      </div>

      {score && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2">风险评分</div>
          <ScoreExplanation riskScore={score} />
        </div>
      )}

      {loans.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Database size={12} />
            贷款余额（来源：核心系统）
          </div>
          {loans.map((loan) => (
            <div key={loan.id} className="bg-[#1a1a2e] rounded p-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">当前余额</span>
                <span className="text-white font-mono">{loan.outstandingBalance.toLocaleString()}万</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">授信额度</span>
                <span className="text-gray-400">{loan.totalLimit.toLocaleString()}万</span>
              </div>
              <div className="h-1 bg-gray-700 rounded overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(loan.outstandingBalance / loan.totalLimit) * 100}%`,
                    backgroundColor: getScoreColor((loan.outstandingBalance / loan.totalLimit) * 100),
                  }}
                />
              </div>
              <div className="text-xs text-gray-500">到期日：{loan.dueDate}</div>
            </div>
          ))}
        </div>
      )}

      {risks.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-400" />
            风险标签
          </div>
          <div className="space-y-2">
            {risks.map((risk) => (
              <div
                key={risk.id}
                className={`p-2 rounded ${
                  risk.severity === 'high'
                    ? 'bg-red-500/10 border border-red-500/30'
                    : risk.severity === 'medium'
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-gray-700/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      risk.severity === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : risk.severity === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {risk.severity === 'high' ? '高风险' : risk.severity === 'medium' ? '中风险' : '低风险'}
                  </span>
                  <span className="text-sm text-white">{risk.labelType}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{risk.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <SourceBadge source={risk.source} />
                  <span className="text-[10px] text-gray-500">{risk.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {guaranteed.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2">对外担保（点击查看）</div>
          <div className="space-y-1">
            {guaranteed.map((c) => {
              const targetEnt = enterprises.find((e) => e.id === c.guaranteedId)
              return (
                <button
                  key={c.id}
                  onClick={() => selectNode(c.guaranteedId)}
                  className="w-full text-left bg-[#1a1a2e] hover:bg-[#252545] rounded p-2 flex items-center gap-2 transition-colors"
                >
                  <ArrowRight size={14} className="text-green-400" />
                  <span className="text-sm text-white">{targetEnt?.name ?? c.guaranteedId}</span>
                  <span className="text-xs text-gray-400 ml-auto">{c.guaranteeAmount.toLocaleString()}万</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {guaranteedBy.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2">被担保（点击查看）</div>
          <div className="space-y-1">
            {guaranteedBy.map((c) => {
              const srcEnt = enterprises.find((e) => e.id === c.guarantorId)
              return (
                <button
                  key={c.id}
                  onClick={() => selectNode(c.guarantorId)}
                  className="w-full text-left bg-[#1a1a2e] hover:bg-[#252545] rounded p-2 flex items-center gap-2 transition-colors"
                >
                  <ArrowRight size={14} className="text-blue-400" />
                  <span className="text-sm text-white">{srcEnt?.name ?? c.guarantorId}</span>
                  <span className="text-xs text-gray-400 ml-auto">{c.guaranteeAmount.toLocaleString()}万</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {revisions.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2">修正痕迹</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {revisions.map((rev) => (
              <div key={rev.id} className="bg-[#1a1a2e] rounded p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{rev.targetField}</span>
                  <span className="text-gray-500">{rev.timestamp.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-red-400 line-through">{rev.oldValue}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-green-400">{rev.newValue}</span>
                </div>
                <div className="text-gray-500 mt-1">原因：{rev.reason}</div>
                <div className="text-gray-500">操作人：{rev.operator}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PersonDetail({ nodeId }: { nodeId: string }) {
  const person = persons.find((p) => p.id === nodeId)
  const risks = riskLabels.filter((r) => r.targetId === nodeId)
  const alerts = useRiskStore((s) => s.getAlertsForNode(nodeId))
  const selectNode = useGraphStore((s) => s.selectNode)

  if (!person) return null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white">{person.name}</h3>
          <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">实控人</span>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Database size={12} />
          数据来源：
          <SourceBadge source={person.dataSource} />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">身份证号</span>
          <span className="text-gray-300 font-mono">{person.idNumber}</span>
        </div>
      </div>

      <div className="border-t border-gray-700/50 pt-4">
        <div className="text-xs text-gray-500 mb-2">控制企业（{person.relatedEnterprises.length}家）</div>
        <div className="space-y-1">
          {person.relatedEnterprises.map((eid) => {
            const ent = enterprises.find((e) => e.id === eid)
            return (
              <button
                key={eid}
                onClick={() => selectNode(eid)}
                className="w-full text-left bg-[#1a1a2e] hover:bg-[#252545] rounded p-2 transition-colors"
              >
                <span className="text-sm text-white">{ent?.name ?? eid}</span>
                {ent && <div className="text-xs text-gray-500 mt-1">{ent.industry}</div>}
              </button>
            )
          })}
        </div>
      </div>

      {alerts.filter((a) => a.type === 'samePerson').length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-yellow-400 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} />
            同人多企风险
          </div>
          {alerts
            .filter((a) => a.type === 'samePerson')
            .map((alert, idx) => (
              <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                <p className="text-sm text-white">{alert.description}</p>
              </div>
            ))}
        </div>
      )}

      {risks.length > 0 && (
        <div className="border-t border-gray-700/50 pt-4">
          <div className="text-xs text-gray-500 mb-2">风险标签</div>
          <div className="space-y-2">
            {risks.map((risk) => (
              <div key={risk.id} className="bg-[#1a1a2e] rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-400 font-semibold">
                    {risk.labelType}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DetailPanel() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const selectNode = useGraphStore((s) => s.selectNode)
  const selectedNode = useGraphStore((s) => s.nodes.find((n) => n.id === selectedNodeId))

  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="w-80 bg-[#0f0f1f] border-l border-gray-800 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Database size={48} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">点击节点查看详情</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-[#0f0f1f] border-l border-gray-800 h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <span className="text-sm text-gray-400">节点详情</span>
        <button
          onClick={() => selectNode(null)}
          className="p-1 hover:bg-gray-800 rounded transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode.type === 'enterprise' ? (
          <EnterpriseDetail nodeId={selectedNodeId} />
        ) : (
          <PersonDetail nodeId={selectedNodeId} />
        )}
      </div>
    </div>
  )
}
