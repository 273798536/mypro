import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import StatusBadgeComponent from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Play, AlertTriangle, ArrowRight, RefreshCw, Filter, Search, FileText } from 'lucide-react';
import type { PlaybackStatus } from '@shared/types';

function Playback() {
  const { playbackResults, loading, error, fetchPlaybackResults, runPlayback } = useStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlaybackStatus | 'all'>('all');
  const [showOnlyMisjudgment, setShowOnlyMisjudgment] = useState(false);

  useEffect(() => {
    fetchPlaybackResults();
  }, [fetchPlaybackResults]);

  const filteredResults = playbackResults.filter(r => {
    const matchesSearch = r.sample?.productName.includes(searchTerm) ||
      r.sample?.attributeName.includes(searchTerm) ||
      r.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesMisjudgment = !showOnlyMisjudgment || r.isMisjudgment;
    return matchesSearch && matchesStatus && matchesMisjudgment;
  });

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600';
    if (score >= 0.6) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 0.8) return 'from-emerald-500 to-green-500';
    if (score >= 0.6) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-800">误判回放</h1>
          <p className="text-gray-500 mt-1">点击置信度分数查看样本证据，不只是看一个数字</p>
        </div>
        <button
          onClick={() => runPlayback()}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={16} />
          重新执行回放
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="搜索商品、属性、回放ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PlaybackStatus | 'all')}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="all">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="approved">已放行</option>
          <option value="need_evidence">待补证</option>
        </select>
        
        <button
          onClick={() => setShowOnlyMisjudgment(!showOnlyMisjudgment)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showOnlyMisjudgment
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle size={16} />
          {showOnlyMisjudgment ? '仅显示误判' : '显示全部'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {filteredResults.map(result => (
          <div
            key={result.id}
            className={`card p-6 cursor-pointer hover:shadow-md transition-all duration-300 ${
              result.sample?.isWithdrawn ? 'border-2 border-red-300 bg-red-50/30' : ''
            }`}
            onClick={() => navigate(`/evidence/${result.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getScoreBg(result.confidenceScore)} flex items-center justify-center shadow-lg`}>
                  <Play className="text-white" size={24} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{result.sample?.productName}</p>
                  <p className="text-sm text-gray-500">
                    {result.sample?.attributeName}: {result.sample?.attributeValue}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-1">{result.id}</p>
                </div>
              </div>
              <StatusBadgeComponent status={result.status} />
            </div>

            <div className="mb-4">
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-4xl font-bold ${getScoreColor(result.confidenceScore)}`}>
                  {(result.confidenceScore * 100).toFixed(0)}
                </span>
                <span className="text-gray-400 mb-1">分</span>
                <span className="text-sm text-gray-500 mb-1">置信度</span>
              </div>
              
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getScoreBg(result.confidenceScore)} transition-all duration-500`}
                  style={{ width: `${result.confidenceScore * 100}%` }}
                />
              </div>
            </div>

            {result.isMisjudgment && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>判定为误判：{result.judgmentReason}</span>
                </p>
              </div>
            )}

            {result.missingReference && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  ⚠ 缺样本引用，点击查看缺失哪条样本证据
                </p>
              </div>
            )}

            {result.sample?.isWithdrawn && (
              <div className="mb-4 p-3 bg-red-100/50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  该样本已被撤回，请注意排除
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <FileText size={12} />
                {result.evidenceChain.length} 条证据
                {result.missingReference && ` · 缺 ${result.missingSampleIds.length} 条引用`}
              </div>
              <button className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium">
                查看证据链
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Play size={48} className="mx-auto mb-4 opacity-30" />
          <p>暂无匹配的回放结果</p>
        </div>
      )}
    </div>
  );
}

export default Playback;
