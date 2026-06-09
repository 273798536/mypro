import { ArrowLeft, Trash2, Calendar, Sigma, AlertTriangle, CheckCircle2, Clock, AlertOctagon, TrendingDown, GitCompare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store';
import { DEGRADATION_LABEL, formatConditionNumber } from '@/utils/math/rank';
import { useState } from 'react';

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const DEG_COLORS = {
  none: 'bg-forest-50 text-forest-700 border-forest-200',
  mild: 'bg-amber-50 text-amber-700 border-amber-200',
  moderate: 'bg-amber-100/80 text-amber-800 border-amber-300',
  severe: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function History() {
  const history = useStore(s => s.history);
  const deleteHistory = useStore(s => s.deleteHistory);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  };

  const selectedRecords = history.filter(h => selected.includes(h.id));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-ink-50/70 border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              返回工作台
            </Link>
            <div>
              <div className="font-serif text-lg font-bold text-ink-800 leading-tight">历史对比中心</div>
              <div className="text-[11.5px] text-ink-400">并排比较同题目多次计算的结论演变</div>
            </div>
          </div>
          {selected.length === 2 && (
            <div className="flex items-center gap-2 text-sm text-ink-700 bg-ink-100 rounded-xl px-3 py-1.5">
              <GitCompare className="w-4 h-4 text-ink-600" />
              已选 2 条记录进行对比
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {selected.length === 2 && (
          <div className="card p-5 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <GitCompare className="w-4 h-4 text-ink-600" />
              <h3 className="font-serif text-ink-800 font-semibold">对比视图</h3>
            </div>
            <div className="divider-gold mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedRecords.map((h, i) => (
                <div key={h.id} className="p-4 rounded-xl bg-ink-50/60 border border-ink-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-ink-500 uppercase tracking-wider">版本 {i + 1}</span>
                    <span className="text-[11.5px] text-ink-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(h.timestamp)}
                    </span>
                  </div>
                  <div className="font-serif font-semibold text-ink-800 mb-3">{h.title}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-white">
                      <div className="text-[11px] text-ink-400 uppercase">矩阵秩</div>
                      <div className="font-mono text-xl font-bold text-ink-800">
                        {h.rankResult.rank} / {h.rankResult.maxRank}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white">
                      <div className="text-[11px] text-ink-400 uppercase">条件数</div>
                      <div className="font-mono text-base font-semibold text-ink-800">
                        {formatConditionNumber(h.rankResult.conditionNumber)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white">
                      <div className="text-[11px] text-ink-400 uppercase">退化程度</div>
                      <span className={`chip border ${DEG_COLORS[h.rankResult.degradationLevel]}`}>
                        <TrendingDown className="w-3 h-3" />
                        {DEGRADATION_LABEL[h.rankResult.degradationLevel]}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white">
                      <div className="text-[11px] text-ink-400 uppercase">异常</div>
                      <div className="font-mono text-base font-semibold text-rose-600">
                        {h.anomalyCount} 条
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
                    <div className="flex items-center gap-1 text-forest-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 可用 {h.availableCount}
                    </div>
                    <div className="flex items-center gap-1 text-amber-700">
                      <Clock className="w-3.5 h-3.5" /> 暂缓 {h.pendingCount}
                    </div>
                    <div className="flex items-center gap-1 text-rose-700">
                      <AlertOctagon className="w-3.5 h-3.5" /> 重采 {h.recollectCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(() => {
              const [a, b] = selectedRecords;
              if (!a || !b) return null;
              const diff = a.rankResult.rank - b.rankResult.rank;
              return (
                <div className="mt-4 p-3 rounded-xl bg-ink-800 text-white">
                  <div className="text-[11px] uppercase tracking-wider text-gold-400 mb-1">差异结论</div>
                  {diff === 0 ? (
                    <div className="text-sm">两次计算秩相同（均为 {a.rankResult.rank}），但异常数量差 {a.anomalyCount - b.anomalyCount} 条。</div>
                  ) : (
                    <div className="text-sm">秩变化：版本 1 = {a.rankResult.rank}，版本 2 = {b.rankResult.rank}，差 {diff > 0 ? '+' : ''}{diff}。</div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-600" />
              <h3 className="font-serif text-ink-800 font-semibold">历史记录（{history.length}）</h3>
            </div>
            <span className="label">选择 2 条进行对比</span>
          </div>
          <div className="divider-gold mb-4" />

          {history.length === 0 ? (
            <div className="py-10 text-center text-ink-400 text-sm">
              暂无历史记录 — 在工作台点击「存入历史」即可保存
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(h => {
                const isSel = selected.includes(h.id);
                return (
                  <div
                    key={h.id}
                    onClick={() => toggleSelect(h.id)}
                    className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      isSel
                        ? 'bg-ink-800 text-white border-ink-800 shadow-card-h'
                        : 'bg-white border-ink-100 hover:bg-ink-50 hover:border-ink-200'
                    }`}
                  >
                    <div className={`w-1.5 h-8 rounded-full ${isSel ? 'bg-gold-400' : 'bg-ink-200'}`} />
                    <div className="flex-1 min-w-[200px]">
                      <div className={`font-medium ${isSel ? 'text-white' : 'text-ink-800'}`}>{h.title}</div>
                      <div className={`text-[11.5px] ${isSel ? 'text-ink-200' : 'text-ink-400'} flex items-center gap-1.5`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(h.timestamp)}
                      </div>
                    </div>

                    <div className={`chip ${isSel ? 'bg-white/10 text-white border-white/20' : 'bg-ink-50 text-ink-700 border-ink-200'}`}>
                      <Sigma className="w-3 h-3" />
                      秩 {h.rankResult.rank}/{h.rankResult.maxRank}
                    </div>

                    <span className={`chip border ${isSel ? 'bg-white/10 text-white border-white/20' : DEG_COLORS[h.rankResult.degradationLevel]}`}>
                      <TrendingDown className="w-3 h-3" />
                      {DEGRADATION_LABEL[h.rankResult.degradationLevel]}
                    </span>

                    {h.anomalyCount > 0 && (
                      <span className={`chip ${isSel ? 'bg-rose-400/30 text-rose-100 border-rose-300/40' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {h.anomalyCount} 异常
                      </span>
                    )}

                    <div className={`text-[11.5px] ${isSel ? 'text-ink-200' : 'text-ink-500'} hidden sm:flex items-center gap-3 ml-auto`}>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />{h.availableCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{h.pendingCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" />{h.recollectCount}
                      </span>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteHistory(h.id);
                        setSelected(s => s.filter(x => x !== h.id));
                      }}
                      className={`p-1.5 rounded-lg ${isSel ? 'hover:bg-white/15 text-white' : 'hover:bg-rose-50 text-ink-400 hover:text-rose-600'}`}
                      aria-label="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
