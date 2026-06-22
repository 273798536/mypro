import { useFieldMappingStore } from '@/stores/fieldMapping'
import { STANDARD_FIELDS } from '@/types'
import { FileUp, Check, X, RotateCcw, Clock, Edit3 } from 'lucide-react'
import { useState } from 'react'

export default function FieldAlignment() {
  const {
    rawInput, mappings, history,
    setRawInput, parseAndGenerate, updateMapping, confirmMapping, rejectMapping, resetMappings,
  } = useFieldMappingStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editReason, setEditReason] = useState('')

  const startEdit = (id: string, currentField: string) => {
    setEditingId(id)
    setEditValue(currentField)
    setEditReason('')
  }

  const saveEdit = (id: string) => {
    if (editValue) {
      updateMapping(id, { guessedField: editValue, reason: editReason || `手动指定为"${editValue}"` })
    }
    setEditingId(null)
  }

  const pendingCount = mappings.filter(m => m.status === 'pending').length
  const confirmedCount = mappings.filter(m => m.status === 'confirmed').length
  const rejectedCount = mappings.filter(m => m.status === 'rejected').length

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    confirmed: 'bg-green-900/40 text-green-300 border-green-700/50',
    rejected: 'bg-red-900/40 text-red-300 border-red-700/50',
  }
  const statusLabel: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    rejected: '已拒绝',
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <FileUp size={16} className="text-cyan-400" />
            <h2 className="text-sm font-medium text-slate-200">数据导入</h2>
          </div>
          <textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder={'粘贴 CSV / JSON 数据，例如:\n\n节点,起点,终点,权重\nA,B,C,1\nB,D,E,2\n\n或 JSON:\n[{"node_id":"A","from":"B","to":"C"}]'}
            className="w-full h-32 bg-[#0d0d1a] border border-slate-700/50 rounded px-3 py-2 text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-600/50 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={parseAndGenerate}
              disabled={!rawInput.trim()}
              className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              解析表头
            </button>
            <button
              onClick={resetMappings}
              className="px-4 py-1.5 text-xs border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 rounded transition-colors"
            >
              <RotateCcw size={12} className="inline mr-1" />
              重置
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-slate-200">待确认映射</h2>
            <div className="flex gap-3 text-[10px]">
              <span className="text-amber-400">{pendingCount} 待确认</span>
              <span className="text-green-400">{confirmedCount} 已确认</span>
              <span className="text-red-400">{rejectedCount} 已拒绝</span>
            </div>
          </div>

          {mappings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-600">
              请先导入数据并解析表头
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900/95 z-10">
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium w-1/5">原字段</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium w-1/5">猜测字段</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium w-2/5">处理理由</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium w-1/5">状态</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium w-1/6">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map(m => (
                    <tr key={m.id} className={`border-b border-slate-800/50 ${m.status === 'confirmed' ? 'bg-green-950/10' : m.status === 'rejected' ? 'bg-red-950/10' : 'bg-slate-800/20'}`}>
                      <td className="py-2 px-3 font-mono text-slate-300">{m.originalField}</td>
                      <td className="py-2 px-3">
                        {editingId === m.id ? (
                          <select
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-full bg-[#0d0d1a] border border-slate-600 rounded px-2 py-0.5 text-xs font-mono text-cyan-300 focus:outline-none"
                          >
                            {STANDARD_FIELDS.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                            <option value="unknown">unknown</option>
                          </select>
                        ) : (
                          <span className={`font-mono ${m.guessedField === 'unknown' ? 'text-red-400' : 'text-cyan-300'}`}>
                            {m.guessedField}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {editingId === m.id ? (
                          <input
                            value={editReason}
                            onChange={e => setEditReason(e.target.value)}
                            placeholder="输入修改理由..."
                            className="w-full bg-[#0d0d1a] border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
                          />
                        ) : (
                          m.reason
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${statusColor[m.status]}`}>
                          {statusLabel[m.status]}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {editingId === m.id ? (
                            <>
                              <button onClick={() => saveEdit(m.id)} className="p-1 text-green-400 hover:bg-green-900/30 rounded transition-colors">
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-700/30 rounded transition-colors">
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              {m.status === 'pending' && (
                                <>
                                  <button onClick={() => confirmMapping(m.id)} className="p-1 text-green-400 hover:bg-green-900/30 rounded transition-colors" title="确认">
                                    <Check size={12} />
                                  </button>
                                  <button onClick={() => rejectMapping(m.id)} className="p-1 text-red-400 hover:bg-red-900/30 rounded transition-colors" title="拒绝">
                                    <X size={12} />
                                  </button>
                                </>
                              )}
                              <button onClick={() => startEdit(m.id, m.guessedField)} className="p-1 text-slate-400 hover:bg-slate-700/30 rounded transition-colors" title="编辑">
                                <Edit3 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="w-72 flex flex-col border-l border-slate-700/40 pl-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-slate-400" />
          <h2 className="text-sm font-medium text-slate-200">映射历史</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {history.length === 0 ? (
            <div className="text-xs text-slate-600">暂无操作记录</div>
          ) : (
            history.slice().reverse().map(h => (
              <div key={h.id} className="border-l-2 border-slate-700 pl-3 py-1">
                <div className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleString('zh-CN')}</div>
                <div className="text-xs text-slate-300">{h.action}</div>
                {h.operatorNote && <div className="text-[10px] text-slate-500 mt-0.5">{h.operatorNote}</div>}
                {h.before && h.after && (
                  <div className="mt-1 text-[10px]">
                    <span className="text-red-400/70 line-through">{h.before.guessedField}</span>
                    <span className="mx-1 text-slate-600">→</span>
                    <span className="text-green-400/80">{h.after.guessedField}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
