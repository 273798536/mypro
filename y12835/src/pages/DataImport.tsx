import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, Copy, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react'

type Step = 1 | 2 | 3

interface ImportCheckResult {
  new_count: number; duplicate_count: number; conflict_count: number
  duplicates: { existing_id: string; incoming: Record<string, any>; match_field: string }[]
  conflicts: { existing_id: string; incoming: Record<string, any>; conflict_fields: string[] }[]
}

interface ImportResult {
  imported: number; skipped: number; overwritten: number; anomaly_detected_ids: string[]
}

type Resolution = 'skip' | 'overwrite' | 'new'

const RESOLUTION_LABELS: Record<Resolution, { label: string; color: string }> = {
  skip: { label: '跳过', color: 'text-gray-600 bg-gray-100 border-gray-300' },
  overwrite: { label: '覆盖', color: 'text-amber-700 bg-amber-100 border-amber-300' },
  new: { label: '新增', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' },
}

export default function DataImport() {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [records, setRecords] = useState<Record<string, any>[]>([])
  const [checkResult, setCheckResult] = useState<ImportCheckResult | null>(null)
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseFile = async (f: File) => {
    setFile(f); setError('')
    try {
      const text = await f.text()
      let parsed: Record<string, any>[]
      if (f.name.endsWith('.json')) {
        parsed = JSON.parse(text)
      } else {
        const lines = text.trim().split('\n')
        const headers = lines[0].split(',').map(h => h.trim())
        parsed = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim())
          const obj: Record<string, any> = {}
          headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
          if (obj.passage_number) obj.passage_number = Number(obj.passage_number)
          if (obj.viability_rate) obj.viability_rate = Number(obj.viability_rate)
          return obj
        })
      }
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('文件内容为空或格式不正确')
      setRecords(parsed)
      await checkDuplicates(parsed)
    } catch (e: any) {
      setError(e.message || '文件解析失败'); setFile(null)
    }
  }

  const checkDuplicates = async (recs: Record<string, any>[]) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/import/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: recs }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || '检查重复失败')
      setCheckResult(json.data); setStep(2)
      const init: Record<string, Resolution> = {}
      json.data.duplicates.forEach((d: any) => { init[d.existing_id] = 'skip' })
      json.data.conflicts.forEach((c: any) => { init[c.existing_id] = 'skip' })
      setResolutions(init)
    } catch (e: any) {
      setError(e.message || '网络请求失败')
    } finally { setLoading(false) }
  }

  const doImport = async () => {
    if (!checkResult) return
    setLoading(true); setError('')
    try {
      const newRecs = records.filter(r => {
        const isDup = checkResult.duplicates.some((d: any) =>
          d.incoming.cell_line === r.cell_line && d.incoming.date === r.date)
        const isConflict = checkResult.conflicts.some((c: any) =>
          c.incoming.cell_line === r.cell_line && c.incoming.date === r.date)
        return !isDup && !isConflict
      })

      const overwriteRecs = Object.entries(resolutions)
        .filter(([, v]) => v === 'overwrite')
        .flatMap(([id]) => {
          const dup = checkResult.duplicates.find((d: any) => d.existing_id === id)
          const conf = checkResult.conflicts.find((c: any) => c.existing_id === id)
          return dup ? [dup.incoming] : conf ? [conf.incoming] : []
        })

      const newExtraRecs = Object.entries(resolutions)
        .filter(([, v]) => v === 'new')
        .flatMap(([id]) => {
          const dup = checkResult.duplicates.find((d: any) => d.existing_id === id)
          const conf = checkResult.conflicts.find((c: any) => c.existing_id === id)
          return dup ? [dup.incoming] : conf ? [conf.incoming] : []
        })

      const allRecs = [...newRecs, ...overwriteRecs, ...newExtraRecs]
      if (allRecs.length === 0) { setStep(3); setImportResult({ imported: 0, skipped: records.length, overwritten: 0, anomaly_detected_ids: [] }); return }

      const res = await fetch('/api/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: allRecs, resolution: 'skip' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || '导入失败')
      setImportResult(json.data); setStep(3)
    } catch (e: any) {
      setError(e.message || '网络请求失败')
    } finally { setLoading(false) }
  }

  const reset = () => {
    setStep(1); setFile(null); setRecords([]); setCheckResult(null)
    setResolutions({}); setImportResult(null); setError('')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">数据导入</h1>

      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>{s}</span>
            <span className={step >= s ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
              {s === 1 ? '上传文件' : s === 2 ? '检查重复' : '导入结果'}
            </span>
            {s < 3 && <ArrowRight className="h-4 w-4 text-gray-300" />}
          </div>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-4 w-4" /><span className="text-sm">{error}</span></div>}

      {step === 1 && (
        <div className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; f && parseFile(f) }}>
          <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-300">拖拽 CSV / JSON 文件到此处，或</p>
          <button onClick={() => fileRef.current?.click()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-800">
            选择文件
          </button>
          <input ref={fileRef} type="file" accept=".csv,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; f && parseFile(f) }} />
          {file && <p className="mt-3 text-sm text-gray-500"><FileText className="mr-1 inline h-4 w-4" />{file.name}</p>}
          {loading && <p className="mt-2 text-sm text-primary">检查中...</p>}
        </div>
      )}

      {step === 2 && checkResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard icon={CheckCircle2} label="新增" count={checkResult.new_count} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" />
            <SummaryCard icon={Copy} label="重复" count={checkResult.duplicate_count} color="text-amber-600 bg-amber-50 dark:bg-amber-900/20" />
            <SummaryCard icon={AlertTriangle} label="冲突" count={checkResult.conflict_count} color="text-red-600 bg-red-50 dark:bg-red-900/20" />
          </div>

          {(checkResult.duplicates.length > 0 || checkResult.conflicts.length > 0) && (
            <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">重复与冲突记录</h3>
              <div className="space-y-3">
                {checkResult.duplicates.map((d, i) => (
                  <div key={`dup-${i}`} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="text-sm">
                      <span className="font-medium text-amber-800 dark:text-amber-300">重复</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                        {d.incoming.cell_line} · {d.incoming.date} · {d.incoming.type} · P{d.incoming.passage_number}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">匹配: {d.match_field}</span>
                    </div>
                    <select value={resolutions[d.existing_id] ?? 'skip'}
                      onChange={e => setResolutions(prev => ({ ...prev, [d.existing_id]: e.target.value as Resolution }))}
                      className="rounded border bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                      {Object.entries(RESOLUTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                ))}
                {checkResult.conflicts.map((c, i) => (
                  <div key={`conf-${i}`} className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-800 dark:text-red-300">冲突</span>
                      <select value={resolutions[c.existing_id] ?? 'skip'}
                        onChange={e => setResolutions(prev => ({ ...prev, [c.existing_id]: e.target.value as Resolution }))}
                        className="rounded border bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                        {Object.entries(RESOLUTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {c.incoming.cell_line} · {c.incoming.date} · {c.incoming.type} · P{c.incoming.passage_number}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.conflict_fields.map(f => (
                        <span key={f} className="rounded bg-red-200 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-800 dark:text-red-200">
                          冲突字段: {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            重复导入场景：系统会按细胞系+日期+类型+代次自动检测重复记录
          </p>

          <div className="flex gap-3">
            <button onClick={reset} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
              <RotateCcw className="mr-1 inline h-4 w-4" />重新上传
            </button>
            <button onClick={doImport} disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50">
              {loading ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && importResult && (
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">导入完成</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
              <p className="text-2xl font-bold text-emerald-600">{importResult.imported}</p>
              <p className="text-sm text-emerald-700">新增</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-700">
              <p className="text-2xl font-bold text-gray-600">{importResult.skipped}</p>
              <p className="text-sm text-gray-500">跳过</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4 text-center dark:bg-amber-900/20">
              <p className="text-2xl font-bold text-amber-600">{importResult.overwritten}</p>
              <p className="text-sm text-amber-700">覆盖</p>
            </div>
          </div>
          {importResult.anomaly_detected_ids.length > 0 && (
            <p className="text-sm text-amber-600">检测到 {importResult.anomaly_detected_ids.length} 条异常，请前往异常复核页面查看</p>
          )}
          <button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-800">
            继续导入
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, count, color }: { icon: typeof CheckCircle2; label: string; count: number; color: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}>
      <Icon className="h-5 w-5" />
      <div><p className="text-2xl font-bold">{count}</p><p className="text-xs opacity-80">{label}</p></div>
    </div>
  )
}
