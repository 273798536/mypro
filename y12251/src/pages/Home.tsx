import { useNavigate } from "react-router-dom"
import { LEVELS } from "@/utils/levels"
import { Zap, ChevronRight } from "lucide-react"

export default function Home() {
  const navigate = useNavigate()

  const difficultyColor = (d: number) => {
    if (d <= 2) return "text-green-400 border-green-700/50 bg-green-950/30"
    if (d <= 3) return "text-amber-400 border-amber-700/50 bg-amber-950/30"
    return "text-red-400 border-red-700/50 bg-red-950/30"
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 flex flex-col">
      <header className="border-b border-cyan-900/30 bg-[#060a14]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-600/40 flex items-center justify-center">
              <Zap size={22} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-['Orbitron'] text-cyan-300 tracking-wider">
                磁场小车竞速
              </h1>
              <p className="text-[10px] text-gray-500 tracking-wide">
                MAGNETIC FIELD CAR RACING — 物理竞赛训练系统
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/anomalies")}
            className="px-3 py-1.5 rounded border border-cyan-700/40 text-[11px] text-cyan-400 hover:bg-cyan-900/30 transition-colors"
          >
            异常总览
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-300 mb-1 font-['Orbitron'] tracking-wider">选择赛道</h2>
          <p className="text-[11px] text-gray-500">
            每条赛道包含磁场板、电流条和靶门，分步到达。后补材料不会覆盖前判。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEVELS.map((level) => (
            <button
              key={level.id}
              onClick={() => navigate(`/race/${level.id}`)}
              className="group rounded-xl border border-cyan-800/30 bg-[#0d1220] p-5 text-left transition-all hover:border-cyan-600/50 hover:shadow-[0_0_20px_rgba(0,229,255,0.08)]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-cyan-400 font-['Orbitron']">
                  {level.id}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border ${difficultyColor(level.difficulty)}`}>
                  难度 {level.difficulty}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-200 mb-1.5">{level.name}</h3>
              <p className="text-[10px] text-gray-500 leading-relaxed mb-3">{level.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-[9px] text-gray-600">
                  <span>能量上限: {level.energyLimit}</span>
                  <span>电荷: {level.particle.charge > 0 ? "+q" : "-q"}</span>
                </div>
                <ChevronRight size={14} className="text-cyan-700 group-hover:text-cyan-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-gray-800/30 bg-[#0d1220] p-5">
          <h3 className="text-xs font-bold text-gray-400 mb-3 font-['Orbitron'] tracking-wider">操作说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] text-gray-500">
            <div>
              <div className="text-cyan-400 font-bold mb-1">1. 材料分步到达</div>
              <p>磁场板先到 → 电流条后补 → 靶门再补。后补不会覆盖已确认的判定。</p>
            </div>
            <div>
              <div className="text-amber-400 font-bold mb-1">2. 瞄准与发射</div>
              <p>点击画布设定出发角度，观察预测轨迹和洛伦兹力箭头，点击发射。</p>
            </div>
            <div>
              <div className="text-red-400 font-bold mb-1">3. 异常捕获</div>
              <p>方向反判、能量超限、质量缺失自动进入异常清单，不混入正常明细。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
