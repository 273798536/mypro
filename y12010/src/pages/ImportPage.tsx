import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, Eye, CheckCircle, AlertTriangle, RotateCcw, Trash2, X } from 'lucide-react'
import { api } from '@/utils/api'

type FileType = 'margin_flow' | 'compliance_proof'
type TaskStatus = 'previewing' | 'confirmed' | 'discarded'
type BadRowReason = 'empty_row' | 'remark_row' | 'missing_column' | 'format_error'
type PreviewTab = 'valid' | 'bad'

interface ImportTask {
  id: string
  fileName: string
  fileType: FileType
  totalRows: number
  validRows: number
  badRows: number
  status: TaskStatus
  createdAt?: string
}

interface BadRow {
  id: string
  rowNumber: number
  rawContent: string
  reason: BadRowReason
}

const FILE_TYPE_LABELS: Record<FileType, string> = {
  margin_flow: '保证金流水',
  compliance_proof: '履约证明',
}

const STATUS_BADGE: Record<TaskStatus, { label: string; cls: string }> = {
  previewing: { label: '预览中', cls: 'bg-blue-100 text-blue-800' },
  confirmed: { label: '已确认', cls: 'bg-emerald-100 text-emerald-800' },
  discarded: { label: '已丢弃', cls: 'bg-gray-100 text-gray-600' },
}

const REASON_BADGE: Record<BadRowReason, { label: string; cls: string }> = {
  empty_row: { label: '空行', cls: 'bg-gray-100 text-gray-600' },
  remark_row: { label: '备注行', cls: 'bg-blue-100 text-blue-800' },
  missing_column: { label: '缺列', cls: 'bg-amber-100 text-amber-800' },
  format_error: { label: '格式错误', cls: 'bg-red-100 text-red-800' },
}

