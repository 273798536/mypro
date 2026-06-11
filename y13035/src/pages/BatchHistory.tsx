import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, Clock } from 'lucide-react';
import { useBatchStore } from '@/store/batchStore';
import MaterialTimeline from '@/components/MaterialTimeline';

export default function BatchHistory() {
  const { id } = useParams<{ id: string }>();
  const { current, fetchBatch, loading } = useBatchStore();

  useEffect(() => {
    if (id) fetchBatch(id);
  }, [id, fetchBatch]);

  if (!current && loading) {
    return <div className="animate-pulse h-96 rounded-2xl bg-white border border-zinc-200" />;
  }
  if (!current) return <div className="text-zinc-500">未找到批次</div>;

  const records = [...current.history].reverse();

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Link to={`/batch/${current.id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary-700 transition-colors">
          <ArrowLeft size={15} />
          返回批次详情
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-zinc-200 p-6 mb-6 shadow-[0_1px_2px_rgba(10,15,31,0.04)]">
        <h2 className="font-display text-2xl font-semibold text-primary-900">{current.batchNo} · 改判历史</h2>
        <p className="text-sm text-zinc-500 mt-1">
          共 {records.length} 次改判 · 每次变更均记录旧材料快照、新备注与改判原因
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-zinc-200 p-10 text-center">
          <p className="text-zinc-500">该批次暂无改判记录</p>
        </div>
      ) : (
        <ol className="relative pl-4">
          {records.map((r, idx) => (
            <li key={r.id} className="relative pb-10 last:pb-0 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
              <span className="absolute left-[11px] top-3 w-0.5 bg-primary-200" style={{ height: idx === records.length - 1 ? '0px' : 'calc(100% + 8px)' }} />
              <div className="flex gap-4">
                <div className="relative flex-none w-6 h-6 mt-1 rounded-full bg-amber-500 ring-4 ring-amber-100 text-white flex items-center justify-center z-10">
                  <span className="text-[10px] font-semibold">{records.length - idx}</span>
                </div>
                <div className="flex-1 rounded-2xl bg-white border border-zinc-200 p-5 shadow-[0_1px_2px_rgba(10,15,31,0.04)]">
                  <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><User size={12} />{r.operator}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={12} />{r.timestamp}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                      <p className="text-[11px] font-medium text-zinc-500 mb-1">旧结论</p>
                      <p className="text-sm text-zinc-600 line-through">{r.oldConclusion}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary-50/60 border border-primary-100">
                      <p className="text-[11px] font-medium text-primary-700 mb-1">新结论</p>
                      <p className="text-sm text-primary-900">{r.newConclusion}</p>
                    </div>
                  </div>

                  {r.newRemark && (
                    <div className="mb-4">
                      <p className="text-[11px] font-medium text-zinc-500 mb-1">新备注</p>
                      <p className="text-sm text-zinc-700">{r.newRemark}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">改判原因</p>
                    <p className="text-sm text-amber-800 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-lg p-3">{r.reviseReason}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-zinc-500 mb-2">旧材料快照（改判时的材料集）</p>
                    <MaterialTimeline materials={r.oldMaterials} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
