import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  FileText,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  GitMerge,
  Eye,
  ExternalLink,
  Check,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useSampleStore } from '@/stores/sampleStore';
import { Empty } from '@/components/Empty';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { cn } from '@/lib/utils';
import { DedupResult } from '@/types';

export default function DuplicatesPage() {
  const {
    dedupResults,
    getFilteredDedupResults,
    markAsDuplicate,
    setMergeStrategy,
    users,
    versions,
    getVersionHistory,
  } = useSampleStore();

  const [expandedDedupId, setExpandedDedupId] = useState<string | null>(null);

  const filteredResults = getFilteredDedupResults();

  const stats = useMemo(() => {
    const total = dedupResults.length;
    const confirmed = dedupResults.filter((d) => d.isConfirmedDuplicate).length;
    const resolved = dedupResults.filter((d) => d.mergeStrategy !== null).length;
    const pending = total - confirmed;

    return { total, confirmed, resolved, pending };
  }, [dedupResults]);

  const handleConfirmDuplicate = (dedup: DedupResult, confirmed: boolean) => {
    const currentUser = users[0];
    if (currentUser) {
      markAsDuplicate(dedup.barcode, confirmed, currentUser.id, currentUser.name);
    }
  };

  const handleSetMergeStrategy = (dedup: DedupResult, strategy: 'keep_latest' | 'keep_original' | 'manual') => {
    const currentUser = users[0];
    if (currentUser) {
      setMergeStrategy(dedup.barcode, strategy, currentUser.id, currentUser.name);
    }
  };

  const handleJumpToSource = (sourceOriginId: string) => {
    const version = versions.find((v) => v.sourceOrigin.id === sourceOriginId);
    if (version) {
      alert(`跳转到原始来源: ${version.sourceOrigin.originalFileName}, 行号: ${version.sourceOrigin.originalRowNumber}`);
    }
  };

  const handleJumpToVersion = (versionId: string) => {
    const version = versions.find((v) => v.versionId === versionId);
    if (version) {
      alert(`跳转到版本详情: v${version.versionNumber}, 条码: ${version.barcode}`);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-danger-600 bg-danger-100';
    if (similarity >= 0.5) return 'text-warning-600 bg-warning-100';
    return 'text-primary-600 bg-primary-100';
  };

  const getMergeStrategyLabel = (strategy: string | null) => {
    switch (strategy) {
      case 'keep_latest':
        return '保留最新';
      case 'keep_original':
        return '保留原始';
      case 'manual':
        return '人工处理';
      default:
        return '未设置';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">重复预警总数</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
              <Clock size={20} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">待确认</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">已确认</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        <div className="lab-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <GitMerge size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-lab-textMuted">已处理</p>
              <p className="text-2xl font-bold font-mono text-lab-text">{stats.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lab-card p-4 bg-warning-50 border border-warning-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-warning-800 mb-1">条码重复记录处理说明</h3>
            <p className="text-sm text-warning-700">
              遇到样本条码重复记录时，系统会保留所有原始行号、图片名和来源备注。请先确认是否为真实重复，
              然后选择合并策略。所有操作都会被记录，真要追问时能回到那张表或那条记录。
            </p>
          </div>
        </div>
      </div>

      <SearchFilterBar showStatusFilter={false} />

      {filteredResults.length > 0 ? (
        <div className="space-y-4">
          {filteredResults.map((dedup, index) => {
            const isExpanded = expandedDedupId === dedup.dedupId;
            const latestVersion = getVersionHistory(dedup.barcode).sort(
              (a, b) => b.versionNumber - a.versionNumber
            )[0];
            const operator = users.find((u) => u.id === dedup.resolvedBy);

            return (
              <div
                key={dedup.dedupId}
                className={cn(
                  'lab-card overflow-hidden transition-all duration-300',
                  dedup.isConfirmedDuplicate && 'ring-2 ring-warning-400/50'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-lab-bg/50 transition-colors"
                  onClick={() => setExpandedDedupId(isExpanded ? null : dedup.dedupId)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-lg text-primary-600">
                          {dedup.barcode}
                        </span>
                        <span className="tag-warning">
                          <AlertTriangle size={12} className="mr-1" />
                          {dedup.duplicateCount} 条重复
                        </span>
                        {dedup.isConfirmedDuplicate && (
                          <span className="tag-accent">
                            <Check size={12} className="mr-1" />
                            已确认
                          </span>
                        )}
                        {dedup.mergeStrategy && (
                          <span className="tag-primary">
                            <GitMerge size={12} className="mr-1" />
                            {getMergeStrategyLabel(dedup.mergeStrategy)}
                          </span>
                        )}
                        <span
                          className={cn('tag', {
                            'bg-warning-50 text-warning-700': !dedup.mergeStrategy,
                            'bg-accent-50 text-accent-700': dedup.mergeStrategy,
                          })}
                        >
                          {dedup.mergeStrategy ? '已处理' : '待处理'}
                        </span>
                      </div>

                      <p className="text-sm text-lab-text mb-2">
                        基因: <span className="font-medium">{latestVersion?.sequencingResult.geneName || '-'}</span>
                        {' · '}
                        版本数: <span className="font-medium">{getVersionHistory(dedup.barcode).length}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-lab-textMuted">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          最新来源: {latestVersion?.sourceOrigin.originalFileName || '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          首次导入: {dayjs(latestVersion?.sourceOrigin.importTimestamp).format('YYYY-MM-DD') || '-'}
                        </span>
                        {dedup.resolvedAt && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            处理人: {operator?.name || '-'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-lab-border bg-lab-bg/30 p-4">
                    <h4 className="text-sm font-medium text-lab-text mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-warning-500" />
                      重复记录详情 - 所有原始来源均已保留
                    </h4>

                    <div className="overflow-x-auto mb-4">
                      <table className="data-table text-sm">
                        <thead>
                          <tr>
                            <th>版本</th>
                            <th>相似度</th>
                            <th>原始行号</th>
                            <th>来源文件</th>
                            <th>来源备注</th>
                            <th>导入时间</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getVersionHistory(dedup.barcode).map((version, idx) => (
                            <tr key={version.versionId}>
                              <td className="font-mono font-medium text-primary-600">v{version.versionNumber}</td>
                              <td>
                                {idx > 0 ? (
                                  <span className={cn('px-2 py-1 rounded text-xs font-medium', getSimilarityColor(dedup.duplicateRecords[idx - 1]?.similarity || 0))}>
                                    {Math.round((dedup.duplicateRecords[idx - 1]?.similarity || 0) * 100)}%
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-700">
                                    原始
                                  </span>
                                )}
                              </td>
                              <td className="font-mono">{version.sourceOrigin.originalRowNumber}</td>
                              <td className="font-mono text-xs max-w-[150px] truncate" title={version.sourceOrigin.originalFileName}>
                                {version.sourceOrigin.originalFileName}
                              </td>
                              <td className="max-w-[200px] truncate" title={version.sourceOrigin.sourceRemark}>
                                {version.sourceOrigin.sourceRemark}
                              </td>
                              <td className="text-xs text-lab-textMuted whitespace-nowrap">
                                {dayjs(version.sourceOrigin.importTimestamp).format('YYYY-MM-DD HH:mm')}
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToSource(version.sourceOrigin.id);
                                    }}
                                    className="p-1.5 rounded hover:bg-primary-100 text-primary-600 transition-colors"
                                    title="查看来源"
                                  >
                                    <FileText size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToVersion(version.versionId);
                                    }}
                                    className="p-1.5 rounded hover:bg-accent-100 text-accent-600 transition-colors"
                                    title="查看版本"
                                  >
                                    <Eye size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-lab-textMuted">确认状态:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDuplicate(dedup, true);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            dedup.isConfirmedDuplicate
                              ? 'bg-accent-600 text-white'
                              : 'bg-lab-bg text-lab-text hover:bg-accent-100 hover:text-accent-700'
                          )}
                        >
                          <Check size={14} />
                          确认为重复
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDuplicate(dedup, false);
                          }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            !dedup.isConfirmedDuplicate && dedup.dedupId
                              ? 'bg-danger-600 text-white'
                              : 'bg-lab-bg text-lab-text hover:bg-danger-100 hover:text-danger-700'
                          )}
                        >
                          <X size={14} />
                          不是重复
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm text-lab-textMuted">合并策略:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetMergeStrategy(dedup, 'keep_latest');
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            dedup.mergeStrategy === 'keep_latest'
                              ? 'bg-primary-600 text-white'
                              : 'bg-lab-bg text-lab-text hover:bg-primary-100 hover:text-primary-700'
                          )}
                        >
                          保留最新
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetMergeStrategy(dedup, 'keep_original');
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            dedup.mergeStrategy === 'keep_original'
                              ? 'bg-primary-600 text-white'
                              : 'bg-lab-bg text-lab-text hover:bg-primary-100 hover:text-primary-700'
                          )}
                        >
                          保留原始
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetMergeStrategy(dedup, 'manual');
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            dedup.mergeStrategy === 'manual'
                              ? 'bg-primary-600 text-white'
                              : 'bg-lab-bg text-lab-text hover:bg-primary-100 hover:text-primary-700'
                          )}
                        >
                          人工处理
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          title="暂无条码重复记录"
          description="所有样本条码均唯一，无需处理重复记录"
          icon={CheckCircle2}
        />
      )}
    </div>
  );
}
