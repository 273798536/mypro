import { useState, useMemo } from 'react';
import { Search, Filter, Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';
import PageHeader from '@/components/PageHeader';
import SandboxCard from '@/components/SandboxCard';
import type { SandboxStatus } from '@/types';
import { Link } from 'react-router-dom';

type FilterStatus = 'all' | SandboxStatus;

export default function SandboxList() {
  const sandboxes = useSandboxStore((s) => s.sandboxes);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [onlyProblems, setOnlyProblems] = useState(false);

  const filtered = useMemo(() => {
    return sandboxes.filter((s) => {
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (onlyProblems) {
        const hasProblem =
          (s.unit === 'radian' && s.inclination > 6.28) ||
          s.modelOverlap ||
          Math.abs(s.cameraView.x) > 100 ||
          s.cameraView.zoom < 0.1 ||
          s.cameraView.zoom > 5;
        if (!hasProblem) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [sandboxes, query, statusFilter, onlyProblems]);

  const stats = useMemo(() => {
    return {
      total: sandboxes.length,
      draft: sandboxes.filter((s) => s.status === 'draft').length,
      reviewing: sandboxes.filter((s) => s.status === 'reviewing').length,
      confirmed: sandboxes.filter((s) => s.status === 'confirmed').length,
    };
  }, [sandboxes]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title="沙盘列表"
        description={`共 ${stats.total} 个沙盘项目，管理所有轨道倾角演示方案`}
        actions={
          <Link to="/create" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新建沙盘
          </Link>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-space-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            全部
          </div>
          <div className="text-2xl font-bold text-space-100">{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-space-400 text-xs mb-1">
            <div className="w-2 h-2 rounded-full bg-space-400" />
            草稿
          </div>
          <div className="text-2xl font-bold text-space-200">{stats.draft}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-space-400 text-xs mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            复核中
          </div>
          <div className="text-2xl font-bold text-amber-300">{stats.reviewing}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-space-400 text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            已确认
          </div>
          <div className="text-2xl font-bold text-emerald-300">{stats.confirmed}</div>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
            <input
              type="text"
              placeholder="搜索沙盘名称..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-space-400" />
            {(['all', 'draft', 'reviewing', 'confirmed'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                    : 'bg-space-700/50 text-space-300 border border-transparent hover:bg-space-700'
                }`}
              >
                {s === 'all' ? '全部' : s === 'draft' ? '草稿' : s === 'reviewing' ? '复核中' : '已确认'}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 px-3 py-1.5 bg-space-700/50 rounded-lg cursor-pointer hover:bg-space-700 transition-colors">
            <input
              type="checkbox"
              checked={onlyProblems}
              onChange={(e) => setOnlyProblems(e.target.checked)}
              className="w-3.5 h-3.5 accent-gold-500"
            />
            <span className="text-sm text-space-200">只显示有问题的</span>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4 opacity-40">🌌</div>
          <div className="text-lg text-space-200 font-medium mb-2">暂无匹配的沙盘</div>
          <div className="text-sm text-space-400">尝试调整筛选条件，或创建一个新的沙盘项目</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {filtered.map((sandbox) => (
            <SandboxCard key={sandbox.id} sandbox={sandbox} />
          ))}
        </div>
      )}
    </div>
  );
}
