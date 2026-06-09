import { useBatchStore } from '@/store/useBatchStore';
import { AlertTriangle, SkipForward, AlertOctagon, Wand2 } from 'lucide-react';

const strategyMeta = {
  skip: { label: '跳过', icon: SkipForward, color: 'text-navy-500' },
  warn: { label: '告警', icon: AlertOctagon, color: 'text-amber-600' },
  fill: { label: '填充默认值', icon: Wand2, color: 'text-teal-600' },
} as const;

export default function EmptySetPanel() {
  const { batch, setEmptySetStrategy } = useBatchStore();
  const items = batch.emptySets;

  return (
    <section className="card-base p-5 animate-fade-up" style={{ animationDelay: '160ms' }}>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className={items.length ? 'text-amber-500' : 'text-navy-300'} />
          <h2 className="font-serif text-base font-semibold text-navy-700">空集合处理</h2>
          <span className="text-xs text-navy-400">（同轮复核）</span>
        </div>
        <span className={`text-xs font-medium ${items.length ? 'text-amber-600' : 'text-teal-600'}`}>
          {items.length ? `${items.length} 条空字段` : '数据完整'}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-navy-400">
          题目清单和评分记录无空字段，无需特殊处理。
        </div>
      ) : (
        <>
          <div className="mb-3 p-3 rounded border border-amber-200 bg-amber-50/60 text-xs text-amber-800">
            当前策略：
            <b className="ml-1">{strategyMeta[batch.params.emptySetStrategy].label}</b>
            {batch.params.emptySetStrategy === 'fill' && (
              <span className="ml-1">（默认分数 {batch.params.emptySetDefaultValue}）</span>
            )}
            <span className="ml-2 text-amber-600">切换策略会立即刷新所有复核结论。</span>
          </div>
          <div className="flex gap-2 mb-3">
            {(['skip', 'warn', 'fill'] as const).map((s) => {
              const { label, icon: Icon, color } = strategyMeta[s];
              const active = batch.params.emptySetStrategy === s;
              return (
                <button
                  key={s}
                  onClick={() => setEmptySetStrategy(s, batch.params.emptySetDefaultValue)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs border transition-all ${
                    active
                      ? 'bg-navy-600 text-white border-navy-600'
                      : 'bg-white text-navy-600 border-navy-200 hover:bg-navy-50'
                  }`}
                >
                  <Icon size={13} className={active ? 'text-white' : color} />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5 scrollbar-thin overflow-y-auto" style={{ maxHeight: 200 }}>
            {items.map((e) => {
              const p = batch.problems.find((q) => q.id === e.problemId);
              const sm = strategyMeta[e.strategy];
              const Icon = sm.icon;
              return (
                <div key={e.id} className="flex items-center gap-2 px-3 py-1.5 rounded border border-navy-100 bg-slate-50/60 text-xs">
                  <Icon size={12} className={sm.color} />
                  <span className="text-navy-600">
                    {p ? `${p.code} 《${p.title}》` : '系统级'} · 字段
                    <code className="mx-1 px-1 rounded bg-navy-100 text-navy-700">{e.field}</code>
                    为空
                  </span>
                  <span className="ml-auto text-navy-400">
                    {sm.label}
                    {e.strategy === 'fill' && e.filledValue != null && (
                      <span className="ml-1">→ {e.filledValue}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
