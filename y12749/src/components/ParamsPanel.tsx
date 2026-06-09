import { useBatchStore } from '@/store/useBatchStore';
import { Sliders } from 'lucide-react';

export default function ParamsPanel() {
  const { batch, updateParams } = useBatchStore();
  const p = batch.params;

  const setNum = (key: keyof typeof p, v: string) => {
    const n = Number(v);
    if (!isNaN(n)) updateParams({ [key]: n } as any);
  };

  const setRatio = (key: 'targetEasyRatio' | 'targetMediumRatio' | 'targetHardRatio', v: string) => {
    const n = Number(v) / 100;
    if (!isNaN(n) && n >= 0 && n <= 1) updateParams({ [key]: n });
  };

  const toggleField = (field: string) => {
    const exists = p.duplicateDetectionFields.includes(field);
    updateParams({
      duplicateDetectionFields: exists
        ? p.duplicateDetectionFields.filter((f) => f !== field)
        : [...p.duplicateDetectionFields, field],
    });
  };

  return (
    <section className="card-base p-5 animate-fade-up" style={{ animationDelay: '40ms' }}>
      <header className="flex items-center gap-2 mb-4">
        <Sliders size={16} className="text-navy-500" />
        <h2 className="font-serif text-base font-semibold text-navy-700">参数表配置</h2>
      </header>

      <div className="space-y-5">
        <div>
          <div className="text-xs font-medium text-navy-600 mb-2">难度分段阈值（满分 100）</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: ['easyMin', 'easyMax'], label: '简单', color: 'bg-teal-500' },
              { k: ['mediumMin', 'mediumMax'], label: '中等', color: 'bg-amber-500' },
              { k: ['hardMin', 'hardMax'], label: '困难', color: 'bg-red-500' },
            ].map(({ k, label, color }) => (
              <div key={label} className="p-2.5 rounded border border-navy-100 bg-slate-50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-1.5 h-4 rounded ${color}`} />
                  <span className="text-xs font-medium text-navy-700">{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    className="input-base !py-1 text-xs text-center"
                    type="number"
                    value={p[k[0] as keyof typeof p] as number}
                    onChange={(e) => setNum(k[0] as keyof typeof p, e.target.value)}
                  />
                  <span className="text-navy-400 text-xs">–</span>
                  <input
                    className="input-base !py-1 text-xs text-center"
                    type="number"
                    value={p[k[1] as keyof typeof p] as number}
                    onChange={(e) => setNum(k[1] as keyof typeof p, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-navy-600 mb-2">目标占比（%）</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { k: 'targetEasyRatio', label: '简单' },
              { k: 'targetMediumRatio', label: '中等' },
              { k: 'targetHardRatio', label: '困难' },
            ].map(({ k, label }) => (
              <div key={k}>
                <label className="label-base">{label}</label>
                <div className="flex items-center">
                  <input
                    className="input-base !py-1 text-xs"
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round((p[k as keyof typeof p] as number) * 100)}
                    onChange={(e) => setRatio(k as any, e.target.value)}
                  />
                  <span className="ml-1 text-xs text-navy-400">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 h-2 rounded-full bg-navy-50 overflow-hidden flex">
            <div className="bg-teal-500 transition-all" style={{ width: `${p.targetEasyRatio * 100}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${p.targetMediumRatio * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${p.targetHardRatio * 100}%` }} />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-navy-600 mb-2">重复判定字段</div>
          <div className="flex flex-wrap gap-2">
            {['code', 'title', 'tags'].map((f) => {
              const on = p.duplicateDetectionFields.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => toggleField(f)}
                  className={`px-2.5 py-1 rounded text-xs border transition-all ${
                    on
                      ? 'bg-navy-600 text-white border-navy-600'
                      : 'bg-white text-navy-600 border-navy-200 hover:bg-navy-50'
                  }`}
                >
                  {f === 'code' ? '题目编号' : f === 'title' ? '题目标题' : '标签'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-navy-600 mb-2">空集合处理策略</div>
          <div className="grid grid-cols-3 gap-2">
            {(['skip', 'warn', 'fill'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateParams({ emptySetStrategy: s })}
                className={`px-2.5 py-2 rounded text-xs border transition-all ${
                  p.emptySetStrategy === s
                    ? 'bg-navy-600 text-white border-navy-600'
                    : 'bg-white text-navy-600 border-navy-200 hover:bg-navy-50'
                }`}
              >
                {s === 'skip' ? '跳过' : s === 'warn' ? '告警' : '填充默认值'}
              </button>
            ))}
          </div>
          {p.emptySetStrategy === 'fill' && (
            <div className="mt-2">
              <label className="label-base">默认填充分数</label>
              <input
                className="input-base !py-1 text-xs"
                type="number"
                value={p.emptySetDefaultValue ?? 0}
                onChange={(e) => updateParams({ emptySetDefaultValue: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
