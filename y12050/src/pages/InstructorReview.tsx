import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Check, X, AlertTriangle, Clock, Eye, Filter, Search } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { exportReviewCSV } from '@/utils/export';
import { twMerge } from 'tailwind-merge';
import type { ReviewCase } from '@/types';

type FilterType = 'all' | 'conflict' | 'overtime' | 'misjudge' | 'pending' | 'approved' | 'rejected';

export default function InstructorReview() {
  const navigate = useNavigate();
  const { reviewCases, approveCase, rejectCase } = useGameStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const filteredCases = reviewCases.filter((c) => {
    if (searchQuery && !c.studentName.includes(searchQuery) && !c.levelName.includes(searchQuery)) {
      return false;
    }
    switch (activeFilter) {
      case 'conflict':
        return c.result.conflicts.length > 0;
      case 'overtime':
        return c.result.isTimeExceeded;
      case 'misjudge':
        return c.result.artifactTypes.length > 2;
      case 'pending':
        return c.reviewStatus === 'pending';
      case 'approved':
        return c.reviewStatus === 'approved';
      case 'rejected':
        return c.reviewStatus === 'rejected';
      default:
        return true;
    }
  });

  const filterLabels: Record<FilterType, string> = {
    all: '全部',
    conflict: '参数冲突',
    overtime: '时间超限',
    misjudge: '伪影误判',
    pending: '待复核',
    approved: '已通过',
    rejected: '已打回',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="relative border-b border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>
          <div className="text-center">
            <h1 className="font-semibold">讲师复核台</h1>
            <p className="text-xs text-slate-500">异常案例审核</p>
          </div>
          <button
            onClick={() => exportReviewCSV(reviewCases)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出复核报告
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="待复核" value={reviewCases.filter((c) => c.reviewStatus === 'pending').length} color="amber" />
          <StatCard label="参数冲突" value={reviewCases.filter((c) => c.result.conflicts.length > 0).length} color="rose" />
          <StatCard label="时间超限" value={reviewCases.filter((c) => c.result.isTimeExceeded).length} color="orange" />
          <StatCard label="已通过" value={reviewCases.filter((c) => c.reviewStatus === 'approved').length} color="emerald" />
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="flex gap-1">
                {(Object.keys(filterLabels) as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={twMerge(
                      'px-3 py-1.5 rounded-lg text-sm transition-colors',
                      activeFilter === f
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    {filterLabels[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="搜索学员/关卡..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-500">
                  <th className="text-left py-3 px-4 font-medium">学员</th>
                  <th className="text-left py-3 px-4 font-medium">关卡</th>
                  <th className="text-left py-3 px-4 font-medium">得分</th>
                  <th className="text-left py-3 px-4 font-medium">扫描时间</th>
                  <th className="text-left py-3 px-4 font-medium">异常类型</th>
                  <th className="text-left py-3 px-4 font-medium">状态</th>
                  <th className="text-left py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      暂无符合条件的案例
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-medium">{c.studentName}</td>
                      <td className="py-3 px-4 text-slate-400">{c.levelName}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold">{c.result.totalScore}</span>
                        <span className="text-slate-500">/{c.result.maxScore}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={twMerge(
                            'font-mono',
                            c.result.isTimeExceeded ? 'text-rose-400' : 'text-slate-300'
                          )}
                        >
                          {c.result.scanTime.toFixed(0)}s
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.result.conflicts.length > 0 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-400">
                              冲突{c.result.conflicts.length}项
                            </span>
                          )}
                          {c.result.isTimeExceeded && (
                            <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">时间超限</span>
                          )}
                          {c.result.artifactTypes.length > 2 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                              伪影{c.result.artifactTypes.length}种
                            </span>
                          )}
                          {c.result.conflicts.length === 0 && !c.result.isTimeExceeded && c.result.artifactTypes.length <= 2 && (
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-400">无明显异常</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={c.reviewStatus} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedCase(c)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {c.reviewStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => approveCase(c.id)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                title="通过"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCase(c);
                                  setRejectNote('');
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                title="打回"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold">案例详情 - {selectedCase.studentName}</h3>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">关卡</p>
                  <p className="font-medium">{selectedCase.levelName}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">总分</p>
                  <p className="font-mono font-bold text-cyan-400">
                    {selectedCase.result.totalScore}/{selectedCase.result.maxScore}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">参数值</p>
                <div className="grid grid-cols-3 gap-2 text-sm font-mono">
                  <span>TR: {selectedCase.params.TR}ms</span>
                  <span>TE: {selectedCase.params.TE}ms</span>
                  <span>NEX: {selectedCase.params.NEX}</span>
                  <span>FOV: {selectedCase.params.FOV}cm</span>
                  <span>矩阵: {selectedCase.params.matrix}</span>
                  <span>层厚: {selectedCase.params.sliceThickness}mm</span>
                </div>
              </div>

              {selectedCase.result.conflicts.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <p className="text-xs text-rose-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    参数冲突
                  </p>
                  {selectedCase.result.conflicts.map((c, i) => (
                    <p key={i} className="text-sm text-rose-300">
                      • {c.message}
                    </p>
                  ))}
                </div>
              )}

              {selectedCase.result.isTimeExceeded && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-xs text-amber-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    时间超限
                  </p>
                  <p className="text-sm text-amber-300">
                    扫描时间 {selectedCase.result.scanTime.toFixed(0)}s / 预算 {selectedCase.result.timeBudget}s
                  </p>
                </div>
              )}

              {selectedCase.result.artifactTypes.length > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-400 mb-2">伪影类型</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCase.result.artifactTypes.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-300">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedCase.reviewStatus === 'pending' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">打回批注（选填）</label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="输入打回原因..."
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500/50 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        approveCase(selectedCase.id, rejectNote);
                        setSelectedCase(null);
                      }}
                      className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
                    >
                      通过
                    </button>
                    <button
                      onClick={() => {
                        rejectCase(selectedCase.id, rejectNote || '请重新调整参数');
                        setSelectedCase(null);
                      }}
                      className="flex-1 py-2.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors font-medium"
                    >
                      打回修改
                    </button>
                  </div>
                </div>
              )}

              {selectedCase.reviewStatus !== 'pending' && selectedCase.reviewNote && (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">复核批注</p>
                  <p className="text-sm text-slate-300">{selectedCase.reviewNote}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  return (
    <div className={twMerge('p-4 rounded-xl border', colorClasses[color])}>
      <p className="text-sm opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ReviewCase['reviewStatus'] }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-rose-500/20 text-rose-400',
  };
  const labels: Record<string, string> = {
    pending: '待复核',
    approved: '已通过',
    rejected: '已打回',
  };
  return (
    <span className={twMerge('px-2.5 py-1 rounded-lg text-xs font-medium', styles[status])}>{labels[status]}</span>
  );
}
