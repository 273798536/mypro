import { useState, useEffect } from 'react';
import { Play, Search, AlertCircle, CheckCircle, XCircle, MinusCircle, Eye, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Loading from '../components/Loading';
import RiskBadge from '../components/RiskBadge';
import StatsCard from '../components/StatsCard';
import Toast from '../components/Toast';
import { MATCH_STATUS_LABELS, CONFLICT_TYPE_LABELS } from '../../shared/types';
import type { RiskLevel, MatchStatus } from '../../shared/types';
import { cn, formatDuration } from '../lib/utils';

export default function Matches() {
  const navigate = useNavigate();
  const {
    matches,
    loading,
    error,
    stats,
    pagination,
    filters,
    setFilters,
    fetchMatches,
    fetchStats,
    runMatching,
    setError,
  } = useStore();

  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchMatches({ ...filters, search: search || undefined });
    fetchStats();
  }, [filters, search]);

  const handleRunMatching = async () => {
    setIsRunning(true);
    try {
      await runMatching();
      setToast({ message: '版权匹配完成', type: 'success' });
    } catch (e) {
      setToast({ message: '匹配失败，请重试', type: 'error' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleFilterChange = (key: 'riskLevel' | 'matchStatus', value: string) => {
    setFilters({ [key]: value || undefined });
  };

  const getMatchIcon = (status: MatchStatus) => {
    switch (status) {
      case 'full':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'partial':
        return <MinusCircle className="w-4 h-4 text-amber-500" />;
      case 'none':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'conflict':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">版权匹配</h1>
          <p className="text-slate-500 mt-1">自动匹配曲库授权，检测版权风险</p>
        </div>
        <button
          onClick={handleRunMatching}
          disabled={isRunning || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <Loading size="sm" />
          ) : (
            <Zap className="w-5 h-5" />
          )}
          {isRunning ? '匹配中...' : '执行匹配'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="总歌曲数"
          value={stats?.total || 0}
          icon={Play}
          color="#3b82f6"
          bgColor="bg-blue-50"
        />
        <StatsCard
          title="高风险"
          value={stats?.byRiskLevel?.high || 0}
          icon={AlertCircle}
          color="#dc2626"
          bgColor="bg-red-50"
        />
        <StatsCard
          title="中风险"
          value={stats?.byRiskLevel?.medium || 0}
          icon={AlertCircle}
          color="#f59e0b"
          bgColor="bg-amber-50"
        />
        <StatsCard
          title="无风险"
          value={stats?.byRiskLevel?.none || 0}
          icon={CheckCircle}
          color="#10b981"
          bgColor="bg-emerald-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索歌曲或歌手..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.riskLevel || ''}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">全部风险等级</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
              <option value="none">无风险</option>
            </select>

            <select
              value={filters.matchStatus || ''}
              onChange={(e) => handleFilterChange('matchStatus', e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">全部匹配状态</option>
              <option value="full">完全匹配</option>
              <option value="partial">部分匹配</option>
              <option value="none">无匹配</option>
              <option value="conflict">冲突待处理</option>
            </select>
          </div>
        </div>

        {loading && matches.length === 0 ? (
          <div className="p-12">
            <Loading text="加载中..." />
          </div>
        ) : matches.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无匹配结果</h3>
            <p className="text-slate-500 mb-4">点击「执行匹配」开始版权匹配</p>
            <button
              onClick={handleRunMatching}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              执行匹配
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      歌曲
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      匹配状态
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      匹配度
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      风险等级
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      版权信息
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      风险原因
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matches.map((match, index) => (
                    <tr
                      key={match.id}
                      className={cn(
                        'hover:bg-slate-50 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{match.song?.name}</div>
                        <div className="text-sm text-slate-500">
                          {match.song?.artist} · {formatDuration(match.song?.duration || 0)}
                        </div>
                        {match.isCoverDetected && (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                            翻唱版本
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getMatchIcon(match.matchStatus)}
                          <span className="text-slate-700">{MATCH_STATUS_LABELS[match.matchStatus]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                match.matchConfidence >= 0.8
                                  ? 'bg-emerald-500'
                                  : match.matchConfidence >= 0.6
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${match.matchConfidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">{(match.matchConfidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge level={match.riskLevel as RiskLevel} pulse />
                      </td>
                      <td className="px-6 py-4">
                        {match.copyright ? (
                          <div>
                            <div className="text-sm font-medium text-slate-700">
                              {(match.copyright as { songName?: string }).songName || '-'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {(match.copyright as { artist?: string }).artist || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">无匹配版权</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-slate-600 line-clamp-2">
                          {match.riskReasons?.join('；') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/song/${match.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                共 {pagination.matches.total} 条记录，第 {pagination.matches.page} /{' '}
                {pagination.matches.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.matches.page <= 1}
                  onClick={() =>
                    fetchMatches({
                      page: pagination.matches.page - 1,
                      ...filters,
                      search: search || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={pagination.matches.page >= pagination.matches.totalPages}
                  onClick={() =>
                    fetchMatches({
                      page: pagination.matches.page + 1,
                      ...filters,
                      search: search || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
