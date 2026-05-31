import { Cpu, AlertTriangle } from 'lucide-react';
import type { DeviceStatus } from '../types';
import { StatusBadge } from './StatusBadge';

interface DeviceStatusPanelProps {
  data: DeviceStatus[];
}

export function DeviceStatusPanel({ data }: DeviceStatusPanelProps) {
  const statusCounts = {
    running: data.filter(d => d.status === 'running').length,
    stopped: data.filter(d => d.status === 'stopped').length,
    maintenance: data.filter(d => d.status === 'maintenance').length,
  };

  const totalPower = data.reduce((sum, d) => sum + d.power, 0);

  const getStatusColor = (status: DeviceStatus['status']) => {
    switch (status) {
      case 'running': return 'bg-emerald-500';
      case 'stopped': return 'bg-red-500';
      case 'maintenance': return 'bg-amber-500';
    }
  };

  const hasOutage = statusCounts.stopped > 0 || statusCounts.maintenance > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-slate-600" />
          设备状态
        </h3>
        {hasOutage && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded text-amber-700 text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            存在异常时段
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-emerald-50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600">{statusCounts.running}</div>
          <div className="text-xs text-emerald-700">运行小时</div>
        </div>
        <div className={`text-center p-2 rounded-lg ${statusCounts.stopped > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`text-2xl font-bold ${statusCounts.stopped > 0 ? 'text-red-600' : 'text-gray-400'}`}>{statusCounts.stopped}</div>
          <div className={`text-xs ${statusCounts.stopped > 0 ? 'text-red-700' : 'text-gray-500'}`}>停机小时</div>
        </div>
        <div className={`text-center p-2 rounded-lg ${statusCounts.maintenance > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
          <div className={`text-2xl font-bold ${statusCounts.maintenance > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{statusCounts.maintenance}</div>
          <div className={`text-xs ${statusCounts.maintenance > 0 ? 'text-amber-700' : 'text-gray-500'}`}>检修小时</div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-2">24小时状态时间轴</p>
        <div className="flex h-8 rounded-lg overflow-hidden border border-gray-200">
          {data.map((d, idx) => (
            <div
              key={idx}
              className="flex-1 relative group"
              title={`${d.time}: ${d.status}`}
            >
              <div className={`w-full h-full ${getStatusColor(d.status)}`}></div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {d.time} - {d.status === 'running' ? '运行' : d.status === 'stopped' ? '停机' : '检修'}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
            <span>运行</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            <span>停机</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
            <span>检修</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-3">异常时段详情</p>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {data.filter(d => d.status !== 'running').length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              ✓ 全天正常运行
            </p>
          ) : (
              data
                .filter(d => d.status !== 'running')
                .map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700 font-medium">{d.time}</span>
                    <StatusBadge status={d.status} size="sm" />
                  </div>
                ))
            )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">当日总发电量</span>
          <span className="text-lg font-bold text-slate-700">
            {totalPower.toFixed(1)} <span className="text-sm font-normal text-gray-500">MWh</span>
          </span>
        </div>
      </div>
    </div>
  );
}
