import { useRobotStore } from '@/store/useRobotStore'

export default function JointControl() {
  const arm = useRobotStore(s => s.arm)
  const setJointAngle = useRobotStore(s => s.setJointAngle)
  const setJointLength = useRobotStore(s => s.setJointLength)
  const setJointLimits = useRobotStore(s => s.setJointLimits)
  const addJoint = useRobotStore(s => s.addJoint)
  const removeJoint = useRobotStore(s => s.removeJoint)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-300">关节参数</h3>
        <div className="flex gap-1">
          {arm.joints.length < 6 && (
            <button
              onClick={addJoint}
              className="px-2 py-0.5 text-xs rounded bg-cyan-900/40 text-cyan-400 hover:bg-cyan-800/60 transition-colors"
            >
              + 添加关节
            </button>
          )}
        </div>
      </div>

      {arm.joints.map((joint, idx) => {
        const isAtLimit = joint.angle <= joint.minAngle || joint.angle >= joint.maxAngle
        const limitPercent = ((joint.angle - joint.minAngle) / (joint.maxAngle - joint.minAngle)) * 100

        return (
          <div
            key={joint.id}
            className={`p-3 rounded-lg border transition-colors ${
              isAtLimit
                ? 'border-red-500/50 bg-red-950/20'
                : 'border-slate-700/50 bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isAtLimit ? 'text-red-400' : 'text-slate-300'}`}>
                关节 {idx} {idx === 0 ? '(底座旋转)' : idx === 1 ? '(肩关节)' : idx === 2 ? '(肘关节)' : ''}
              </span>
              {isAtLimit && (
                <span className="text-[10px] text-red-400 bg-red-900/40 px-1.5 py-0.5 rounded">
                  限位边界
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>角度</span>
                  <span className={`font-mono ${isAtLimit ? 'text-red-400' : 'text-cyan-400'}`}>
                    {joint.angle.toFixed(1)}°
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={joint.minAngle}
                    max={joint.maxAngle}
                    step={0.5}
                    value={joint.angle}
                    onChange={e => setJointAngle(joint.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 appearance-none bg-slate-700 rounded-full cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
                      [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,229,255,0.5)]
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>{joint.minAngle}°</span>
                    <span>{joint.maxAngle}°</span>
                  </div>
                </div>
              </div>

              {joint.length > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>臂长</span>
                    <span className="font-mono text-cyan-400">{joint.length.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={joint.length}
                    onChange={e => setJointLength(joint.id, parseFloat(e.target.value) || 0.1)}
                    className="w-full px-2 py-1 text-xs bg-slate-900/60 border border-slate-700/50 rounded text-slate-300
                      focus:border-cyan-500/50 focus:outline-none font-mono"
                  />
                </div>
              )}

              <details className="group">
                <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-400 select-none">
                  限位设置
                </summary>
                <div className="flex gap-2 mt-1.5">
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-600">最小°</label>
                    <input
                      type="number"
                      value={joint.minAngle}
                      onChange={e => setJointLimits(joint.id, parseFloat(e.target.value) || -180, joint.maxAngle)}
                      className="w-full px-1.5 py-0.5 text-[11px] bg-slate-900/60 border border-slate-700/50 rounded text-slate-400
                        focus:border-cyan-500/50 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-600">最大°</label>
                    <input
                      type="number"
                      value={joint.maxAngle}
                      onChange={e => setJointLimits(joint.id, joint.minAngle, parseFloat(e.target.value) || 180)}
                      className="w-full px-1.5 py-0.5 text-[11px] bg-slate-900/60 border border-slate-700/50 rounded text-slate-400
                        focus:border-cyan-500/50 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </details>

              {arm.joints.length > 2 && idx >= 1 && (
                <button
                  onClick={() => removeJoint(joint.id)}
                  className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                >
                  移除此关节
                </button>
              )}
            </div>
          </div>
        )
      })}

      <div className="p-2.5 rounded-lg border border-slate-700/50 bg-slate-800/20">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>基座高度</span>
          <span className="font-mono text-cyan-400">{arm.baseHeight.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
