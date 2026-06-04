import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBatchStore } from '@/stores/useBatchStore';
import { AuditService } from '@/services/auditService';
import { formatTimestamp, getDeviceTypeLabel, getRiskLevelColor } from '@/utils/helpers';
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function ReportPage() {
  const navigate = useNavigate();
  const { currentBatch, devices, getReport, confirmCoordinateFlip } = useBatchStore();
  const report = getReport();
  const [expandedAnomaly, setExpandedAnomaly] = useState<string | null>(null);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  const auditTrail = selectedAnomalyId
    ? AuditService.getAuditTrail(currentBatch, devices, selectedAnomalyId)
    : [];

  const anomalyTimeline = selectedAnomalyId
    ? AuditService.getAnomalyTimeline(
        devices.find((d) => d.id === selectedAnomalyId)!,
        currentBatch.commands
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Roboto Slab', serif" }}>
          报告与审计追踪
        </h1>
        <div className="ml-auto text-sm text-white/60">
          运行ID: <span className="font-mono">{report.runId}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-[#1e3a5f]">
              {report.summary.totalDevices}
            </div>
            <div className="text-sm text-gray-500">设备总数</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
            <div className="text-3xl font-bold text-green-600">
              {report.summary.safeCount}
            </div>
            <div className="text-sm text-green-600/70">安全</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {report.summary.warningCount}
            </div>
            <div className="text-sm text-orange-600/70">警示</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center">
            <div className="text-3xl font-bold text-red-600">
              {report.summary.dangerCount}
            </div>
            <div className="text-sm text-red-600/70">危险</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-center">
            <div className="text-3xl font-bold text-amber-600">
              {report.summary.coordinateIssues}
            </div>
            <div className="text-sm text-amber-600/70">坐标异常</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                <h2 className="font-semibold text-gray-800">异常设备列表</h2>
                <span className="ml-auto text-sm text-gray-500">
                  {report.anomalies.length} 个异常
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {report.anomalies.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <CheckCircle2 size={48} className="mx-auto mb-2 text-green-400" />
                    暂无异常记录
                  </div>
                ) : (
                  report.anomalies.map((device) => {
                    const isExpanded = expandedAnomaly === device.id;
                    const isSelected = selectedAnomalyId === device.id;

                    return (
                      <div key={device.id}>
                        <div
                          className={`px-6 py-4 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50'
                              : isExpanded
                                ? 'bg-gray-50'
                                : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setExpandedAnomaly(isExpanded ? null : device.id);
                            setSelectedAnomalyId(device.id);
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getRiskLevelColor(device.riskLevel) }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">
                                  {device.name}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ({getDeviceTypeLabel(device.type)})
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                坐标: {device.x.toFixed(6)}, {device.y.toFixed(6)}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {device.coordinateFlip &&
                                !device.coordinateFlip.userConfirmed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmCoordinateFlip(device.id);
                                    }}
                                    className="px-3 py-1 text-xs bg-[#1e3a5f] text-white rounded hover:bg-[#2a4a7a] transition-colors"
                                  >
                                    确认修正
                                  </button>
                                )}
                              {device.coordinateFlip && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertCircle size={12} />
                                  坐标异常
                                </span>
                              )}
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  device.riskLevel === 'safe'
                                    ? 'bg-green-100 text-green-700'
                                    : device.riskLevel === 'warning'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {device.riskLevel === 'safe'
                                  ? '安全'
                                  : device.riskLevel === 'warning'
                                    ? '警示'
                                    : '危险'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={16} className="text-gray-400" />
                              ) : (
                                <ChevronDown size={16} className="text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-4 bg-gray-50/50">
                            {device.coordinateFlip && (
                              <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                <div className="flex items-start gap-2">
                                  <AlertCircle
                                    size={18}
                                    className="text-amber-600 flex-shrink-0 mt-0.5"
                                  />
                                  <div>
                                    <div className="font-medium text-amber-800 text-sm">
                                      坐标异常说明
                                    </div>
                                    <div className="text-sm text-amber-700 mt-1">
                                      {device.coordinateFlip.reason}
                                    </div>
                                    <div className="text-xs text-amber-600 mt-2 font-mono">
                                      原始值: {device.coordinateFlip.originalX.toFixed(4)},{' '}
                                      {device.coordinateFlip.originalY.toFixed(4)} → 修正值:{' '}
                                      {device.coordinateFlip.correctedX.toFixed(4)},{' '}
                                      {device.coordinateFlip.correctedY.toFixed(4)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {device.annotations.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                  <MessageSquare size={14} />
                                  标注记录 ({device.annotations.length})
                                </div>
                                {device.annotations.map((ann) => (
                                  <div
                                    key={ann.id}
                                    className="p-3 bg-white rounded-lg border border-gray-100"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                        style={{
                                          backgroundColor: getRiskLevelColor(ann.riskLevel),
                                        }}
                                      />
                                      <div className="flex-1">
                                        <div className="text-sm text-gray-800">
                                          {ann.content}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">
                                          处理意见: {ann.opinion}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                          <Clock size={10} />
                                          {formatTimestamp(ann.timestamp)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                <Clock size={20} className="text-[#1e3a5f]" />
                <h2 className="font-semibold text-gray-800">审计追踪</h2>
              </div>

              <div className="p-4">
                {!selectedAnomalyId ? (
                  <div className="text-center text-gray-400 py-8">
                    <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">点击左侧异常设备查看审计追踪</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-3">
                      {anomalyTimeline.map((entry, idx) => (
                        <div key={idx} className="relative pl-8">
                          <div className="absolute left-1.5 w-3 h-3 rounded-full bg-[#1e3a5f] border-2 border-white" />
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-800">
                              {entry.action}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {entry.detail}
                            </div>
                            {entry.time > 0 && (
                              <div className="text-xs text-gray-400 mt-1">
                                {formatTimestamp(entry.time)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {auditTrail.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm font-medium text-gray-600 mb-2">
                          关联操作记录
                        </div>
                        {auditTrail.map((entry, idx) => (
                          <div key={idx} className="text-xs p-2 bg-gray-50 rounded mb-1">
                            <div className="font-medium text-gray-700">
                              {entry.command.description}
                            </div>
                            <div className="text-gray-400 mt-0.5">
                              {formatTimestamp(entry.command.timestamp)}
                            </div>
                            {entry.screenshot && (
                              <div className="mt-2">
                                <img
                                  src={entry.screenshot}
                                  alt="操作截图"
                                  className="rounded border border-gray-200 max-w-full"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>报告生成时间</span>
                  <span className="font-medium text-gray-700">
                    {formatTimestamp(report.generatedAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>操作人</span>
                  <span className="font-medium text-gray-700">{currentBatch.operator}</span>
                </div>
                <div className="flex justify-between">
                  <span>操作记录数</span>
                  <span className="font-medium text-gray-700">
                    {currentBatch.currentIndex + 1}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>运行ID</span>
                  <span className="font-mono text-[#1e3a5f] text-[10px]">
                    {report.runId}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
