import { useState, useRef, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { useToastStore } from '@/store/useToastStore'
import { FileDown, CheckCircle, Clock, AlertTriangle, ClipboardCheck, Download, MapPin, FileText, Camera, Loader2, Eye, ExternalLink } from 'lucide-react'
import type { LabelType } from '@/types'
import { composeExportImage, downloadImage, capture3DScene } from '@/utils/export'
import { useNavigate } from 'react-router-dom'

function isPlaceholderImage(imageData: string | undefined | null): boolean {
  if (!imageData || imageData === '') return true
  return imageData.includes('svg+xml') || imageData.length < 500
}

const labelTypeConfig: Record<LabelType, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  resolved: { label: '已处理', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10 border-emerald-400/30', icon: CheckCircle },
  pending_material: { label: '待补材料', color: 'text-amber-400', bgColor: 'bg-amber-400/10 border-amber-400/30', icon: Clock },
  manual_override: { label: '人工改判', color: 'text-red-400', bgColor: 'bg-red-400/10 border-red-400/30', icon: AlertTriangle },
}

function ExportCard({
  id,
  collisionId,
  objectId,
  labelType,
  note,
  imageData,
  onExport,
}: {
  id: string
  collisionId: string
  objectId: string
  labelType: LabelType
  note: string
  imageData?: string
  onExport: (id: string) => Promise<string | null>
}) {
  const getBarById = useStore((s) => s.getBarById)
  const currentFrame = useStore((s) => s.currentFrame)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const navigate = useNavigate()
  const bar = getBarById(objectId)
  const config = labelTypeConfig[labelType]
  const Icon = config.icon
  const posY = bar ? getBarPositionAtFrame(bar.id, currentFrame) : 0
  const isPlaceholder = isPlaceholderImage(imageData)

  const handleClick = async () => {
    if (isPlaceholder) {
      navigate('/')
      return
    }
    setIsExporting(true)
    try {
      await onExport(id)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={`bg-zinc-900/60 border rounded-lg overflow-hidden transition-colors group ${
      isPlaceholder ? 'border-dashed border-zinc-700' : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex">
        <div className="w-40 h-28 bg-zinc-800/80 shrink-0 relative overflow-hidden">
          {!isPlaceholder && imageData ? (
            <img
              src={imageData}
              alt={`${bar?.name} 3D 截图`}
              className="w-full h-full object-cover"
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800/50">
              <div className="text-center">
                <Camera size={20} className="mx-auto text-zinc-600 mb-1" />
                <span className="text-[10px] text-zinc-500">占位预览</span>
              </div>
            </div>
          )}
          {showPreview && !isPlaceholder && imageData && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Eye size={24} className="text-zinc-300" />
            </div>
          )}
        </div>
        <div className="flex-1 p-3 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-200 truncate">{bar?.name || objectId}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${config.bgColor} ${config.color} flex items-center gap-1 shrink-0`}>
              <Icon size={10} /> {config.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <div className="bg-zinc-800/50 rounded px-1.5 py-1">
              <span className="text-[9px] text-zinc-600">X</span>
              <p className="text-[10px] text-zinc-400 font-mono">{bar?.positionX.toFixed(1) ?? '-'}</p>
            </div>
            <div className="bg-zinc-800/50 rounded px-1.5 py-1">
              <span className="text-[9px] text-zinc-600">Y</span>
              <p className="text-[10px] text-zinc-400 font-mono">{posY.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-800/50 rounded px-1.5 py-1">
              <span className="text-[9px] text-zinc-600">Z</span>
              <p className="text-[10px] text-zinc-400 font-mono">{bar?.positionZ.toFixed(1) ?? '-'}</p>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed flex-1">{note}</p>
          <button
            onClick={handleClick}
            disabled={isExporting}
            className={`mt-2 flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isPlaceholder
                ? 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 border border-amber-400/20'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-emerald-400'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 size={10} className="animate-spin" /> 生成中...
              </>
            ) : isPlaceholder ? (
              <>
                <ExternalLink size={10} /> 去场景页生成
              </>
            ) : (
              <>
                <Download size={10} /> 下载说明图
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({ label, status, materialPath }: { label: string; status: 'done' | 'pending' | 'missing'; materialPath?: string }) {
  const statusConfig = {
    done: { icon: CheckCircle, color: 'text-emerald-400', label: '已完成' },
    pending: { icon: Clock, color: 'text-amber-400', label: '进行中' },
    missing: { icon: AlertTriangle, color: 'text-red-400', label: '缺失' },
  }
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex items-center gap-3 bg-zinc-900/40 rounded-lg px-3 py-2.5 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <Icon size={16} className={config.color} />
      <div className="flex-1">
        <p className="text-xs text-zinc-200">{label}</p>
        {materialPath && <p className="text-[10px] text-zinc-600 mt-0.5">材料位置：{materialPath}</p>}
      </div>
      <span className={`text-[10px] ${config.color}`}>{config.label}</span>
    </div>
  )
}

export default function Export() {
  const screenshots = useStore((s) => s.screenshots)
  const collisions = useStore((s) => s.collisions)
  const bars = useStore((s) => s.bars)
  const annotations = useStore((s) => s.annotations)
  const supplements = useStore((s) => s.supplements)
  const getBarById = useStore((s) => s.getBarById)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)
  const getAnnotationsByCollisionId = useStore((s) => s.getAnnotationsByCollisionId)
  const addScreenshot = useStore((s) => s.addScreenshot)
  const setScreenshotImageData = useStore((s) => s.setScreenshotImageData)
  const currentFrame = useStore((s) => s.currentFrame)

  const [exportingAll, setExportingAll] = useState(false)

  const collisionCount = collisions.filter(c => c.status === 'collision').length
  const pendingCount = collisions.filter(c => c.status === 'pending_review').length
  const resolvedCount = screenshots.filter(s => s.labelType === 'resolved').length
  const pendingMaterialCount = screenshots.filter(s => s.labelType === 'pending_material').length
  const manualOverrideCount = screenshots.filter(s => s.labelType === 'manual_override').length

  const checklist = [
    { label: '所有碰撞项已审查', status: collisionCount === 0 ? 'done' as const : 'pending' as const, materialPath: '场景预审页 → 碰撞检测面板' },
    { label: '待确认项已补充材料', status: pendingCount === 0 ? 'done' as const : 'missing' as const, materialPath: '批注管理页 → 补充材料区' },
    { label: '每项碰撞截图标注已生成', status: screenshots.length >= collisionCount ? 'done' as const : 'pending' as const, materialPath: '导出报告页 → 截图说明区' },
    { label: '行动提示全部处理', status: annotations.filter(a => a.type === 'action_hint').length > 0 ? 'pending' as const : 'done' as const, materialPath: '批注管理页 → 行动提示' },
    { label: '补充材料版本链完整', status: supplements.length > 0 ? 'done' as const : 'pending' as const, materialPath: '批注管理页 → 版本链' },
    { label: '负责人确认签字', status: 'missing' as const, materialPath: '' },
  ]

  const realScreenshots = useMemo(
    () => screenshots.filter(s => !isPlaceholderImage(s.imageData)),
    [screenshots]
  )
  const placeholderCount = screenshots.length - realScreenshots.length

  const handleExportSingle = async (screenshotId: string): Promise<string | null> => {
    const screenshot = screenshots.find(s => s.id === screenshotId)
    if (!screenshot) return null

    if (isPlaceholderImage(screenshot.imageData)) {
      useToastStore.getState().info(
        '请先生成真实截图',
        '当前为占位预览图，请前往场景预审页点选该对象并点击「导出当前对象」生成真实截图后再下载。'
      )
      return null
    }

    const bar = getBarById(screenshot.objectId)
    const filename = `碰撞预审_${bar?.name || screenshot.objectId}_${screenshot.timestamp}.png`
    downloadImage(screenshot.imageData!, filename)

    useToastStore.getState().success(
      '下载成功',
      `已导出 ${bar?.name || screenshot.objectId} 的说明图，空间位置、备注、3D 截图均为生成时的快照。`
    )
    return screenshot.imageData!
  }

  const handleExportAll = async () => {
    if (screenshots.length === 0) {
      useToastStore.getState().info('暂无可导出内容', '请先在场景预审页点选对象并导出，或生成截图标注')
      return
    }

    if (realScreenshots.length === 0) {
      useToastStore.getState().warning(
        '暂无可下载的真实截图',
        `当前 ${screenshots.length} 项均为占位预览图，请前往场景预审页点选对象并生成真实截图。`
      )
      return
    }

    setExportingAll(true)
    const toastId = useToastStore.getState().loading(
      '正在批量下载',
      `共 ${realScreenshots.length} 张真实截图，正在下载中...`
    )

    let successCount = 0
    for (let i = 0; i < realScreenshots.length; i++) {
      const s = realScreenshots[i]
      try {
        useToastStore.getState().updateToast(toastId, {
          description: `正在下载第 ${i + 1}/${realScreenshots.length} 项...`,
        })
        const bar = getBarById(s.objectId)
        const filename = `碰撞预审_${bar?.name || s.objectId}_${s.timestamp}.png`
        downloadImage(s.imageData!, filename)
        successCount++
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch {
        // skip
      }
    }

    const finalDesc = placeholderCount > 0
      ? `成功下载 ${successCount} 张真实截图，另有 ${placeholderCount} 项为占位预览图（请在场景预审页生成）`
      : `成功下载 ${successCount} 张说明图`

    useToastStore.getState().updateToast(toastId, {
      type: placeholderCount > 0 ? 'warning' as const : 'success' as const,
      title: placeholderCount > 0 ? '批量下载完成（部分为占位图）' : '批量下载完成',
      description: finalDesc,
    })
    setExportingAll(false)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <FileDown size={20} className="text-amber-400" /> 导出与报告
          </h1>
          <p className="text-xs text-zinc-500 mt-1">碰撞预审结果汇总，截图说明三色标签区分处理状态。点击「下载说明图」生成真实交付物</p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{collisionCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1">碰撞项</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1">待确认</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{resolvedCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1">已处理</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{pendingMaterialCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1">待补材料</p>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{manualOverrideCount}</p>
            <p className="text-[10px] text-zinc-500 mt-1">人工改判</p>
          </div>
        </div>

        <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <MapPin size={14} /> 截图说明（按标签类型）
                </h2>
                {placeholderCount > 0 && (
                  <p className="text-[10px] text-amber-400/80 mt-1">
                    共 {screenshots.length} 项，其中 {placeholderCount} 项为占位预览图，需在场景预审页生成真实截图后才能下载
                  </p>
                )}
              </div>
              <button
                onClick={handleExportAll}
                disabled={exportingAll || realScreenshots.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 text-amber-400 text-xs font-medium hover:bg-amber-400/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-400/20"
              >
                {exportingAll ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> 批量下载中...
                  </>
                ) : (
                  <>
                    <Download size={12} /> 下载全部 ({realScreenshots.length})
                  </>
                )}
              </button>
            </div>

          {screenshots.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 border border-dashed border-zinc-700 rounded-lg">
              <Camera size={32} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500 mb-2">暂无截图标注</p>
              <p className="text-[11px] text-zinc-600">请回到「场景预审页」点选异常对象，点击右上角「导出当前对象」生成截图标注</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(['resolved', 'pending_material', 'manual_override'] as LabelType[]).map((type) => {
                const config = labelTypeConfig[type]
                const Icon = config.icon
                const items = screenshots.filter(s => s.labelType === type)
                if (items.length === 0) return null
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={14} className={config.color} />
                      <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                      <span className="text-[10px] text-zinc-600">{items.length} 项</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {items.map((s) => (
                        <ExportCard
                          key={s.id}
                          id={s.id}
                          collisionId={s.collisionId}
                          objectId={s.objectId}
                          labelType={s.labelType}
                          note={s.note}
                          imageData={s.imageData || undefined}
                          onExport={handleExportSingle}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-4">
            <ClipboardCheck size={14} /> 封账自检清单
          </h2>
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <ChecklistItem key={idx} label={item.label} status={item.status} materialPath={item.materialPath} />
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-6 pb-8">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-200">材料索引</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>碰撞检测数据</span>
                <span className="text-zinc-600">场景预审页 → 右侧面板</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>评审批注与补充材料</span>
                <span className="text-zinc-600">批注管理页 → 版本链</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>截图标注说明</span>
                <span className="text-zinc-600">导出报告页 → 截图说明区</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>行动提示</span>
                <span className="text-zinc-600">批注管理页 → 黄色行动提示卡片</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
