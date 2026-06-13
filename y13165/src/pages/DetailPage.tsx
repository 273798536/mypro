import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, AlertCircle, CheckCircle, HelpCircle, FileText, Layers, Target } from 'lucide-react';
import { useTorqueStore } from '@/store/useTorqueStore';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import { formatTorque } from '@/utils/unitConverter';
import type { TorqueCalcResult, AnomalyItem } from '@/types';

const severityIcons = {
  high: AlertCircle,
  medium: AlertTriangle,
  low: AlertTriangle,
};

const severityColors = {
  high: 'text-red-600 bg-red-50 border-red-200',
  medium: 'text-orange-600 bg-orange-50 border-orange-200',
  low: 'text-amber-600 bg-amber-50 border-amber-200',
};

export default function DetailPage() {
  const { results, selectedRecordId, selectRecord } = useTorqueStore();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
    selectRecord(id);
  };

  const filteredResults = filterStatus === 'all'
    ? results
    : results.filter(r => r.status === filterStatus);

  const stats = {
    total: results.length,
    normal: results.filter(r => r.status === 'normal').length,
    warning: results.filter(r => r.status === 'warning').length,
    error: results.filter(r => r.status === 'error').length,
    unknown: results.filter(r => r.status === 'unknown').length,
  };

  const selectedResult = results.find(r => r.recordId === selectedRecordId) || null;

  if (results.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">暂无数据，请先导入铭牌数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-800">复算明细</h2>
          <p className="text-sm text-slate-500 mt-1">逐条展示复算结果，异常高亮，点击行查看原始铭牌溯源</p>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-5">
          <StatCard label="总记录" value={stats.total} color="slate" icon="total" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
          <StatCard label="正常" value={stats.normal} color="emerald" icon="normal" active={filterStatus === 'normal'} onClick={() => setFilterStatus('normal')} />
          <StatCard label="异常" value={stats.warning} color="orange" icon="warning" active={filterStatus === 'warning'} onClick={() => setFilterStatus('warning')} />
          <StatCard label="错误" value={stats.error} color="red" icon="error" active={filterStatus === 'error'} onClick={() => setFilterStatus('error')} />
          <StatCard label="未知" value={stats.unknown} color="gray" icon="unknown" active={filterStatus === 'unknown'} onClick={() => setFilterStatus('unknown')} />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="w-8 px-2 py-2.5"></th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">设备编号</th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">铭牌原始值</th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">换算后(N·m)</th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">复算值(N·m)</th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">安全阈值</th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">状态</th>
                  <th className="text-left px-3 py-2.5 font-medium text-slate-600 whitespace-nowrap">来源</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map(result => (
                  <React.Fragment key={result.recordId}>
                    <tr
                      className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${
                        result.status === 'error' ? 'bg-red-50/50' :
                        result.status === 'warning' ? 'bg-orange-50/40' : ''
                      } ${selectedRecordId === result.recordId ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleRow(result.recordId)}
                    >
                      <td className="px-2 py-2.5 text-slate-400">
                        {expandedRows.has(result.recordId) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-800">{result.deviceId}</div>
                        {result.deviceName && (
                          <div className="text-xs text-slate-500">{result.deviceName}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-mono">
                        {result.originalValue !== null ? (
                          <>
                            <span>{result.originalValue}</span>
                            <span className="text-slate-400 ml-1 text-xs">{result.originalUnit}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 font-mono font-medium">
                        {result.unitConversion.detected ? (
                          formatTorque(result.normalizedValue, 3)
                        ) : (
                          <span className="text-orange-500">{result.normalizedValue.toFixed(3)} ?</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 font-mono">
                        {result.calculatedTorque !== null ? (
                          <span>{result.calculatedTorque.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {result.thresholdCheck ? (
                          <div>
                            <div className={`font-mono text-sm ${result.thresholdCheck.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                              {result.thresholdCheck.threshold.toFixed(2)} N·m
                            </div>
                            <div className="text-xs text-slate-400">
                              {(result.thresholdCheck.ratio * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">无阈值</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[result.status]}`}>
                          {STATUS_LABELS[result.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">
                        <div className="truncate max-w-[120px]" title={result.sourceFile}>
                          {result.sourceFile}
                        </div>
                        <div className="text-slate-400">第 {result.sourceRow} 行</div>
                      </td>
                    </tr>
                    {expandedRows.has(result.recordId) && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={8} className="px-6 py-4">
                          <RowDetail result={result} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedResult && (
        <aside className="w-80 border-l border-slate-200 bg-white overflow-auto flex-shrink-0">
          <TracePanel result={selectedResult} />
        </aside>
      )}
    </div>
  );
}

function StatCard({ label, value, color, active, onClick }: {
  label: string;
  value: number;
  color: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    slate: active ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50',
    emerald: active ? 'bg-emerald-100 border-emerald-300' : 'bg-white border-slate-200 hover:bg-emerald-50',
    orange: active ? 'bg-orange-100 border-orange-300' : 'bg-white border-slate-200 hover:bg-orange-50',
    red: active ? 'bg-red-100 border-red-300' : 'bg-white border-slate-200 hover:bg-red-50',
    gray: active ? 'bg-gray-100 border-gray-300' : 'bg-white border-slate-200 hover:bg-gray-50',
  };

  const valueColors: Record<string, string> = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${colorClasses[color]}`}
    >
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueColors[color]}`}>{value}</div>
    </button>
  );
}

function RowDetail({ result }: { result: TorqueCalcResult }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div>
        <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          单位换算
        </div>
        <div className="bg-white rounded border border-slate-200 p-3 text-sm">
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-500">原始单位</span>
            <span className="font-mono text-slate-700">{result.unitConversion.fromUnit}</span>
          </div>
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-500">目标单位</span>
            <span className="font-mono text-slate-700">{result.unitConversion.toUnit}</span>
          </div>
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-500">换算系数</span>
            <span className="font-mono text-blue-600">×{result.unitConversion.factor}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-100">
            <span className="text-slate-500">识别状态</span>
            <span className={result.unitConversion.detected ? 'text-emerald-600' : 'text-orange-600'}>
              {result.unitConversion.detected ? '自动识别' : '未能识别'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
          <Target className="w-3 h-3" />
          复算信息
        </div>
        <div className="bg-white rounded border border-slate-200 p-3 text-sm">
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-500">复算方法</span>
            <span className="text-slate-700 text-right text-xs max-w-[50%]">{result.calcMethod}</span>
          </div>
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-500">铭牌值</span>
            <span className="font-mono text-slate-700">{result.originalValue ?? '-'}</span>
          </div>
          <div className="flex justify-between mb-1.5">
            <span className="text-slate-500">复算值</span>
            <span className="font-mono text-blue-600">
              {result.calculatedTorque !== null ? result.calculatedTorque.toFixed(2) : '-'}
            </span>
          </div>
          {result.thresholdCheck && (
            <div className="flex justify-between pt-1.5 border-t border-slate-100">
              <span className="text-slate-500">阈值占比</span>
              <span className={result.thresholdCheck.passed ? 'text-emerald-600' : 'text-red-600'}>
                {(result.thresholdCheck.ratio * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          异常列表 ({result.anomalies.length})
        </div>
        <div className="space-y-2">
          {result.anomalies.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              无异常
            </div>
          ) : (
            result.anomalies.map((anomaly, idx) => (
              <AnomalyBadge key={idx} anomaly={anomaly} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AnomalyBadge({ anomaly }: { anomaly: AnomalyItem }) {
  const Icon = severityIcons[anomaly.severity];
  return (
    <div className={`rounded border p-2.5 text-xs ${severityColors[anomaly.severity]}`}>
      <div className="flex items-start gap-1.5">
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium">{anomaly.message}</div>
          {anomaly.sourceRef && (
            <div className="text-[11px] opacity-70 mt-1">溯源：{anomaly.sourceRef}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TracePanel({ result }: { result: TorqueCalcResult }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800">原始铭牌溯源</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="text-xs text-slate-500 mb-2">设备信息</div>
          <div className="text-sm font-medium text-slate-800">{result.deviceId}</div>
          {result.deviceName && <div className="text-xs text-slate-500 mt-0.5">{result.deviceName}</div>}
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">来源信息</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">文件名</span>
              <span className="text-slate-700 text-right text-xs max-w-[55%] break-all">{result.sourceFile}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">行号</span>
              <span className="font-mono text-slate-700">第 {result.sourceRow} 行</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">批次ID</span>
              <span className="font-mono text-xs text-slate-600">{result.sourceBatch.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">导入时间</span>
              <span className="text-slate-600 text-xs">
                {new Date(result.importedAt).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
        </div>

        {result.thresholdCheck && (
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">安全阈值来源</div>
            <div className={`rounded-lg p-3 border text-sm ${
              result.thresholdCheck.passed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="font-medium mb-1">
                阈值：{result.thresholdCheck.threshold.toFixed(2)} N·m
              </div>
              <div className="text-xs opacity-80">
                {result.thresholdCheck.thresholdSource}
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">原始行内容</div>
          <div className="bg-slate-900 text-slate-200 rounded-lg p-3 text-xs font-mono break-all leading-relaxed">
            {result.sourceContent || '(无)'}
          </div>
        </div>

        {result.anomalies.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">异常详情</div>
            <div className="space-y-2">
              {result.anomalies.map((a, idx) => (
                <div key={idx} className={`rounded border p-2.5 text-xs ${severityColors[a.severity]}`}>
                  <div className="font-medium">{a.message}</div>
                  {a.sourceRef && (
                    <div className="text-[11px] opacity-70 mt-1">溯源：{a.sourceRef}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
