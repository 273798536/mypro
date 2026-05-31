import { useState } from "react";
import { useSimStore } from "../store/simStore";
import { SCENARIO_PRESETS } from "../data/constants";

export default function ParamPanel() {
  const { scenarioName, params, selectScenario, updateParam } = useSimStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">
          场景预设
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIO_PRESETS.map((s) => (
            <button
              key={s.name}
              onClick={() => selectScenario(s.name)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                scenarioName === s.name
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="font-semibold">{s.label}</div>
              <div className="text-[10px] mt-0.5 opacity-70">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="池体积 (m³)"
          value={params.poolVolume}
          onChange={(v) => updateParam("poolVolume", v)}
          min={50}
          max={5000}
        />
        <NumberInput
          label="泵流量 (m³/h)"
          value={params.pumpFlow}
          onChange={(v) => updateParam("pumpFlow", v)}
          min={5}
          max={500}
        />
        <NumberInput
          label="初始余氯 (mg/L)"
          value={params.initialChlorine}
          onChange={(v) => updateParam("initialChlorine", v)}
          min={0.1}
          max={5}
          step={0.1}
        />
        <NumberInput
          label="余氯阈值 (mg/L)"
          value={params.chlorineThreshold}
          onChange={(v) => updateParam("chlorineThreshold", v)}
          min={0.1}
          max={3}
          step={0.1}
        />
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {showAdvanced ? "▼ 收起高级参数" : "▶ 展开高级参数"}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <NumberInput
            label="衰减率"
            value={params.chlorineDecayRate}
            onChange={(v) => updateParam("chlorineDecayRate", v)}
            min={0.01}
            max={0.5}
            step={0.01}
          />
          <NumberInput
            label="投加量 (mg/L)"
            value={params.chlorineDoseAmount}
            onChange={(v) => updateParam("chlorineDoseAmount", v)}
            min={0.1}
            max={3}
            step={0.1}
          />
          <NumberInput
            label="访客消耗系数"
            value={params.visitorImpact}
            onChange={(v) => updateParam("visitorImpact", v)}
            min={0.001}
            max={0.05}
            step={0.001}
          />
        </div>
      )}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-md px-2.5 py-1.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
      />
    </div>
  );
}
