import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store';
import type { AnalysisSample, FilterState, SampleStatus } from '@/types';
import {
  StatusBadge,
  ReviewBadge,
  DuplicateTag,
  PillButton,
  PrimaryButton,
} from '@/components/Badges';

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className="glass-panel rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium ${color}`}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${color}`}>
        {value}
      </div>
    </div>
  );
}

interface SampleCardProps {
  sample: AnalysisSample;
}

function SampleCard({ sample }: SampleCardProps) {
  const navigate = useNavigate();
  const createdDate = new Date(sample.createdAt);
  const formattedDate = createdDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={() => navigate(`/sample/${sample.id}`)}
      className={`glass-panel rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(0,180,216,0.15)] animate-slide-up relative group ${
        sample.isDuplicate ? 'duplicate-overlay' : ''
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <StatusBadge status={sample.status} />
          <div className="flex items-center gap-2">
            {sample.isDuplicate && (
              <DuplicateTag score={sample.duplicatePair?.similarityScore} />
            )}
            <ReviewBadge reviewed={sample.reviewed} status={sample.reviewStatus} />
          </div>
        </div>

        <h3 className="text-base font-semibold text-neutral-50 mb-1 truncate">
          {sample.name}
        </h3>
        <p className="text-xs text-neutral-300 font-mono mb-3">ID: {sample.id}</p>

        {sample.explanation && (
          <div className="mb-3 p-3 rounded-lg bg-deep-800/60 border border-deep-600/50">
            <p className="text-xs text-neutral-100 leading-relaxed line-clamp-2">
              {sample.explanation.summary}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-300">{formattedDate}</span>
          <span className="text-xs text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
            查看详情 →
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div className="text-6xl mb-4 opacity-50">📭</div>
      <h3 className="text-lg font-semibold text-neutral-100 mb-2">没有找到符合条件的样例</h3>
      <p className="text-sm text-neutral-300">请尝试调整筛选条件或上传新的数据</p>
    </div>
  );
}

export default function Workbench() {
  const navigate = useNavigate();
  const { samples, filters, setFilters } = useStore();

  const stats = useMemo(() => {
    return {
      total: samples.length,
      normal: samples.filter((s) => s.status === 'normal').length,
      pending: samples.filter((s) => s.status === 'pending').length,
      badData: samples.filter((s) => s.status === 'bad_data').length,
      duplicates: samples.filter((s) => s.isDuplicate).length,
    };
  }, [samples]);

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      if (filters.status !== 'all' && sample.status !== filters.status) {
        return false;
      }
      if (filters.onlyDuplicates && !sample.isDuplicate) {
        return false;
      }
      if (filters.onlyReviewed !== 'all') {
        if (filters.onlyReviewed === true && !sample.reviewed) {
          return false;
        }
        if (filters.onlyReviewed === false && sample.reviewed) {
          return false;
        }
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !sample.name.toLowerCase().includes(searchLower) &&
          !sample.id.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [samples, filters]);

  const statusOptions: { key: SampleStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: stats.total },
    { key: 'normal', label: '正常', count: stats.normal },
    { key: 'pending', label: '待确认', count: stats.pending },
    { key: 'bad_data', label: '坏数据', count: stats.badData },
  ];

  const reviewOptions: { key: boolean | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: true, label: '已复核' },
    { key: false, label: '未复核' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-neutral-50 mb-1">分析工作台</h1>
            <p className="text-sm text-neutral-300">
              管理和分析所有网络流瓶颈样例
            </p>
          </div>
          <PrimaryButton icon={<span>↑</span>} onClick={() => navigate('/upload')}>
            上传数据
          </PrimaryButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="总样例数"
            value={stats.total}
            color="text-accent-cyan"
            icon="📊"
          />
          <StatCard
            label="正常"
            value={stats.normal}
            color="text-accent-green"
            icon="✓"
          />
          <StatCard
            label="待确认"
            value={stats.pending}
            color="text-accent-amber"
            icon="⚠"
          />
          <StatCard
            label="坏数据"
            value={stats.badData}
            color="text-accent-red"
            icon="✕"
          />
          <StatCard
            label="重复样本"
            value={stats.duplicates}
            color="text-accent-red"
            icon="♻"
          />
        </div>

        <div className="glass-panel rounded-xl p-4 mb-6 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-300 mr-2">状态：</span>
              {statusOptions.map((opt) => (
                <PillButton
                  key={opt.key}
                  active={filters.status === opt.key}
                  onClick={() => setFilters({ status: opt.key } as Partial<FilterState>)}
                  count={opt.count}
                >
                  {opt.label}
                </PillButton>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyDuplicates}
                  onChange={(e) => setFilters({ onlyDuplicates: e.target.checked })}
                  className="w-4 h-4 rounded border-deep-600 bg-deep-700 text-accent-cyan focus:ring-accent-cyan focus:ring-offset-deep-900"
                />
                <span className="text-xs text-neutral-200">仅显示重复样本</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-300 mr-1">复核：</span>
              <select
                value={
                  filters.onlyReviewed === 'all'
                    ? 'all'
                    : filters.onlyReviewed === true
                    ? 'reviewed'
                    : 'unreviewed'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters({
                    onlyReviewed:
                      val === 'all' ? 'all' : val === 'reviewed' ? true : false,
                  } as Partial<FilterState>);
                }}
                className="bg-deep-700/50 border border-deep-600/50 rounded-lg text-xs text-neutral-100 px-3 py-1.5 focus:outline-none focus:border-accent-cyan/50"
              >
                {reviewOptions.map((opt) => (
                  <option
                    key={String(opt.key)}
                    value={opt.key === 'all' ? 'all' : opt.key === true ? 'reviewed' : 'unreviewed'}
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:ml-auto w-full lg:w-64">
              <div className="relative">
                <input
                  type="text"
                  placeholder="按名称搜索..."
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  className="w-full bg-deep-700/50 border border-deep-600/50 rounded-lg text-sm text-neutral-100 placeholder-neutral-300 px-4 py-2 pl-10 focus:outline-none focus:border-accent-cyan/50 transition-colors"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300">
                  🔍
                </span>
              </div>
            </div>
          </div>
        </div>

        {filteredSamples.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSamples.map((sample) => (
              <SampleCard key={sample.id} sample={sample} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
