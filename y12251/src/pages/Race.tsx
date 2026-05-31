import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useGameStore } from "@/store/gameStore"
import RaceCanvas from "@/components/RaceCanvas"
import MaterialPanel from "@/components/MaterialPanel"
import AnomalySidebar from "@/components/AnomalySidebar"
import { ArrowLeft, Play, RotateCcw, Eye } from "lucide-react"

export default function Race() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const loadLevel = useGameStore((s) => s.loadLevel)
  const phase = useGameStore((s) => s.phase)
  const launchCar = useGameStore((s) => s.launchCar)
  const resetLevel = useGameStore((s) => s.resetLevel)
  const takeSnapshot = useGameStore((s) => s.takeSnapshot)
  const currentLevelId = useGameStore((s) => s.currentLevelId)
  const violations = useGameStore((s) => s.violations)
  const snapshots = useGameStore((s) => s.snapshots)
  const score = useGameStore((s) => s.score)

  useEffect(() => {
    if (id && id !== currentLevelId) {
      loadLevel(id)
    }
  }, [id, currentLevelId, loadLevel])

  const handleLaunch = () => {
    if (phase !== "aiming") return
    takeSnapshot()
    launchCar()
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 flex flex-col">
      <header className="border-b border-cyan-900/30 bg-[#060a14]/80 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 rounded border border-cyan-800/40 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-sm font-bold font-['Orbitron'] text-cyan-300 tracking-wider">
                赛道 {id}
              </h1>
              <p className="text-[9px] text-gray-500">
                {phase === "aiming" ? "点击画布设定角度，然后发射" : `阶段: ${phase}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {phase === "finished" && snapshots.length > 0 && (
              <button
                onClick={() => navigate(`/review/${id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-700/40 text-[10px] text-amber-400 hover:bg-amber-900/30 transition-colors"
              >
                <Eye size={12} />
                复盘对比
              </button>
            )}
            <button
              onClick={resetLevel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-700/40 text-[10px] text-cyan-400 hover:bg-cyan-900/30 transition-colors"
            >
              <RotateCcw size={12} />
              重置
            </button>
            <button
              onClick={handleLaunch}
              disabled={phase !== "aiming"}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-[10px] font-bold transition-all ${
                phase === "aiming"
                  ? "border border-green-600/50 text-green-300 bg-green-900/30 hover:bg-green-800/40 shadow-[0_0_12px_rgba(0,230,118,0.15)]"
                  : "border border-gray-700/30 text-gray-600 bg-gray-900/10 cursor-not-allowed"
              }`}
            >
              <Play size={12} />
              发射
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto px-4 py-4 w-full">
        <div className="flex gap-4 items-start justify-center">
          <MaterialPanel />
          <div className="flex-1 flex flex-col items-center">
            <RaceCanvas />
            {phase === "aiming" && (
              <div className="mt-2 text-[10px] text-cyan-600 animate-pulse">
                点击画布设定出发角度，红色箭头为洛伦兹力方向
              </div>
            )}
          </div>
          <AnomalySidebar />
        </div>
      </main>
    </div>
  )
}
