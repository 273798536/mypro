import { AlertTriangle, Zap, XCircle, CheckCircle, Target } from 'lucide-react';
import type { SimulationEvent, SimulationEventType } from '../../engine/types';

interface EventTimelineProps {
  events: SimulationEvent[];
}

const eventIcon: Record<SimulationEventType, typeof AlertTriangle> = {
  collision: AlertTriangle,
  energy_empty: Zap,
  out_of_bounds: XCircle,
  pass_complete: CheckCircle,
  pass_fail: XCircle,
  robot_reach_target: Target,
};

const eventColor: Record<SimulationEventType, string> = {
  collision: 'bg-red-500',
  energy_empty: 'bg-amber-500',
  out_of_bounds: 'bg-red-500',
  pass_complete: 'bg-emerald-500',
  pass_fail: 'bg-orange-500',
  robot_reach_target: 'bg-sky-500',
};

const eventTextColor: Record<SimulationEventType, string> = {
  collision: 'text-red-400',
  energy_empty: 'text-amber-400',
  out_of_bounds: 'text-red-400',
  pass_complete: 'text-emerald-400',
  pass_fail: 'text-orange-400',
  robot_reach_target: 'text-sky-400',
};

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-300 mb-4">事件时间线</h3>
        <p className="text-slate-500 text-center py-8">无事件记录</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort((a, b) => a.time - b.time);

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-300 mb-4">事件时间线</h3>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-700" />
        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const Icon = eventIcon[event.type];
            return (
              <div key={event.id} className="relative pl-10">
                <div
                  className={`absolute left-0 w-6 h-6 rounded-full ${eventColor[event.type]} flex items-center justify-center`}
                >
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">
                      [{event.time.toFixed(2)}s]
                    </span>
                    <span className={`text-xs font-medium ${eventTextColor[event.type]} capitalize`}>
                      {event.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{event.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    位置: ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
