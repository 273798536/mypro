import { useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/useToast'
import type { ExportMode } from '@/types'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Folder,
  FolderOpen,
  Layers,
  MapPin,
  Package,
  Save,
  Share2,
  UploadCloud,
  FileDown,
  Archive,
  FolderPlus,
  Eye,
  Download,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react'

export default function HandoverNav() {
  const { report, cadLayers, openPathInExplorer, handleExport, uploadSupplementMaterial, isExporting, uploadPending } = useAppStore()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [expandedFolder, setExpandedFolder] = useState<string | null>('mp-1')
  const [selectedExport, setSelectedExport] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState('PDF（推荐）')
  const [exportOptions, setExportOptions] = useState({
    withAnnotation: true,
    withWithdrawal: true,
    withSourcePath: false,
  })
  const [openingPath, setOpeningPath] = useState<string | null>(null)

  const handleCopyPath = async (path: string, id: string) => {
    try {
      await navigator.clipboard.writeText(path)
      setCopiedPath(id)
      toast.success(`已复制路径：${path}`)
      setTimeout(() => setCopiedPath(null), 2000)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleOpenPath = async (path: string, label: string) => {
    setOpeningPath(path)
    toast.info(`正在打开「${label}」...`)
    try {
      const result = await openPathInExplorer(path)
      if (result.copied) {
        toast.success(`已在访达/资源管理器中打开「${label}」，路径已复制到剪贴板：${path}`, 4500)
      } else {
        toast.success(`「${label}」路径已复制到剪贴板：${path}`, 4500)
      }
    } catch {
      toast.error('打开失败，请手动导航到该路径')
    } finally {
      setTimeout(() => setOpeningPath(null), 300)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().match(/\.(dwg|pdf|png|jpg|jpeg|zip|rar)$/)) {
      toast.warning('请上传 CAD、PDF、图片或压缩包格式的材料')
      e.target.value = ''
      return
    }
    toast.info(`正在上传「${file.name}」...`)
    try {
      const material = await uploadSupplementMaterial(file)
      toast.success(`已上传补充材料：${material.title}，已添加到待补材料列表。`, 4000)
    } catch {
      toast.error('上传失败，请检查网络或重试')
    }
    e.target.value = ''
  }

  const handleStartExport = async () => {
    if (!selectedExport) {
      toast.warning('请先选择一种导出模式')
      return
    }
    const mode = report.navigation.exportModes.find((m) => m.id === selectedExport)
    if (!mode) return
    const format = exportFormat.replace(/（.*）/, '').trim()
    toast.info(`正在导出「${mode.name}」（${format}）...`)
    try {
      const result = await handleExport(selectedExport, {
        ...exportOptions,
        format,
      })
      toast.success(`导出完成：${result.fileName}（${result.size}），已自动下载，历史版本目录已归档。`, 6000)
    } catch {
      toast.error('导出失败，请检查磁盘空间或重试')
    }
  }

  const folderIcons: Record<string, typeof Folder> = {
    'mp-1': Folder,
    'mp-2': Archive,
    'mp-3': UploadCloud,
    'mp-4': FolderOpen,
  }

  return (
    <div className="p-6 space-y-6 min-w-[1200px]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-engineer-800">接手导航</h1>
          <p className="text-sm text-engineer-500 mt-1">
            不用问也知道：哪里放材料 · 哪里看异常 · 哪里重新导出
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="tag tag-info">
            <Share2 className="w-3 h-3 mr-1" />
            共 {report.navigation.materialPaths.length} 个材料位置
          </span>
          <span className="tag tag-warn">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {report.navigation.anomalyLocations.length} 处异常
          </span>
        </div>
      </header>

      {/* 接手同事欢迎横幅 */}
      <div className="rounded border border-engineer-200 bg-gradient-to-r from-engineer-50 to-white p-5 card-shadow">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded bg-engineer-700 flex items-center justify-center flex-shrink-0">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-engineer-800">接手同事你好，这里是全部你需要知道的</div>
          <p className="text-sm text-engineer-600 mt-1 leading-relaxed">
            无需追问方案经理也能上手：下面三个面板分别告诉你
            <span className="font-medium text-engineer-800"> 材料放哪</span>、
            <span className="font-medium text-engineer-800"> 异常在哪</span>、
            <span className="font-medium text-engineer-800"> 怎么重新导出</span>，
            所有路径可一键复制，异常可直接定位。
          </p>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* 材料位置 */}
        <section className="col-span-5 bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-engineer-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-engineer-600" />
            <span className="text-sm font-semibold text-engineer-800">📁 材料存放位置</span>
            <span className="text-[11px] text-engineer-500 ml-1">
              点击路径可复制
            </span>
          </div>

          <div className="divide-y divide-engineer-100">
            {report.navigation.materialPaths.map((mp) => {
              const FolderIcon = folderIcons[mp.id] ?? Folder
              const isExpanded = expandedFolder === mp.id
              const isCopied = copiedPath === mp.id

              return (
                <div key={mp.id}>
                  <button
                  onClick={() => setExpandedFolder(isExpanded ? null : mp.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-engineer-50/60 transition-colors"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-engineer-400 transition-transform flex-shrink-0 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <div className="w-8 h-8 rounded bg-engineer-100 flex items-center justify-center flex-shrink-0">
                    <FolderIcon className="w-4 h-4 text-engineer-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-engineer-800">{mp.label}</div>
                    <div className="text-[11px] text-engineer-500 mt-0.5">{mp.description}</div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pl-14">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-xs text-engineer-700 bg-engineer-50 border border-engineer-200 px-3 py-2 rounded">
                        {mp.path}
                      </code>
                      <button
                        onClick={() => handleCopyPath(mp.path, mp.id)}
                        className={`btn-eng text-xs py-1.5 px-3 ${isCopied ? 'btn-success' : 'btn-ghost'}`}
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1 inline" />
                            复制
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleOpenPath(mp.path, mp.label)}
                      disabled={openingPath === mp.path}
                      className="mt-2 w-full btn-eng btn-ghost text-xs py-2 justify-start disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {openingPath === mp.path ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          打开中...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          在访达/资源管理器中打开
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )})}
          </div>

          {/* 补充材料快捷入口 */}
          <div className="px-4 py-4 border-t border-engineer-100 bg-engineer-50/60">
            <div className="flex items-center gap-2 text-xs text-engineer-600 mb-2">
              <UploadCloud className="w-4 h-4 text-warn-500" />
              <span className="font-medium">补充材料上传入口</span>
            </div>
            <p className="text-[11px] text-engineer-500 leading-relaxed mb-3">
              消防分区图、精装标高等未到位材料请上传至「待补充」目录，上传后自动标记关联判断。
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".dwg,.pdf,.png,.jpg,.jpeg,.zip,.rar"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              onClick={handleUploadClick}
              disabled={uploadPending}
              className="w-full btn-eng btn-primary text-xs py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 inline animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5 inline" />
                  上传补充材料
                </>
              )}
            </button>
          </div>
        </section>

        {/* 异常位置 */}
        <section className="col-span-3 bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-engineer-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-warn-500" />
            <span className="text-sm font-semibold text-engineer-800">🚨 异常位置一览</span>
          </div>
          <div className="p-4 space-y-3 max-h-[500px] overflow-auto">
            {report.navigation.anomalyLocations.map((al, idx) => (
              <button
                key={al.id}
                className="w-full text-left p-3 rounded border border-engineer-200 hover:border-warn-300 hover:bg-orange-50/40 transition-all card-shadow-hover"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="tag tag-warn text-[10px]">异常 #{idx + 1}</span>
                  <Eye className="w-3.5 h-3.5 text-engineer-400" />
                </div>
                <div className="text-sm font-medium text-engineer-800">{al.layerName}</div>
                <div className="mt-1 text-[11px] font-mono text-engineer-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-engineer-400" />
                  {al.coordinates}
                </div>
                <div className="mt-1.5 text-[11px] text-engineer-600">
                  关联对象：<span className="font-mono">{al.relatedObject}</span>
                </div>
                <div className="mt-1 text-[11px] text-engineer-500 leading-relaxed">
                  {al.description}
                </div>
              </button>
            ))}

            {/* 历史异常汇总 */}
            <div className="pt-3 mt-3 border-t border-engineer-100">
              <div className="text-[11px] text-engineer-500 mb-2">关联图层</div>
              <div className="flex flex-wrap gap-1.5">
                {cadLayers.map((l) => (
                  <span
                  key={l.id}
                  className={`tag ${l.coordinateValid ? 'tag-info' : ''}`}
                  style={!l.coordinateValid ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' } : undefined}
                >
                  <Layers className="w-3 h-3 mr-1" />
                  {l.name.split('_')[0]}
                  {!l.coordinateValid && <AlertTriangle className="w-3 h-3 ml-1" />}
                </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 重新导出 */}
        <section className="col-span-4 bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-engineer-100 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-engineer-600" />
            <span className="text-sm font-semibold text-engineer-800">📤 重新导出</span>
            <span className="text-[11px] text-engineer-500 ml-1">
              三种导出模式
            </span>
          </div>
          <div className="p-4 space-y-3">
            {report.navigation.exportModes.map((em: ExportMode, idx) => {
              const isSelected = selectedExport === em.id
              return (
                <button
                  key={em.id}
                  onClick={() => setSelectedExport(isSelected ? null : em.id)}
                  className={`w-full text-left p-4 rounded border transition-all ${
                    isSelected
                      ? 'border-engineer-600 bg-engineer-50 ring-2 ring-engineer-600/20'
                      : 'border-engineer-200 hover:border-engineer-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-engineer-700' : 'bg-engineer-100'
                    }`}>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-engineer-600'}`}>
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${isSelected ? 'text-engineer-800' : 'text-engineer-700'}`}>
                        {em.name}
                      </div>
                      <p className="text-xs text-engineer-500 mt-1 leading-relaxed">
                        {em.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(em.params).map(([k, v]) => (
                          <span key={k} className="tag tag-gray text-[10px]">
                            {k}: <span className="font-mono">{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-engineer-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}

            {/* 导出参数 */}
            {selectedExport && (
              <div className="mt-4 p-4 rounded bg-engineer-50 border border-engineer-200">
                <div className="text-xs font-medium text-engineer-700 mb-3">导出参数配置</div>
                <div className="space-y-2.5">
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-engineer-600">包含标注</span>
                    <input
                      type="checkbox"
                      checked={exportOptions.withAnnotation}
                      onChange={(e) => setExportOptions({ ...exportOptions, withAnnotation: e.target.checked })}
                      className="rounded border-engineer-300 text-engineer-700 focus:ring-engineer-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-engineer-600">包含撤回记录</span>
                    <input
                      type="checkbox"
                      checked={exportOptions.withWithdrawal}
                      onChange={(e) => setExportOptions({ ...exportOptions, withWithdrawal: e.target.checked })}
                      className="rounded border-engineer-300 text-engineer-700 focus:ring-engineer-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="text-engineer-600">包含图层源文件路径</span>
                    <input
                      type="checkbox"
                      checked={exportOptions.withSourcePath}
                      onChange={(e) => setExportOptions({ ...exportOptions, withSourcePath: e.target.checked })}
                      className="rounded border-engineer-300 text-engineer-700 focus:ring-engineer-500"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-engineer-600 mb-1">导出格式</label>
                  <div className="flex gap-2">
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded border border-engineer-200 bg-white text-engineer-700 focus:outline-none focus:border-engineer-500"
                    >
                      <option>PDF（推荐）</option>
                      <option>DWG</option>
                      <option>PNG</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleStartExport}
                  disabled={isExporting}
                  className="w-full mt-3 btn-eng btn-primary text-sm py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 inline animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-1.5 inline" />
                      开始导出
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 底部说明 */}
          <div className="px-4 py-3 border-t border-engineer-100 bg-engineer-50/60">
            <div className="flex items-center gap-2 text-[11px] text-engineer-500">
              <Save className="w-3.5 h-3.5" />
              导出文件自动归档至「历史版本目录」
            </div>
          </div>
        </section>
      </div>

      {/* 快速检查表 */}
      <section className="bg-white rounded border border-engineer-200 card-shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-engineer-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success-500" />
          <span className="text-sm font-semibold text-engineer-800">接手同事快速检查表</span>
        </div>
        <div className="p-5 grid grid-cols-4 gap-4">
          {[
            { step: 1, title: '确认材料齐全', desc: '检查「待补材料」栏位是否已补齐', done: false },
            { step: 2, title: '复核异常位置', desc: '逐一处理异常一览中列出的异常', done: false },
            { step: 3, title: '核对人工改判', desc: '理解所有人工改判的原因和上下文', done: true },
            { step: 4, title: '导出最终版本', desc: '按评审版本导出一份最终交付件', done: false },
          ].map((item) => (
            <div
              key={item.step}
              className={`p-4 rounded border flex items-start gap-3 ${
                item.done ? 'border-success-500/30 bg-emerald-50' : 'border-engineer-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.done ? 'bg-success-500' : 'bg-engineer-100'
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-sm font-semibold text-engineer-500">{item.step}</span>
                )}
              </div>
              <div>
                <div className={`text-sm font-medium ${item.done ? 'text-success-700' : 'text-engineer-800'}`}>
                  {item.title}
                </div>
                <div className="text-[11px] text-engineer-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
