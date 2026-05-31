import { ArrowUp, ArrowDown, Minus, GitCompare } from 'lucide-react';
import type { RunRecord, ValidationResult } from '@/types';

interface DiffComparisonProps {
  before: RunRecord | null;
  after: RunRecord | null;
}

type MetricKey =
  | 'totalScore'
  | 'portfolioDuration'
  | 'portfolioEffDuration'
  | 'durationGap'
  | 'varValue'
  | 'isInverted';

interface MetricDef {
  key: MetricKey;
  label: string;
  format: (val: RunRecord[MetricKey]) => string;
  compare: (before: RunRecord[MetricKey], after: RunRecord[MetricKey]) => 'better' | 'worse' | 'same';
}

const metrics: MetricDef[] = [
  {
    key: 'totalScore',
    label: '总分',
    format: (v) => (v as number).toFixed(1),
    compare: (b, a) => (a > b ? 'better' : a < b ? 'worse' : 'same'),
  },
  {
    key: 'portfolioDuration',
    label: '组合久期',
    format: (v) => (v as number).toFixed(2),
    compare: () => 'same',
  },
  {
    key: 'portfolioEffDuration',
    label: '有效久期',
    format: (v) => (v as number).toFixed(2),
    compare: () => 'same',
  },
  {
    key: 'durationGap',
    label: '久期缺口',
    format: (v) => (v as number).toFixed(2),
    compare: (b, a) => {
      const diff = Math.abs(a as number) - Math.abs(b as number);
      return diff < 0 ? 'better' : diff > 0 ? 'worse' : 'same';
    },
  },
  {
    key: 'varValue',
    label: 'VaR',
    format: (v) => (v as number).toFixed(4),
    compare: (b, a) => (a < b ? 'better' : a > b ? 'worse' : 'same'),
  },
  {
    key: 'isInverted',
    label: '曲线反向',
    format: (v) => (v ? '是' : '否'),
    compare: (b, a) => {
      if (b && !a) return 'better';
      if (!b && a) return 'worse';
      return 'same';
    },
  },
];

function getCellColor(result: 'better' | 'worse' | 'same', side: 'before' | 'after') {
  if (result === 'same') return '';
  if (side === 'before') return result === 'worse' ? 'bg-red-900/40' : 'bg-green-900/40';
  return result === 'better' ? 'bg-green-900/40' : 'bg-red-900/40';
}

function ChangeIcon({ result }: { result: 'better' | 'worse' | 'same' }) {
  if (result === 'better') return <ArrowUp className="w-3.5 h-3.5 text-green-400" />;
  if (result === 'worse') return <ArrowDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function buildValidationMap(results: ValidationResult[]) {
  const map = new Map<string, ValidationResult>();
  for (const r of results) map.set(r.ruleId, r);
  return map;
}

export function DiffComparison({ before, after }: DiffComparisonProps) {
  if (!before || !after) {
    return (
      <div className="rounded-lg border border-slate-700/50 p-6" style={{ backgroundColor: '#0F1D33' }}>
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-5 h-5" style={{ color: '#D4A017' }} />
          <h2
            className="text-lg font-bold text-white inline-block"
            style={{ borderBottom: '2px solid #D4A017', paddingBottom: 4 }}
          >
            前后差异对比
          </h2>
        </div>
        <p className="text-sm text-slate-500">请先完成两次运行以生成差异对比</p>
      </div>
    );
  }

  const beforeRules = buildValidationMap(before.validationResults);
  const afterRules = buildValidationMap(after.validationResults);
  const allRuleIds = Array.from(new Set([...beforeRules.keys(), ...afterRules.keys()]));

  return (
    <div className="rounded-lg border border-slate-700/50 p-6" style={{ backgroundColor: '#0F1D33' }}>
      <div className="flex items-center gap-2 mb-5">
        <GitCompare className="w-5 h-5" style={{ color: '#D4A017' }} />
        <h2
          className="text-lg font-bold text-white inline-block"
          style={{ borderBottom: '2px solid #D4A017', paddingBottom: 4 }}
        >
          前后差异对比
        </h2>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-0 rounded-lg overflow-hidden border border-slate-700/50">
        <div className="px-4 py-2.5 text-center text-sm font-semibold text-slate-300 border-b border-r border-slate-700/50" style={{ backgroundColor: '#0A1628' }}>
          修改前
        </div>
        <div className="px-4 py-2.5 text-center text-sm font-semibold text-slate-300 border-b border-slate-700/50" style={{ backgroundColor: '#0A1628' }}>
          修改后
        </div>

        {metrics.map((m) => {
          const bVal = before[m.key];
          const aVal = after[m.key];
          const result = m.compare(bVal, aVal);
          return (
            <div key={m.key} className="contents">
              <div className={`flex items-center justify-between px-4 py-2.5 border-b border-r border-slate-700/50 ${getCellColor(result, 'before')}`}>
                <span className="text-slate-400 text-sm">{m.label}</span>
                <span className="text-white text-sm font-medium">{m.format(bVal)}</span>
              </div>
              <div className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 ${getCellColor(result, 'after')}`}>
                <span className="text-white text-sm font-medium">{m.format(aVal)}</span>
                <ChangeIcon result={result} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">规则检查对比</h3>
        <div className="grid grid-cols-[1fr_1fr] gap-0 rounded-lg overflow-hidden border border-slate-700/50">
          <div className="px-4 py-2.5 text-center text-sm font-semibold text-slate-300 border-b border-r border-slate-700/50" style={{ backgroundColor: '#0A1628' }}>
            修改前
          </div>
          <div className="px-4 py-2.5 text-center text-sm font-semibold text-slate-300 border-b border-slate-700/50" style={{ backgroundColor: '#0A1628' }}>
            修改后
          </div>

          {allRuleIds.map((ruleId) => {
            const bRule = beforeRules.get(ruleId);
            const aRule = afterRules.get(ruleId);
            const bPassed = bRule?.passed ?? null;
            const aPassed = aRule?.passed ?? null;

            let leftBg = '';
            let rightBg = '';
            if (bPassed !== null && aPassed !== null && bPassed !== aPassed) {
              if (!bPassed && aPassed) {
                leftBg = 'bg-red-900/40';
                rightBg = 'bg-green-900/40';
              } else {
                leftBg = 'bg-green-900/40';
                rightBg = 'bg-red-900/40';
              }
            }

            return (
              <div key={ruleId} className="contents">
                <div className={`px-4 py-2 border-b border-r border-slate-700/50 ${leftBg}`}>
                  <div className="text-xs text-slate-400 mb-0.5">{ruleId}</div>
                  <div className="text-sm font-medium text-white">
                    {bRule ? (bPassed ? '✓ 通过' : '✗ 未通过') : '—'}
                  </div>
                  {bRule && <div className="text-xs text-slate-500 mt-0.5 truncate">{bRule.feedback}</div>}
                </div>
                <div className={`px-4 py-2 border-b border-slate-700/50 ${rightBg}`}>
                  <div className="text-xs text-slate-400 mb-0.5">{ruleId}</div>
                  <div className="text-sm font-medium text-white">
                    {aRule ? (aPassed ? '✓ 通过' : '✗ 未通过') : '—'}
                  </div>
                  {aRule && <div className="text-xs text-slate-500 mt-0.5 truncate">{aRule.feedback}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
