import { useState } from 'react';
import { Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import type { Sample } from '@/types';
import { cn } from '@/utils/helpers';

interface SampleTableProps {
  samples: Sample[];
  versionId: string;
  rerunStatus: Record<string, 'idle' | 'running' | 'done'>;
  onViewSample: (sample: Sample) => void;
  onRerunSample: (sampleId: string) => void;
}

export default function SampleTable({
  samples,
  versionId,
  rerunStatus,
  onViewSample,
  onRerunSample,
}: SampleTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getRerunStatus = (sampleId: string) => {
    return rerunStatus[`${versionId}-${sampleId}`] || 'idle';
  };

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-color overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-color">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">排名</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">商品名称</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">属性</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">贡献度</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">影响原因</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">状态</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((sample, index) => {
            const status = getRerunStatus(sample.id);
            const isExpanded = expandedRow === sample.id;

            return (
              <>
                <tr
                  key={sample.id}
                  className={cn(
                    'border-b border-border-color/50 hover:bg-bg-tertiary/30 transition-colors',
                    sample.isLeak && 'bg-accent-red/5',
                    isExpanded && 'bg-bg-tertiary/30'
                  )}
                  onClick={() => setExpandedRow(isExpanded ? null : sample.id)}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        index < 3
                          ? 'bg-accent-orange/20 text-accent-orange'
                          : 'bg-bg-tertiary text-gray-400'
                      )}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{sample.productName}</p>
                    {sample.isLeak && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-accent-red/10 text-accent-red text-xs">
                        <XCircle size={10} />
                        样本泄漏
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(sample.attributes).slice(0, 3).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 rounded bg-bg-tertiary text-xs text-gray-300"
                        >
                          {key}: {value}
                        </span>
                      ))}
                      {Object.keys(sample.attributes).length > 3 && (
                        <span className="px-1.5 py-0.5 rounded bg-bg-tertiary text-xs text-gray-500">
                          +{Object.keys(sample.attributes).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(sample.contribution.score * 5, 100)}%`,
                            backgroundColor:
                              sample.contribution.score > 10
                                ? '#EF4444'
                                : sample.contribution.score > 5
                                ? '#F59E0B'
                                : '#3B82F6',
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-sm font-mono font-medium',
                          sample.contribution.score > 10
                            ? 'text-accent-red'
                            : sample.contribution.score > 5
                            ? 'text-accent-orange'
                            : 'text-gray-300'
                        )}
                      >
                        {sample.contribution.score.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-400">
                      {sample.contribution.impactReason || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {status === 'running' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue text-xs">
                        <RefreshCw size={10} className="animate-spin" />
                        重跑中
                      </span>
                    ) : status === 'done' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-green/10 text-accent-green text-xs">
                        <CheckCircle size={10} />
                        已完成
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">正常</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSample(sample);
                        }}
                        className="p-1.5 rounded hover:bg-bg-tertiary text-gray-400 hover:text-white transition-colors"
                        title="查看接口返回"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (status !== 'running') {
                            onRerunSample(sample.id);
                          }
                        }}
                        disabled={status === 'running'}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          status === 'running'
                            ? 'text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:bg-bg-tertiary hover:text-accent-blue'
                        )}
                        title="重跑样本"
                      >
                        <RefreshCw
                          size={14}
                          className={status === 'running' ? 'animate-spin' : ''}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 bg-bg-tertiary/20">
                      <div className="grid grid-cols-5 gap-4">
                        {Object.entries(sample.attributes).map(([key, value]) => (
                          <div key={key} className="bg-bg-tertiary rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{key}</p>
                            <p className="text-sm text-white font-mono">{value}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
