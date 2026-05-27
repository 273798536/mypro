import { useState } from 'react';
import type { ErrorRecord, CorrectionStatus } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, CheckCircle, Clock, Edit3, History } from 'lucide-react';

interface ErrorListProps {
  errors: ErrorRecord[];
  onUpdateStatus?: (errorId: string, status: CorrectionStatus, note?: string) => void;
}

export function ErrorList({ errors, onUpdateStatus }: ErrorListProps) {
  const [activeTab, setActiveTab] = useState<CorrectionStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredErrors = activeTab === 'all'
    ? errors
    : errors.filter(e => e.correctionStatus === activeTab);

  const statusConfig: Record<CorrectionStatus, { label: string; color: string; icon: typeof AlertTriangle }> = {
    unprocessed: { label: '未处理', color: 'text-red-400 bg-red-500/10 border-red-500/30', icon: Clock },
    corrected: { label: '已修正', color: 'text-green-400 bg-green-500/10 border-green-500/30', icon: CheckCircle },
    needs_manual_review: { label: '需人工确认', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', icon: AlertTriangle }
  };

  const tabs = [
    { key: 'all' as const, label: '全部', count: errors.length },
    { key: 'unprocessed' as const, ...statusConfig.unprocessed, count: errors.filter(e => e.correctionStatus === 'unprocessed').length },
    { key: 'needs_manual_review' as const, ...statusConfig.needs_manual_review, count: errors.filter(e => e.correctionStatus === 'needs_manual_review').length },
    { key: 'corrected' as const, ...statusConfig.corrected, count: errors.filter(e => e.correctionStatus === 'corrected').length }
  ];

  if (errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>错误记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p>太棒了！没有错误记录</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>错误记录</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredErrors.map(error => {
            const config = statusConfig[error.correctionStatus];
            const isExpanded = expandedId === error.id;

            return (
              <div
                key={error.id}
                className={`border rounded-lg overflow-hidden ${config.color}`}
              >
                <div
                  className="p-3 cursor-pointer hover:bg-white/5"
                  onClick={() => setExpandedId(isExpanded ? null : error.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <config.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium text-white truncate">
                          {error.source}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {error.reason}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                        {config.label}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(error.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-700/50">
                    <div className="pt-3 space-y-2 text-sm">
                      <div className="flex gap-4">
                        <span className="text-slate-500">坐标:</span>
                        <span className="text-white font-mono">
                          ({error.point.x.toFixed(2)}, {error.point.y.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-slate-500">类型:</span>
                        <span className="text-white">{error.judgementType === 'slope' ? '斜率判断' : '极值判断'}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-slate-500">你的答案:</span>
                        <span className="text-red-400">{error.playerAnswer}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-slate-500">正确答案:</span>
                        <span className="text-green-400">{error.correctAnswer}</span>
                      </div>

                      {error.revisionHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center gap-2 mb-2">
                            <History className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-xs">修正历史</span>
                          </div>
                          <div className="space-y-1 pl-6">
                            {error.revisionHistory.map((rev, idx) => (
                              <div key={idx} className="text-xs text-slate-500">
                                <span>{new Date(rev.timestamp).toLocaleString()}: </span>
                                <span>{statusConfig[rev.oldStatus].label} → {statusConfig[rev.newStatus].label}</span>
                                {rev.note && <span className="block text-slate-400">备注: {rev.note}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {onUpdateStatus && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(error.id, 'corrected');
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            标记已修正
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(error.id, 'needs_manual_review');
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            需人工确认
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
