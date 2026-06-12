import { useMemo } from 'react';
import { useMainStore } from '@/store/useMainStore';
import {
  RefreshCw,
  Layers,
  GitCompareArrows,
  Check as CheckIcon,
  Minus as MinusIcon,
} from 'lucide-react';

export default function ParamCompare() {
  const {
    paramGroups,
    activeGroup,
    setActiveGroup,
    updateParam,
    chainA,
    chainB,
    rerun,
  } = useMainStore();
  const [grpA, grpB] = paramGroups;

  const paramKeys = useMemo(
    () => Object.keys(grpA.params),
    [grpA]
  );

  return (
    <aside className="glass-card h-full flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-neon-cyan/15 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4 text-neon-magenta" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            参数对照工作台
          </h2>
        </div>
        <button
          onClick={rerun}
          className="neon-btn neon-btn-ghost text-xs py-1.5 px-2.5"
        >
          <RefreshCw className="w-3 h-3" /> 重新复算
        </button>
      </header>

      {/* A/B切换 tab */}
      <div className="px-3 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <GroupTab
            id="A"
            label="A组 · 干净记录"
            active={activeGroup === 'A'}
            onClick={() => setActiveGroup('A')}
            tone="cyan"
            steps={chainA}
          />
          <GroupTab
            id="B"
            label="B组 · 含缺口"
            active={activeGroup === 'B'}
            onClick={() => setActiveGroup('B')}
            tone="amber"
            steps={chainB}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* 参数表：双列 */}
        <div className="rounded-xl border border-neon-cyan/15 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr] text-[11px] uppercase tracking-wider text-slate-500 bg-abyss-800/60">
            <div className="px-3 py-2">参数</div>
            <div className="px-3 py-2 border-x border-neon-cyan/10 text-center text-neon-cyan">
              A 组
            </div>
            <div className="px-3 py-2 text-center text-neon-amber">
              B 组
            </div>
          </div>

          {paramKeys.map((k) => {
            const a = grpA.params[k];
            const b = grpB.params[k];
            const diffVal = Math.abs(a.value * unitFactor(a.unit) - b.value * unitFactor(b.unit)) > 1e-6;
            const diffUnit = a.unit !== b.unit;
            const hasDiff = diffVal || diffUnit;

            return (
              <div
                key={k}
                className={`grid grid-cols-[1fr_1fr_1fr] border-t border-neon-cyan/10
                  ${hasDiff ? 'bg-neon-magenta/[0.04]' : ''}
                `}
              >
                <div className="px-3 py-2.5 flex flex-col justify-center border-r border-neon-cyan/10">
                  <div className="text-xs text-slate-300 font-medium">
                    {a.label || k}
                  </div>
                  {hasDiff && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="chip bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 text-[10px]">
                        {diffVal ? (
                          <>
                            <MinusIcon className="w-2.5 h-2.5" /> 数值差异
                          </>
                        ) : (
                          <>
                            <Layers className="w-2.5 h-2.5" /> 单位混写
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <ParamCell
                  value={a.value}
                  unit={a.unit}
                  tone="cyan"
                  onChange={(v, u) => updateParam('A', k, v, u)}
                />
                <ParamCell
                  value={b.value}
                  unit={b.unit}
                  tone="amber"
                  onChange={(v, u) => updateParam('B', k, v, u)}
                  highlight={hasDiff}
                />
              </div>
            );
          })}
        </div>

        {/* 双列最终结果对比 */}
        <div className="rounded-xl border border-neon-cyan/15 overflow-hidden">
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-500 bg-abyss-800/60 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> 关键计算结果对照
          </div>
          <ResultRow label="有义波高 Hs" vA={chainA[0]?.result} vB={chainB[0]?.result} />
          <ResultRow label="零交叉周期 Tz" vA={chainA[1]?.result} vB={chainB[1]?.result} />
          <ResultRow label="谱峰频率 fp" vA={chainA[2]?.result} vB={chainB[2]?.result} />
          <ResultRow label="有效波功率 P (kW/m)" vA={chainA[6] ? { value: chainA[6].result.value / 1000, unit: 'kW/m' } : undefined} vB={chainB[6] ? { value: chainB[6].result.value / 1000, unit: 'kW/m' } : undefined} highlight />
        </div>

        {/* 交接说明 */}
        <div className="rounded-xl p-3 border border-dashed border-neon-cyan/25 bg-abyss-800/30">
          <div className="text-xs font-semibold text-neon-cyan mb-2">
            交接给负责人时按此讲三件事：
          </div>
          <ol className="text-[12px] text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              <span className="text-slate-200 font-medium">放样例</span>：注入现场照片包(4张) + B组缺口，系统自动跑链路。
            </li>
            <li>
              <span className="text-slate-200 font-medium">重跑</span>：修改A/B参数后重跑，缺口告警实时更新。
            </li>
            <li>
              <span className="text-slate-200 font-medium">查看截图说明</span>：从照片读数追溯原始说法，从步骤卡片跳转回链路。
            </li>
          </ol>
        </div>
      </div>
    </aside>
  );
}

function unitFactor(u: string): number {
  const table: Record<string, number> = {
    m: 1, cm: 1e-2, mm: 1e-3, km: 1e3,
    s: 1, ms: 1e-3, min: 60,
    'm/s': 1, 'cm/s': 1e-2, 'km/h': 1 / 3.6,
    'm/s^2': 1, 'cm/s^2': 1e-2, 'mm/s^2': 1e-3, g: 9.80665,
    hz: 1, khz: 1e3,
    rad: 1, deg: Math.PI / 180,
    'kg/m^3': 1,
  };
  return table[u] ?? 1;
}

const UNIT_OPTIONS: Record<string, string[]> = {
  Hs_raw: ['m', 'cm', 'mm'],
  T_raw: ['s', 'ms'],
  a_raw: ['m/s^2', 'cm/s^2', 'mm/s^2', 'g'],
  water_depth: ['m', 'cm', 'km'],
  rho: ['kg/m^3'],
};

function ParamCell({
  value,
  unit,
  tone,
  onChange,
  highlight,
}: {
  value: number;
  unit: string;
  tone: 'cyan' | 'amber';
  onChange: (v: number, u: string) => void;
  highlight?: boolean;
}) {
  const colorMap = {
    cyan: 'text-neon-cyan border-neon-cyan/30 focus:border-neon-cyan focus:shadow-neon-cyan',
    amber:
      'text-neon-amber border-neon-amber/30 focus:border-neon-amber focus:shadow-neon-amber',
  } as const;

  const opts = UNIT_OPTIONS[unit] ?? [unit];

  return (
    <div className={`px-2.5 py-2 flex items-center gap-1.5 ${highlight ? 'bg-neon-magenta/5' : ''} ${tone === 'amber' ? 'border-l border-neon-cyan/10' : ''}`}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value), unit)}
        className={`w-full bg-abyss-900/70 rounded-md px-2 py-1 text-sm font-mono
          border outline-none transition ${colorMap[tone]}`}
      />
      <select
        value={unit}
        onChange={(e) => onChange(value, e.target.value)}
        className={`shrink-0 bg-abyss-900/70 rounded-md px-1.5 py-1 text-[11px] font-mono
          border outline-none transition cursor-pointer ${colorMap[tone]}`}
      >
        {opts.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  );
}

