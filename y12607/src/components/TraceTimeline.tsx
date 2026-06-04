import { CheckCircle2, AlertTriangle, Clock, FileText, Layers, Target, User } from 'lucide-react';
import type { ProcessNote, ScoreRecord, LayerRecord, HitRecord } from '@/types';
import { cn } from '@/lib/utils';
import { ANOMALY_TYPE_TEXT, STATUS_TEXT } from '@/utils/mockData';

interface TraceEvent {
  id: string;
  time: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  icon: typeof CheckCircle2;
}

interface TraceTimelineProps {
  record: ScoreRecord;
  layers: LayerRecord[];
  hits: HitRecord[];
  notes: ProcessNote[];
}

export function TraceTimeline({ record, layers, hits, notes }: TraceTimelineProps) {
  const events: TraceEvent[] = [];

  events.push({
    id: 'create',
    time: record.fillTime,
    title: '评分表创建',
    description: `${record.fillOperator} 在 ${record.fillUnit || '未指定单位'} 提交评分表，项目：${record.scoreItem}，得分：${record.score}`,
    type: 'info',
    icon: FileText,
  });

  if (record.isOldFormat) {
    events.push({
      id: 'old-format',
      time: record.fillTime,
      title: '旧格式检测',
      description: '检测到该评分表为旧系统迁移数据，图层标记规则与新版不一致',
      type: 'warning',
      icon: AlertTriangle,
    });
  }

  if (!record.fillUnit) {
    events.push({
      id: 'missing-unit',
      time: record.fillTime,
      title: '必填字段缺失',
      description: '填写单位字段未填写，属于数据不完整异常',
      type: 'warning',
      icon: AlertTriangle,
    });
  }

  const missingLayers = layers.filter(l => l.uploadStatus !== 'uploaded');
  if (missingLayers.length > 0) {
    events.push({
      id: 'material-missing',
      time: record.fillTime,
      title: '离线素材缺失检测',
      description: `检测到 ${missingLayers.length} 个图层素材异常：${missingLayers.map(l => `${l.layerName}(${l.uploadStatus === 'missing' ? '未上传' : '已损坏'})`).join('、')}`,
      type: 'error',
      icon: AlertTriangle,
    });
  }

  const occlusionLayers = layers.filter(l => l.hasOcclusion);
  if (occlusionLayers.length > 0) {
    events.push({
      id: 'occlusion',
      time: record.fillTime,
      title: '图层遮挡检测',
      description: `检测到 ${occlusionLayers.length} 个图层存在遮挡：${occlusionLayers.map(l => l.layerName).join('、')}`,
      type: 'warning',
      icon: Layers,
    });
  }

  if (hits.length > 0) {
    events.push({
      id: 'hit-detection',
      time: record.fillTime,
      title: '命中检测完成',
      description: `共检测到 ${hits.length} 个关键点命中，平均置信度 ${(hits.reduce((sum, h) => sum + h.confidence, 0) / hits.length * 100).toFixed(1)}%`,
      type: 'info',
      icon: Target,
    });
  }

  if (record.anomalyType !== 'none') {
    events.push({
      id: 'anomaly-tag',
      time: notes.length > 0 ? notes[notes.length - 1].operateTime : record.fillTime,
      title: '异常标记',
      description: `系统标记为"${ANOMALY_TYPE_TEXT[record.anomalyType]}"，原因：${record.anomalyReason}`,
      type: 'warning',
      icon: AlertTriangle,
    });
  }

  notes.forEach(note => {
    events.push({
      id: note.id,
      time: note.operateTime,
      title: `${note.operator} - ${note.action}`,
      description: note.suggestion,
      type: note.action.includes('通过') || note.action.includes('已处理') ? 'success' : 'info',
      icon: User,
    });
  });

  if (record.status === 'processed') {
    events.push({
      id: 'complete',
      time: notes.length > 0 ? notes[0].operateTime : record.fillTime,
      title: '处理完成',
      description: `评分表已审核通过，状态更新为"${STATUS_TEXT[record.status]}"`,
      type: 'success',
      icon: CheckCircle2,
    });
  }

  const typeStyles = {
    info: 'bg-blue-500 border-blue-500',
    warning: 'bg-amber-500 border-amber-500',
    success: 'bg-green-500 border-green-500',
    error: 'bg-red-500 border-red-500',
  };

  const iconBgStyles = {
    info: 'bg-blue-100 text-blue-600',
    warning: 'bg-amber-100 text-amber-600',
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  };

  return (
    <div className="relative">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        追溯时间线
      </h3>
      <div className="space-y-4 pl-6">
        {events.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={event.id} className="relative">
              {index < events.length - 1 && (
                <div className={cn(
                  'absolute left-[-25px] top-6 w-0.5 h-full',
                  'bg-slate-200'
                )} />
              )}
              <div className={cn(
                'absolute left-[-33px] top-0 w-4 h-4 rounded-full border-2',
                typeStyles[event.type]
              )} />
              <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded', iconBgStyles[event.type])}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium text-sm text-slate-800">{event.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">{event.time}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
