import { useState } from 'react';
import { Fish, Clock, AlertTriangle, CheckCircle, Info, ArrowRight, FileWarning } from 'lucide-react';
import type { AquacultureLog } from '../types';
import { calculateDelay, getDelaySeverityInfo, analyzeDelayedLogImpact } from '../utils/aquacultureLogs';
import { mockAquacultureLogs, mockErosionCalculations } from '../data/mockData';

export default function AquacultureLogsPanel() {
  const [selectedLog, setSelectedLog] = useState<AquacultureLog | null>(null);
  const [filterDelayed, setFilterDelayed] = useState<'all' | 'delayed' | 'ontime'>('all');

  const impactAnalysis = analyzeDelayedLogImpact(mockAquacultureLogs, mockErosionCalculations);

  const filteredLogs = mockAquacultureLogs.filter(log => {
    if (filterDelayed === 'delayed' && !log.isDelayed) return false;
    if (filterDelayed === 'ontime' && log.isDelayed) return false;
    return true;
  });

  const delayedCount = mockAquacultureLogs.filter(l => l.isDelayed).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Fish className="w-7 h-7 text-ocean-600" />
            养殖日志管理
          </h2>
          <p className="text-slate-500 mt-1">日志延迟自动检测，受影响结论明确提示，不悄悄覆盖旧结果</p>
        </div>
      </div>

      {impactAnalysis.totalDelayed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <FileWarning className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">
                检测到 {impactAnalysis.totalDelayed} 份延迟上报的养殖日志
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                以下结论可能受影响，系统保留旧计算结果，不会悄悄覆盖
              </p>
              <div className="mt-3 space-y-1.5">
                {impactAnalysis.conclusions.map((conclusion, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-amber-700">
                    <ArrowRight className="w-4 h-4" />
                    {conclusion}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">日志总数</span>
            <Fish className="w-5 h-5 text-ocean-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{mockAquacultureLogs.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">延迟上报</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{delayedCount}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">影响断面</span>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-600 mt-2">
            {impactAnalysis.affectedResultCount}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">按时上报</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {mockAquacultureLogs.length - delayedCount}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'delayed', 'ontime'] as const).map((filter) => {
          const labels = { all: '全部', delayed: '延迟上报', ontime: '按时上报' };
          const isActive = filterDelayed === filter;
          return (
            <button
              key={filter}
              onClick={() => setFilterDelayed(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-ocean-600 text-white' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {labels[filter]}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-slate-600">养殖场</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">日志日期</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">应上报时间</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">实际上报</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">延迟</th>
              <th className="text-center py-3 px-4 font-medium text-slate-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-slate-600">异常情况</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const delayInfo = calculateDelay(log);
              const severityInfo = getDelaySeverityInfo(delayInfo.severity);
              
              return (
                <tr 
                  key={log.id}
                  className="border-t border-slate-100 table-row-hover cursor-pointer"
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{log.farmName}</div>
                    <div className="text-xs text-slate-400">{log.farmId}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.logDate}</td>
                  <td className="py-3 px-4 text-slate-600">{log.expectedSubmitTime}</td>
                  <td className="py-3 px-4 text-slate-600">{log.submitTime}</td>
                  <td className="py-3 px-4 text-center">
                    {log.isDelayed ? (
                      <span className={`font-medium ${severityInfo.color}`}>
                        {delayInfo.delayHours.toFixed(1)} 小时
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${severityInfo.bg} ${severityInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${severityInfo.dot}`}></span>
                      {severityInfo.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {log.abnormalSituation || <span className="text-slate-400">无</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedLog && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Fish className="w-5 h-5 text-ocean-500" />
              {selectedLog.farmName} 日志详情
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">日志日期</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.logDate}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">上报人</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.operator}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">放养密度</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.stockingDensity} 尾/亩</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">投饵量</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.feedingAmount} kg</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">换水量</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.waterExchangeRate} %</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">死亡数量</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.mortalityCount} 尾</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">应上报时间</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.expectedSubmitTime}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">实际上报</div>
                  <div className="text-sm font-medium text-slate-800">{selectedLog.submitTime}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-ocean-50 rounded-lg p-3">
              <div className="text-xs text-ocean-600 mb-1">水质观察</div>
              <div className="text-sm text-ocean-800">{selectedLog.waterQualityObservation}</div>
            </div>

            {selectedLog.abnormalSituation && (
              <div className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                <div className="text-xs text-amber-600 mb-1">异常情况说明</div>
                <div className="text-sm text-amber-800">{selectedLog.abnormalSituation}</div>
              </div>
            )}

            {selectedLog.isDelayed && (
              <div className="mt-3 bg-orange-50 rounded-lg p-3 border border-orange-200">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-orange-800 text-sm">
                      延迟 {calculateDelay(selectedLog).delayHours.toFixed(1)} 小时上报
                    </div>
                    <div className="text-xs text-orange-600 mt-0.5">
                      可能影响同期侵蚀计算结果的准确性
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-slate-500" />
              对结论的影响
            </h3>

            {(() => {
              const detail = impactAnalysis.details.find(d => d.log.id === selectedLog.id);
              if (!detail || detail.affectedResults.length === 0) {
                return (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <div className="text-sm text-slate-600">该日志对当前计算结果无直接影响</div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">{detail.impactDescription}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-500">受影响的断面</div>
                    {detail.affectedResults.map((result, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="font-medium text-amber-800 text-sm">{result.sectionName}</div>
                        <div className="text-xs text-amber-600 mt-1">
                          侵蚀速率: {result.averageErosionRate} m/a
                        </div>
                        <div className="text-xs text-amber-600">
                          状态: {result.calculationStatus === 'partial' ? '部分有效' : result.calculationStatus}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-2">系统处理方式</div>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• 保留旧计算结果，不自动覆盖</li>
                      <li>• 标记相关结论为"待确认"</li>
                      <li>• 补录完成后提示重新计算</li>
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
