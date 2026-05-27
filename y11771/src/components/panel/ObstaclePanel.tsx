import { useState } from 'react'
import { useRobotStore } from '@/store/useRobotStore'
import type { Obstacle, SphereSafetyZone, CylinderSafetyZone } from '@/utils/kinematics'

let nextId = 1

export default function ObstaclePanel() {
  const obstacles = useRobotStore(s => s.obstacles)
  const safetyZones = useRobotStore(s => s.safetyZones)
  const addObstacle = useRobotStore(s => s.addObstacle)
  const removeObstacle = useRobotStore(s => s.removeObstacle)
  const addSafetyZone = useRobotStore(s => s.addSafetyZone)
  const removeSafetyZone = useRobotStore(s => s.removeSafetyZone)

  const [obsType, setObsType] = useState<'sphere' | 'box'>('sphere')
  const [zoneType, setZoneType] = useState<'sphere' | 'cylinder'>('sphere')

  const handleAddObstacle = () => {
    const id = `obs_${nextId++}_${Date.now()}`
    const obstacle: Obstacle =
      obsType === 'sphere'
        ? { id, type: 'sphere', position: [2, 1, 0], size: 0.5 }
        : { id, type: 'box', position: [2, 0.5, 0], size: [0.8, 1, 0.8] as [number, number, number] }
    addObstacle(obstacle)
  }

  const handleAddSafetyZone = () => {
    const id = `zone_${nextId++}_${Date.now()}`
    if (zoneType === 'sphere') {
      const zone: SphereSafetyZone = { id, type: 'sphere', position: [0, 1.5, 0], size: 3 }
      addSafetyZone(zone)
    } else {
      const zone: CylinderSafetyZone = { id, type: 'cylinder', position: [0, 1, 0], size: [3, 4] }
      addSafetyZone(zone)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-cyan-300 mb-2">障碍物</h3>
        <div className="flex gap-2 mb-2">
          <select
            value={obsType}
            onChange={e => setObsType(e.target.value as 'sphere' | 'box')}
            className="px-2 py-1 text-xs bg-slate-900/60 border border-slate-700/50 rounded text-slate-300
              focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="sphere">球体</option>
            <option value="box">立方体</option>
          </select>
          <button
            onClick={handleAddObstacle}
            className="px-3 py-1 text-xs rounded bg-red-900/40 text-red-400 hover:bg-red-800/60 transition-colors"
          >
            + 添加障碍物
          </button>
        </div>
        {obstacles.length === 0 && (
          <p className="text-[10px] text-slate-600">暂无障碍物，点击上方按钮添加</p>
        )}
        {obstacles.map(obs => (
          <div key={obs.id} className="p-2 rounded border border-red-900/30 bg-red-950/10 mb-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-red-300">
                {obs.type === 'sphere' ? '球体' : '立方体'}
              </span>
              <button
                onClick={() => removeObstacle(obs.id)}
                className="text-[10px] text-red-400/60 hover:text-red-400"
              >
                删除
              </button>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              位置: ({obs.position.map(v => v.toFixed(1)).join(', ')})
              {obs.type === 'sphere'
                ? ` | 半径: ${(obs.size as number).toFixed(1)}`
                : ` | 尺寸: ${(obs.size as [number, number, number]).map(v => v.toFixed(1)).join('×')}`}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-green-400 mb-2">安全区</h3>
        <div className="flex gap-2 mb-2">
          <select
            value={zoneType}
            onChange={e => setZoneType(e.target.value as 'sphere' | 'cylinder')}
            className="px-2 py-1 text-xs bg-slate-900/60 border border-slate-700/50 rounded text-slate-300
              focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="sphere">球体</option>
            <option value="cylinder">圆柱体</option>
          </select>
          <button
            onClick={handleAddSafetyZone}
            className="px-3 py-1 text-xs rounded bg-green-900/40 text-green-400 hover:bg-green-800/60 transition-colors"
          >
            + 添加安全区
          </button>
        </div>
        {safetyZones.length === 0 && (
          <p className="text-[10px] text-slate-600">暂无安全区，点击上方按钮添加</p>
        )}
        {safetyZones.map(zone => (
          <div key={zone.id} className="p-2 rounded border border-green-900/30 bg-green-950/10 mb-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-green-300">
                {zone.type === 'sphere' ? '球体' : '圆柱体'}
              </span>
              <button
                onClick={() => removeSafetyZone(zone.id)}
                className="text-[10px] text-green-400/60 hover:text-green-400"
              >
                删除
              </button>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              位置: ({zone.position.map(v => v.toFixed(1)).join(', ')})
              {zone.type === 'sphere'
                ? ` | 半径: ${zone.size.toFixed(1)}`
                : ` | 半径: ${zone.size[0].toFixed(1)} 高: ${zone.size[1].toFixed(1)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
