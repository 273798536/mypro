import {
  AlertTriangle,
  GitMerge,
  FlaskConical,
  Plus,
  Minus,
  Move,
  Wrench,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { ActionType, OverloadEvent } from '@/types';

interface SummaryEvent {
  stepIndex: number;
  timestamp: number;
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
}

const SEVERITY_STYLE: Record<string, { border: string; bg: string; icon: string }> = {
  info: { border: 'border-blue-700', bg: 'bg-blue-900/30', icon: 'text-blue-400' },
  warning: { border: 'border-yellow-700', bg: 'bg-yellow-900/30', icon: 'text-yellow-400' },
  critical: { border: 'border-red-700', bg: 'bg-red-900/30', icon: 'text-red-400' },
};

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  ADD_NODE: Plus,
  ADD_MEMBER: Plus,
  REMOVE_NODE: Minus,
  REMOVE_MEMBER: Minus,
  MOVE_NODE: Move,
  MERGE_RESOLVE: GitMerge,
  LOAD_TEST: FlaskConical,
  MATERIAL_CHANGE: Wrench,
};

const ACTION_LABEL: Record<string, string> = {
  ADD_NODE: '添加节点',
  ADD_MEMBER: '添加杆件',
  REMOVE_NODE: '删除节点',
  REMOVE_MEMBER: '删除杆件',
  MOVE_NODE: '移动节点',
  MERGE_RESOLVE: '合并解决',
  LOAD_TEST: '载荷测试',
  MATERIAL_CHANGE: '更换材料',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function impactToSeverity(impact: string): 'info' | 'warning' | 'critical' {
  if (impact.includes('断裂') || impact.includes('破坏')) return 'critical';
  if (impact.includes('过载') || impact.includes('危险')) return 'warning';
  return 'info';
}

export default function EventSummary() {
  const actionHistory = useGameStore((s) => s.actionHistory);
  const mergeSnapshots = useGameStore((s) => s.mergeSnapshots);
  const testResult = useGameStore((s) => s.testResult);
  const setReviewStep = useGameStore((s) => s.setReviewStep);

  const events: SummaryEvent[] = [];

  actionHistory.forEach((action, idx) => {
    if (action.structuralImpact && action.structuralImpact !== '无影响') {
      const label = ACTION_LABEL[action.type] ?? action.type;
      events.push({
        stepIndex: idx,
        timestamp: action.timestamp,
        type: action.type,
        description: `${label} → ${action.structuralImpact}`,
        severity: impactToSeverity(action.structuralImpact),
      });
    }
  });

  mergeSnapshots.forEach((snapshot) => {
    const idx = actionHistory.findIndex((a) => a.type === 'MERGE_RESOLVE' && a.timestamp === snapshot.timestamp);
    events.push({
      stepIndex: idx >= 0 ? idx : 0,
      timestamp: snapshot.timestamp,
      type: 'MERGE_RESOLVE',
      description: `合并解决（${snapshot.diffs.length} 项差异）`,
      severity: 'info',
    });
  });

  if (testResult?.overloadEvents) {
    testResult.overloadEvents.forEach((evt: OverloadEvent, i: number) => {
      events.push({
        stepIndex: actionHistory.length - 1,
        timestamp: Date.now() - (testResult.overloadEvents.length - i) * 1000,
        type: 'LOAD_TEST',
        description: `过载事件：杆件 ${evt.memberIds.join(', ')} 在位置 ${evt.vehiclePosition.toFixed(1)}m`,
        severity: evt.memberIds.some((id) => testResult.failedMemberIds.includes(id)) ? 'critical' : 'warning',
      });
    });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        无关键事件
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">关键事件</h4>
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {events.map((event, idx) => {
          const style = SEVERITY_STYLE[event.severity];
          const Icon = ACTION_ICON[event.type] ?? AlertTriangle;
          return (
            <div
              key={idx}
              className={`cursor-pointer rounded border-l-4 ${style.border} ${style.bg} p-2.5 transition-colors hover:brightness-125`}
              onClick={() => setReviewStep(event.stepIndex)}
            >
              <div className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.icon}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${style.icon}`}>
                      {ACTION_LABEL[event.type] ?? event.type}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-slate-300">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
