import { useState, useMemo, useEffect } from 'react'
import Scene3D from '@/components/Scene3D'
import { useStore } from '@/store/useStore'
import { useToastStore } from '@/store/useToastStore'
import {
  FileDown, CheckCircle, Clock, AlertTriangle, ClipboardCheck, Download,
  MapPin, FileText, Camera, Loader2, Eye, ExternalLink, RefreshCw,
  Play, ZoomIn, Info
} from 'lucide-react'
import type { LabelType, ScreenshotMark } from '@/types'
import { composeExportImage, downloadImage, capture3DScene } from '@/utils/export'
import { useNavigate } from 'react-router-dom'

function isPlaceholderImage(imageData: string | undefined | null): boolean {
  if (!imageData || imageData === '') return true
  return imageData.includes('svg+xml') || imageData.length < 500
}

function resolveFrameForScreenshot(
  screenshot: ScreenshotMark,
  collisions: ReturnType<typeof useStore.getState>['collisions'],
  fallbackFrame: number
): number {
  if (screenshot.collisionId) {
    const col = collisions.find(c => c.id === screenshot.collisionId)
    if (col) return col.frameIndex
  }
  const m = screenshot.note?.match(/帧\s*(\d+)/)
  if (m) return parseInt(m[1], 10)
  return fallbackFrame
}

const labelTypeConfig: Record<LabelType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof CheckCircle }> = {
  resolved: { label: '已处理', color: 'text-emerald-400', bgColor: 'bg-emerald-400/10', borderColor: 'border-emerald-400/30', icon: CheckCircle },
  pending_material: { label: '待补材料', color: 'text-amber-400', bgColor: 'bg-amber-400/10', borderColor: 'border-amber-400/30', icon: Clock },
  manual_override: { label: '人工改判', color: 'text-red-400', bgColor: 'bg-red-400/10', borderColor: 'border-red-400/30', icon: AlertTriangle },
}

