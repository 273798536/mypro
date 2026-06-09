import { useBatchStore } from '@/store/useBatchStore';
import { computeMeanStd } from '@/utils/difficultyEngine';
import { BarChart2, AlertCircle } from 'lucide-react';

export default function ScoreRecords() {
  const { batch, selectedProblemId } = useBatchStore();
  const filtered = selectedProblemId
    ? batch.scores.filter((s) => s.problemId === selectedProblemId)
    : batch.scores;

  const { mean, std } = computeMeanStd(filtered.map((s) => s.score));
  const buckets = [0, 20, 40, 60, 80, 100];
  const hist = buckets.slice(0, -1).map((lo, i) => ({
    lo,
    hi: buckets[i + 1],
    count: filtered.filter((s) => s.score >= lo && s.score < buckets[i + 1] + (i === buckets.length - 2 ? 1 : 0)).length,
  }));
  const maxCount = Math.max(1, ...hist.map((h) => h.count));

  return (
    <section className="card-base p-5 flex flex-col animate-fade-up" style={{ animationDelay: '120ms' }}>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-navy-500" />
          <h2 className="font-serif text-base font-semibold text-navy-700">评分记录</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-navy-500">
          <span>
            共 <b className="text-navy-700">{filtered.length}</b> 条
            {selectedProblemId && (
              <span className="ml-1 text-navy-400">
                （已筛选：{batch.problems.find((p) => p.id === selectedProblemId)?.code}）
              </span>
            )}
          </span>
          <span>均值 <b className="text-navy-700">{mean.toFixed(1)}</b></span>
          <span>标准差 <b className="text-navy-700">{std.toFixed(2)}</b></span>
        </div>
      </header>

      <div className="mb-3 px-2">
        <div className="flex items-end gap-1 h-14">
          {hist.map((h) => (
            <div key={h.lo} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-navy-300 transition-all"
                style={{ height: `${(h.count / maxCount) * 100}%`, minHeight: h.count ? 3 : 0 }}
                title={`${h.lo}-${h.hi}: ${h.count}`}
              />
              <span className="text-[10px] text-navy-400">
                {h.lo}-{h.hi}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-navy-100 rounded overflow-hidden scrollbar-thin overflow-y-auto" style={{ maxHeight: 200 }}>
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-navy-100 sticky top-0">
            <tr className="text-navy-500">
              <th className="px-3 py-1.5 text-left font-medium">答卷</th>
              <th className="px-3 py-1.5 text-left font-medium">题目</th>
              <th className="px-3 py-1.5 text-center font-medium">分数</th>
              <th className="px-3 py-1.5 text-left font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((s) => {
              const p = batch.problems.find((q) => q.id === s.problemId);
              return (
                <tr key={s.id} className="border-b border-navy-50 hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-mono text-navy-600">{s.respondentId}</td>
                  <td className="px-3 py-1.5 text-navy-700">
                    {p ? `${p.code} ${p.title}` : s.problemId}
                  </td>
                  <td className={`px-3 py-1.5 text-center font-semibold ${s.isAnomaly ? 'text-red-600' : 'text-navy-800'}`}>
                    {s.score}
                  </td>
                  <td className="px-3 py-1.5">
                    {s.isAnomaly ? (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <AlertCircle size={12} />
                        <span className="text-[10px]">{s.anomalyReason}</span>
                      </span>
                    ) : (
                      <span className="text-teal-600 text-[10px]">正常</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length > 80 && (
              <tr>
                <td colSpan={4} className="px-3 py-1.5 text-center text-navy-400 text-[10px]">
                  仅展示前 80 条，共 {filtered.length} 条
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
