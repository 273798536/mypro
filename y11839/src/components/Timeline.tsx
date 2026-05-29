import { useRef, useEffect } from 'react';
import {
  Plus,
  Minus,
  Move,
  GitMerge,
  FlaskConical,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { ActionType } from '@/types';

const ACTION_CONFIG: Record<string, { color: string; bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ADD_NODE: { color: 'text-green-400', bg: 'bg-green-500', Icon: Plus },
  ADD_MEMBER: { color: 'text-green-400', bg: 'bg-green-500', Icon: Plus },
  REMOVE_NODE: { color: 'text-red-400', bg: 'bg-red-500', Icon: Minus },
  REMOVE_MEMBER: { color: 'text-red-400', bg: 'bg-red-500', Icon: Minus },
  MOVE_NODE: { color: 'text-blue-400', bg: 'bg-blue-500', Icon: Move },
  MERGE_RESOLVE: { color: 'text-purple-400', bg: 'bg-purple-500', Icon: GitMerge },
  LOAD_TEST: { color: 'text-orange-400', bg: 'bg-orange-500', Icon: FlaskConical },
  MATERIAL_CHANGE: { color: 'text-blue-400', bg: 'bg-blue-500', Icon: Move },
};

function getActionConfig(type: ActionType) {
  return ACTION_CONFIG[type] ?? { color: 'text-slate-400', bg: 'bg-slate-500', Icon: Plus };
}

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

export default function Timeline() {
  const actionHistory = useGameStore((s) => s.actionHistory);
  const reviewStep = useGameStore((s) => s.reviewStep);
  const setReviewStep = useGameStore((s) => s.setReviewStep);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeDot = el.querySelector(`[data-step="${reviewStep}"]`) as HTMLElement | null;
    if (activeDot) {
      activeDot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [reviewStep]);

  if (actionHistory.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-sm text-slate-500">
        暂无操作记录
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin"
      >
        {actionHistory.map((action, idx) => {
          const config = getActionConfig(action.type);
          const isActive = idx === reviewStep;
          const isPast = idx < reviewStep;

          return (
            <div
              key={idx}
              data-step={idx}
              className="group relative flex shrink-0 cursor-pointer flex-col items-center"
              onClick={() => setReviewStep(idx)}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                  isActive
                    ? `border-white ${config.bg} scale-125 shadow-lg`
                    : isPast
                      ? `border-slate-500 ${config.bg}/60`
                      : 'border-slate-600 bg-slate-800'
                }`}
              >
                <config.Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              </div>

              {idx < actionHistory.length - 1 && (
                <div
                  className={`absolute left-full top-1/2 h-0.5 w-1 -translate-y-1/2 ${
                    isPast ? 'bg-slate-500' : 'bg-slate-700'
                  }`}
                />
              )}

              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                <div className="font-bold">{ACTION_LABEL[action.type] ?? action.type}</div>
                <div className="text-slate-400">{formatTime(action.timestamp)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>步骤 {reviewStep + 1} / {actionHistory.length}</span>
        <span>{ACTION_LABEL[actionHistory[reviewStep]?.type ?? ''] ?? ''}</span>
      </div>
    </div>
  );
}
