import { useEffect, useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Upload, Download, CheckCircle, Flag, FileDown,
  AlertTriangle, Eye, X, FileUp, ChevronRight,
} from "lucide-react"
import { useWorkshopStore } from "@/store/useWorkshopStore"
import { useDefectStore } from "@/store/useDefectStore"
import StatusBadge from "@/components/StatusBadge"
import AnomalyFilter, { type FilterValues } from "@/components/AnomalyFilter"
import type { Defect, ExportConsistencyCheck } from "@/types"

export default function DefectList() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const navigate = useNavigate()
  const { currentWorkshop, fetchWorkshop } = useWorkshopStore()
  const {
    defects, colorRules, loading,
    fetchDefects, fetchColorRules, setFilters,
    batchUpdateStatus, importData, exportCheck, exportData,
  } = useDefectStore()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filterValues, setFilterValues] = useState<FilterValues>({
    status: "", type: "", batchId: "", offlineOnly: false,
  })
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportResult, setExportResult] = useState<ExportConsistencyCheck | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)

  useEffect(() => {
    if (!workshopId) return
    fetchWorkshop(workshopId)
    fetchDefects(workshopId)
    fetchColorRules(workshopId)
  }, [workshopId])

  const uniqueTypes = useMemo(() => [...new Set(defects.map((d) => d.type))], [defects])
  const uniqueBatches = useMemo(
    () => [...new Set(defects.filter((d) => d.importBatchId).map((d) => d.importBatchId!))],
    [defects],
  )

  const filtered = useMemo(() => defects.filter((d) => {
    if (filterValues.status && d.status !== filterValues.status) return false
    if (filterValues.type && d.type !== filterValues.type) return false
    if (filterValues.batchId && d.importBatchId !== filterValues.batchId) return false
    if (filterValues.offlineOnly && !d.isOfflineAsset) return false
    return true
  }), [defects, filterValues])

  const colorMap = useMemo(() => new Map(colorRules.map((r) => [r.id, r.color])), [colorRules])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((d) => d.id)))
  }

  const handleFilterChange = (f: FilterValues) => {
    setFilterValues(f)
    if (workshopId) setFilters({ status: f.status, type: f.type, batchId: f.batchId })
  }

  const handleBatchConfirm = async () => {
    if (!workshopId || !selected.size) return
    await batchUpdateStatus(workshopId, [...selected], "approved")
    setSelected(new Set())
  }
  const handleBatchResolve = async () => {
    if (!workshopId || !selected.size) return
    await batchUpdateStatus(workshopId, [...selected], "resolved")
    setSelected(new Set())
  }

  const handleExportOpen = async () => {
    if (!workshopId) return
    const result = await exportCheck(workshopId)
    setExportResult(result)
    setShowExport(true)
  }
  const handleExportConfirm = async () => {
    if (!workshopId) return
    await exportData(workshopId, { defectIds: [...selected] })
    setShowExport(false)
    setExportResult(null)
  }

  const handleImport = async () => {
    if (!workshopId || !importFile) return
    const text = await importFile.text()
    await importData(workshopId, { data: text })
    setShowImport(false)
    setImportFile(null)
  }

  const sourceLabel = (d: Defect) =>
    d.source === "manual" ? "手动" : `导入·${d.importBatchId?.slice(0, 6) ?? ""}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>工作区</span>
          <ChevronRight size={14} />
          <span className="font-medium text-gray-800">{currentWorkshop?.name ?? workshopId}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded bg-iron px-3 py-1.5 text-sm text-white hover:bg-iron/90 transition-colors"
          >
            <Upload size={14} /> 导入
          </button>
          <button
            onClick={handleExportOpen}
            className="flex items-center gap-1.5 rounded border border-iron px-3 py-1.5 text-sm text-iron hover:bg-gray-100 transition-colors"
          >
            <Download size={14} /> 导出
          </button>
        </div>
      </div>

      <AnomalyFilter types={uniqueTypes} batches={uniqueBatches} onChange={handleFilterChange} />

      {filtered.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleAll}
              className="rounded border-gray-300"
            />
            全选
          </label>
          <button
            onClick={handleBatchConfirm}
            disabled={!selected.size}
            className="flex items-center gap-1 rounded bg-pass px-3 py-1 text-sm text-white transition-colors hover:bg-pass/90 disabled:opacity-40"
          >
            <CheckCircle size={14} /> 批量确认
          </button>
          <button
            onClick={handleBatchResolve}
            disabled={!selected.size}
            className="flex items-center gap-1 rounded bg-muted px-3 py-1 text-sm text-white transition-colors hover:bg-muted/90 disabled:opacity-40"
          >
            <Flag size={14} /> 批量标记处理
          </button>
          <button
            onClick={handleExportOpen}
            disabled={!selected.size}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <FileDown size={14} /> 导出选中
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <AlertTriangle size={32} />
          <span>暂无缺陷数据</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="w-10 px-3 py-2.5" />
                <th className="px-3 py-2.5 text-left font-medium">编号</th>
                <th className="px-3 py-2.5 text-left font-medium">位置</th>
                <th className="px-3 py-2.5 text-left font-medium">类型</th>
                <th className="px-3 py-2.5 text-left font-medium">颜色</th>
                <th className="px-3 py-2.5 text-left font-medium">状态</th>
                <th className="px-3 py-2.5 text-left font-medium">来源</th>
                <th className="px-3 py-2.5 text-left font-medium">警告</th>
                <th className="px-3 py-2.5 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => navigate(`/defects/${workshopId}/${d.id}`)}
                  className={`cursor-pointer border-b transition-colors hover:bg-gray-50 ${
                    d.isOfflineAsset
                      ? "border-l-4 border-l-warn"
                      : d.coordinateOffset
                        ? "border-l-4 border-l-yellow-500"
                        : ""
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleSelect(d.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{d.id.slice(0, 6)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{d.posX}, {d.posY}</td>
                  <td className="px-3 py-2.5">{d.type}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-block h-4 w-4 rounded-sm border border-gray-200"
                      style={{ backgroundColor: colorMap.get(d.colorRuleId) ?? "#ccc" }}
                    />
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-xs">{sourceLabel(d)}</td>
                  <td className="px-3 py-2.5">
                    {d.isOfflineAsset && (
                      <span className="inline-flex items-center gap-1 text-xs text-warn">
                        <AlertTriangle size={12} /> 离线缺失
                      </span>
                    )}
                    {d.coordinateOffset && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                        <AlertTriangle size={12} /> 坐标偏移
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/defects/${workshopId}/${d.id}`)}
                      className="text-iron transition-colors hover:text-warn"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImport && <ImportDialog onClose={() => { setShowImport(false); setImportFile(null) }} onConfirm={handleImport} file={importFile} onFileChange={setImportFile} />}
      {showExport && <ExportDialog result={exportResult} onClose={() => { setShowExport(false); setExportResult(null) }} onConfirm={handleExportConfirm} />}
    </div>
  )
}

function ImportDialog({ onClose, onConfirm, file, onFileChange }: {
  onClose: () => void
  onConfirm: () => void
  file: File | null
  onFileChange: (f: File | null) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">导入缺陷数据</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="mb-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-warn">
            <FileUp size={24} className="text-gray-400" />
            <span className="text-sm text-gray-500">{file ? file.name : "点击选择 CSV 文件"}</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100">取消</button>
          <button onClick={onConfirm} disabled={!file} className="rounded bg-warn px-4 py-1.5 text-sm text-white transition-colors hover:bg-warn/90 disabled:opacity-40">确认导入</button>
        </div>
      </div>
    </div>
  )
}

function ExportDialog({ result, onClose, onConfirm }: {
  result: ExportConsistencyCheck | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[480px] rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">导出校验</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        {result?.isConsistent ? (
          <p className="mb-4 text-sm text-pass">一致性校验通过，数据无差异。</p>
        ) : (
          <div className="mb-4">
            <p className="mb-2 text-sm text-danger">一致性校验未通过，以下缺陷状态不一致：</p>
            <div className="max-h-48 overflow-auto rounded border border-gray-200 bg-gray-50 p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left">编号</th>
                    <th className="text-left">界面状态</th>
                    <th className="text-left">数据状态</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.mismatches.map((m, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1 font-mono">{m.defectId.slice(0, 6)}</td>
                      <td>{m.uiStatus}</td>
                      <td>{m.dataStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100">取消</button>
          {result?.isConsistent && (
            <button onClick={onConfirm} className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">确认导出</button>
          )}
        </div>
      </div>
    </div>
  )
}
