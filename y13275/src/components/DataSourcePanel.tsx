import { FileText, Paperclip, MessageSquare, Check, X, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirePointStore } from '@/store/useFirePointStore';
import type { DataSourceType } from '@/types';
import { getDataSourceTypeText, formatDateTime } from '@/utils/format';

export default function DataSourcePanel() {
  const {
    selectedPointId,
    activeDataSourceTab,
    setActiveDataSourceTab,
    getPointDataSources,
    toggleAffectsConclusion,
  } = useFirePointStore();

  const dataSources = selectedPointId ? getPointDataSources(selectedPointId) : [];
  const normalSources = dataSources.filter((s) => !s.isAbnormal);
  const filteredSources = normalSources.filter((s) => s.type === activeDataSourceTab);

  const tabs: { type: DataSourceType; icon: any; label: string }[] = [
    { type: 'meeting_minutes', icon: FileText, label: '会议纪要' },
    { type: 'attachment', icon: Paperclip, label: '附件材料' },
    { type: 'verbal_note', icon: MessageSquare, label: '口头备注' },
  ];

  if (!selectedPointId) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm bg-surface-secondary rounded-lg">
        请选择一个点位查看数据来源
      </div>
    );
  }

  const normalCount = normalSources.length;
  const abnormalCount = dataSources.filter((s) => s.isAbnormal).length;

  return (
    <div className="flex flex-col h-full bg-surface rounded-lg border border-primary-100">
      <div className="p-4 border-b border-primary-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-text-primary">
            数据来源
          </h3>
          <div className="flex gap-2 text-xs">
            <span className="text-text-muted">
              正常 <span className="font-mono font-semibold text-primary-700">{normalCount}</span>
            </span>
            {abnormalCount > 0 && (
              <span className="text-accent-600">
                异常 <span className="font-mono font-semibold">{abnormalCount}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex bg-surface-secondary rounded-lg p-1">
          {tabs.map(({ type, icon: Icon, label }) => {
            const count = normalSources.filter((s) => s.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setActiveDataSourceTab(type)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
                  activeDataSourceTab === type
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-primary-100 text-primary-700 rounded-full text-[10px] font-bold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredSources.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            暂无{getDataSourceTypeText(activeDataSourceTab)}
          </div>
        ) : (
          filteredSources.map((source, index) => (
            <div
              key={source.id}
              className="p-3 bg-surface-secondary rounded-lg border border-primary-100 opacity-0 animate-fade-in-stagger"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-text-primary text-sm leading-snug">
                  {source.title}
                </h4>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {source.content}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-primary-100">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {source.uploadedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(source.uploadedAt)}
                  </span>
                </div>

                <button
                  onClick={() => toggleAffectsConclusion(source.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                    source.affectsConclusion
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-surface text-text-muted border border-primary-200 hover:bg-surface-secondary'
                  )}
                >
                  {source.affectsConclusion ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      影响结论
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      不影响
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
