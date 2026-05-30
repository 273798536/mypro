import { useState } from 'react';
import {
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  ArrowRight,
  History,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatTime, formatDuration } from '@/utils/reportGenerator';
import { cn } from '@/lib/utils';

const portStatusLabels: Record<string, string> = {
  active: '运行中',
  blocked: '堵塞',
  maintenance: '维护中',
};

const portStatusColors: Record<string, string> = {
  active: '#00B42A',
  blocked: '#F53F3F',
  maintenance: '#FF7D00',
};

export default function SortingPorts() {
  const { sortingPorts, anomalies, luggageData } = useAppStore();
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);

  const selectedPort = sortingPorts.find((p) => p.id === selectedPortId);

  const getPortLuggageCount = (portId: string) => {
    return luggageData.filter((l) => l.sortingPortId === portId).length;
  };

  const getPortAnomalies = (portId: string) => {
    return anomalies.filter((a) => {
      const port = sortingPorts.find((p) => p.id === portId);
      if (!port) return false;
      return Math.abs(a.position - port.position) < 1.5;
    });
  };

  const getPortHeightMismatches = (portId: string) => {
    return getPortAnomalies(portId).filter((a) => a.type === 'height_mismatch').length;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">分拣口监控</h1>
          <p className="text-gray-400 mt-1">实时监控各分拣口状态和堵包记录</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
            <GitBranch size={18} className="text-blue-400" />
            <span className="text-white font-medium">{sortingPorts.length} 个分拣口</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg">
            <AlertTriangle size={18} className="text-red-400" />
            <span className="text-red-400 font-medium">
              {sortingPorts.filter((p) => p.status === 'blocked').length} 个堵塞
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sortingPorts.map((port) => {
          const luggageCount = getPortLuggageCount(port.id);
          const anomalies = getPortAnomalies(port.id);
          const heightMismatches = getPortHeightMismatches(port.id);
          const isSelected = selectedPortId === port.id;

          return (
            <div
              key={port.id}
              className={cn(
                'bg-gray-900/60 border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:bg-gray-900',
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/30'
                  : 'border-gray-800 hover:border-gray-700',
                port.status === 'blocked' && 'border-l-4'
              )}
              style={port.status === 'blocked' ? { borderLeftColor: '#F53F3F' } : {}}
              onClick={() => setSelectedPortId(isSelected ? null : port.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: `${portStatusColors[port.status]}20`,
                      color: portStatusColors[port.status],
                    }}
                  >
                    <GitBranch size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{port.name}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      位置: {port.position.toFixed(1)}m
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                  style={{
                    backgroundColor: `${portStatusColors[port.status]}20`,
                    color: portStatusColors[port.status],
                  }}
                >
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      port.status === 'active' && 'animate-pulse'
                    )}
                    style={{ backgroundColor: portStatusColors[port.status] }}
                  />
                  {portStatusLabels[port.status]}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-xs">行李数</p>
                  <p className="text-white font-bold text-lg">{luggageCount}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-xs">异常数</p>
                  <p
                    className={cn(
                      'font-bold text-lg',
                      anomalies.length > 0 ? 'text-red-400' : 'text-green-400'
                    )}
                  >
                    {anomalies.length}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-gray-500 text-xs">高度错配</p>
                  <p
                    className={cn(
                      'font-bold text-lg',
                      heightMismatches > 0 ? 'text-red-400' : 'text-white'
                    )}
                  >
                    {heightMismatches}
                  </p>
                </div>
              </div>

              {port.blockRecords.length > 0 && (
                <div className="pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
                    <History size={14} />
                    <span>堵包记录</span>
                  </div>
                  <div className="space-y-2">
                    {port.blockRecords.slice(0, 2).map((record) => (
                      <div
                        key={record.id}
                        className="bg-gray-800/50 rounded-lg p-2 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">
                            {formatTime(record.startTime)}
                          </span>
                          <span className="text-orange-400 font-medium">
                            {record.luggageCount}件
                          </span>
                        </div>
                        {record.reason && (
                          <p className="text-gray-500 line-clamp-1">{record.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-end">
                <ArrowRight
                  size={16}
                  className={cn(
                    'transition-transform',
                    isSelected && 'rotate-90'
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      {selectedPort && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {selectedPort.name} - 详细信息
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                位置 {selectedPort.position.toFixed(1)}m | 所属滑槽 {selectedPort.chuteId}
              </p>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: `${portStatusColors[selectedPort.status]}20`,
                color: portStatusColors[selectedPort.status],
              }}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  selectedPort.status === 'active' && 'animate-pulse'
                )}
                style={{ backgroundColor: portStatusColors[selectedPort.status] }}
              />
              {portStatusLabels[selectedPort.status]}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-0">
            <div className="p-5 border-r border-gray-800">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-400" />
                堵包记录时间线
              </h3>
              <div className="space-y-4">
                {selectedPort.blockRecords.length > 0 ? (
                  selectedPort.blockRecords.map((record, index) => (
                    <div key={record.id} className="relative pl-6">
                      {index < selectedPort.blockRecords.length - 1 && (
                        <div className="absolute left-[7px] top-6 w-0.5 h-full bg-gray-700" />
                      )}
                      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-gray-900" />
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs">
                            {formatTime(record.startTime)}
                          </span>
                          <span className="text-orange-400 text-sm font-medium">
                            {record.luggageCount} 件行李
                          </span>
                        </div>
                        {record.reason && (
                          <p className="text-gray-300 text-sm">{record.reason}</p>
                        )}
                        {record.endTime && (
                          <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={12} />
                            持续时间: {formatDuration(record.endTime - record.startTime)}
                          </div>
                        )}
                        {!record.endTime && (
                          <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2 text-xs text-red-400">
                            <AlertTriangle size={12} />
                            仍在处理中
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">暂无堵包记录</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Package size={18} className="text-blue-400" />
                相关异常事件
              </h3>
              <div className="space-y-3">
                {getPortAnomalies(selectedPort.id).length > 0 ? (
                  getPortAnomalies(selectedPort.id).map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className="bg-gray-800/50 rounded-lg p-3 border-l-2"
                      style={{
                        borderColor:
                          anomaly.type === 'height_mismatch'
                            ? '#F53F3F'
                            : anomaly.type === 'speed_over'
                            ? '#FF7D00'
                            : '#FFAA00',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-sm font-medium"
                          style={{
                            color:
                              anomaly.type === 'height_mismatch'
                                ? '#F53F3F'
                                : anomaly.type === 'speed_over'
                                ? '#FF7D00'
                                : '#FFAA00',
                          }}
                        >
                          {anomaly.type === 'height_mismatch'
                            ? '高度错配'
                            : anomaly.type === 'speed_over'
                            ? '速度过快'
                            : '行李堆积'}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {formatTime(anomaly.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {anomaly.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span className="text-gray-500">
                          标准: <span className="text-white">{anomaly.expectedValue}</span>
                        </span>
                        <span className="text-gray-500">
                          实际:{' '}
                          <span
                            style={{
                              color:
                                anomaly.type === 'height_mismatch'
                                  ? '#F53F3F'
                                  : anomaly.type === 'speed_over'
                                  ? '#FF7D00'
                                  : '#FFAA00',
                            }}
                          >
                            {anomaly.actualValue}
                          </span>
                        </span>
                        <span className="text-gray-500">
                          影响: <span className="text-white">{anomaly.luggageIds.length}件</span>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">该分拣口附近无异常事件</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
