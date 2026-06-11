import { useMemo, useState } from 'react'
import { Upload, X, AlertTriangle, CheckCircle, Info, ArrowRight } from 'lucide-react'
import { parseImportText } from '@/utils/parser'
import { useStore } from '@/store/useStore'
import type { ImportResultItem, ImportPreview } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ImportModal({ open, onClose }: Props) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(null)
  const previewImport = useStore(s => s.previewImport)
  const commitImport = useStore(s => s.commitImport)

  const parsedItems = useMemo(() => parseImportText(text), [text])

  if (!open) return null

  function handlePreview() {
    setDone(null)
    setPreview(previewImport(parsedItems))
  }

  function handleCommit() {
    if (!preview) return
    const items = [...preview.newItems, ...preview.duplicates.map(d => d.incoming)]
    const result = commitImport(items)
    setDone(result)
  }

  function resetAndClose() {
    setText('')
    setPreview(null)
    setDone(null)
    onClose()
  }

  const sampleText = `来源：审批邮件-张三
ABS-2025-001,125000.00,柜台A
ABS-2025-002,-8000.00,负数冲正
ABS-2025-003,45600.50`

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-16 overflow-y-auto">
      <div className="bg-white rounded shadow-2xl w-full max-w-3xl mx-4 mb-16">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-serif text-lg font-semibold text-ink-800 flex items-center gap-2">
            <Upload size={18} />
            导入审批邮件
          </h2>
          <button onClick={resetAndClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {!done ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                粘贴审批邮件内容或 CSV 格式文本
              </label>
              <textarea
                value={text}
                onChange={e => {
                  setText(e.target.value)
                  setPreview(null)
                }}
                placeholder={`示例格式：\n${sampleText}`}
                className="w-full h-40 px-3 py-2 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink-700/30"
              />
              <p className="text-xs text-slate-500 mt-1">
                识别规则：一行一条；包含「批次/编号」和「金额」关键字；或直接「批次号,金额,来源」。金额负数自动识别为冲正。
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                已识别 <span className="font-semibold text-ink-800">{parsedItems.length}</span> 条记录
              </div>
              <button
                disabled={parsedItems.length === 0}
                onClick={handlePreview}
                className="px-4 py-2 bg-ink-800 text-white rounded text-sm hover:bg-ink-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                预览导入结果
              </button>
            </div>

            {preview && (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                {preview.newItems.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle size={16} className="text-success" />
                      新增记录（{preview.newItems.length}）
                    </h3>
                    <PreviewTable items={preview.newItems} />
                  </section>
                )}
                {preview.duplicates.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Info size={16} className="text-warn" />
                      重复批次（{preview.duplicates.length}）— 不重复入库，金额不翻倍，备注保留不变
                    </h3>
                    <div className="overflow-x-auto rounded border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">批次号</th>
                            <th className="text-left px-3 py-2 font-medium">已有金额</th>
                            <th className="px-2"></th>
                            <th className="text-left px-3 py-2 font-medium">新导入金额</th>
                            <th className="text-left px-3 py-2 font-medium">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.duplicates.map((d, i) => (
                            <tr key={i} className={d.amountChanged ? 'bg-yellow-50' : ''}>
                              <td className="px-3 py-2 font-mono">{d.existing.batchNo}</td>
                              <td className="px-3 py-2 font-mono">{d.existing.amount.toFixed(2)}</td>
                              <td className="px-2 text-slate-400"><ArrowRight size={14} /></td>
                              <td className={`px-3 py-2 font-mono ${d.amountChanged ? 'text-danger font-semibold' : ''}`}>
                                {d.incoming.amount.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                {d.amountChanged ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/30">
                                    <AlertTriangle size={12} /> 金额不一致，保留原值
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted bg-muted/10 px-2 py-0.5 rounded border border-muted/30">
                                    相同，跳过
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {preview.reversals.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={16} className="text-danger" />
                      负数冲正（{preview.reversals.length}）— 将高亮并在报告中单独提示
                    </h3>
                    <PreviewTable items={preview.reversals} highlight />
                  </section>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={resetAndClose}
                    className="px-4 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCommit}
                    className="px-4 py-2 bg-ink-800 text-white rounded text-sm hover:bg-ink-900 transition-colors"
                  >
                    确认导入
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center space-y-3">
            <CheckCircle size={40} className="text-success mx-auto" />
            <div className="text-lg font-serif font-semibold">导入完成</div>
            <div className="text-sm text-slate-600">
              新增 <span className="font-semibold text-success">{done.added}</span> 条，
              跳过重复 <span className="font-semibold text-muted">{done.skipped}</span> 条
            </div>
            <button
              onClick={resetAndClose}
              className="px-5 py-2 bg-ink-800 text-white rounded text-sm hover:bg-ink-900"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewTable({ items, highlight }: { items: ImportResultItem[]; highlight?: boolean }) {
  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium">批次号</th>
            <th className="text-left px-3 py-2 font-medium">金额</th>
            <th className="text-left px-3 py-2 font-medium">来源</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} className={highlight && it.amount < 0 ? 'bg-danger/5' : ''}>
              <td className="px-3 py-2 font-mono">{it.batchNo}</td>
              <td className={`px-3 py-2 font-mono ${it.amount < 0 ? 'text-danger font-semibold' : ''}`}>
                {it.amount.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-slate-600">{it.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