function ExportCard({
  screenshot,
  isActive,
  onSelect,
}: {
  screenshot: ScreenshotMark
  isActive: boolean
  onSelect: () => void
}) {
  const getBarById = useStore((s) => s.getBarById)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)
  const collisions = useStore((s) => s.collisions)
  const currentFrame = useStore((s) => s.currentFrame)
  const bar = getBarById(screenshot.objectId)
  const config = labelTypeConfig[screenshot.labelType]
  const Icon = config.icon
  const frameForCard = resolveFrameForScreenshot(screenshot, collisions, currentFrame)
  const posY = bar ? getBarPositionAtFrame(bar.id, frameForCard) : 0
  const isPlaceholder = isPlaceholderImage(screenshot.imageData)

  return (
    <div
      onClick={onSelect}
      className={`bg-zinc-900/60 border rounded-lg overflow-hidden cursor-pointer transition-all group ${
        isActive
          ? 'border-amber-400/50 ring-1 ring-amber-400/30'
          : isPlaceholder
            ? 'border-dashed border-zinc-700 hover:border-zinc-600'
            : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex">
        <div className="w-32 h-24 bg-zinc-800/80 shrink-0 relative overflow-hidden">
          {!isPlaceholder && screenshot.imageData ? (
            <img
              src={screenshot.imageData}
              alt={`${bar?.name} 3D 截图`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800/50">
              <div className="text-center">
                <Camera size={18} className="mx-auto text-zinc-600 mb-1" />
                <span className="text-[9px] text-zinc-500">占位预览</span>
              </div>
            </div>
          )}
          {isActive && (
            <div className="absolute inset-0 bg-amber-400/10 flex items-center justify-center">
              <Eye size={20} className="text-amber-400" />
            </div>
          )}
        </div>
        <div className="flex-1 p-2.5 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-zinc-200 truncate">{bar?.name || screenshot.objectId}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${config.bgColor} ${config.color} ${config.borderColor} flex items-center gap-1 shrink-0`}>
              <Icon size={9} /> {config.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 mb-1.5">
            <div className="bg-zinc-800/50 rounded px-1.5 py-1">
              <span className="text-[8px] text-zinc-600">X</span>
              <p className="text-[9px] text-zinc-400 font-mono">{bar?.positionX.toFixed(1) ?? '-'}</p>
            </div>
            <div className="bg-zinc-800/50 rounded px-1.5 py-1">
              <span className="text-[8px] text-zinc-600">Y</span>
              <p className="text-[9px] text-zinc-400 font-mono">{posY.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-800/50 rounded px-1.5 py-1">
              <span className="text-[8px] text-zinc-600">Z</span>
              <p className="text-[9px] text-zinc-400 font-mono">{bar?.positionZ.toFixed(1) ?? '-'}</p>
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 leading-relaxed flex-1 line-clamp-2">{screenshot.note}</p>
          <div className="flex items-center gap-1 mt-1.5">
            {isPlaceholder ? (
              <span className="text-[9px] text-amber-400 flex items-center gap-1">
                <Play size={9} /> 点击预览生成
              </span>
            ) : (
              <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                <CheckCircle size={9} /> 已有真实截图
              </span>
            )}
          </div>
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
  const annotations = useStore((s) => s.annotations)
  const supplements = useStore((s) => s.supplements)
  const getBarById = useStore((s) => s.getBarById)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)
  const getAnnotationsByCollisionId = useStore((s) => s.getAnnotationsByCollisionId)
  const setScreenshotImageData = useStore((s) => s.setScreenshotImageData)
  const addScreenshot = useStore((s) => s.addScreenshot)
  const setCurrentFrame = useStore((s) => s.setCurrentFrame)
  const currentFrame = useStore((s) => s.currentFrame)
  const selectedObjectId = useStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useStore((s) => s.setSelectedObjectId)
  const navigate = useNavigate()

  const [exportingSingle, setExportingSingle] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)

  const collisionCount = collisions.filter(c => c.status === 'collision').length
  const pendingCount = collisions.filter(c => c.status === 'pending_review').length
  const resolvedCount = screenshots.filter(s => s.labelType === 'resolved').length
  const pendingMaterialCount = screenshots.filter(s => s.labelType === 'pending_material').length
  const manualOverrideCount = screenshots.filter(s => s.labelType === 'manual_override').length

  const realScreenshots = useMemo(
    () => screenshots.filter(s => !isPlaceholderImage(s.imageData)),
    [screenshots]
  )
  const placeholderCount = screenshots.length - realScreenshots.length

  const activeScreenshot = useMemo(() => {
    if (selectedObjectId) {
      return screenshots.find(s => s.objectId === selectedObjectId) || null
    }
    return null
  }, [screenshots, selectedObjectId])

  const activeFrame = useMemo(() => {
    if (activeScreenshot) {
      return resolveFrameForScreenshot(activeScreenshot, collisions, currentFrame)
    }
    return currentFrame
  }, [activeScreenshot, collisions, currentFrame])

  const activeBar = selectedObjectId ? getBarById(selectedObjectId) : null
  const activePosY = activeBar ? getBarPositionAtFrame(activeBar.id, activeFrame) : 0
  const activeCollision = activeBar
    ? collisions.find(c => (c.objectAId === activeBar.id || c.objectBId === activeBar.id) && c.frameIndex === activeFrame)
      || collisions.find(c => c.objectAId === activeBar.id || c.objectBId === activeBar.id)
      || null
    : null
  const activeAnnotations = activeCollision ? getAnnotationsByCollisionId(activeCollision.id) : []
  const activeLabelType = activeScreenshot?.labelType || (
    activeAnnotations.length > 5 ? 'resolved'
      : activeAnnotations.length > 0 ? 'pending_material'
      : activeCollision ? 'manual_override'
      : 'pending_material'
  )
  const activeNote = activeScreenshot?.note || (
    activeCollision
      ? `碰撞间距 ${activeCollision.distance}m · 帧${activeFrame}`
      : `当前帧无碰撞 · 帧${activeFrame}`
  )

  useEffect(() => {
    if (!selectedObjectId && screenshots.length > 0) {
      const first = screenshots[0]
      setSelectedObjectId(first.objectId)
      const frame = resolveFrameForScreenshot(first, collisions, currentFrame)
      setCurrentFrame(frame)
    }
  }, [selectedObjectId, screenshots, collisions, currentFrame, setSelectedObjectId, setCurrentFrame])

  const handleSelectScreenshot = (s: ScreenshotMark) => {
    setSelectedObjectId(s.objectId)
    const frame = resolveFrameForScreenshot(s, collisions, currentFrame)
    setCurrentFrame(frame)
  }

  const handleGenerateAndDownload = async (screenshotId?: string): Promise<string | null> => {
    const initialState = useStore.getState()

    let target: ScreenshotMark | null = null
    if (screenshotId) {
      target = initialState.screenshots.find(s => s.id === screenshotId) || null
    } else if (initialState.selectedObjectId) {
      target = initialState.screenshots.find(s => s.objectId === initialState.selectedObjectId) || null
    }

    if (!target) {
      useToastStore.getState().warning('请先选择对象', '请在下方截图列表中点击一个对象，或前往场景预审页点选对象。')
      return null
    }

    const targetFrame = resolveFrameForScreenshot(target, initialState.collisions, initialState.currentFrame)
    const state = useStore.getState()
    const currentBar = state.getBarById(target.objectId)
    if (!currentBar) {
      useToastStore.getState().error('导出失败', `找不到对象 ${target.objectId}`)
      return null
    }

    setSelectedObjectId(target.objectId)
    setCurrentFrame(targetFrame)
    await new Promise(resolve => setTimeout(resolve, 350))

    const liveState = useStore.getState()
    const liveBar = liveState.getBarById(target.objectId)!
    const livePosY = liveState.getBarPositionAtFrame(liveBar.id, targetFrame)
    const liveCollision =
      liveState.collisions.find(
        c => (c.objectAId === liveBar.id || c.objectBId === liveBar.id) && c.frameIndex === targetFrame
      ) ||
      liveState.collisions.find(c => c.objectAId === liveBar.id || c.objectBId === liveBar.id) ||
      null
    const liveAnnotations = liveCollision ? liveState.getAnnotationsByCollisionId(liveCollision.id) : []
    const liveNote = target.note || (
      liveCollision
        ? `碰撞间距 ${liveCollision.distance}m · 帧${targetFrame}`
        : `当前帧无碰撞 · 帧${targetFrame}`
    )
    const liveLabelType = target.labelType || (
      liveAnnotations.length > 5 ? 'resolved'
        : liveAnnotations.length > 0 ? 'pending_material'
        : liveCollision ? 'manual_override'
        : 'pending_material'
    )

    setExportingSingle(true)
    const toastId = useToastStore.getState().loading(
      '正在生成说明图',
      `正在截取 3D 场景并合成 ${liveBar.name}（帧 ${targetFrame}）的说明图...`
    )

    try {
      const rawImageData = await capture3DScene()
      const composed = await composeExportImage({
        bar: liveBar,
        positionY: livePosY,
        collision: liveCollision,
        annotations: liveAnnotations,
        imageData: rawImageData,
        labelType: liveLabelType,
        note: liveNote,
        frameIndex: targetFrame,
      })

      const filename = `碰撞预审_${liveBar.name}_F${targetFrame}_${Date.now()}.png`
      downloadImage(composed, filename)

      setScreenshotImageData(target.id, composed)

      useToastStore.getState().updateToast(toastId, {
        type: 'success',
        title: '导出成功',
        description: `已生成 ${filename}（帧 ${targetFrame}），3D 画面、空间位置、备注三者已对齐`,
      })
      return composed
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '导出失败'
      useToastStore.getState().updateToast(toastId, {
        type: 'error',
        title: '导出失败',
        description: errMsg,
      })
      return null
    } finally {
      setExportingSingle(false)
    }
  }

  const handleExportAll = async () => {
    const initialState = useStore.getState()
    if (initialState.screenshots.length === 0) {
      useToastStore.getState().info('暂无可导出内容', '请先在场景预审页点选对象并导出，或生成截图标注')
      return
    }

    const originalFrame = initialState.currentFrame
    const originalObjectId = initialState.selectedObjectId
    const items = [...initialState.screenshots]

    setExportingAll(true)
    const toastId = useToastStore.getState().loading(
      '正在批量生成说明图',
      `共 ${items.length} 项，正在逐个切换到碰撞帧并截取 3D 场景...`
    )

    let successCount = 0
    let failCount = 0
    const failedItems: string[] = []

    for (let i = 0; i < items.length; i++) {
      const s = items[i]
      try {
        useToastStore.getState().updateToast(toastId, {
          description: `正在处理第 ${i + 1}/${items.length} 项：切换到碰撞帧...`,
        })

        const targetFrame = resolveFrameForScreenshot(s, initialState.collisions, originalFrame)
        setSelectedObjectId(s.objectId)
        setCurrentFrame(targetFrame)
        await new Promise(resolve => setTimeout(resolve, 400))

        const live = useStore.getState()
        const bar = live.getBarById(s.objectId)
        if (!bar) { failCount++; failedItems.push(s.objectId); continue }

        const posY = live.getBarPositionAtFrame(bar.id, targetFrame)
        const collision =
          live.collisions.find(
            c => (c.objectAId === bar.id || c.objectBId === bar.id) && c.frameIndex === targetFrame
          ) ||
          live.collisions.find(c => c.objectAId === bar.id || c.objectBId === bar.id) ||
          null
        const anns = collision ? live.getAnnotationsByCollisionId(collision.id) : []
        const note = s.note || (
          collision ? `碰撞间距 ${collision.distance}m · 帧${targetFrame}` : `当前帧无碰撞 · 帧${targetFrame}`
        )

        useToastStore.getState().updateToast(toastId, {
          description: `正在处理第 ${i + 1}/${items.length} 项：截取 ${bar.name}（帧 ${targetFrame}）...`,
        })

        const rawImageData = await capture3DScene()
        const composed = await composeExportImage({
          bar,
          positionY: posY,
          collision,
          annotations: anns,
          imageData: rawImageData,
          labelType: s.labelType,
          note,
          frameIndex: targetFrame,
        })

        const filename = `碰撞预审_${bar.name}_F${targetFrame}_${Date.now()}.png`
        downloadImage(composed, filename)
        setScreenshotImageData(s.id, composed)
        successCount++
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        failCount++
        failedItems.push(s.objectId)
      }
    }

    if (originalObjectId) setSelectedObjectId(originalObjectId)
    setCurrentFrame(originalFrame)

    const finalType = failCount === 0 ? 'success' as const : 'error' as const
    const finalTitle = failCount === 0 ? '批量导出完成' : '批量导出完成（部分失败）'
    const finalDesc = `成功 ${successCount} 项，失败 ${failCount} 项。每项均切换到对应碰撞帧后实时截图，坐标/碰撞/备注与帧一致${failedItems.length > 0 ? `；失败：${failedItems.join('、')}` : ''}`

    useToastStore.getState().updateToast(toastId, {
      type: finalType,
      title: finalTitle,
      description: finalDesc,
    })
    setExportingAll(false)
  }

  const goToSceneReview = () => {
    navigate('/')
  }

  const checklist = [
    { label: '所有碰撞项已审查', status: collisionCount === 0 ? 'done' as const : 'pending' as const, materialPath: '场景预审页 → 碰撞检测面板' },
    { label: '待确认项已补充材料', status: pendingCount === 0 ? 'done' as const : 'missing' as const, materialPath: '批注管理页 → 补充材料区' },
    { label: '每项碰撞截图标注已生成', status: realScreenshots.length >= collisionCount ? 'done' as const : 'pending' as const, materialPath: '导出报告页 → 截图说明区' },
    { label: '行动提示全部处理', status: annotations.filter(a => a.type === 'action_hint').length > 0 ? 'pending' as const : 'done' as const, materialPath: '批注管理页 → 行动提示' },
    { label: '补充材料版本链完整', status: supplements.length > 0 ? 'done' as const : 'pending' as const, materialPath: '批注管理页 → 版本链' },
    { label: '负责人确认签字', status: 'missing' as const, materialPath: '' },
  ]

  const activeConfig = labelTypeConfig[activeLabelType]
  const ActiveIcon = activeConfig.icon

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <FileDown size={20} className="text-amber-400" /> 导出与报告
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            碰撞预审结果汇总。左侧 3D 预览为实时画面，与右侧数据实时对齐，导出前可验证一致性。
          </p>
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

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <Camera size={14} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-200">实时导出预览</h2>
              <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded">
                3D 画面与数据实时对齐
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToSceneReview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                <ExternalLink size={11} /> 去场景页调整
              </button>
              <button
                onClick={() => handleGenerateAndDownload()}
                disabled={exportingSingle || !activeBar}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-400/10 text-amber-400 text-[11px] font-medium hover:bg-amber-400/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-400/20"
              >
                {exportingSingle ? (
                  <><Loader2 size={11} className="animate-spin" /> 生成中...</>
                ) : (
                  <><Download size={11} /> 生成说明图并下载</>
                )}
              </button>
            </div>
          </div>

          <div className="flex">
            <div className="flex-1 h-[380px] bg-[#0D1117] relative">
              <Scene3D />
              {activeBar && (
                <div className="absolute top-3 left-3 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-3 py-2 flex items-center gap-2 z-10">
                  <div className={`w-2 h-2 rounded-full ${activeBar.type === 'scenery' ? 'bg-amber-700' : 'bg-amber-400'}`} />
                  <span className="text-xs font-medium text-zinc-200">{activeBar.name}</span>
                  <span className="text-[10px] text-zinc-500">帧 {activeFrame}</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 text-[10px] text-zinc-500 bg-zinc-900/70 px-2 py-1 rounded z-10">
                <ZoomIn size={10} className="inline mr-1" />
                鼠标拖拽旋转 · 滚轮缩放
              </div>
            </div>

            <div className="w-72 border-l border-zinc-800 p-4 flex flex-col gap-4 bg-zinc-900/30">
              {activeBar ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-zinc-200">空间位置</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded border ${activeConfig.bgColor} ${activeConfig.color} ${activeConfig.borderColor} flex items-center gap-1`}>
                        <ActiveIcon size={9} /> {activeConfig.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-zinc-800/60 rounded-lg px-2.5 py-2 text-center">
                        <span className="text-[9px] text-zinc-500 block mb-0.5">X</span>
                        <p className="text-sm font-bold text-zinc-200 font-mono">{activeBar.positionX.toFixed(1)}</p>
                      </div>
                      <div className="bg-zinc-800/60 rounded-lg px-2.5 py-2 text-center">
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Y</span>
                        <p className="text-sm font-bold text-zinc-200 font-mono">{activePosY.toFixed(2)}</p>
                      </div>
                      <div className="bg-zinc-800/60 rounded-lg px-2.5 py-2 text-center">
                        <span className="text-[9px] text-zinc-500 block mb-0.5">Z</span>
                        <p className="text-sm font-bold text-zinc-200 font-mono">{activeBar.positionZ.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-zinc-200 mb-2">备注说明</h3>
                    <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5 border border-zinc-800">
                      <p className="text-[11px] text-zinc-300 leading-relaxed">{activeNote}</p>
                    </div>
                  </div>

                  {activeCollision && (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-200 mb-2">碰撞信息</h3>
                      <div className="bg-red-400/5 rounded-lg px-3 py-2 border border-red-400/20">
                        <p className="text-[11px] text-red-400 font-medium">
                          碰撞间距 {activeCollision.distance}m · 帧 {activeCollision.frameIndex}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeAnnotations.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-200 mb-2">
                        最新批注 <span className="text-[10px] text-zinc-500 font-normal">({activeAnnotations.length} 条)</span>
                      </h3>
                      <div className="bg-zinc-800/40 rounded-lg px-3 py-2 border border-zinc-800">
                        <p className="text-[10px] text-amber-400 font-medium mb-1">
                          {activeAnnotations[activeAnnotations.length - 1].authorName}
                        </p>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          {activeAnnotations[activeAnnotations.length - 1].content.slice(0, 50)}...
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="text-[9px] text-zinc-500 flex items-start gap-1.5 bg-blue-400/5 rounded-lg p-2.5 border border-blue-400/10">
                      <Info size={11} className="text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-blue-400/80 leading-relaxed">
                        导出的 PNG 包含 3D 实时截图 + 空间位置 + 备注 + 碰撞信息 + 最新批注，共 900×540 像素
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-zinc-500">
                    <Camera size={28} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">请从下方列表选择一个对象</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <MapPin size={14} /> 截图说明（按标签类型）
              </h2>
              <p className="text-[11px] text-zinc-500 mt-1">
                点击卡片可预览对象，确认 3D 画面与数据一致后再导出
                {placeholderCount > 0 && (
                  <span className="text-amber-400/80 ml-2">（{placeholderCount} 项为占位预览，需生成真实截图）</span>
                )}
              </p>
            </div>
            <button
              onClick={handleExportAll}
              disabled={exportingAll || screenshots.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 text-amber-400 text-xs font-medium hover:bg-amber-400/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-400/20"
            >
              {exportingAll ? (
                <><Loader2 size={12} className="animate-spin" /> 批量生成中...</>
              ) : (
                <><RefreshCw size={12} /> 全部重新生成 ({screenshots.length})</>
              )}
            </button>
          </div>

          {screenshots.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/40 border border-dashed border-zinc-700 rounded-lg">
              <Camera size={32} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500 mb-2">暂无截图标注</p>
              <p className="text-[11px] text-zinc-600">
                点击上方「生成说明图并下载」按钮，或前往场景预审页点选对象导出
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {(['resolved', 'pending_material', 'manual_override'] as LabelType[]).map((type) => {
                const config = labelTypeConfig[type]
                const Icon = config.icon
                const items = screenshots.filter(s => s.labelType === type)
                if (items.length === 0) return null
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon size={13} className={config.color} />
                      <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                      <span className="text-[10px] text-zinc-600">{items.length} 项</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {items.map((s) => (
                        <ExportCard
                          key={s.id}
                          screenshot={s}
                          isActive={selectedObjectId === s.objectId}
                          onSelect={() => handleSelectScreenshot(s)}
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
