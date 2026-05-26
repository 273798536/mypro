import { Info, FileText, AlertTriangle, History, Edit2 } from 'lucide-react'
import { useBondStore } from '../../stores/bondStore'
import { useScenarioStore } from '../../stores/scenarioStore'
import { useUIStore } from '../../stores/uiStore'
import { formatAmount, getAnomalyTypeLabel } from '../../utils/dataValidator'
import { mapRatingToColor } from '../../utils/colorMapper'
import { useState } from 'react'

export function DetailPanel() {
  const selectedBar = useUIStore((state) => state.selectedBar)
  const setSelectedBar = useUIStore((state) => state.setSelectedBar)
  const cashFlows = useBondStore((state) => state.cashFlows)
  const holdings = useBondStore((state) => state.holdings)
  const correctionHistory = useBondStore((state) => state.correctionHistory)
  const addCorrection = useBondStore((state) => state.addCorrection)
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)

  const [isEditing, setIsEditing] = useState(false)
  const [editField, setEditField] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editReason, setEditReason] = useState('')

  const selectedCashFlow = selectedBar
    ? cashFlows.find((cf) => cf.id === selectedBar.cashFlowId)
    : null

  const relatedBond = selectedCashFlow
    ? holdings.find((b) => b.bondCode === selectedCashFlow.bondCode)
    : null

  const relatedCorrections = correctionHistory.filter(
    (c) => c.source === selectedCashFlow?.source && c.sourceLine === selectedCashFlow?.sourceLine
  )

  const handleSaveEdit = () => {
    if (!selectedCashFlow || !editField || !editValue.trim()) return

    addCorrection({
      id: `corr-${Date.now()}`,
      timestamp: new Date().toISOString(),
      field: editField,
      oldValue: selectedCashFlow[editField as keyof typeof selectedCashFlow]?.toString() || '',
      newValue: editValue.trim(),
      reason: editReason.trim() || '未说明',
      source: selectedCashFlow.source,
      sourceLine: selectedCashFlow.sourceLine,
      operator: '当前用户',
    })

    setIsEditing(false)
    setEditField('')
    setEditValue('')
    setEditReason('')
  }

  if (!selectedCashFlow) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[#21262d]">
          <h2 className="text-sm font-semibold text-[#c9d1d9] flex items-center gap-2">
            <Info size={16} className="text-[#8957e5]" />
            数据明细
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <FileText size={40} className="mx-auto text-[#30363d] mb-3" />
            <p className="text-sm text-[#6e7681]">点击3D瀑布图中的柱子</p>
            <p className="text-xs text-[#6e7681] mt-1">查看详细数据</p>
          </div>
        </div>
      </div>
    )
  }

  const severityColor = selectedCashFlow.anomaly === 'negative_cashflow'
    ? 'bg-[#f85149]'
    : selectedCashFlow.anomaly === 'scenario_duplicate'
    ? 'bg-[#f59e0b]'
    : 'bg-[#f97316]'

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#21262d] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#c9d1d9] flex items-center gap-2">
          <Info size={16} className="text-[#8957e5]" />
          数据明细
        </h2>
        <button
          onClick={() => setSelectedBar(null)}
          className="text-xs text-[#6e7681] hover:text-[#c9d1d9] px-2 py-1 rounded
            hover:bg-[#21262d] transition-colors"
        >
          关闭
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedCashFlow.anomaly && (
          <div className={`p-3 rounded-lg border ${
            selectedCashFlow.anomaly === 'negative_cashflow'
              ? 'bg-[#f85149]/10 border-[#f85149]/30'
              : 'bg-[#f59e0b]/10 border-[#f59e0b]/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className={
                selectedCashFlow.anomaly === 'negative_cashflow' ? 'text-[#f85149]' : 'text-[#f59e0b]'
              } />
              <span className={`text-xs font-medium ${
                selectedCashFlow.anomaly === 'negative_cashflow' ? 'text-[#f85149]' : 'text-[#f59e0b]'
              }`}>
                {getAnomalyTypeLabel(selectedCashFlow.anomaly)}
              </span>
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${severityColor} text-white`}>
                {selectedCashFlow.anomaly === 'negative_cashflow' ? '严重' : '警告'}
              </span>
            </div>
            <p className="text-xs text-[#c9d1d9]">{selectedCashFlow.anomalyDesc}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-medium text-[#8b949e] mb-2">债券信息</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6e7681]">债券代码</span>
                <span className="text-[#58a6ff] font-mono">{selectedCashFlow.bondCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">债券名称</span>
                <span className="text-[#c9d1d9]">{relatedBond?.bondName || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">评级</span>
                <span
                  className="font-mono px-1.5 rounded"
                  style={{
                    backgroundColor: relatedBond
                      ? mapRatingToColor(relatedBond.rating) + '30'
                      : 'transparent',
                    color: relatedBond ? mapRatingToColor(relatedBond.rating) : '#6e7681',
                  }}
                >
                  {relatedBond?.rating || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">久期</span>
                <span className="text-[#c9d1d9] font-mono">{relatedBond?.duration || '-'}年</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">持仓金额</span>
                <span className="text-[#c9d1d9] font-mono">
                  {relatedBond ? formatAmount(relatedBond.holdingAmount) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-[#8b949e] mb-2">现金流信息</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6e7681]">日期</span>
                <span className="text-[#c9d1d9] font-mono">{selectedCashFlow.flowDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">金额</span>
                <span className={`font-mono ${
                  selectedCashFlow.amount < 0 ? 'text-[#f85149]' : 'text-[#00d4aa]'
                }`}>
                  {formatAmount(selectedCashFlow.amount)}元
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">类型</span>
                <span className="text-[#c9d1d9]">
                  {selectedCashFlow.flowType === 'coupon' ? '票息' :
                    selectedCashFlow.flowType === 'principal' ? '本金' :
                    selectedCashFlow.flowType === 'call' ? '赎回' : '回售'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">情景ID</span>
                <span className="text-[#c9d1d9] font-mono text-[10px]">
                  {selectedCashFlow.scenarioId}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-[#8b949e] mb-2">数据来源</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#6e7681]">源文件</span>
                <span className="text-[#c9d1d9] font-mono">{selectedCashFlow.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6e7681]">原始行号</span>
                <span className="text-[#f59e0b] font-mono">第 {selectedCashFlow.sourceLine} 行</span>
              </div>
            </div>
          </div>
        </div>

        {relatedCorrections.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-[#8b949e] mb-2 flex items-center gap-1.5">
              <History size={12} />
              修正历史 ({relatedCorrections.length})
            </h3>
            <div className="space-y-2">
              {relatedCorrections.map((corr) => (
                <div key={corr.id} className="p-2 rounded bg-[#161b22] border border-[#30363d]">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-[#6e7681]">
                      {new Date(corr.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="text-[#8b949e]">
                      {corr.field}: <span className="text-[#f85149]">{corr.oldValue}</span>
                      <span className="text-[#6e7681]"> → </span>
                      <span className="text-[#00d4aa]">{corr.newValue}</span>
                    </div>
                    <div className="text-[10px] text-[#6e7681]">
                      原因: {corr.reason} | 操作人: {corr.operator}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded
              bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9]
              text-xs transition-colors"
          >
            <Edit2 size={12} />
            添加修正记录
          </button>
        ) : (
          <div className="p-3 rounded bg-[#161b22] border border-[#30363d] space-y-2">
            <div className="text-xs text-[#8b949e] mb-2">修正该条数据</div>
            <select
              value={editField}
              onChange={(e) => setEditField(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1
                text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="">选择字段...</option>
              <option value="flowDate">现金流日期</option>
              <option value="amount">金额</option>
              <option value="flowType">类型</option>
              <option value="scenarioId">情景</option>
            </select>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="新值"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1
                text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
            />
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="修正原因（可选）"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-1
                text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-1.5 rounded bg-[#238636] text-white text-xs
                  hover:bg-[#2ea043] transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditField('')
                  setEditValue('')
                  setEditReason('')
                }}
                className="flex-1 py-1.5 rounded bg-[#21262d] text-[#8b949e] text-xs
                  hover:bg-[#30363d] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}