import { useState } from 'react';
import { useDraftStore } from '@/store/draftStore';
import type { Draft, FourierConfig, WindowFunction } from '@/types';
import { Sliders, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

const windowOptions: { value: WindowFunction; label: string; desc: string }[] = [
  { value: 'hanning', label: '汉宁窗 (Hanning)', desc: '通用平滑，频率分辨率较好' },
  { value: 'hamming', label: '汉明窗 (Hamming)', desc: '幅度精度更高，旁瓣抑制' },
  { value: 'blackman', label: '布莱克曼窗 (Blackman)', desc: '旁瓣最低，主瓣最宽' },
  { value: 'rectangular', label: '矩形窗 (Rectangular)', desc: '频率分辨率最高，泄漏最大' },
];

export function FormulaPanel({ draft }: { draft: Draft }) {
  const { updateFourierConfig, runCalculation, addVersionLog } = useDraftStore();
  const [expanded, setExpanded] = useState(true);
  const cfg = draft.fourierConfig;

  const update = (patch: Partial<FourierConfig>) => {
    updateFourierConfig(draft.id, patch);
  };

  const handleRun = () => {
    runCalculation(draft.id);
    addVersionLog(draft.id, '执行傅里叶计算，参数已更新', '当前助教');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
            <Calculator size={14} />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-slate-800">公式计算台</h3>
            <p className="text-[11px] text-slate-500">傅里叶变换参数 · 结果可追溯到每一行</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="space-y-4 px-4 py-4">
          <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 p-3 font-mono text-xs text-indigo-900 ring-1 ring-inset ring-indigo-100">
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-indigo-500">当前公式</div>
            <div>
              X[k] = Σ<sub>n=0</sub><sup>N-1</sup> x[n] · w(n) · e<sup>-j2πkn/N</sup>
            </div>
            <div className="mt-1 text-[10px] text-indigo-600/80">
              窗口 w(n) = {cfg.windowFunction} · 采样率 {cfg.sampleRate}Hz · 通带 [{cfg.highPassCutoff}, {cfg.lowPassCutoff}] Hz
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SliderField
              label="采样率 (Hz)"
              value={cfg.sampleRate}
              min={100}
              max={10000}
              step={100}
              onChange={(v) => update({ sampleRate: v })}
            />
            <SliderField
              label="窗口大小 N"
              value={cfg.windowSize}
              min={16}
              max={512}
              step={16}
              onChange={(v) => update({ windowSize: v })}
            />
            <SliderField
              label="高通截止 (Hz)"
              value={cfg.highPassCutoff}
              min={0}
              max={500}
              step={1}
              onChange={(v) => update({ highPassCutoff: v })}
            />
            <SliderField
              label="低通截止 (Hz)"
              value={cfg.lowPassCutoff}
              min={10}
              max={5000}
              step={1}
              onChange={(v) => update({ lowPassCutoff: v })}
            />
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-medium text-slate-600 flex items-center gap-1">
              <Sliders size={11} />
              窗函数
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {windowOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ windowFunction: opt.value })}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                    cfg.windowFunction === opt.value
                      ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`font-medium ${cfg.windowFunction === opt.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-slate-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRun}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 hover:shadow-md active:scale-[0.99]"
          >
            <Calculator size={15} />
            执行公式计算 & 重新生成反例
          </button>
        </div>
      )}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] font-medium text-slate-600">{label}</label>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
      />
    </div>
  );
}
