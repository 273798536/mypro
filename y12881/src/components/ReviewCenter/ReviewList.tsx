import { ClipboardCheck, Search, LocateFixed, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSampleStore } from '@/store/useSampleStore';
import { useReviewStore } from '@/store/useReviewStore';
import { STATUS_LABELS, SampleStatus, SPECIES_LIST } from '@/types';
import { getRiskColor } from '@/utils/colorUtils';
import { INITIAL_WATER_QUALITIES } from '@/utils/mockData';

export default function ReviewList() {
  const { samples, selectSample, selectedSampleId } = useSampleStore();
  const { createRevision } = useReviewStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [editNote, setEditNote] = useState('');

  const filtered = useMemo(() => {
    return samples
      .filter((s) => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return (
            s.id.toLowerCase().includes(q) ||
            s.species.toLowerCase().includes(q) ||
            s.buoyId.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const order = { pending: 0, reviewed: 1, confirmed: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        const riskOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      });
  }, [samples, searchTerm, statusFilter]);

  const pendingCount = samples.filter((s) => s.status === 'pending').length;
  const reviewedCount = samples.filter((s) => s.status === 'reviewed').length;
  const confirmedCount = samples.filter((s) => s.status === 'confirmed').length;

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditCount(s.count);
    setEditNote(s.notes || '');
  };

  const saveEdit = (s: any) => {
    createRevision(s.id, editCount, undefined, editNote, '复核员');
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={20} className="text-cyan-glow" />
          <h2 className="font-display font-bold text-lg text-ocean-50">复核与修正中心</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full`} style={{ background: '#FF9F1C' }} />
            <span className="text-ocean-300">待复核</span>
            <span className="font-bold text-amber-risk">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#5AADCB' }} />
            <span className="text-ocean-300">已复核</span>
            <span className="font-bold text-ocean-200">{reviewedCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00D4AA' }} />
            <span className="text-ocean-300">已确认</span>
            <span className="font-bold text-cyan-glow">{confirmedCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-400" />
          <input
            type="text"
            placeholder="搜索样本ID、物种、浮标..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-ocean w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-ocean-400" />
          {(['all', 'pending', 'reviewed', 'confirmed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                statusFilter === s
                  ? 'bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30'
                  : 'bg-ocean-800/40 text-ocean-300 hover:bg-ocean-800 border border-ocean-700'
              }`}
            >
              {s === 'all' ? '全部' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid gap-2">
          {filtered.map((s) => {
            const wq = INITIAL_WATER_QUALITIES.find((w) => w.sampleId === s.id);
            const isEditing = editingId === s.id;
            const isSelected = selectedSampleId === s.id;
            return (
              <div
                key={s.id}
                className={`glass-panel p-3.5 transition-all cursor-pointer ${
                  isSelected ? 'border-cyan-glow/50 shadow-glow-cyan' : ''
                }`}
                onClick={() => selectSample(s.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: `${getRiskColor(s.riskLevel)}20`,
                      color: getRiskColor(s.riskLevel),
                      border: `1px solid ${getRiskColor(s.riskLevel)}40`,
                    }}
                  >
                    {s.count}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-semibold text-ocean-100 text-sm">{s.id}</span>
                      <span className={`badge-status-${s.status}`}>{STATUS_LABELS[s.status]}</span>
                      {s.riskLevel !== 'none' && (
                        <span className={`badge-risk-${s.riskLevel}`}>
                          {s.riskLevel === 'high' ? '高风险' : s.riskLevel === 'medium' ? '中风险' : '低风险'}
                        </span>
                      )}
                      {wq?.isMissing && (
                        <span className="badge-risk-medium">水质缺失</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ocean-300">
                      <span>物种：{s.species}</span>
                      <span>浮标：{s.buoyId}</span>
                      <span>水层：{s.waterLayer === 'surface' ? '表层' : s.waterLayer === 'middle' ? '中层' : '深层'}</span>
                      <span>采样：{s.sampledAt}</span>
                    </div>
                    {s.notes && !isEditing && (
                      <p className="text-xs text-ocean-400 mt-1.5 line-clamp-1">备注：{s.notes}</p>
                    )}

                    {isEditing && (
                      <div className="mt-3 space-y-2 p-2.5 bg-ocean-900/60 rounded-lg border border-cyan-glow/20" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-[10px] text-ocean-400 block mb-1">计数值</label>
                          <input
                            type="number"
                            value={editCount}
                            onChange={(e) => setEditCount(Number(e.target.value))}
                            className="input-ocean w-full text-sm py-1.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-ocean-400 block mb-1">复核备注</label>
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="input-ocean w-full text-sm py-1.5"
                            placeholder="说明修正原因..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs rounded-md bg-ocean-800/60 text-ocean-300 hover:bg-ocean-800 border border-ocean-700"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => saveEdit(s)}
                            className="btn-glow py-1.5 text-xs px-3"
                          >
                            保存复核
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(s);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                        s.status === 'confirmed'
                          ? 'bg-ocean-800/30 text-ocean-500 cursor-not-allowed'
                          : 'bg-cyan-glow/15 text-cyan-glow hover:bg-cyan-glow/25 border border-cyan-glow/30'
                      }`}
                      disabled={s.status === 'confirmed'}
                    >
                      {s.status === 'confirmed' ? '已确认' : '复核修正'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSample(s.id);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs bg-ocean-800/40 text-ocean-300 hover:bg-ocean-800 border border-ocean-700 flex items-center gap-1"
                    >
                      <LocateFixed size={11} /> 3D定位
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
