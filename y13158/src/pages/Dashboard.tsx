import { useStore } from '@/store'
import { Link } from 'react-router-dom'
import { Play, RotateCcw, CheckCircle2, FileQuestion, UserCheck } from 'lucide-react'

export default function Dashboard() {
  const records = useStore((s) => s.records)
  const isRunning = useStore((s) => s.isRunning)
  const lastRunAt = useStore((s) => s.lastRunAt)
  const startRun = useStore((s) => s.startRun)
  const finishRun = useStore((s) => s.finishRun)

  const processed = records.filter((r) => r.status === 'processed')
  const pendingMaterial = records.filter((r) => r.status === 'pending_material')
  const manualOverride = records.filter((r) => r.status === 'manual_override')
  const extremeCount = records.filter((r) => r.isExtreme).length
  const samplingGapCount = records.filter((r) => r.hasSamplingGap).length

  const handleStart = () => {
    startRun()
    setTimeout(() => finishRun(), 2000)
  }

  const handleRerun = () => {
    startRun()
    setTimeout(() => finishRun(), 2000)
  }

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-iron-50 mb-1">热泵循环误差归因</h1>
        <p className="text-iron-400 text-sm">启动归因计算 · 重跑参数 · 查看摘要</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Link
          to="/records?status=processed"
          className="group relative overflow-hidden rounded-xl border border-iron-700 bg-iron-900 p-6 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-iron-400 text-sm font-medium">已处理</span>
          </div>
          <div className="text-4xl font-bold text-iron-50 font-mono">{processed.length}</div>
          <div className="mt-2 text-xs text-iron-500">
            含 {processed.filter((r) => r.isExtreme).length} 条极端值
          </div>
        </Link>

        <Link
          to="/records?status=pending_material"
          className="group relative overflow-hidden rounded-xl border border-iron-700 bg-iron-900 p-6 transition-all duration-300 hover:border-iron-500/40 hover:shadow-[0_0_30px_-5px_rgba(107,114,128,0.15)]"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-iron-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-iron-500/10 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-iron-500/10 flex items-center justify-center">
              <FileQuestion className="w-5 h-5 text-iron-400" />
            </div>
            <span className="text-iron-400 text-sm font-medium">待补材料</span>
          </div>
          <div className="text-4xl font-bold text-iron-50 font-mono">{pendingMaterial.length}</div>
          <div className="mt-2 text-xs text-iron-500">
            采样缺口 {pendingMaterial.filter((r) => r.hasSamplingGap).length} 条 · 卡点{' '}
            {pendingMaterial.filter((r) => r.blockPoint).length} 处
          </div>
        </Link>

        <Link
          to="/records?status=manual_override"
          className="group relative overflow-hidden rounded-xl border border-iron-700 bg-iron-900 p-6 transition-all duration-300 hover:border-danger-500/40 hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.15)]"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-danger-500/10 transition-colors" />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-danger-500/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-danger-500" />
            </div>
            <span className="text-iron-400 text-sm font-medium">人工改判</span>
          </div>
          <div className="text-4xl font-bold text-iron-50 font-mono">{manualOverride.length}</div>
          <div className="mt-2 text-xs text-iron-500">需复核确认</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <button
          onClick={handleStart}
          disabled={isRunning}
          className="group relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6 transition-all duration-300 hover:border-amber-500/60 hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
              {isRunning ? (
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5 text-amber-500" />
              )}
            </div>
            <div>
              <div className="text-lg font-bold text-iron-50">
                {isRunning ? '计算中…' : '启动归因'}
              </div>
              <div className="text-xs text-iron-400 mt-0.5">基于当前参数版本全量计算</div>
            </div>
          </div>
        </button>

        <button
          onClick={handleRerun}
          disabled={isRunning}
          className="group relative overflow-hidden rounded-xl border border-iron-600 bg-iron-900 p-6 transition-all duration-300 hover:border-iron-500 hover:shadow-[0_0_40px_-5px_rgba(107,114,128,0.1)] disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-iron-700/50 flex items-center justify-center group-hover:bg-iron-700 transition-colors">
              <RotateCcw className="w-5 h-5 text-iron-300" />
            </div>
            <div>
              <div className="text-lg font-bold text-iron-50">
                {isRunning ? '重跑中…' : '重跑归因'}
              </div>
              <div className="text-xs text-iron-400 mt-0.5">
                {lastRunAt ? `上次完成: ${new Date(lastRunAt).toLocaleString('zh-CN')}` : '使用更新后的参数重新计算'}
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="rounded-xl border border-iron-700 bg-iron-900 p-5">
        <h2 className="text-sm font-semibold text-iron-300 mb-4">快速统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-iron-800/50">
            <div className="text-2xl font-bold font-mono text-iron-50">{records.length}</div>
            <div className="text-xs text-iron-400 mt-1">总记录</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-iron-800/50">
            <div className="text-2xl font-bold font-mono text-danger-500">{extremeCount}</div>
            <div className="text-xs text-iron-400 mt-1">极端值</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-iron-800/50">
            <div className="text-2xl font-bold font-mono text-amber-500">{samplingGapCount}</div>
            <div className="text-xs text-iron-400 mt-1">采样缺口</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-iron-800/50">
            <div className="text-2xl font-bold font-mono text-iron-300">
              {records.filter((r) => r.anomalyLevel === 'high').length}
            </div>
            <div className="text-xs text-iron-400 mt-1">高异常</div>
          </div>
        </div>
      </div>
    </div>
  )
}
