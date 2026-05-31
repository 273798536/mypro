import { useGameStore } from "@/store/gameStore"
import { BUILTIN_RULES } from "@/utils/physics"
import { AlertTriangle, ArrowDown, ArrowUp, Lock, Unlock, Zap, Target, Magnet } from "lucide-react"

export default function MaterialPanel() {
  const phase = useGameStore((s) => s.phase)
  const boards = useGameStore((s) => s.boards)
  const bars = useGameStore((s) => s.bars)
  const gates = useGameStore((s) => s.gates)
  const particle = useGameStore((s) => s.particle)
  const updateBoard = useGameStore((s) => s.updateBoard)
  const updateBar = useGameStore((s) => s.updateBar)
  const updateGate = useGameStore((s) => s.updateGate)
  const violations = useGameStore((s) => s.violations)
  const score = useGameStore((s) => s.score)

  const boardArrived = ["board_arrival", "current_arrival", "gate_arrival", "aiming", "running", "judging", "finished"].includes(phase)
  const barArrived = ["current_arrival", "gate_arrival", "aiming", "running", "judging", "finished"].includes(phase)
  const gateArrived = ["gate_arrival", "aiming", "running", "judging", "finished"].includes(phase)
  const canEdit = phase === "aiming" || phase === "current_arrival" || phase === "gate_arrival"

  return (
    <div className="flex flex-col gap-3 w-64 min-w-[256px]">
      <div className="text-xs font-bold tracking-wider text-cyan-400 uppercase mb-1 font-['Orbitron']">材料面板</div>

      {boards.map((board) => (
        <div
          key={board.id}
          className={`rounded-lg border p-3 transition-all duration-500 ${
            boardArrived
              ? "border-cyan-700/50 bg-cyan-950/30"
              : "border-gray-800/50 bg-gray-900/20 opacity-40"
          } ${board.locked ? "ring-1 ring-amber-500/40" : ""}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Magnet size={14} className="text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300 font-['Orbitron']">磁场板</span>
            </div>
            {board.locked && <Lock size={12} className="text-amber-500" />}
            {!board.locked && boardArrived && <Unlock size={12} className="text-cyan-600" />}
          </div>
          {boardArrived && (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-gray-400 w-8">方向</span>
                <button
                  disabled={board.locked || !canEdit}
                  onClick={() => updateBoard(board.id, { direction: board.direction === "into" ? "outof" : "into" })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                    board.direction === "into"
                      ? "border-cyan-600/60 text-cyan-300 bg-cyan-900/30"
                      : "border-amber-600/60 text-amber-300 bg-amber-900/30"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {board.direction === "into" ? "⊗ 向里" : "⊙ 向外"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-8">强度</span>
                <input
                  type="range"
                  min={0.005}
                  max={0.06}
                  step={0.005}
                  value={board.strength}
                  disabled={board.locked || !canEdit}
                  onChange={(e) => updateBoard(board.id, { strength: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-cyan-400"
                />
                <span className="text-[10px] text-cyan-400 w-12 text-right">{board.strength.toFixed(3)}T</span>
              </div>
            </>
          )}
          {!boardArrived && (
            <div className="text-[10px] text-gray-600 italic">等待到达...</div>
          )}
        </div>
      ))}

      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`rounded-lg border p-3 transition-all duration-500 ${
            barArrived
              ? "border-amber-700/50 bg-amber-950/30"
              : "border-gray-800/50 bg-gray-900/20 opacity-40"
          } ${bar.locked ? "ring-1 ring-amber-500/40" : ""}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300 font-['Orbitron']">电流条</span>
            </div>
            {bar.locked && <Lock size={12} className="text-amber-500" />}
          </div>
          {barArrived ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-gray-400 w-8">方向</span>
                <button
                  disabled={bar.locked || !canEdit}
                  onClick={() => updateBar(bar.id, { direction: bar.direction === "up" ? "down" : "up" })}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                    bar.direction === "up"
                      ? "border-amber-600/60 text-amber-300 bg-amber-900/30"
                      : "border-cyan-600/60 text-cyan-300 bg-cyan-900/30"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {bar.direction === "up" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {bar.direction === "up" ? "向上" : "向下"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-8">电流</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={bar.current}
                  disabled={bar.locked || !canEdit}
                  onChange={(e) => updateBar(bar.id, { current: parseFloat(e.target.value) })}
                  className="flex-1 h-1 accent-amber-400"
                />
                <span className="text-[10px] text-amber-400 w-12 text-right">{bar.current}A</span>
              </div>
            </>
          ) : (
            <div className="text-[10px] text-gray-600 italic">等待到达...</div>
          )}
        </div>
      ))}

      {gates.map((gate) => (
        <div
          key={gate.id}
          className={`rounded-lg border p-3 transition-all duration-500 ${
            gateArrived
              ? "border-green-700/50 bg-green-950/30"
              : "border-gray-800/50 bg-gray-900/20 opacity-40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-green-400" />
              <span className="text-xs font-bold text-green-300 font-['Orbitron']">靶门</span>
            </div>
          </div>
          {gateArrived ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-8">宽度</span>
              <input
                type="range"
                min={20}
                max={60}
                step={5}
                value={gate.width}
                disabled={!canEdit}
                onChange={(e) => updateGate(gate.id, { width: parseFloat(e.target.value) })}
                className="flex-1 h-1 accent-green-400"
              />
              <span className="text-[10px] text-green-400 w-12 text-right">{gate.width}px</span>
            </div>
          ) : (
            <div className="text-[10px] text-gray-600 italic">等待到达...</div>
          )}
        </div>
      ))}

      {particle && (
        <div className="rounded-lg border border-gray-700/40 bg-gray-900/30 p-3">
          <div className="text-xs font-bold text-gray-300 mb-1.5 font-['Orbitron']">粒子参数</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div className="text-gray-500">电荷</div>
            <div className={particle.charge > 0 ? "text-red-400" : "text-blue-400"}>
              {particle.charge > 0 ? "+q" : "-q"}
            </div>
            <div className="text-gray-500">质量</div>
            <div className="text-gray-300">{particle.mass}m</div>
            <div className="text-gray-500">速率</div>
            <div className="text-gray-300">{Math.sqrt(particle.vx ** 2 + particle.vy ** 2).toFixed(2)}v</div>
          </div>
        </div>
      )}

      {violations.length > 0 && (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs font-bold text-red-300">规则违反</span>
          </div>
          {violations.map((v, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <div className="text-[10px] text-red-400 font-bold">[{v.ruleId}] {v.description.slice(0, 20)}...</div>
              <div className="text-[10px] text-gray-400">期望: {v.expected}</div>
              <div className="text-[10px] text-red-300">实际: {v.actual}</div>
            </div>
          ))}
        </div>
      )}

      {phase === "finished" && (
        <div className={`rounded-lg border p-3 text-center ${
          score > 0
            ? "border-green-700/50 bg-green-950/30"
            : "border-red-700/50 bg-red-950/30"
        }`}>
          <div className={`text-2xl font-bold font-['Orbitron'] ${score > 0 ? "text-green-400" : "text-red-400"}`}>
            {score}分
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {score > 0 ? "靶门通过" : "未通过靶门"}
          </div>
        </div>
      )}
    </div>
  )
}
