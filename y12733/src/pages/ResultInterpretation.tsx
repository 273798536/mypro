import { useState } from 'react';
import { useCondProbStore } from '@/store/useCondProbStore';
import { CondProbParam } from '@/types';
import StatusFilterBar from '@/components/StatusFilterBar';
import ParamCard from '@/components/ParamCard';
import SampleBanner from '@/components/SampleBanner';
import EditParamModal from '@/components/EditParamModal';
import { Lightbulb, Plus } from 'lucide-react';

export default function ResultInterpretation() {
  const { params, filterStatus, boundaryOnly, setEditingParam } = useCondProbStore();
  const [editOpen, setEditOpen] = useState(false);

  const filtered = params.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (boundaryOnly && !p.isBoundary) return false;
    return true;
  });

  const openEdit = (p?: CondProbParam) => {
    setEditingParam(p ?? null);
    setEditOpen(true);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <SampleBanner />

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink-800 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            结果解释 · 日常入口
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            这里是数据分析员平时最常来的地方：查看每张卡的概率值和一两句解释，快速判断哪些数据可以讲、哪些要暂缓。
          </p>
        </div>
        <button
          onClick={() => openEdit()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ink-700 hover:bg-ink-800 text-white text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增参数
        </button>
      </div>

      <div className="mb-6">
        <StatusFilterBar />
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-ink-400">
          <div className="font-serif text-lg mb-1">没有符合条件的参数</div>
          <div className="text-sm">试试调整筛选条件，或点击右上角「重置示例」。</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <ParamCard key={p.id} param={p} onEdit={openEdit} />
          ))}
        </div>
      )}

      <EditParamModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
