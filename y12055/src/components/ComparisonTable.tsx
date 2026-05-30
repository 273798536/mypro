import { useGameStore } from "@/store/gameStore";

export default function ComparisonTable() {
  const savedSessions = useGameStore((s) => s.savedSessions);
  const session = useGameStore((s) => s.session);

  const allSessions = [...savedSessions];
  if (session) allSessions.push(session);

  if (allSessions.length < 2) return null;

  const basicSession = allSessions.find((s) => !s.withTreasure && s.calculations.length > 0);
  const treasureSession = allSessions.find((s) => s.withTreasure && s.calculations.length > 0);

  if (!basicSession || !treasureSession) return null;

  const basicLastCalc = basicSession.calculations[basicSession.calculations.length - 1];
  const treasureLastCalc = treasureSession.calculations[treasureSession.calculations.length - 1];

  if (!basicLastCalc || !treasureLastCalc) return null;

  const treasureOps = treasureSession.operations.filter((op) => op.treasureAffected);
  const treasureCalcs = treasureSession.calculations.filter(
    (c) => c.treasureImpact > 0
  );

  const rows = [
    {
      label: "总质量",
      basic: `${basicLastCalc.totalMass.toFixed(0)} kg`,
      treasure: `${treasureLastCalc.totalMass.toFixed(0)} kg`,
      diff: treasureLastCalc.totalMass - basicLastCalc.totalMass,
      unit: "kg",
    },
    {
      label: "浮力",
      basic: `${basicLastCalc.buoyantForce.toFixed(1)} N`,
      treasure: `${treasureLastCalc.buoyantForce.toFixed(1)} N`,
      diff: treasureLastCalc.buoyantForce - basicLastCalc.buoyantForce,
      unit: "N",
    },
    {
      label: "重力",
      basic: `${basicLastCalc.gravitationalForce.toFixed(1)} N`,
      treasure: `${treasureLastCalc.gravitationalForce.toFixed(1)} N`,
      diff: treasureLastCalc.gravitationalForce - basicLastCalc.gravitationalForce,
      unit: "N",
    },
    {
      label: "合力",
      basic: `${basicLastCalc.netForce.toFixed(1)} N`,
      treasure: `${treasureLastCalc.netForce.toFixed(1)} N`,
      diff: treasureLastCalc.netForce - basicLastCalc.netForce,
      unit: "N",
    },
    {
      label: "排开体积",
      basic: `${basicLastCalc.displacedVolume.toFixed(3)} m³`,
      treasure: `${treasureLastCalc.displacedVolume.toFixed(3)} m³`,
      diff: treasureLastCalc.displacedVolume - basicLastCalc.displacedVolume,
      unit: "m³",
    },
  ];

  return (
    <div className="bg-[#0a1628]/80 backdrop-blur-sm border border-[#e9b44c]/30 rounded-lg p-4">
      <h3
        className="text-[10px] text-[#e9b44c] uppercase tracking-wider mb-3"
        style={{ fontFamily: "'Orbitron', monospace" }}
      >
        ★ 宝箱影响明细对比
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-[#1b4965]/50">
              <th className="text-left text-[#8899aa] py-1.5 pr-2">指标</th>
              <th className="text-right text-[#3e92cc] py-1.5 px-2">无宝箱</th>
              <th className="text-right text-[#e9b44c] py-1.5 px-2">含宝箱</th>
              <th className="text-right text-[#d8315b] py-1.5 pl-2">差异</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[#0d1f33]">
                <td className="text-[#778899] py-1.5 pr-2">{row.label}</td>
                <td className="text-right font-mono text-[#3e92cc] py-1.5 px-2">
                  {row.basic}
                </td>
                <td className="text-right font-mono text-[#e9b44c] py-1.5 px-2">
                  {row.treasure}
                </td>
                <td
                  className={`text-right font-mono py-1.5 pl-2 ${
                    Math.abs(row.diff) > 0.01
                      ? "text-[#d8315b] font-bold"
                      : "text-[#556677]"
                  }`}
                >
                  {Math.abs(row.diff) > 0.01
                    ? `${row.diff > 0 ? "+" : ""}${row.diff.toFixed(1)} ${row.unit}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {treasureOps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1b4965]/30">
          <div className="text-[10px] text-[#e9b44c] font-bold mb-1.5">
            受宝箱影响的操作 ({treasureOps.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {treasureOps.map((op, i) => (
              <div
                key={`top-${i}`}
                className="text-[9px] text-[#99aabb] bg-[#1a1508] rounded p-1.5 flex items-center gap-1"
              >
                <span className="text-[#e9b44c]">★</span>
                <span>F#{op.frame}</span>
                <span className="text-[#778899]">{op.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {treasureCalcs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1b4965]/30">
          <div className="text-[10px] text-[#e9b44c] font-bold mb-1.5">
            宝箱引起的浮力计算变化 ({treasureCalcs.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {treasureCalcs.map((calc, i) => (
              <div
                key={`tcalc-${i}`}
                className="text-[9px] text-[#99aabb] bg-[#1a1508] rounded p-1.5"
              >
                <span className="text-[#e9b44c]">★</span> F浮={calc.buoyantForce.toFixed(1)}N | F重=
                {calc.gravitationalForce.toFixed(1)}N | 宝箱影响:
                <span className="text-[#ffa500]">+{calc.treasureImpact.toFixed(1)}N</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
