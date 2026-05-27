import { useRef } from 'react'
import { useRobotStore } from '@/store/useRobotStore'
import { exportToJSON, importFromJSON } from '@/utils/exportImport'
import { Save, FolderOpen, Camera, RotateCcw, Cloud, CloudOff } from 'lucide-react'

export default function Toolbar() {
  const arm = useRobotStore(s => s.arm)
  const obstacles = useRobotStore(s => s.obstacles)
  const safetyZones = useRobotStore(s => s.safetyZones)
  const history = useRobotStore(s => s.history)
  const resetToDefault = useRobotStore(s => s.resetToDefault)
  const loadFromData = useRobotStore(s => s.loadFromData)
  const addHistoryEntry = useRobotStore(s => s.addHistoryEntry)
  const workspaceVisible = useRobotStore(s => s.workspaceVisible)
  const setWorkspaceVisible = useRobotStore(s => s.setWorkspaceVisible)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = () => {
    exportToJSON(arm, obstacles, safetyZones, history)
    addHistoryEntry('manual', '导出方案为JSON文件')
  }

  const handleLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importFromJSON(file)
      loadFromData(data.arm, data.obstacles, data.safetyZones, data.history)
    } catch (err) {
      alert((err as Error).message)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    try {
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      link.download = `机械臂截图_${ts}.png`
      link.href = url
      link.click()
      addHistoryEntry('manual', '导出场景截图')
    } catch {
      console.warn('截图失败')
    }
  }

  const handleReset = () => {
    if (confirm('确定重置为默认方案？当前未保存的更改将丢失。')) {
      resetToDefault()
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full
          bg-cyan-900/30 text-cyan-400 border border-cyan-700/30
          hover:bg-cyan-800/40 hover:border-cyan-600/50 hover:shadow-[0_0_12px_rgba(0,229,255,0.15)]
          transition-all"
      >
        <Save size={13} />
        保存方案
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full
          bg-blue-900/30 text-blue-400 border border-blue-700/30
          hover:bg-blue-800/40 hover:border-blue-600/50 hover:shadow-[0_0_12px_rgba(96,165,250,0.15)]
          transition-all"
      >
        <FolderOpen size={13} />
        加载方案
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleLoad}
        className="hidden"
      />

      <button
        onClick={handleScreenshot}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full
          bg-emerald-900/30 text-emerald-400 border border-emerald-700/30
          hover:bg-emerald-800/40 hover:border-emerald-600/50 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]
          transition-all"
      >
        <Camera size={13} />
        截图导出
      </button>

      <button
        onClick={() => setWorkspaceVisible(!workspaceVisible)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
          workspaceVisible
            ? 'bg-violet-900/30 text-violet-400 border-violet-700/30 hover:bg-violet-800/40 hover:shadow-[0_0_12px_rgba(167,139,250,0.15)]'
            : 'bg-slate-900/30 text-slate-500 border-slate-700/30 hover:bg-slate-800/40'
        }`}
      >
        {workspaceVisible ? <Cloud size={13} /> : <CloudOff size={13} />}
        可达云图
      </button>

      <button
        onClick={handleReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full
          bg-red-900/20 text-red-400/70 border border-red-700/20
          hover:bg-red-800/30 hover:text-red-400 hover:border-red-600/30
          transition-all ml-auto"
      >
        <RotateCcw size={13} />
        重置
      </button>
    </div>
  )
}
