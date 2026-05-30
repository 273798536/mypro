import { useFractalStore } from "@/store/useFractalStore";
import { getDimensionMethodDescription, getIterationExplosionThreshold } from "@/data/paramGuards";
import { Box, Layers, Hash, Info } from "lucide-react";
import { useState } from "react";

export default function DimensionMetrics() {
  const { dimensionInfo, activeRule, iterationCount, getPrimitiveCount } = useFractalStore();
  const [showMethod, setShowMethod] = useState(false);
  const methodDesc = getDimensionMethodDescription();
  const threshold = getIterationExplosionThreshold();
  const primitiveCount = getPrimitiveCount();
  const nearExplosion = primitiveCount > threshold.maxPrimitives * 0.5;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">维度与指标</h3>
        <button onClick={() => setShowMethod(!showMethod)} className="text-slate-500 hover:text-slate-300 transition-colors">
          <Info size={12} />
        </button>
      </div>

      {showMethod && (
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-2.5 text-[10px] text-slate-400 leading-relaxed">
          {methodDesc}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={<Box size={12} />}
          label="Hausdorff 维度"
          value={dimensionInfo.hausdorff || "—"}
          color="emerald"
        />
        <MetricCard
          icon={<Layers size={12} />}
          label="盒计数维度"
          value={dimensionInfo.boxCount || "—"}
          color="blue"
        />
        <MetricCard
          icon={<Hash size={12} />}
          label="迭代深度"
          value={iterationCount}
          color="violet"
        />
        <MetricCard
          icon={<Hash size={12} />}
          label="预估图元数"
          value={primitiveCount.toLocaleString()}
          color={nearExplosion ? "amber" : "slate"}
        />
      </div>

      <div className="text-[9px] text-slate-600 mt-1">
        变换数量: {activeRule.transforms.length} · 维度公式来源: paramGuards.ts
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    violet: "text-violet-400 border-violet-500/20 bg-violet-500/5",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    slate: "text-slate-400 border-slate-600/20 bg-slate-800/30",
  };
  const cls = colorMap[color] || colorMap.slate;

  return (
    <div className={`rounded-lg border p-2.5 ${cls}`}>
      <div className="flex items-center gap-1 mb-1">
        {icon}
        <span className="text-[9px] text-slate-400">{label}</span>
      </div>
      <div className="text-lg font-mono font-bold tracking-tight">{value}</div>
    </div>
  );
}
