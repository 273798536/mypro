import { forwardRef } from 'react'
import { Camera, Download, Link2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import {
  ABNORMAL_LABELS,
  findWell,
  findTimePoint,
  getSnapshot,
  monitoringWells,
} from '@/data/mockData'
import { useAppStore } from '@/store/useAppStore'

export interface ScreenshotPanelHandle {
  exportScreenshot: () => Promise<void>
}

const ScreenshotPanel = forwardRef<ScreenshotPanelHandle, {}>((_props, ref) => {
  const selectedWellId = useAppStore((s) => s.selectedWellId)
  const currentTimePointId = useAppStore((s) => s.currentTimePointId)
  const abnormalFilter = useAppStore((s) => s.abnormalFilter)
  const wellFilter = useAppStore((s) => s.selectedWellIdsForFilter)

  const well = findWell(selectedWellId)
  const tp = findTimePoint(currentTimePointId)
  const snapshot = well ? getSnapshot(well.id, currentTimePointId) : undefined

  const totalAbnormal = monitoringWells.filter((w) => {
    const s = getSnapshot(w.id, currentTimePointId)
    return s?.isAbnormal
  }).length

  const exportScreenshot = async () => {
    const el = document.getElementById('capture-root')
    if (!el) return
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#070b10',
        scale: 1.5,
        useCORS: true,
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      const stamp = tp?.label ?? 'now'
      const wn = well?.name ?? 'all'
      a.download = `地下水监测井时序回放_${wn}_${stamp}.png`
      a.click()

      const text = buildDescription()
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const ta = document.createElement('a')
      ta.href = URL.createObjectURL(blob)
      ta.download = `地下水监测井时序回放_${wn}_${stamp}_说明.txt`
      ta.click()
    } catch (e) {
      console.error('截图导出失败', e)
    }
  }

  const buildDescription = () => {
    const lines: string[] = []
    lines.push('== 地下水监测井时序回放 · 截图说明 ==')
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`)
    lines.push(`当前时间点: ${tp?.label ?? '-'}${tp?.missing ? ' [缺段·非正常通过]' : ''}`)
    if (tp?.missing) lines.push(`缺段原因: ${tp.missingReason ?? '未记录'}`)
    lines.push('')
    if (well) {
      lines.push(`选中对象: ${well.name}`)
      lines.push(`对象来源: ${well.sourcePhoto}`)
      if (well.note) lines.push(`备注: ${well.note}`)
      if (snapshot) {
        lines.push(`数据状态: ${snapshot.hasData ? '有数据' : '[NO_DATA·未修脏]'}`)
        lines.push(`原始记录: ${snapshot.originalRaw}`)
        if (snapshot.isAbnormal && snapshot.abnormalType) {
          lines.push(`异常类型: ${ABNORMAL_LABELS[snapshot.abnormalType]}`)
        } else {
          lines.push('异常类型: 无')
        }
        if (snapshot.hasData) {
          lines.push(`水位: ${snapshot.waterLevel.toFixed(2)} m`)
          lines.push(`水质: ${snapshot.quality}`)
        }
      }
    } else {
      lines.push('选中对象: 全部（未点选）')
      lines.push(`异常对象数（当前时间点）: ${totalAbnormal}`)
    }
    lines.push('')
    lines.push('筛选条件:')
    lines.push(
      `  异常类型: ${
        abnormalFilter.length > 0
          ? abnormalFilter.map((t) => ABNORMAL_LABELS[t]).join('、')
          : '全部'
      }`,
    )
    lines.push(
      `  监测井: ${
        wellFilter.length > 0
          ? wellFilter
              .map((id) => findWell(id)?.name ?? id)
              .join('、')
          : '全部'
      }`,
    )
    lines.push('')
    lines.push('-- 可通过截图文件名回溯本说明 --')
    return lines.join('\n')
  }

  if (typeof ref === 'function') {
    ref({ exportScreenshot })
  } else if (ref) {
    ref.current = { exportScreenshot }
  }

  return (
    <div className="glass rounded-xl p-4 w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-amberx" />
          <span className="font-display text-sm text-slate-100">截图说明</span>
          <span className="text-[10px] font-mono text-slate-500">用于评审沟通</span>
        </div>
        <button
          onClick={exportScreenshot}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-amberx/15 border border-amberx/40 text-amberx hover:bg-amberx/25 shadow-glow-amber transition"
        >
          <Download size={12} />
          导出截图+说明
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-2">
          <div className="text-slate-500 mb-0.5">当前时间点</div>
          <div className="flex items-center gap-1">
            {tp?.missing ? (
              <AlertTriangle size={11} className="text-redx" />
            ) : (
              <CheckCircle2 size={11} className="text-tealx" />
            )}
            <span className={tp?.missing ? 'text-redx' : 'text-slate-100'}>
              {tp?.label}
            </span>
            {tp?.missing && (
              <span className="label-tag bg-redx/20 text-redx border border-redx/30 ml-1">
                缺段
              </span>
            )}
          </div>
          {tp?.missing && (
            <div className="text-redx/70 mt-0.5">{tp.missingReason}</div>
          )}
        </div>
        <div className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-2">
          <div className="text-slate-500 mb-0.5">对象来源</div>
          {well ? (
            <div>
              <div className="text-tealx">{well.name}</div>
              <div className="text-slate-400 mt-0.5 break-all">
                <Link2 size={10} className="inline mr-1 opacity-60" />
                {well.sourcePhoto}
              </div>
            </div>
          ) : (
            <div className="text-slate-400">
              未点选 · 全局 · 异常 {totalAbnormal} 口
            </div>
          )}
        </div>
      </div>

      {well && snapshot && (
        <div className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-2 text-[11px] font-mono space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">数据状态</span>
            <span className={snapshot.hasData ? 'text-tealx' : 'text-redx'}>
              {snapshot.hasData ? 'HAS_DATA' : 'NO_DATA · [未修脏保留]'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">异常</span>
            <span
              className={
                snapshot.isAbnormal ? 'text-amberx' : 'text-slate-300'
              }
            >
              {snapshot.isAbnormal && snapshot.abnormalType
                ? ABNORMAL_LABELS[snapshot.abnormalType]
                : '无'}
            </span>
          </div>
          {snapshot.hasData && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">水位</span>
                <span className="text-slate-100">
                  {snapshot.waterLevel.toFixed(2)} m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">水质</span>
                <span
                  className={
                    snapshot.quality === 'poor'
                      ? 'text-redx'
                      : snapshot.quality === 'excellent'
                      ? 'text-tealx'
                      : 'text-slate-200'
                  }
                >
                  {snapshot.quality}
                </span>
              </div>
            </>
          )}
          <div className="flex items-start justify-between gap-2 pt-1 border-t border-white/5 mt-1">
            <span className="text-slate-500 shrink-0">原始记录</span>
            <span className="text-slate-400 break-all text-right">
              {snapshot.originalRaw}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-2 text-[11px] font-mono">
        <div className="text-slate-500 mb-1">当前筛选</div>
        <div className="flex flex-wrap gap-1">
          {abnormalFilter.length === 0 ? (
            <span className="chip chip-default">异常类型：全部</span>
          ) : (
            abnormalFilter.map((t) => (
              <span key={t} className="chip chip-danger">
                {ABNORMAL_LABELS[t]}
              </span>
            ))
          )}
          {wellFilter.length === 0 ? (
            <span className="chip chip-default">监测井：全部</span>
          ) : (
            wellFilter.map((id) => (
              <span key={id} className="chip chip-active">
                {findWell(id)?.name ?? id}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
})

ScreenshotPanel.displayName = 'ScreenshotPanel'
export default ScreenshotPanel
