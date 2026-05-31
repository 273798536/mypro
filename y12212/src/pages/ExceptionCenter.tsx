import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, User, CheckCircle } from 'lucide-react';
import type { ExceptionType } from '../../shared/types';
import { EXCEPTION_TYPE_LABELS } from '../../shared/types';
import { cn } from '@/lib/utils';
import { useExceptionStore } from '@/stores/exceptionStore';
import ExceptionBadge from '@/components/ExceptionBadge';

const tabs: { key: ExceptionType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'reading_gap', label: EXCEPTION_TYPE_LABELS.reading_gap },
  { key: 'discount_expired', label: EXCEPTION_TYPE_LABELS.discount_expired },
  { key: 'allocation_error', label: EXCEPTION_TYPE_LABELS.allocation_error },
];

const severityDot: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-orange-500',
  high: 'bg-red-500',
};

export default function ExceptionCenter() {
  const { exceptions, loading, fetchExceptions, resolveException } = useExceptionStore();
  const [activeTab, setActiveTab] = useState<ExceptionType | 'all'>('all');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    const filters = activeTab === 'all' ? {} : { type: activeTab };
    fetchExceptions(filters);
  }, [activeTab, fetchExceptions]);

  const filtered = activeTab === 'all'
    ? exceptions
    : exceptions.filter((e) => e.type === activeTab);

  const countByType = (type: ExceptionType | 'all') => {
    if (type === 'all') return exceptions.length;
    return exceptions.filter((e) => e.type === type).length;
  };

  const handleResolve = async () => {
    if (!resolvingId || !resolutionText.trim()) return;
    await resolveException(resolvingId, resolutionText.trim());
    setResolvingId(null);
    setResolutionText('');
  };

  const handleCancel = () => {
    setResolvingId(null);
    setResolutionText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-[#ef4444]" />
        <h2 className="text-xl font-bold text-[#1e3a5f]">异常处理中心</h2>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.label}
            <span
              className={cn(
                'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold',
                activeTab === tab.key
                  ? 'bg-white text-[#1e3a5f]'
                  : 'bg-[#3b82f6] text-white'
              )}
            >
              {countByType(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <span className="animate-pulse text-sm">加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <CheckCircle className="mb-2 h-10 w-10 text-[#10b981]" />
          <p className="text-sm">暂无异常记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', severityDot[ex.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ExceptionBadge type={ex.type} />
                    <span className="text-sm text-gray-500">
                      户号: {ex.bill_id}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-700">{ex.description}</p>

                  <div className="mt-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2">
                    <p className="text-sm text-yellow-800">{ex.human_readable}</p>
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{ex.created_at}</span>
                  </div>

                  {ex.resolved ? (
                    <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2">
                      <div className="flex items-center gap-1 text-sm font-medium text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        已处理
                      </div>
                      <p className="mt-1 text-sm text-green-600">{ex.resolution}</p>
                    </div>
                  ) : resolvingId === ex.id ? (
                    <div className="mt-3 space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                      <textarea
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                        placeholder="请输入处理说明..."
                        rows={3}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleResolve}
                          disabled={!resolutionText.trim()}
                          className={cn(
                            'rounded-md px-4 py-1.5 text-sm font-medium text-white transition-colors',
                            resolutionText.trim()
                              ? 'bg-[#3b82f6] hover:bg-[#2563eb]'
                              : 'cursor-not-allowed bg-gray-300'
                          )}
                        >
                          提交
                        </button>
                        <button
                          onClick={handleCancel}
                          className="rounded-md bg-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-300"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResolvingId(ex.id)}
                      className="mt-3 rounded-md bg-[#ef4444] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#dc2626] transition-colors"
                    >
                      处理
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
