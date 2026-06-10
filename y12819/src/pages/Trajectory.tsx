import { useEffect, useState, useMemo, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useAppStore } from '@/store'
import TrajectoryScene from '@/components/TrajectoryScene'

export default function Trajectory() {
  const { sessions, trajectoryData, fetchSessions, fetchTrajectory } = useAppStore()
  const [selectedAnimal, setSelectedAnimal] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [rangeStart, setRangeStart] = useState(0)
  const [rangeEnd, setRangeEnd] = useState(50)

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (sessions.length > 0 && !selectedAnimal) {
      setSelectedAnimal(sessions[0].animal_id)
    }
  }, [sessions, selectedAnimal])

  useEffect(() => {
    if (selectedAnimal) {
      fetchTrajectory(selectedAnimal)
    }
  }, [selectedAnimal, fetchTrajectory])

  const currentSession = trajectoryData?.[0]
  const points = currentSession?.points ?? []
  const annotations = currentSession?.annotations ?? []

  useEffect(() => {
    if (points.length > 0) {
      setRangeEnd(points.length)
    }
  }, [points.length])

  const speedStats = useMemo(() => {
    if (points.length === 0) return { min: 0, max: 0, avg: 0 }
    const speeds = points.map((p) => p.speed)
    return {
      min: Math.min(...speeds).toFixed(3),
      max: Math.max(...speeds).toFixed(3),
      avg: (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(3),
    }
  }, [points])

  const regionDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    points.forEach((p) => {
      dist[p.region] = (dist[p.region] || 0) + 1
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [points])

  const uniqueAnimals = useMemo(
    () => [...new Set(sessions.map((s) => s.animal_id))],
    [sessions]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-title text-2xl font-semibold text-slate-800">轨迹可视化</h2>
        <select
          value={selectedAnimal}
          onChange={(e) => setSelectedAnimal(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          {uniqueAnimals.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="h-[500px]">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  加载3D场景...
                </div>
              }
            >
              <Canvas camera={{ position: [1, 3, 3], fov: 50 }}>
                <TrajectoryScene
                  points={points}
                  annotations={annotations}
                  highlightedIndex={highlightedIndex}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                />
                <OrbitControls enableDamping dampingFactor={0.05} />
              </Canvas>
            </Suspense>
          </div>

          <div className="px-6 py-4 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 shrink-0">时间轴</span>
              <input
                type="range"
                min={0}
                max={points.length || 1}
                value={rangeStart}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v < rangeEnd) setRangeStart(v)
                }}
                className="flex-1"
              />
              <input
                type="range"
                min={0}
                max={points.length || 1}
                value={rangeEnd}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v > rangeStart) setRangeEnd(v)
                }}
                className="flex-1"
              />
              <span className="text-xs text-slate-500 shrink-0">
                {rangeStart}-{rangeEnd}/{points.length}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 rounded bg-blue-500" />慢速
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 rounded bg-red-500" />快速
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />速度变化
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />区域变化
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 max-h-[640px] overflow-y-auto">
          {currentSession && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-medium text-slate-800 mb-3">会话信息</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">动物ID</dt>
                  <dd className="font-medium text-slate-800">{currentSession.animal_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">实验组</dt>
                  <dd className="font-medium text-slate-800">{currentSession.experiment_group}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">开始时间</dt>
                  <dd className="text-slate-700">{currentSession.start_time}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">结束时间</dt>
                  <dd className="text-slate-700">{currentSession.end_time}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-medium text-slate-800 mb-3">速度统计</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">最小</dt>
                <dd className="font-mono text-slate-800">{speedStats.min}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">最大</dt>
                <dd className="font-mono text-slate-800">{speedStats.max}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">平均</dt>
                <dd className="font-mono text-slate-800">{speedStats.avg}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-medium text-slate-800 mb-3">区域分布</h3>
            <div className="space-y-2 text-sm">
              {regionDistribution.map(([region, count]) => (
                <div key={region} className="flex justify-between">
                  <span className="text-slate-500">{region}</span>
                  <span className="text-slate-800">{count} 次</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-medium text-slate-800 mb-3">标注列表</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {annotations.map((ann) => (
                <button
                  key={ann.id}
                  onClick={() =>
                    setHighlightedIndex(
                      highlightedIndex === ann.point_index ? null : ann.point_index
                    )
                  }
                  className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                    highlightedIndex === ann.point_index
                      ? 'bg-amber-50 border border-amber-300'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">#{ann.point_index}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        ann.type === 'speed_change'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {ann.type === 'speed_change' ? '速度' : '区域'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{ann.label}</p>
                  <p className="text-xs text-slate-400">{ann.detail}</p>
                </button>
              ))}
              {annotations.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">暂无标注</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
