import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Plus, 
  Edit3, 
  FileText, 
  Clock, 
  Tag,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import type { HistoryVersion } from '@/types';
import { CHANGE_TYPE_LABELS } from '@/types';

interface HistoryTimelineProps {
  versions: HistoryVersion[];
}

const iconMap: Record<string, typeof Plus> = {
  create: Plus,
  update: Edit3,
  status_change: Tag,
  note_change: MessageSquare,
  scan_add: FileText,
  timecode_toggle: Clock,
};

export function HistoryTimeline({ versions }: HistoryTimelineProps) {
  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-1">
      {sortedVersions.map((version, index) => {
        const Icon = iconMap[version.changeType] || Edit3;
        const isLast = index === sortedVersions.length - 1;
        
        return (
          <div key={version.id} className="relative flex gap-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex flex-col items-center">
              <div className="timeline-node flex items-center justify-center">
                <Icon className="w-3 h-3 text-white" />
              </div>
              {!isLast && <div className="timeline-line flex-1 min-h-[40px]" />}
            </div>
            
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-display font-semibold text-primary-900">
                  v{version.version}
                </span>
                <span className="badge bg-primary-100 text-primary-700 border-primary-200 text-xs">
                  {CHANGE_TYPE_LABELS[version.changeType]}
                </span>
                <span className="text-xs text-primary-500 ml-auto">
                  {format(new Date(version.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
              
              <p className="text-sm text-primary-700 mb-1">
                {version.changeDescription}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-primary-500">
                <span>操作人：{version.operator}</span>
                {version.snapshot && Object.keys(version.snapshot).length > 0 && (
                  <>
                    <ArrowRight className="w-3 h-3" />
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(version.snapshot).map(([key, value]) => {
                        if (key === 'contractScans' && Array.isArray(value)) {
                          return (
                            <span key={key} className="bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded">
                              {key}: {value.length}份
                            </span>
                          );
                        }
                        if (typeof value === 'boolean') {
                          return (
                            <span key={key} className={`px-1.5 py-0.5 rounded ${value ? 'bg-accent-100 text-accent-700' : 'bg-gray-100 text-gray-600'}`}>
                              {key === 'isTimecodeOffset' ? '时码偏半拍' : `${key}: ${value}`}
                            </span>
                          );
                        }
                        if (typeof value === 'string' && value.length > 20) {
                          return (
                            <span key={key} className="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded max-w-[200px] truncate">
                              {key}: {value.substring(0, 20)}...
                            </span>
                          );
                        }
                        return (
                          <span key={key} className="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                            {key}: {String(value)}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {sortedVersions.length === 0 && (
        <div className="text-center py-8 text-primary-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无历史记录</p>
        </div>
      )}
    </div>
  );
}
