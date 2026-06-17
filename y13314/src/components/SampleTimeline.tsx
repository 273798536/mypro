import { useAppStore } from '@/store/useAppStore';
import type { TimelineEvent } from '@/types';
import { 
  Clock, FileText, BarChart3, Settings, 
  AlertTriangle, CheckCircle, Paperclip, 
  ArrowRight, ThumbsUp, ThumbsDown 
} from 'lucide-react';

const getEventIcon = (type: TimelineEvent['type']) => {
  const icons = {
    score: BarChart3,
    attachment: Paperclip,
    conclusion: FileText,
    threshold_change: Settings,
    suspend: AlertTriangle,
    confirm: CheckCircle,
  };
  return icons[type] || Clock;
};

const getEventColor = (type: TimelineEvent['type'], status?: string) => {
  if (status === 'pass' || status === 'approved') return 'text-moss-500 bg-moss-50 border-moss-200';
  if (status === 'fail' || status === 'rejected') return 'text-rust-500 bg-rust-50 border-rust-200';
  if (status === 'suspended') return 'text-sky-500 bg-sky-50 border-sky-200';
  
  const colors = {
    score: 'text-navy-500 bg-navy-50 border-navy-200',
    attachment: 'text-amber-500 bg-amber-50 border-amber-200',
    conclusion: 'text-navy-700 bg-navy-50 border-navy-300',
    threshold_change: 'text-sky-500 bg-sky-50 border-sky-200',
    suspend: 'text-sky-500 bg-sky-50 border-sky-200',
    confirm: 'text-moss-500 bg-moss-50 border-moss-200',
  };
  return colors[type] || 'text-navy-500 bg-navy-50 border-navy-200';
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

interface SampleTimelineProps {
  sampleId: string;
}

export const SampleTimeline = ({ sampleId }: SampleTimelineProps) => {
  const getSampleTimeline = useAppStore(state => state.getSampleTimeline);
  const timeline = getSampleTimeline(sampleId);

  if (timeline.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Clock className="w-8 h-8 text-navy-300 mx-auto mb-2" />
        <p className="text-navy-500 text-sm">暂无时间线记录</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-serif text-lg font-semibold text-navy-800 mb-6">
        评分时间线
      </h3>
      
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-navy-200" />
        
        <div className="space-y-6">
          {timeline.map((event, index) => {
            const Icon = getEventIcon(event.type);
            const colorConfig = getEventColor(event.type, event.status);
            const isScoreChange = event.type === 'score';
            const isConclusion = event.type === 'conclusion';
            const isLateAttachment = event.type === 'attachment' && event.description.includes('晚到附件');
            
            return (
              <div 
                key={event.id} 
                className="relative pl-12 animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className={`absolute left-2 w-7 h-7 rounded-full border-2 ${colorConfig} flex items-center justify-center`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                
                <div className="bg-white border border-navy-100 p-4 relative">
                  {isLateAttachment && (
                    <span className="absolute top-2 right-2 tag tag-amber">
                      晚到附件
                    </span>
                  )}
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-navy-400">
                        {formatDate(event.date)}
                      </span>
                      {isScoreChange && event.status && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          event.status === 'pass' ? 'text-moss-600' : 'text-rust-600'
                        }`}>
                          {event.status === 'pass' ? (
                            <><ThumbsUp className="w-3 h-3" /> 通过</>
                          ) : (
                            <><ThumbsDown className="w-3 h-3" /> 未通过</>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-navy-500">
                      {event.operator}
                    </span>
                  </div>
                  
                  <div className="font-medium text-navy-800 mb-1">
                    {event.description}
                  </div>
                  
                  {event.detail && (
                    <div className="text-sm text-navy-600 bg-navy-50 p-3 mt-2 border-l-2 border-amber-400">
                      {event.detail}
                    </div>
                  )}
                  
                  {isConclusion && event.status && (
                    <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${
                      event.status === 'approved' ? 'bg-moss-50 text-moss-700 border border-moss-200' :
                      event.status === 'rejected' ? 'bg-rust-50 text-rust-700 border border-rust-200' :
                      'bg-sky-50 text-sky-700 border border-sky-200'
                    }`}>
                      <ArrowRight className="w-4 h-4" />
                      最终结论：{event.status === 'approved' ? '批准' : event.status === 'rejected' ? '拒绝' : '挂起'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
