import { useMemo } from 'react';
import { MessageSquare, Image, User } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { formatRelativeTime } from '@/utils/date';

interface HistoryTimelineProps {
  pointId: string;
}

export default function HistoryTimeline({ pointId }: HistoryTimelineProps) {
  const { remarkHistory, screenshotHistory } = useDataStore();

  const historyItems = useMemo(() => {
    const remarks = remarkHistory
      .filter(r => r.pointId === pointId)
      .map(r => ({
        id: r.id,
        type: 'remark' as const,
        timestamp: r.timestamp,
        content: r.remark,
        operator: r.operator,
      }));

    const screenshots = screenshotHistory
      .filter(s => s.pointId === pointId)
      .map(s => ({
        id: s.id,
        type: 'screenshot' as const,
        timestamp: s.timestamp,
        content: s.description,
        dataUrl: s.dataUrl,
      }));

    return [...remarks, ...screenshots].sort((a, b) => b.timestamp - a.timestamp);
  }, [remarkHistory, screenshotHistory, pointId]);

  if (historyItems.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>暂无历史记录</p>
        <p className="text-xs mt-1">保存备注后将显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        历史版本 ({historyItems.length})
      </h3>

      <div className="relative timeline-line pl-6 space-y-4">
        {historyItems.map((item, idx) => (
          <div key={item.id} className="relative">
            <div
              className={`absolute -left-6 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                item.type === 'remark'
                  ? 'bg-tech-blue/20 text-tech-blue'
                  : 'bg-info-purple/20 text-info-purple'
              }`}
            >
              {item.type === 'remark' ? (
                <MessageSquare className="w-3 h-3" />
              ) : (
                <Image className="w-3 h-3" />
              )}
            </div>

            <div className="glass-card p-3 hover:border-tech-blue/30 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="w-3 h-3 text-text-muted" />
                  <span className="text-text-secondary">
                    {'operator' in item ? item.operator : '系统'}
                  </span>
                </div>
                <span className="text-xs text-text-muted">
                  {formatRelativeTime(item.timestamp)}
                </span>
              </div>

              {item.type === 'remark' ? (
                <p className="text-sm text-text-primary leading-relaxed">{item.content}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-text-secondary">{item.content}</p>
                  {item.dataUrl ? (
                    <img
                      src={item.dataUrl}
                      alt="历史截图"
                      className="w-full rounded border border-border-glow/30"
                    />
                  ) : (
                    <div className="w-full h-24 bg-bg-card rounded border border-dashed border-border-glow/30 flex items-center justify-center text-text-muted text-xs">
                      <Image className="w-4 h-4 mr-1" />
                      暂无截图
                    </div>
                  )}
                </div>
              )}
            </div>

            {idx < historyItems.length - 1 && (
              <div className="absolute -left-[11px] top-6 bottom-0 w-px bg-gradient-to-b from-tech-blue/30 to-transparent" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
