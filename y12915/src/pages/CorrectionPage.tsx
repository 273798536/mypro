import { useState, useMemo } from 'react';
import {
  PencilLine,
  Search,
  X,
  Save,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import TraceButton from '@/components/common/TraceButton';
import type { EvaluationSample } from '@/types';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/common/StatusBadge';

export default function CorrectionPage() {
  const {
    currentSamples,
    versions,
    correctSample,
    correctionLogs,
    showTrace,
    traceSample,
    traceModalOpen,
    closeTrace,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showOnlyCorrected, setShowOnlyCorrected] = useState(false);
  const [editingSample, setEditingSample] = useState<EvaluationSample | null>(null);
  const [newScore, setNewScore] = useState('');
  const [reason, setReason] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let list = [...currentSamples];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) =>
        String(s.originalRowNumber ?? '').includes(q) ||
        (s.imageName ?? '').toLowerCase().includes(q) ||
        (s.sourceFileName ?? '').toLowerCase().includes(q) ||
        (s.batchId ?? '').toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      list = list.filter((s) => s.reviewStatus === filterStatus);
    }
    if (showOnlyCorrected) {
      list = list.filter((s) => s.isCorrected);
    }
    list.sort((a, b) => {
      const va = a.originalRowNumber ?? 0;
      const vb = b.originalRowNumber ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return list;
  }, [currentSamples, search, filterStatus, showOnlyCorrected, sortAsc]);

  const stats = useMemo(() => {
    const corrected = currentSamples.filter((s) => s.isCorrected).length;
    const needReview = currentSamples.filter((s) => s.reviewStatus === 'need_review').length;
    return { corrected, needReview, total: currentSamples.length };
  }, [currentSamples]);

  function openEdit(s: EvaluationSample) {
    setEditingSample(s);
    const score = s.humanCorrectedScore ?? s.modelScore;
    setNewScore(score.toFixed(2));
    setReason(s.correctionReason ?? '');
  }

  function closeEdit() {
    setEditingSample(null);
    setNewScore('');
    setReason('');
  }

  function submitEdit() {
    if (!editingSample) return;
    const score = parseFloat(newScore);
    if (isNaN(score) || score < 0 || score > 1) return;
    if (!reason.trim()) return;
    correctSample(editingSample.id, score, reason.trim());
    closeEdit();
  }

  function openTrace(s: EvaluationSample) {
    showTrace(s);
  }

  const sampleLogs = editingSample
    ? correctionLogs.filter((l) => l.sampleId === editingSample.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">
            人工修正工作台
          </h1>
          <p className="text-slate-400 text-sm">
            按行号 / 图片名搜索样本，逐项人工校正分数，保留完整追溯链
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 animate-fade-in stagger-1">
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">总样本</div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums">{stats.total}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-amber-500/30">
          <div className="text-xs text-slate-400 mb-1">待复核</div>
          <div className="text-2xl font-mono font-bold text-amber-400 tabular-nums">{stats.needReview}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-emerald-500/30">
          <div className="text-xs text-slate-400 mb-1">已修正</div>
          <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{stats.corrected}</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">修正率</div>
          <div className="text-2xl font-mono font-bold text-sky-400 tabular-nums">
            {stats.total === 0 ? '0%' : `${((stats.corrected / stats.total) * 100).toFixed(1)}%`}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 animate-fade-in stagger-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索行号 / 图片名 / 源文件 / 批次 ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
            >
              <option value="all">全部状态</option>
              <option value="direct_use">直接可用</option>
              <option value="need_review">需复核</option>
              <option value="rejected">不合格</option>
              <option value="pending">需补测</option>
            </select>
          </div>

          <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyCorrected}
              onChange={(e) => setShowOnlyCorrected(e.target.checked)}
              className="accent-sky-500"
            />
            <span className="text-sm text-slate-300">仅显示已修正</span>
          </label>

          <button
            onClick={() => setSortAsc((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700/60 transition-colors"
          >
            <span>行号</span>
            {sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden animate-fade-in stagger-3">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60 sticky top-0 z-10">
              <tr className="text-slate-400 text-left">
                <th className="px-4 py-3 font-medium w-16">行号</th>
                <th className="px-4 py-3 font-medium">图片 / 来源</th>
                <th className="px-4 py-3 font-medium w-28">状态</th>
                <th className="px-4 py-3 font-medium w-28 text-right">模型分</th>
                <th className="px-4 py-3 font-medium w-28 text-right">修正分</th>
                <th className="px-4 py-3 font-medium w-28 text-center">修正次数</th>
                <th className="px-4 py-3 font-medium w-40 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    没有匹配的样本
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const logs = correctionLogs.filter((l) => l.sampleId === s.id);
                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        'border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors',
                        s.isCorrected && 'bg-emerald-500/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-sky-400 text-center">
                          #{s.originalRowNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{s.imageName ?? '—'}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {s.sourceFileName} · {s.batchId}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.reviewStatus} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300 tabular-nums">
                        {s.modelScore.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.humanCorrectedScore !== undefined ? (
                          <span className="font-mono font-bold text-emerald-400 tabular-nums">
                            {s.humanCorrectedScore.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                          logs.length > 0
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'bg-slate-700/50 text-slate-500'
                        )}>
                          {logs.length}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <TraceButton sample={s} onTrace={openTrace} />
                          <button
                            onClick={() => openEdit(s)}
                            className={cn(
                              'inline-flex items-center justify-center w-7 h-7 rounded-md border transition-colors',
                              s.isCorrected
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/10'
                            )}
                            title="修正分数"
                          >
                            <PencilLine size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingSample && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            onClick={closeEdit}
          />
          <div className="relative w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-in-right">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-start justify-between">
              <div>
                <div className="text-xs text-slate-500">
                  行号 <span className="font-mono text-sky-400">#{editingSample.originalRowNumber}</span>
                  {' · '}
                  批次 <span className="font-mono text-slate-400">{editingSample.batchId}</span>
                </div>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  人工修正分数
                </h2>
              </div>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1">模型原始分</div>
                  <div className="text-2xl font-mono font-bold text-slate-300 tabular-nums">
                    {editingSample.modelScore.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg bg-sky-500/10 p-4 border border-sky-500/30">
                  <div className="text-xs text-slate-500 mb-1">当前修正分</div>
                  <div className="text-2xl font-mono font-bold text-sky-400 tabular-nums">
                    {editingSample.humanCorrectedScore !== undefined
                      ? editingSample.humanCorrectedScore.toFixed(2)
                      : '—'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  新分数 <span className="text-rose-400">*</span>
                  <span className="text-slate-500 ml-2">（范围 0.00 - 1.00）</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={newScore}
                  onChange={(e) => setNewScore(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-xl font-mono focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 tabular-nums"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  修正理由 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="说明修正依据：如参照 Ground Truth、图片内容复核、标注规则第 X 条等..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-sm resize-none"
                />
              </div>

              {sampleLogs.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                    <RotateCcw size={12} />
                    历史修正记录（{sampleLogs.length}）
                  </div>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {sampleLogs.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-lg bg-slate-800/50 px-3 py-2.5 border border-slate-700/50 text-sm"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-slate-500 tabular-nums">
                            {l.oldScore.toFixed(2)}
                          </span>
                          <span className="text-slate-600">→</span>
                          <span className="font-mono font-semibold text-sky-400 tabular-nums">
                            {l.newScore.toFixed(2)}
                          </span>
                          <span className="ml-auto text-xs text-slate-500 font-mono">
                            {l.operator}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{l.reason}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-end gap-2 bg-slate-800/30">
              <button
                onClick={closeEdit}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitEdit}
                disabled={
                  !newScore ||
                  isNaN(parseFloat(newScore)) ||
                  parseFloat(newScore) < 0 ||
                  parseFloat(newScore) > 1 ||
                  !reason.trim()
                }
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                保存修正
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
