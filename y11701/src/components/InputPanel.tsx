import { useState } from 'react';
import type { SchemeParams } from '@/types';
import { DEFAULT_PARAMS } from '@/types';

interface Props {
  value: SchemeParams;
  onChange: (params: SchemeParams) => void;
  onSubmit: () => void;
  source: string;
  onSourceChange: (s: string) => void;
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
        {unit && <span className="text-xs text-slate-400 w-12">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function InputPanel({ value, onChange, onSubmit, source, onSourceChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setCollapsed((p) => ({ ...p, [key]: !p[key] }));

  const update = <K extends keyof SchemeParams>(key: K, val: SchemeParams[K]) => {
    onChange({ ...value, [key]: val });
  };

  const reset = () => onChange(DEFAULT_PARAMS);

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-amber-400">参数输入</h2>
        <button
          onClick={reset}
          className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
        >
          重置默认
        </button>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-slate-300 mb-1">数据来源</label>
        <input
          type="text"
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder="如：2024年5月运营报告"
          className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="border-t border-slate-700 pt-3">
        <button
          onClick={() => toggle('basic')}
          className="flex items-center w-full text-left text-sm font-medium text-slate-200 mb-2"
        >
          <span className={`mr-2 transition-transform ${collapsed.basic ? '' : 'rotate-90'}`}>▶</span>
          基础参数
        </button>
        {!collapsed.basic && (
          <div className="pl-4">
            <NumberField label="到达率 λ" value={value.arrivalRate} onChange={(v) => update('arrivalRate', v)} min={0.1} step={0.1} unit="人/分钟" hint="午休时段每分钟到达客户数" />
            <NumberField label="服务率 μ" value={value.serviceRate} onChange={(v) => update('serviceRate', v)} min={0.1} step={0.1} unit="人/分钟" hint="每个柜台每分钟服务人数" />
            <NumberField label="柜台数 c" value={value.numCounters} onChange={(v) => update('numCounters', v)} min={1} max={20} step={1} unit="个" hint="午休时段开放的柜台数量" />
            <NumberField label="排队阈值" value={value.queueThreshold} onChange={(v) => update('queueThreshold', v)} min={1} step={1} unit="人" hint="可接受的最大排队人数" />
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 pt-3">
        <button
          onClick={() => toggle('lunch')}
          className="flex items-center w-full text-left text-sm font-medium text-slate-200 mb-2"
        >
          <span className={`mr-2 transition-transform ${collapsed.lunch ? '' : 'rotate-90'}`}>▶</span>
          午休时段
        </button>
        {!collapsed.lunch && (
          <div className="pl-4 flex gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">开始</label>
              <input
                type="time"
                value={value.lunchStart}
                onChange={(e) => update('lunchStart', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">结束</label>
              <input
                type="time"
                value={value.lunchEnd}
                onChange={(e) => update('lunchEnd', e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-700 pt-3">
        <button
          onClick={() => toggle('advanced')}
          className="flex items-center w-full text-left text-sm font-medium text-slate-200 mb-2"
        >
          <span className={`mr-2 transition-transform ${collapsed.advanced ? '' : 'rotate-90'}`}>▶</span>
          异常检测参数
        </button>
        {!collapsed.advanced && (
          <div className="pl-4">
            <NumberField label="高峰到达率" value={value.peakArrivalRate} onChange={(v) => update('peakArrivalRate', v)} min={0.1} step={0.1} unit="人/分钟" hint="异常检测：突增对比基准" />
            <NumberField label="平均服务时长" value={value.avgServiceTime} onChange={(v) => update('avgServiceTime', v)} min={0.1} step={0.1} unit="分钟" />
            <NumberField label="最长服务时长" value={value.maxServiceTime} onChange={(v) => update('maxServiceTime', v)} min={0.1} step={0.1} unit="分钟" hint="异常检测：长尾风险判断" />
            <NumberField label="柜台切换成本" value={value.switchCost} onChange={(v) => update('switchCost', v)} min={0} step={0.5} unit="分钟" hint="开启/关闭柜台的准备时间" />
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-700">
        <button
          onClick={onSubmit}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-900 font-semibold py-3 rounded-lg transition-all shadow-lg shadow-amber-900/20"
        >
          执行试算
        </button>
      </div>
    </div>
  );
}
