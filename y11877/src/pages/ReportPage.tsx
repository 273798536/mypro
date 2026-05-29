import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import ReportSummary from '@/components/ReportSummary';
import DetailExpandable from '@/components/DetailExpandable';
import ExportButton from '@/components/ExportButton';
import type { Verdict } from '@/utils/types';

export default function ReportPage() {
  const navigate = useNavigate();
  const results = useAppStore((s) => s.results);
  const mirrors = useAppStore((s) => s.mirrors);
  const rays = useAppStore((s) => s.rays);
  const isGraded = useAppStore((s) => s.isGraded);

  const [filter, setFilter] = useState<Verdict | 'all'>('all');
  const [search, setSearch] = useState('');

  if (!isGraded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-gray-400">尚未执行批改</div>
          <button
            onClick={() => navigate('/import')}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-[#f0c040] text-[#1a1a2e] hover:bg-[#f0c040]/90"
          >
            前往导入
          </button>
        </div>
      </div>
    );
  }

  const filteredResults = results.filter((r) => {
    if (filter !== 'all' && r.verdict !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.rayId.toLowerCase().includes(q) ||
        r.mirrorId.toLowerCase().includes(q) ||
        r.computationDetails.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-[#2d2d44]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/grading')}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-[#2d2d44] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-100">批改报告</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                共 {results.length} 条记录，可展开查看计算明细与冲突来源
              </p>
            </div>
          </div>
          <ExportButton results={results} mirrors={mirrors} rays={rays} />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
        <ReportSummary results={results} />

        <div className="rounded-xl border border-[#2d2d44] bg-[#13132a] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">明细列表</h3>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {(['all', 'pass', 'error', 'pending'] as const).map((v) => {
                  const label =
                    v === 'all' ? '全部' : v === 'pass' ? '通过' : v === 'error' ? '错误' : '待确认';
                  const color =
                    v === 'all'
                      ? 'text-gray-300 border-gray-500/40'
                      : v === 'pass'
                      ? 'text-emerald-400 border-emerald-400/40'
                      : v === 'error'
                      ? 'text-red-400 border-red-400/40'
                      : 'text-amber-400 border-amber-400/40';
                  return (
                    <button
                      key={v}
                      onClick={() => setFilter(v)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-all ${
                        filter === v
                          ? `${color} bg-white/5`
                          : 'text-gray-600 border-transparent hover:text-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索ID或关键词..."
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#0d0d1a] border border-[#2d2d44] text-xs text-gray-300 placeholder:text-gray-600 outline-none focus:border-[#f0c040]/40 transition-colors w-48"
                />
              </div>
            </div>
          </div>
          <DetailExpandable results={filteredResults} mirrors={mirrors} rays={rays} />
        </div>
      </div>
    </div>
  );
}
