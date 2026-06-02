import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Music, Activity, BarChart3, AlertTriangle,
  Flag, Edit3, FileText, Clock, ChevronRight,
} from 'lucide-react';
import { usePracticeStore } from '@/store/practiceStore';

interface TimelineEvent {
  type: string;
  label: string;
  time: string;
  icon: typeof Music;
  color: string;
  bgColor: string;
}

export default function PracticeHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPractice, loading, fetchPracticeDetail } = usePracticeStore();

  const loadDetail = useCallback(() => {
    if (id) fetchPracticeDetail(id);
  }, [id, fetchPracticeDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (loading && !currentPractice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPractice) {
    return <div className="text-center py-20 text-text-muted">未找到练习记录</div>;
  }

  const { record, rhythmDetection, speedTier, beatMarkers, conflicts, corrections } = currentPractice;

  const timelineEvents: TimelineEvent[] = [
    ...(rhythmDetection ? [{
      type: 'rhythm',
      label: '节奏检测完成',
      time: rhythmDetection.detectedAt,
      icon: Music,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/15',
    }] : []),
    ...(speedTier ? [{
      type: 'tier',
      label: '速度分层完成',
      time: speedTier.calculatedAt,
      icon: Activity,
      color: 'text-amber-primary',
      bgColor: 'bg-amber-primary/15',
    }] : []),
    ...(beatMarkers ? [{
      type: 'beat',
      label: '节拍标记分析完成',
      time: beatMarkers.analyzedAt,
      icon: BarChart3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/15',
    }] : []),
    ...conflicts.map((c) => ({
      type: 'conflict_found',
      label: `冲突发现: ${c.description.slice(0, 30)}...`,
      time: c.createdAt,
      icon: AlertTriangle,
      color: 'text-conflict-red',
      bgColor: 'bg-conflict-red/15',
    })),
    ...conflicts.filter((c) => c.status === 'flagged' || c.status === 'resolved').map((c) => ({
      type: 'conflict_flagged',
      label: c.status === 'resolved' ? `冲突已解决: ${c.id.slice(0, 8)}` : `冲突留痕: ${c.id.slice(0, 8)}`,
      time: c.resolvedAt || c.createdAt,
      icon: Flag,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/15',
    })),
    ...corrections.map((c) => ({
      type: 'correction',
      label: `数据修正: ${c.field} (${c.operator})`,
      time: c.createdAt,
      icon: Edit3,
      color: 'text-correction-green',
      bgColor: 'bg-correction-green/15',
    })),
  ];

  timelineEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  const chainItems = [
    { label: '结果', active: false },
    { label: '错因提示', active: false },
    { label: '速度分层', active: true },
    { label: '节奏检测', active: false },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button onClick={() => navigate(`/practices/${id}`)} className="hover:text-text-primary transition-colors">
          练习详情
        </button>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary">历史追溯</span>
      </div>

      <h2 className="font-display text-2xl font-bold text-text-primary mb-6">{record.studentName} - 历史追溯</h2>

      <div className="bg-dark-card rounded-xl border border-dark-border p-4 mb-8">
        <h3 className="text-xs text-text-muted mb-3">追溯链路</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {chainItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  item.active
                    ? 'bg-amber-primary text-dark-primary'
                    : 'bg-dark-tertiary text-text-secondary hover:bg-dark-border hover:text-text-primary'
                }`}
              >
                {item.label}
              </button>
              {idx < chainItems.length - 1 && <ChevronRight className="w-3 h-3 text-text-muted" />}
            </div>
          ))}
        </div>
      </div>

      <div className="relative pl-8">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-dark-border" />

        {timelineEvents.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-sm">暂无历史事件</div>
        ) : (
          <div className="space-y-0">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="relative mb-8 last:mb-0">
                <div className={`absolute -left-[21px] top-1 w-5 h-5 rounded-full ${event.bgColor} flex items-center justify-center`}>
                  <event.icon className={`w-3 h-3 ${event.color}`} />
                </div>
                <div className="bg-dark-card rounded-xl border border-dark-border p-4 ml-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${event.color}`}>{event.label}</span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.time).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