function GroupTab({
  id, label, active, onClick, tone, steps,
}: {
  id: 'A' | 'B';
  label: string;
  active: boolean;
  onClick: () => void;
  tone: 'cyan' | 'amber';
  steps: { hasGap: boolean; boundaryCheck?: { passed: boolean } }[];
}) {
  const color = tone === 'cyan' ? 'cyan' : 'amber';
  const gaps = steps.filter((s) => s.hasGap).length;
  const fails = steps.filter((s) => s.boundaryCheck && !s.boundaryCheck.passed).length;

  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl px-3 py-2.5 border text-left transition-all
        ${active
          ? tone === 'cyan'
            ? 'bg-neon-cyan/10 border-neon-cyan/60 shadow-neon-cyan'
            : 'bg-neon-amber/10 border-neon-amber/60 shadow-neon-amber'
          : 'bg-abyss-800/50 border-neon-cyan/10 hover:border-neon-cyan/30'}
      `}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${active ? `text-neon-${color}` : 'text-slate-300'}`}>
          <span className="font-mono mr-1.5">{id}</span>
          {label}
        </span>
        {active && (
          <CheckIcon className={`w-4 h-4 text-neon-${color}`} />
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {gaps === 0 ? (
          <span className="chip bg-neon-green/10 text-neon-green/90 border border-neon-green/25 text-[10px]">
            <CheckIcon className="w-2.5 h-2.5" /> 无缺口
          </span>
        ) : (
          <span className="chip bg-neon-amber/10 text-neon-amber border border-neon-amber/30 text-[10px]">
            缺口 {gaps}
          </span>
        )}
        {fails > 0 && (
          <span className="chip bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/30 text-[10px]">
            越界 {fails}
          </span>
        )}
      </div>
    </button>
  );
}

function ResultRow({
  label, vA, vB, highlight,
}: {
  label: string;
  vA?: { value: number; unit: string };
  vB?: { value: number; unit: string };
  highlight?: boolean;
}) {
  const diff = vA && vB && Math.abs(vA.value - vB.value) > 1e-9;
  return (
    <div
      className={`grid grid-cols-[1fr_1fr_1fr] border-t border-neon-cyan/10
        ${highlight ? 'bg-neon-magenta/[0.05]' : ''}
      `}
    >
      <div className="px-3 py-2 border-r border-neon-cyan/10 flex items-center">
        <div className="text-xs text-slate-400">{label}</div>
      </div>
      <ResultCell v={vA} tone="cyan" />
      <ResultCell v={vB} tone="amber" flag={diff} />
    </div>
  );
}

function ResultCell({
  v, tone, flag,
}: { v?: { value: number; unit: string }; tone: 'cyan' | 'amber'; flag?: boolean }) {
  const cMap = {
    cyan: 'text-neon-cyan',
    amber: 'text-neon-amber',
  } as const;
  return (
    <div className={`px-3 py-2 ${tone === 'amber' ? 'border-l border-neon-cyan/10' : ''}`}>
      <div className={`font-mono text-sm tabular-nums ${cMap[tone]} ${flag ? 'font-semibold' : ''}`}>
        {v ? Number(v.value.toFixed(4)) : '--'}
        <span className="text-xs text-slate-500 ml-1">{v?.unit}</span>
      </div>
      {flag && (
        <div className="text-[10px] text-neon-magenta mt-0.5">⚠ 两组差异</div>
      )}
    </div>
  );
}