export default function ImportPage() {
  const [fileType, setFileType] = useState<FileType>('margin_flow')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tasks, setTasks] = useState<ImportTask[]>([])
  const [previewTask, setPreviewTask] = useState<ImportTask | null>(null)
  const [validRows, setValidRows] = useState<any[]>([])
  const [badRows, setBadRows] = useState<BadRow[]>([])
  const [activeTab, setActiveTab] = useState<PreviewTab>('valid')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', fileType)
    setUploading(true)
    try {
      const res = await api.importData.upload(formData)
      const task: ImportTask = {
        id: res.taskId,
        fileName: res.fileName,
        fileType: res.fileType,
        totalRows: res.totalRows,
        validRows: res.validRows,
        badRows: res.badRows,
        status: 'previewing',
        createdAt: new Date().toISOString(),
      }
      setTasks(prev => [task, ...prev])
      setPreviewTask(task)
      setValidRows(res.validData || [])
      setBadRows(res.badData || [])
      setActiveTab('valid')
      showToast(`文件 ${file.name} 上传成功`)
    } catch (e: any) {
      showToast(e.message || '上传失败', 'error')
    } finally {
      setUploading(false)
    }
  }, [fileType, showToast])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handlePreview = useCallback(async (task: ImportTask) => {
    try {
      const [previewRes, badRes] = await Promise.all([
        api.importData.preview(task.id),
        api.importData.badRows(task.id),
      ])
      setPreviewTask(task)
      setValidRows(previewRes.previewRows || previewRes.validRows || [])
      setBadRows(Array.isArray(badRes) ? badRes : (badRes.badRows || []))
      setActiveTab('valid')
    } catch (e: any) {
      showToast(e.message || '预览失败', 'error')
    }
  }, [showToast])

  const handleConfirm = useCallback(async (taskId: string) => {
    setConfirming(taskId)
    try {
      await api.importData.confirm(taskId)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'confirmed' as TaskStatus } : t))
      if (previewTask?.id === taskId) {
        setPreviewTask(prev => prev ? { ...prev, status: 'confirmed' } : null)
      }
      showToast('导入确认成功')
    } catch (e: any) {
      showToast(e.message || '确认失败', 'error')
    } finally {
      setConfirming(null)
    }
  }, [previewTask, showToast])

  const handleRestore = useCallback(async (rowId: string) => {
    try {
      const res = await api.importData.restoreBadRow(rowId)
      setBadRows(prev => prev.filter(r => r.id !== rowId))
      if (previewTask) {
        setPreviewTask(prev => prev ? { ...prev, validRows: prev.validRows + 1, badRows: prev.badRows - 1 } : null)
        setTasks(prev => prev.map(t => t.id === previewTask.id ? { ...t, validRows: t.validRows + 1, badRows: t.badRows - 1 } : t))
      }
    } catch (e: any) {
      showToast(e.message || '恢复失败', 'error')
    }
  }, [previewTask, showToast])

  const handleDiscard = useCallback(async (rowId: string) => {
    try {
      const res = await api.importData.discardBadRow(rowId)
      setBadRows(prev => prev.filter(r => r.id !== rowId))
      if (previewTask) {
        setPreviewTask(prev => prev ? { ...prev, badRows: prev.badRows - 1 } : null)
        setTasks(prev => prev.map(t => t.id === previewTask.id ? { ...t, badRows: t.badRows - 1 } : t))
      }
    } catch (e: any) {
      showToast(e.message || '丢弃失败', 'error')
    }
  }, [previewTask, showToast])

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-body">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-teal-700 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-display font-bold text-slate-800">数据导入与清洗</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-slate-600">文件类型</label>
            <div className="flex gap-2">
              {(Object.keys(FILE_TYPE_LABELS) as FileType[]).map(ft => (
                <button
                  key={ft}
                  onClick={() => setFileType(ft)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${fileType === ft ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {FILE_TYPE_LABELS[ft]}
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/50'}`}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} className="hidden" />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500">上传中...</span>
              </div>
            ) : (
              <>
                <Upload className={`w-10 h-10 mb-3 ${dragging ? 'text-teal-600' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-600 mb-1">拖拽文件至此或点击上传</p>
                <p className="text-xs text-slate-400">支持 Excel(.xlsx/.xls)、CSV(.csv)</p>
              </>
            )}
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-slate-700">导入任务列表</h2>
            {tasks.map(task => (
              <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-50">
                  <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-800 truncate">{task.fileName}</span>
                    <span className="badge bg-teal-50 text-teal-700">{FILE_TYPE_LABELS[task.fileType]}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>总行数 <span className="font-mono-data font-medium text-slate-700">{task.totalRows}</span></span>
                    <span>有效 <span className="font-mono-data font-medium text-emerald-600">{task.validRows}</span></span>
                    <span>异常 <span className="font-mono-data font-medium text-amber-600">{task.badRows}</span></span>
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[task.status].cls}`}>{STATUS_BADGE[task.status].label}</span>
                <div className="flex items-center gap-2">
                  {task.status === 'previewing' && (
                    <>
                      <button onClick={() => handlePreview(task)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> 预览
                      </button>
                      <button onClick={() => handleConfirm(task.id)} disabled={confirming === task.id} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> 确认导入
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {previewTask && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-display font-semibold text-slate-700">预览与校验</h2>
                <span className="text-sm text-slate-500">{previewTask.fileName}</span>
              </div>
              <button onClick={() => setPreviewTask(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('valid')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'valid' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                正常数据
              </button>
              <button
                onClick={() => setActiveTab('bad')}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${activeTab === 'bad' ? 'border-red-500 text-red-700 bg-red-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                坏行列表
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'valid' ? (
                <div className="border-l-4 border-emerald-500 rounded-r-lg overflow-hidden">
                  {validRows.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">无有效数据</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-emerald-50 text-left">
                            {Object.keys(validRows[0] || {}).map(key => (
                              <th key={key} className="px-4 py-2.5 font-medium text-emerald-800 whitespace-nowrap">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validRows.map((row, i) => (
                            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                              {Object.values(row).map((val: any, j) => (
                                <td key={j} className="px-4 py-2 text-slate-700 whitespace-nowrap font-mono-data text-xs">{String(val ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-l-4 border-red-500 rounded-r-lg overflow-hidden">
                  {badRows.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">无异常数据</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-red-50 text-left">
                            <th className="px-4 py-2.5 font-medium text-red-800 w-20">行号</th>
                            <th className="px-4 py-2.5 font-medium text-red-800">原始内容</th>
                            <th className="px-4 py-2.5 font-medium text-red-800 w-28">原因</th>
                            <th className="px-4 py-2.5 font-medium text-red-800 w-40">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {badRows.map(row => (
                            <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono-data text-slate-700">{row.rowNumber}</td>
                              <td className="px-4 py-2 text-slate-600 max-w-xs truncate font-mono-data text-xs" title={row.rawContent}>{row.rawContent}</td>
                              <td className="px-4 py-2">
                                <span className={`badge ${REASON_BADGE[row.reason].cls}`}>{REASON_BADGE[row.reason].label}</span>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex gap-2">
                                  <button onClick={() => handleRestore(row.id)} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                                    <RotateCcw className="w-3 h-3" /> 恢复
                                  </button>
                                  <button onClick={() => handleDiscard(row.id)} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                                    <Trash2 className="w-3 h-3" /> 丢弃
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>有效 <span className="font-mono-data font-medium text-emerald-600">{previewTask.validRows}</span> 行</span>
                <span className="text-slate-300">|</span>
                <span>异常 <span className="font-mono-data font-medium text-red-600">{previewTask.badRows}</span> 行</span>
              </div>
              {previewTask.status === 'previewing' && (
                <button
                  onClick={() => handleConfirm(previewTask.id)}
                  disabled={confirming === previewTask.id}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  确认导入
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
