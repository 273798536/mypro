import {
  Eye,
  Camera,
  Download,
  Save,
  ChevronDown,
  Trash2,
  Maximize2,
  Grid3X3,
  Box,
  RotateCcw,
  Image as ImageIcon,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

type ViewPreset = 'perspective' | 'top' | 'side'

const VIEW_PRESETS: Record<ViewPreset, { label: string; icon: any; pos: [number, number, number]; tgt: [number, number, number] }> = {
  perspective: { label: '透视', icon: Box, pos: [30, 35, 60], tgt: [0, 2, 40] },
  top: { label: '俯视', icon: Grid3X3, pos: [0, 80, 40], tgt: [0, 0, 40] },
  side: { label: '侧视', icon: Maximize2, pos: [60, 10, 40], tgt: [0, 3, 40] },
}

export default function Toolbar() {
  const setCamera = useAppStore((s) => s.setCamera)
  const saveSnapshot = useAppStore((s) => s.saveSnapshot)
  const restoreSnapshot = useAppStore((s) => s.restoreSnapshot)
  const deleteSnapshot = useAppStore((s) => s.deleteSnapshot)
  const snapshots = useAppStore((s) => s.snapshots)
  const takeScreenshot = useAppStore((s) => s.takeScreenshot)
  const exportReviewList = useAppStore((s) => s.exportReviewList)
  const points = useAppStore((s) => s.points)
  const reviews = useAppStore((s) => s.reviews)
  const anomalies = useAppStore((s) => s.anomalies)

  const [showSnapshots, setShowSnapshots] = useState(false)
  const [snapName, setSnapName] = useState('')
  const snapMenuRef = useRef<HTMLDivElement>(null)

  const applyPreset = (preset: ViewPreset) => {
    const p = VIEW_PRESETS[preset]
    setCamera({ position: p.pos, target: p.tgt })
  }

  const handleSaveSnap = () => {
    const name = snapName.trim() || `快照 ${new Date().toLocaleTimeString('zh-CN')}`
    saveSnapshot(name)
    setSnapName('')
  }

  const handleExport = () => {
    const text = exportReviewList()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `滨海步道风场复核清单_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const passCount = points.filter((p) => reviews[p.id]?.result === 'pass').length
  const supplyCount = points.filter((p) => reviews[p.id]?.result === 'supply').length
  const pendingCount = points.length - passCount - supplyCount

  return (
    <div className="panel-glass flex items-center gap-3 px-4 py-2 border-b border-gray-border relative z-10">
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-cyan-industrial" />
        <h1 className="font-mono text-sm tracking-widest text-cyan-industrial">
          滨海步道风场空间复核
        </h1>
      </div>

      <div className="h-5 w-px bg-gray-border mx-2" />

      <div className="flex items-center gap-1">
        {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map((k) => {
          const p = VIEW_PRESETS[k]
          const Icon = p.icon
          return (
            <button
              key={k}
              onClick={() => applyPreset(k)}
              className="btn-industrial flex items-center gap-1.5"
              title={p.label}
            >
              <Icon size={13} />
              {p.label}
            </button>
          )
        })}
        <button
          onClick={() => applyPreset('perspective')}
          className="btn-industrial flex items-center gap-1.5"
          title="重置视角"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <div className="h-5 w-px bg-gray-border mx-2" />

      <button
        onClick={() => takeScreenshot()}
        className="btn-industrial flex items-center gap-1.5"
        title="导出当前视角为PNG图片"
      >
        <ImageIcon size={13} />
        截图下载
      </button>

      <div className="relative" ref={snapMenuRef}>
        <button
          onClick={() => setShowSnapshots((v) => !v)}
          className="btn-industrial flex items-center gap-1.5"
        >
          <Camera size={13} />
          视图快照
          <ChevronDown size={13} />
        </button>
        {showSnapshots && (
          <div className="absolute top-full left-0 mt-1.5 w-72 panel-glass rounded border border-gray-border shadow-xl z-50">
            <div className="p-2 border-b border-gray-border/60 flex gap-1.5">
              <input
                type="text"
                value={snapName}
                onChange={(e) => setSnapName(e.target.value)}
                placeholder="快照名称..."
                className="flex-1 px-2 py-1.5 text-xs bg-navy-deep/70 border border-gray-border rounded focus:border-cyan-industrial outline-none text-gray-200 font-mono"
              />
              <button
                onClick={handleSaveSnap}
                className="btn-industrial flex items-center gap-1"
              >
                <Save size={12} />
                保存
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              {snapshots.length === 0 && (
                <div className="text-center text-gray-wait text-xs py-6">
                  暂无快照
                </div>
              )}
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-2.5 py-2 hover:bg-navy-mid/50 border-b border-gray-border/30 last:border-0 group"
                >
                  <Camera size={13} className="text-cyan-industrial shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-200 truncate">{s.name}</div>
                    <div className="text-[10px] text-gray-wait">
                      {new Date(s.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <button
                    onClick={() => restoreSnapshot(s.id)}
                    className="text-[10px] px-2 py-0.5 rounded border border-cyan-industrial/50 text-cyan-industrial hover:bg-cyan-industrial/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => deleteSnapshot(s.id)}
                    className="text-[10px] p-1 rounded text-gray-wait hover:text-orange-alert hover:bg-orange-alert/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-green-pass shadow-glow-green" />
            <span className="text-green-pass">{passCount} 放行</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-orange-alert shadow-glow-orange" />
            <span className="text-orange-alert">{supplyCount} 补料</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-gray-wait" />
            <span className="text-gray-wait">{pendingCount} 待确认</span>
          </span>
          <span className="text-gray-wait/60">|</span>
          <span className="text-orange-alert">{anomalies.length} 异常</span>
        </div>
        <button onClick={handleExport} className="btn-industrial flex items-center gap-1.5">
          <Download size={13} />
          导出复核清单
        </button>
      </div>
    </div>
  )
}
