import { Settings2 } from "lucide-react";
import { useVolumeStore } from "@/store/useVolumeStore";

export default function ParamCard() {
  const { currentBatch, updateParams } = useVolumeStore();
  const p = currentBatch.params;

  return (
    <div className="bg-white/80 backdrop-blur rounded-lg border border-ink-100 shadow-card p-5 animate-fadeUp" style={{ animationDelay: "0ms" }}>
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-4 h-4 text-amber-500" />
        <h3 className="serif text-base font-semibold text-ink-800">本批次近似参数</h3>
      </div>
      <div className="space-y-3 text-sm">
        <ParamRow
          label="填充率"
          value={p.fillRate}
          suffix=""
          hint="材料占纸箱有效容积的比例，越小越保守"
          onChange={(v) => updateParams({ fillRate: v })}
          step={0.01}
        />
        <ParamRow
          label="单箱基准体积"
          value={p.boxVolume}
          suffix="cm³"
          hint="标准纸箱的标称容积"
          onChange={(v) => updateParams({ boxVolume: v })}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-ink-400 mb-1">取整规则</div>
            <select
              value={p.roundingRule}
              onChange={(e) => updateParams({ roundingRule: e.target.value as "ceil" | "floor" | "round" })}
              className="w-full bg-paper border border-ink-100 rounded px-2 py-1.5 mono text-ink-700 focus:outline-none focus:border-amber-300"
            >
              <option value="ceil">向上取整（保守）</option>
              <option value="round">四舍五入（平衡）</option>
              <option value="floor">向下取整（激进）</option>
            </select>
          </div>
          <ParamRow
            label="误差阈值"
            value={p.errorThreshold}
            suffix="%"
            hint="超过该值判定为误差过大"
            onChange={(v) => updateParams({ errorThreshold: v })}
            compact
          />
        </div>
        <ParamRow
          label="运输配额"
          value={p.transportQuota}
          suffix="cm³"
          hint="本批次允许的最大总体积"
          onChange={(v) => updateParams({ transportQuota: v })}
        />
      </div>
    </div>
  );
}

function ParamRow({
  label, value, suffix, hint, onChange, step = 1, compact,
}: {
  label: string; value: number; suffix: string; hint?: string;
  onChange: (v: number) => void; step?: number; compact?: boolean;
}) {
  return (
    <div className={compact ? "" : ""}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-ink-400 group relative">
          {label}
          {hint && (
            <span className="hidden group-hover:block absolute left-0 top-full mt-1 w-48 bg-ink-800 text-ink-50 text-[11px] p-2 rounded z-10 serif leading-snug">
              {hint}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-paper border border-ink-100 rounded px-2 py-1.5 mono text-amber-600 font-semibold focus:outline-none focus:border-amber-300"
        />
        {suffix && <span className="text-xs text-ink-400 w-10 mono">{suffix}</span>}
      </div>
    </div>
  );
}
