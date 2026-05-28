import { usePulleyStore } from '../store/pulleyStore'
import type { WeightUnit, LengthUnit } from '../types'

export default function ParamPanel() {
  const record = usePulleyStore((s) => s.getActiveRecord())
  const updateParam = usePulleyStore((s) => s.updateParam)

  if (!record) return null

  return (
    <div className="space-y-4">
      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">滑轮配置</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8899aa] block mb-1">滑轮总数</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    const moving = Math.floor(n / 2)
                    const fixed = n - moving
                    updateParam(record.id, 'pulleyCount', n as never)
                    updateParam(record.id, 'movingPulleys', moving as never)
                    updateParam(record.id, 'fixedPulleys', fixed as never)
                  }}
                  className={`w-9 h-9 rounded-md text-sm font-mono transition-all duration-200 ${
                    record.pulleyCount === n
                      ? 'bg-[#ff6b35] text-white shadow-lg shadow-[#ff6b35]/30'
                      : 'bg-[#253345] text-[#8899aa] hover:bg-[#2d3f54]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-[#ff6b35]">动滑轮: {record.movingPulleys}</span>
            <span className="text-[#8899aa]">定滑轮: {record.fixedPulleys}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">物体重量</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.1}
            max={100}
            step={0.1}
            value={record.objectWeight}
            onChange={(e) => updateParam(record.id, 'objectWeight', parseFloat(e.target.value) as never)}
            className="flex-1 h-1.5 bg-[#253345] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff6b35]
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#ff6b35]/40"
          />
          <input
            type="number"
            value={record.objectWeight}
            onChange={(e) => updateParam(record.id, 'objectWeight', parseFloat(e.target.value) || 0 as never)}
            className="w-16 bg-[#253345] text-white text-sm font-mono px-2 py-1 rounded border border-[#334466] focus:border-[#ff6b35] focus:outline-none"
          />
          <select
            value={record.weightUnit}
            onChange={(e) => updateParam(record.id, 'weightUnit', e.target.value as WeightUnit)}
            className="bg-[#253345] text-white text-sm font-mono px-2 py-1 rounded border border-[#334466] focus:border-[#ff6b35] focus:outline-none"
          >
            <option value="N">N</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
          </select>
        </div>
      </div>

      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">摩擦系数 μ</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={Math.max(0, Math.min(0.99, record.frictionCoefficient))}
            onChange={(e) => updateParam(record.id, 'frictionCoefficient', parseFloat(e.target.value) as never)}
            className="flex-1 h-1.5 bg-[#253345] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff6b35]
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#ff6b35]/40"
          />
          <input
            type="number"
            value={record.frictionCoefficient}
            step={0.01}
            onChange={(e) => updateParam(record.id, 'frictionCoefficient', parseFloat(e.target.value) as never)}
            className={`w-16 bg-[#253345] text-white text-sm font-mono px-2 py-1 rounded border focus:outline-none ${
              record.frictionCoefficient < 0 || record.frictionCoefficient >= 1
                ? 'border-[#ef4444]'
                : 'border-[#334466] focus:border-[#ff6b35]'
            }`}
          />
        </div>
      </div>

      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">绳长</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0.1}
            max={20}
            step={0.1}
            value={record.ropeLength}
            onChange={(e) => updateParam(record.id, 'ropeLength', parseFloat(e.target.value) as never)}
            className="flex-1 h-1.5 bg-[#253345] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#ff6b35]
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#ff6b35]/40"
          />
          <input
            type="number"
            value={record.ropeLength}
            step={0.1}
            onChange={(e) => updateParam(record.id, 'ropeLength', parseFloat(e.target.value) || 0 as never)}
            className="w-16 bg-[#253345] text-white text-sm font-mono px-2 py-1 rounded border border-[#334466] focus:border-[#ff6b35] focus:outline-none"
          />
          <select
            value={record.ropeLengthUnit}
            onChange={(e) => updateParam(record.id, 'ropeLengthUnit', e.target.value as LengthUnit)}
            className="bg-[#253345] text-white text-sm font-mono px-2 py-1 rounded border border-[#334466] focus:border-[#ff6b35] focus:outline-none"
          >
            <option value="m">m</option>
            <option value="cm">cm</option>
          </select>
        </div>
      </div>

      <div className="bg-[#1a2332]/80 rounded-lg p-4 border border-[#253345]">
        <h3 className="text-xs font-mono text-[#8899aa] uppercase tracking-wider mb-3">数据来源</h3>
        <input
          type="text"
          value={record.source}
          onChange={(e) => updateParam(record.id, 'source', e.target.value as never)}
          className="w-full bg-[#253345] text-white text-sm font-mono px-3 py-1.5 rounded border border-[#334466] focus:border-[#ff6b35] focus:outline-none"
          placeholder="如：课堂实验、学生步骤、课本例题"
        />
      </div>
    </div>
  )
}
