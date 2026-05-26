import { useEffect, useState } from 'react';
import { X, AlertTriangle, Zap, ArrowRight, CheckCircle, XCircle, Target } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import type { SimulationEventType } from '../../engine/types';

const eventConfig: Record<
  SimulationEventType,
  { icon: typeof AlertTriangle; color: string; bgColor: string; borderColor: string }
> = {
  collision: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-500',
  },
  energy_empty: {
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/50',
    borderColor: 'border-amber-500',
  },
  out_of_bounds: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-500',
  },
  pass_complete: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/50',
    borderColor: 'border-emerald-500',
  },
  pass_fail: {
    icon: XCircle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/50',
    borderColor: 'border-orange-500',
  },
  robot_reach_target: {
    icon: Target,
    color: 'text-sky-400',
    bgColor: 'bg-sky-900/50',
    borderColor: 'border-sky-500',
  },
};

export function EventToast() {
  const { activeEvents, removeShowingEvent, showingEvents } = useSimulationStore();
  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newVisible = new Set(visibleEvents);
    for (const event of activeEvents) {
      if (!showingEvents.has(event.id)) {
        newVisible.add(event.id);
        setTimeout(() => {
          setVisibleEvents((prev) => {
            const next = new Set(prev);
            next.delete(event.id);
            return next;
          });
          removeShowingEvent(event.id);
        }, 4000);
      }
    }
    setVisibleEvents(newVisible);
  }, [activeEvents, showingEvents, removeShowingEvent]);

  const displayEvents = activeEvents.filter((e) => visibleEvents.has(e.id));

  if (displayEvents.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {displayEvents.map((event) => {
        const config = eventConfig[event.type];
        const Icon = config.icon;
        return (
          <div
            key={event.id}
            className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.color}`}>
                    [{event.time.toFixed(2)}s]
                  </span>
                  <span className="text-xs text-slate-400 capitalize">{event.type}</span>
                </div>
                <p className="text-sm text-white mt-1">{event.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  位置: ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                </p>
              </div>
              <button
                onClick={() => {
                  setVisibleEvents((prev) => {
                    const next = new Set(prev);
                    next.delete(event.id);
                    return next;
                  });
                  removeShowingEvent(event.id);
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
