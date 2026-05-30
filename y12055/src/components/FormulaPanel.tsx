import { useGameStore } from "@/store/gameStore";

export default function FormulaPanel() {
  const engine = useGameStore((s) => s.engine);
  const { buoyancy } = engine;

  return (
    <div className="bg-[#0a1628]/80 backdrop-blur-sm border border-[#1b4965]/50 rounded-lg p-4">
      <h3
        className="text-xs text-[#8899aa] uppercase tracking-wider mb-3"
        style={{ fontFamily: "'Orbitron', monospace" }}
      >
        浮力计算公式
      </h3>

      <div
        className="text-center mb-4 p-3 bg-[#0d1f33] rounded-lg border border-[#1b4965]/30"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <div className="text-sm text-[#ccdde8] mb-2">
          <span className="text-[#3e92cc] font-bold">F浮</span> ={" "}
          <span className="text-[#5dade2]">ρ液</span> ×{" "}
          <span className="text-[#e9b44c]">g</span> ×{" "}
          <span className="text-[#58d68d]">V排</span>
        </div>
        <div className="text-xs text-[#99aabb]">
          = <span className="text-[#5dade2]">{buoyancy.fluidDensity.toFixed(0)}</span>{" "}
          × <span className="text-[#e9b44c]">{buoyancy.gravity.toFixed(1)}</span> ×{" "}
          <span className="text-[#58d68d]">{buoyancy.displacedVolume.toFixed(3)}</span>
        </div>
        <div
          className="text-lg mt-2 font-bold"
          style={{ color: "#3e92cc" }}
        >
          = {buoyancy.buoyantForce.toFixed(1)} N
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#5dade2]">ρ液 (液体密度)</span>
          <span
            className="font-mono font-bold text-[#5dade2]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {buoyancy.fluidDensity.toFixed(0)} kg/m³
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#e9b44c]">g (重力加速度)</span>
          <span
            className="font-mono font-bold text-[#e9b44c]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {buoyancy.gravity.toFixed(1)} m/s²
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#58d68d]">V排 (排开体积)</span>
          <span
            className="font-mono font-bold text-[#58d68d]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {buoyancy.displacedVolume.toFixed(3)} m³
          </span>
        </div>

        <div className="border-t border-[#1b4965]/50 my-2" />

        <div className="flex justify-between items-center text-xs">
          <span className="text-[#d8315b]">F重 = m×g</span>
          <span
            className="font-mono font-bold text-[#d8315b]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {buoyancy.gravitationalForce.toFixed(1)} N
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#ccdde8]">F合 = F浮 − F重</span>
          <span
            className="font-mono font-bold"
            style={{
              color:
                Math.abs(buoyancy.netForce) < 500
                  ? "#4cd137"
                  : buoyancy.netForce > 0
                    ? "#3e92cc"
                    : "#d8315b",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {buoyancy.netForce.toFixed(1)} N
            {buoyancy.netForce > 10 ? " ↑" : buoyancy.netForce < -10 ? " ↓" : " ≈"}
          </span>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-[#667788] bg-[#0d1f33] rounded p-2">
        触发原因: <span className="text-[#e9b44c]">{buoyancy.trigger}</span>
      </div>

      {buoyancy.treasureImpact > 0 && (
        <div className="mt-2 text-[10px] bg-[#2a1f0a] border border-[#e9b44c]/30 rounded p-2">
          <span className="text-[#e9b44c]">★ 宝箱影响:</span>{" "}
          <span className="text-[#ffa500]">
            重力增加 {buoyancy.treasureImpact.toFixed(1)}N，导致合力变化
          </span>
        </div>
      )}
    </div>
  );
}
