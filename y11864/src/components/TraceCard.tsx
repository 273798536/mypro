import type { TrajectoryResult } from '@/types'
import { X } from 'lucide-react'

interface TraceCardProps {
  result: TrajectoryResult
  onClose: () => void
}

export default function TraceCard({ result, onClose }: TraceCardProps) {
  const { params, maxRange, maxHeight, flightTime, anomalies } = result

  return (
    <div className="absolute bottom-20 right-4 z-30 bg-[#0d1117]/95 backdrop-blur border border-[#00d4ff]/30 rounded-xl p-4 w-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#00d4ff] tracking-wider">溯源详情</h3>
        <button onClick={onClose} className="text-[#8892a4] hover:text-[#ff3366] transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="bg-[#1a1f2e] rounded-lg p-3 mb-2">
        <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-1.5">来源参数</p>
        <div className="font-mono text-xs text-[#c8d0dc] space-y-0.5">
          <div>初速度: <span className="text-[#00d4ff]">{params.velocity} m/s</span></div>
          <div>发射角度: <span className="text-[#00d4ff]">{params.angle}°</span></div>
          <div>阻力系数: <span className="text-[#00d4ff]">{params.dragCoefficient}</span></div>
          <div>发射点: <span className="text-[#00d4ff]">({params.origin.join(', ')})</span></div>
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-lg p-3 mb-2">
        <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-1.5">计算公式</p>
        <div className="font-mono text-[10px] text-[#c8d0dc] space-y-0.5">
          <div>理想: x=v₀cos(θ)t, y=v₀sin(θ)t-½gt²</div>
          <div>含阻力: F_drag=-kv (RK4积分, dt=0.01s)</div>
          <div>g = 9.81 m/s²</div>
        </div>
      </div>

      <div className="bg-[#1a1f2e] rounded-lg p-3">
        <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-1.5">结果数据</p>
        <div className="font-mono text-xs text-[#c8d0dc] space-y-0.5">
          <div>最大射程: <span className="text-[#00ff88]">{maxRange} m</span></div>
          <div>最大高度: <span className="text-[#00ff88]">{maxHeight} m</span></div>
          <div>飞行时间: <span className="text-[#00ff88]">{flightTime} s</span></div>
        </div>
        {anomalies.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#2a3040]">
            <p className="text-[10px] text-[#ff6b35] uppercase tracking-wider mb-1">异常</p>
            {anomalies.map((a, i) => (
              <div key={i} className="text-[10px] text-[#ff6b35] font-mono">{a.message}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
