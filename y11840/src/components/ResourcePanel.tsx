import type { AgentResource } from '@/types';
import { BUSY_LEVEL_LABELS } from '@/types';
import { Users, Clock, AlertTriangle, CheckCircle2, XCircle, Minus } from 'lucide-react';

interface ResourcePanelProps {
  resources: AgentResource;
}

const busyLevelConfig = {
  low: {
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    icon: CheckCircle2,
    pulse: false,
  },
  medium: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    icon: Minus,
    pulse: false,
  },
  high: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
    pulse: true,
  },
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    icon: XCircle,
    pulse: true,
  },
};

export function ResourcePanel({ resources }: ResourcePanelProps) {
  const busyRatio = resources.busyAgents / resources.totalAgents;
  const config = busyLevelConfig[resources.busyLevel];
  const StatusIcon = config.icon;

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-400" />
        坐席资源状态
      </h3>

      <div className="space-y-4">
        <div className={`p-4 rounded-xl ${config.bg} ${config.border} border ${config.pulse ? 'animate-pulse' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">繁忙度</span>
            <div className={`flex items-center gap-1.5 ${config.color}`}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{BUSY_LEVEL_LABELS[resources.busyLevel]}</span>
            </div>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                resources.busyLevel === 'low' ? 'bg-green-500' :
                resources.busyLevel === 'medium' ? 'bg-blue-500' :
                resources.busyLevel === 'high' ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${busyRatio * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/30">
            <div className="text-xs text-gray-400 mb-1">可用坐席</div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-white font-mono">
                {resources.totalAgents - resources.busyAgents}
              </span>
              <span className="text-sm text-gray-500 mb-0.5">/ {resources.totalAgents}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/30">
            <div className="text-xs text-gray-400 mb-1">排队人数</div>
            <div className="flex items-end gap-1">
              <span className={`text-2xl font-bold font-mono ${
                resources.queueLength > 5 ? 'text-red-400' :
                resources.queueLength > 2 ? 'text-orange-400' : 'text-green-400'
              }`}>
                {resources.queueLength}
              </span>
              <span className="text-sm text-gray-500 mb-0.5">人</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400">平均等待时间</span>
            </div>
            <span className={`text-lg font-bold font-mono ${
              resources.avgWaitTime > 10 ? 'text-red-400' :
              resources.avgWaitTime > 5 ? 'text-orange-400' : 'text-cyan-400'
            }`}>
              {resources.avgWaitTime} 分钟
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-700/40 border border-slate-600/30">
          <div className="text-xs text-gray-400 mb-2">坐席状态分布</div>
          <div className="flex gap-1">
            {Array.from({ length: resources.totalAgents }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-6 rounded transition-all duration-300 ${
                  i < resources.busyAgents
                    ? 'bg-orange-500/80'
                    : 'bg-green-500/80'
                }`}
                title={i < resources.busyAgents ? '繁忙' : '空闲'}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> 空闲: {resources.totalAgents - resources.busyAgents}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" /> 繁忙: {resources.busyAgents}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
