import { useRef, useState } from 'react'
import { Upload, Loader2, FileUp, Info } from 'lucide-react'
import { api } from '@/api/client'
import { useUiStore } from '@/store/useUi'
import { Modal } from './Modal'

const TEMPLATE = `record_id,model_version,prompt,response_a,response_b,human_label,rm_prediction,annotator
rec-001,v1.2,"用一句话解释递归","函数调用自身。","递归是一种函数通过调用自身处理更小子问题的技术。",a,b,alice`

export function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onImported: () => void
}) {
  const toast = useUiStore((s) => s.toast)
  const [csv, setCsv] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const text = await file.text()
    setCsv(text)
    if (!label) setLabel(file.name.replace(/\.csv$/i, ''))
  }

  const handleImport = async () => {
    if (!csv.trim()) {
      toast('请先选择文件或粘贴 CSV 内容', 'error')
      return
    }
    setBusy(true)
    try {
      const result = await api.importCsv(csv, label || undefined)
      toast(
        `导入完成：新增 ${result.imported} / 更新 ${result.updated} / 总计 ${result.total}（版本 ${result.label}）`,
        'success',
      )
      setCsv('')
      setLabel('')
      onImported()
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title="导入 / 补录标注"
      subtitle="按 record_id 幂等 upsert，已有结论不会被覆盖"
      footer={
        <>
          <button
            className="btn-ghost"
            onClick={() => {
              setCsv(TEMPLATE)
              if (!label) setLabel('手动补录')
            }}
          >
            填入模板
          </button>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn-primary" onClick={handleImport} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            开始导入
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-ink-900/40 px-4 py-6 text-center transition hover:border-signal/40"
          onClick={() => fileRef.current?.click()}
          role="button"
        >
          <FileUp className="h-6 w-6 text-zinc-500" />
          <div className="text-sm text-zinc-300">点击选择 CSV 文件</div>
          <div className="text-xs text-zinc-500">支持 UTF-8 编码，首行需为表头</div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </div>

        <div>
          <label className="label">版本标签（可选）</label>
          <input
            className="input font-mono text-xs"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="留空则用时间戳自动生成"
          />
        </div>

        <div>
          <label className="label">CSV 内容</label>
          <textarea
            className="input min-h-[160px] resize-y font-mono text-xs leading-relaxed"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={TEMPLATE}
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-ink-900/50 px-3 py-2.5 text-xs text-zinc-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
          <div className="leading-relaxed">
            必填列：<span className="font-mono text-zinc-300">record_id, model_version, prompt, response_a, response_b, human_label</span>
            ；可选：<span className="font-mono text-zinc-300">rm_prediction, annotator</span>。首份示例数据位于
            <span className="font-mono text-signal"> samples/annotations.csv</span>。重导入同一 record_id 会更新数据但保留已有结论，补录仅追加新记录。
          </div>
        </div>
      </div>
    </Modal>
  )
}
