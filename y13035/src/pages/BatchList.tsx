import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, RotateCcw, Download, Calendar, Layers } from 'lucide-react';
import { useBatchStore } from '@/store/batchStore';
import StatusBadge from '@/components/StatusBadge';
import type { BatchStatus } from '@shared/types';
import { STATUS_LABEL } from '@shared/types';

const FILTERS: Array<BatchStatus | 'all'> = ['all', 'pending', 'running', 'completed', 'revised'];

export default function BatchList() {
  const { batches, fetchBatches, filterStatus, setFilter, startBatch, rerunBatch, loading } = useBatchStore();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
    const interval = setInterval(fetchBatches, 3000);
    return () => clearInterval(interval);
  }, [fetchBatches]);

  const shown = batches.filter((b) => filterStatus === 'all' || b.status === filterStatus);

  const handleStart = async (id: string, status: BatchStatus) => {
    setStartingId(id);
    if (status === 'pending') await startBatch(id);
    else await rerunBatch(id);
    setToast(status === 'pending' ? '批次已启动复核' : '批次已重跑');
    setStartingId(null);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-primary-900">复核批次</h2>
          <p className="text-sm text-zinc-500 mt-1">以银行流水为主线，串联名称不一致材料与后补说明进行税费复核</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                filterStatus === f
                  ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              {f === 'all' ? '全部' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {loading && batches.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {shown.map((b, i) => (
            <Link
              key={b.id}
              to={`/batch/${b.id}`}
              className="group relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(10,15,31,0.04)] hover:shadow-[0_10px_30px_-10px_rgba(11,61,145,0.25)] hover:border-primary-200 transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-primary-900 group-hover:text-primary-700 transition-colors">{b.batchNo}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                    <Calendar size={12} />
                    <span>{b.date}</span>
                  </div>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <Layers size={13} />
                  <span>材料 {b.materialCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download size={13} />
                  <span>回款 {b.payments.length} 行</span>
                </div>
              </div>

              <p className="mt-3 text-sm text-zinc-600 line-clamp-2 min-h-[40px]">{b.conclusionSummary}</p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleStart(b.id, b.status); }}
                  disabled={b.status === 'running' || startingId === b.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    b.status === 'pending'
                      ? 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600 disabled:opacity-60'
                      : 'bg-white text-primary-700 border-primary-200 hover:bg-primary-50 disabled:opacity-60'
                  }`}
                >
                  {b.status === 'pending' ? <Play size={13} /> : <RotateCcw size={13} />}
                  {b.status === 'pending' ? '启动复核' : b.status === 'running' ? (startingId === b.id ? '处理中...' : '复核中') : '重跑'}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); useBatchStore.getState().exportCSV(b.id).then((r) => { setToast(r.message); setTimeout(() => setToast(null), 2500); }); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 text-zinc-600 bg-white hover:border-primary-300 hover:text-primary-700 transition-colors"
                >
                  <Download size={13} />
                  导出CSV
                </button>
              </div>
              {b.history.length > 0 && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    {b.history.length} 次改判
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-primary-900 text-white text-sm shadow-xl animate-fade-in-up">
          {toast}
        </div>
      )}
    </div>
  );
}
