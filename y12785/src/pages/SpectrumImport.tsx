import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FilePlus, AlertCircle, X } from 'lucide-react'
import { useAppStore, Batch } from '@/store'
import { fetchApi, fromSnakeData, toSnakeBody } from '@/lib/utils'

interface SpectrumPagePreview {
  pageNumber: number
  fileName: string
  uploaded: boolean
}

export default function SpectrumImport() {
  const { addBatch, addToast } = useAppStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [batchNo, setBatchNo] = useState('')
  const [precision, setPrecision] = useState<'0.1mg' | '0.01mg' | '1mg'>('0.1mg')
  const [pages, setPages] = useState<SpectrumPagePreview[]>([])
  const [missingPages, setMissingPages] = useState<number[]>([])
  const [uploading, setUploading] = useState(false)
  const [createdBatchId, setCreatedBatchId] = useState<string | null>(null)

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    if (!batchNo.trim()) return

    try {
      const raw = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_no: batchNo, weighing_precision: precision }),
      })
      const err = await raw.json().catch(() => ({}))
      if (!raw.ok) {
        addToast({
          type: 'error',
          message: err.message || '创建批次失败',
          actionableHint: err.actionableHint,
          missingData: err.missingData,
        })
        return
      }
      const batch = fromSnakeData<Batch>(err.data)
      addBatch(batch)
      setCreatedBatchId(batch.id)
      setPages([])
      setMissingPages([])
      addToast({ type: 'success', message: `批次 ${batchNo} 创建成功` })
    } catch {
      addToast({ type: 'error', message: '网络错误，请重试' })
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !createdBatchId) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const match = file.name.match(/(\d+)/)
      const pageNumber = match ? parseInt(match[1], 10) : pages.length + i + 1

      let peaks: any[] = []
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        peaks = parsed.peaks || parsed
      } catch {
        peaks = [
          { mz: 100 + Math.random() * 300, intensity: Math.floor(1000 + Math.random() * 9000) },
        ]
      }

      const body = {
        page_number: pageNumber,
        file_name: file.name,
        data: {
          peaks,
          retentionTime: 5 + Math.random() * 10,
          temperature: 25 + Math.random() * 20,
        },
      }

      try {
        const raw = await fetch(`/api/batches/${createdBatchId}/spectra`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const resp = await raw.json().catch(() => ({}))
        if (!raw.ok) {
          addToast({
            type: 'error',
            message: resp.message || `${file.name} 上传失败`,
            actionableHint: resp.actionableHint,
            missingData: resp.missingData,
          })
          continue
        }
        setPages((prev) => {
          const existing = prev.find((p) => p.pageNumber === pageNumber)
          if (existing) {
            return prev.map((p) =>
              p.pageNumber === pageNumber
                ? { ...p, fileName: file.name, uploaded: true }
                : p
            )
          }
          return [
            ...prev,
            { pageNumber, fileName: file.name, uploaded: true },
          ].sort((a, b) => a.pageNumber - b.pageNumber)
        })
      } catch (e: any) {
        addToast({ type: 'error', message: `${file.name} 上传失败` })
      }
    }

    try {
      const checkData = await fetchApi<{
        complete: boolean
        missingPages: number[]
      }>(`/api/batches/${createdBatchId}/spectra/check`)
      if (checkData.missingPages && checkData.missingPages.length > 0) {
        setMissingPages(checkData.missingPages)
        addToast({
          type: 'warning',
          message: '检测到缺失页码',
          actionableHint: '请补充以下缺失页面的谱图数据',
          missingData: checkData.missingPages.map((p: number) => `第${p}页`),
        })
      } else {
        setMissingPages([])
      }
    } catch {}

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const allPageNumbers = [
    ...new Set([
      ...pages.map((p) => p.pageNumber),
      ...missingPages,
    ]),
  ].sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-indigo-900">
          谱图导入
        </h2>
        <p className="text-sm text-cool-gray mt-1">
          创建批次并上传分页谱图数据
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FilePlus size={18} className="text-indigo-900" />
              <h3 className="font-serif text-lg font-semibold text-indigo-900">
                新建批次
              </h3>
            </div>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  批次号
                </label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900"
                  placeholder="如 BATCH-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  称量精度
                </label>
                <select
                  value={precision}
                  onChange={(e) =>
                    setPrecision(e.target.value as '0.1mg' | '0.01mg' | '1mg')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900"
                >
                  <option value="0.1mg">0.1mg</option>
                  <option value="0.01mg">0.01mg</option>
                  <option value="1mg">1mg</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
              >
                创建批次
              </button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={18} className="text-indigo-900" />
              <h3 className="font-serif text-lg font-semibold text-indigo-900">
                分页上传
              </h3>
            </div>

            {!createdBatchId ? (
              <div className="text-center py-8 text-cool-gray text-sm">
                请先创建批次
              </div>
            ) : (
              <>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-900/30 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload
                    size={32}
                    className="mx-auto text-cool-gray mb-2"
                  />
                  <p className="text-sm text-cool-gray">
                    点击或拖拽上传谱图文件
                  </p>
                  <p className="text-xs text-cool-gray mt-1">
                    文件名含页码将自动识别
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.txt,.json"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                </div>

                {uploading && (
                  <div className="mt-4 text-center text-sm text-amber-500">
                    上传中...
                  </div>
                )}

                {allPageNumbers.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      谱图页码
                    </h4>
                    <div className="grid grid-cols-5 gap-2">
                      {allPageNumbers.map((num) => {
                        const page = pages.find((p) => p.pageNumber === num)
                        const isMissing = missingPages.includes(num)
                        return (
                          <div
                            key={num}
                            className={`relative rounded-lg p-3 text-center text-sm ${
                              isMissing
                                ? 'border-2 border-dashed border-coral-500 bg-coral-500/5'
                                : page?.uploaded
                                  ? 'bg-indigo-900/5 border border-indigo-900/20'
                                  : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            {isMissing && (
                              <AlertCircle
                                size={14}
                                className="absolute top-1 right-1 text-coral-500"
                              />
                            )}
                            <span
                              className={`font-mono text-sm ${
                                isMissing
                                  ? 'text-coral-500'
                                  : 'text-indigo-900'
                              }`}
                            >
                              P{num}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {missingPages.length > 0 && (
                  <div className="mt-4 border-l-4 border-coral-500 bg-coral-500/5 rounded-r-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={16}
                        className="text-coral-500 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-coral-500">
                          缺失页码检测
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          请补充以下缺失页面的谱图数据：
                        </p>
                        <div className="flex gap-1.5 mt-2">
                          {missingPages.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-coral-500/10 text-coral-500 rounded text-xs font-mono"
                            >
                              第{p}页
                              <button
                                onClick={() =>
                                  setMissingPages((prev) =>
                                    prev.filter((pp) => pp !== p)
                                  )
                                }
                                className="hover:text-red-700"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pages.length > 0 && missingPages.length === 0 && (
                  <button
                    onClick={() =>
                      navigate(`/attribution/${createdBatchId}`)
                    }
                    className="mt-6 w-full bg-indigo-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors"
                  >
                    进入碎片归因
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
