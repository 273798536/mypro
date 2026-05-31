import { useState } from 'react';
import { Plus } from 'lucide-react';
import { SeatHeatmap } from '../components/SeatHeatmap';
import { FeedbackList } from '../components/FeedbackList';
import { FeedbackForm } from '../components/FeedbackForm';
import { useFeedbackStore } from '../store/useFeedbackStore';

export function Home() {
  const [showForm, setShowForm] = useState(false);
  const [filterAreaId, setFilterAreaId] = useState<string | undefined>();
  const { feedbacks, seatAreas, trackSegments } = useFeedbackStore();

  const stats = {
    total: feedbacks.length,
    complete: feedbacks.filter(f => f.qualityStatus === 'complete').length,
    incomplete: feedbacks.filter(f => f.qualityStatus === 'incomplete').length,
    invalid: feedbacks.filter(f => f.qualityStatus === 'invalid').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">反馈管理</h1>
          <p className="text-slate-500 mt-1">管理演唱会座位音效反馈数据</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          新增反馈
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">总反馈数</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">数据完整</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.complete}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">数据不完整</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.incomplete}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">数据无效</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{stats.invalid}</p>
        </div>
      </div>

      <SeatHeatmap onAreaClick={(areaId) => setFilterAreaId(filterAreaId === areaId ? undefined : areaId)} />

      {filterAreaId && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">当前筛选：</span>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            {seatAreas.find(a => a.id === filterAreaId)?.name}
          </span>
          <button
            onClick={() => setFilterAreaId(undefined)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            清除筛选
          </button>
        </div>
      )}

      <FeedbackList filterAreaId={filterAreaId} />

      {showForm && (
        <FeedbackForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
