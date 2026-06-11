import { useStore } from '@/store/useStore'
import { MapPin, Ruler, Lightbulb, AlertTriangle } from 'lucide-react'

export default function ObjectProperties() {
  const selectedObjectId = useStore((s) => s.selectedObjectId)
  const getBarById = useStore((s) => s.getBarById)
  const getFixturesByBarId = useStore((s) => s.getFixturesByBarId)
  const getCollisionsByObjectId = useStore((s) => s.getCollisionsByObjectId)
  const currentFrame = useStore((s) => s.currentFrame)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)

  if (!selectedObjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6">
        <MapPin size={32} className="mb-3 opacity-40" />
        <p className="text-sm text-center">点击3D场景中的对象<br/>查看属性详情</p>
      </div>
    )
  }

  const bar = getBarById(selectedObjectId)
  if (!bar) return null

  const fixtures = getFixturesByBarId(selectedObjectId)
  const collisions = getCollisionsByObjectId(selectedObjectId)
  const currentY = getBarPositionAtFrame(selectedObjectId, currentFrame)

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${bar.type === 'scenery' ? 'bg-amber-700' : 'bg-zinc-400'}`} />
        <h3 className="text-sm font-semibold text-zinc-100">{bar.name}</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{bar.type === 'scenery' ? '景片' : '吊杆'}</span>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <Ruler size={12} /> 空间位置
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-900/80 rounded px-2 py-1.5">
            <span className="text-[10px] text-zinc-500">X</span>
            <p className="text-xs text-zinc-200 font-mono">{bar.positionX.toFixed(1)}m</p>
          </div>
          <div className="bg-zinc-900/80 rounded px-2 py-1.5">
            <span className="text-[10px] text-zinc-500">Y (当前帧)</span>
            <p className="text-xs text-zinc-200 font-mono">{currentY.toFixed(2)}m</p>
          </div>
          <div className="bg-zinc-900/80 rounded px-2 py-1.5">
            <span className="text-[10px] text-zinc-500">Z</span>
            <p className="text-xs text-zinc-200 font-mono">{bar.positionZ.toFixed(1)}m</p>
          </div>
        </div>
      </div>

      {fixtures.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Lightbulb size={12} /> 挂载灯具
          </h4>
          <div className="space-y-1">
            {fixtures.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-zinc-900/60 rounded px-2 py-1.5">
                <span className="text-xs text-zinc-300">{f.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{f.fixtureType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle size={12} /> 碰撞状态
        </h4>
        {collisions.length === 0 ? (
          <p className="text-xs text-emerald-400 bg-emerald-400/10 rounded px-2 py-1.5">无碰撞记录</p>
        ) : (
          <div className="space-y-1">
            {collisions.map((c) => (
              <div key={c.id} className={`text-xs rounded px-2 py-1.5 ${
                c.status === 'collision' ? 'bg-red-500/10 text-red-400' :
                c.status === 'pending_review' ? 'bg-amber-500/10 text-amber-400' :
                'bg-emerald-400/10 text-emerald-400'
              }`}>
                <span className="font-medium">
                  {c.objectAId === selectedObjectId ? useStore.getState().getBarById(c.objectBId)?.name : useStore.getState().getBarById(c.objectAId)?.name}
                </span>
                <span className="ml-2 opacity-70">间距 {c.distance}m · 帧{c.frameIndex}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
