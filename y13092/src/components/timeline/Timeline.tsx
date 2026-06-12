import { useAppStore } from '@/store/useAppStore';
import { Clock, AlertTriangle, Pause, CheckCircle, Loader, XCircle } from 'lucide-react';

const statusConfig = {
  completed: {
    label: '已完成',
    color: 'bg-green-500',
    textColor: 'text-green-400',
    Icon: CheckCircle,
  },
  in_progress: {
    label: '进行中',
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    Icon: Loader,
  },
  suspended: {
    label: '已挂起',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    Icon: Pause,
  },
  missing: {
    label: '数据缺失',
    color: 'bg-red-500',
    textColor: 'text-red-400',
    Icon: XCircle,
  },
};

export default function Timeline() {
  const { timeSegments } = useAppStore();

  const hasMissing = timeSegments.some((s) => s.status === 'missing');
  const hasSuspended = timeSegments.some((s) => s.status === 'suspended');

  const totalWidth = timeSegments.length * 180;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-200">检测时段</span>
          <span className="text-xs text-slate-500">
            {timeSegments.length} 个时段
          </span>
        </div>

        {(hasMissing || hasSuspended) && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 animate-pulse">
            <AlertTriangle size={14} />
            <span>存在挂起项，结论不完整</span>
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto pb-2">
        <div style={{ width: totalWidth, minWidth: '100%' }}>
          <div className="flex items-end h-16">
            {timeSegments.map((segment, index) => {
              const config = statusConfig[segment.status];
              const isMissing = segment.status === 'missing';
              const isSuspended = segment.status === 'suspended';

              return (
                <div
                  key={segment.id}
                  className="relative flex-1 px-1"
                  style={{ minWidth: 160 }}
                >
                  <div
                    className={`relative h-8 rounded flex items-center justify-center transition-all ${
                      isMissing
                        ? 'bg-slate-700/30 border-2 border-dashed border-slate-600'
                        : config.color + '/20 border border-' + config.color.replace('bg-', '') + '/30'
                    } ${isSuspended ? 'animate-pulse' : ''}`}
                  >
                    {isMissing ? (
                      <div className="flex items-center gap-1 text-slate-500">
                        <XCircle size={12} />
                        <span className="text-xs">数据缺失</span>
                      </div>
                    ) : (
                      <span className={`text-xs font-medium ${config.textColor}`}>
                        {segment.description}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-center">
                    <p className="text-xs text-slate-400 font-mono">
                      {segment.startTime}
                    </p>
                    <p className="text-xs text-slate-600 font-mono">
                      ↓
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {segment.endTime}
                    </p>
                  </div>

                  <div className="mt-1 text-center">
                    <p className="text-xs text-slate-500">
                      负责: {segment.responsible}
                    </p>
                  </div>

                  {index < timeSegments.length - 1 && (
                    <div
                      className={`absolute top-4 -right-0.5 w-full h-0.5 ${
                        timeSegments[index + 1].status === 'missing' ||
                        segment.status === 'missing'
                          ? 'bg-slate-700 border-t-2 border-dashed'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: 'calc(100% - 4px)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hasMissing && (
        <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
          <p className="font-medium flex items-center gap-1">
            <AlertTriangle size={12} />
            缺段提示
          </p>
          <p className="mt-1 text-yellow-400/70">
            部分时段数据缺失，系统已自动挂起，请勿基于不完整数据下结论。
            请负责人确认补充数据后再继续。
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs">
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className="text-slate-400">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
