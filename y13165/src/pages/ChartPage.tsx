import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { BarChart3, Target, AlertTriangle, Info } from 'lucide-react';
import { useTorqueStore } from '@/store/useTorqueStore';
import { STATUS_LABELS } from '@/types';

export default function ChartPage() {
  const { results, selectRecord, selectedRecordId } = useTorqueStore();
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return results.map(r => ({
      id: r.recordId,
      deviceId: r.deviceId,
      deviceName: r.deviceName || '',
      normalizedValue: r.normalizedValue,
      calculatedTorque: r.calculatedTorque,
      status: r.status,
      threshold: r.thresholdCheck?.threshold,
      thresholdSource: r.thresholdCheck?.thresholdSource,
      thresholdPassed: r.thresholdCheck?.passed,
      anomalyCount: r.anomalies.length,
      sourceFile: r.sourceFile,
      sourceRow: r.sourceRow,
      calcMethod: r.calcMethod,
    }));
  }, [results]);

  const maxValue = useMemo(() => {
    const values = chartData.map(d => d.normalizedValue);
    const thresholds = chartData.filter(d => d.threshold).map(d => d.threshold!);
    const max = Math.max(...values, ...thresholds, 1);
    return max * 1.1;
  }, [chartData]);

  const thresholdValues = chartData.filter(d => d.threshold).map(d => d.threshold!);
  const avgThreshold = thresholdValues.length > 0
    ? thresholdValues.reduce((a, b) => a + b, 0) / thresholdValues.length
    : 0;

  if (results.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-500">暂无数据</div>
        </div>
      </div>
    );
  }

  const selectedResult = results.find(r => r.recordId === selectedRecordId) || null;

  const getBarColor = (status: string) => {
    switch (status) {
      case 'normal': return '#3b82f6';
      case 'warning': return '#f97316';
      case 'error': return '#ef4444';
      default: return '#9ca3af';
    }
  };

  const handleBarClick = (data: any) => {
    if (data && data.id) {
      selectRecord(data.id);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
          <div className="font-medium text-slate-800 mb-2">{data.deviceId}</div>
          {data.deviceName && <div className="text-xs text-slate-500 mb-2">{data.deviceName}</div>}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">铭牌扭矩</span>
              <span className="font-mono text-slate-700">{data.normalizedValue.toFixed(2)} N·m</span>
            </div>
            {data.calculatedTorque !== null && (
              <div className="flex justify-between">
                <span className="text-slate-500">复算扭矩</span>
                <span className="font-mono text-blue-600">{data.calculatedTorque.toFixed(2)} N·m</span>
              </div>
            )}
            {data.threshold && (
              <div className="flex justify-between">
                <span className="text-slate-500">安全阈值</span>
                <span className={`font-mono ${data.thresholdPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.threshold.toFixed(2)} N·m
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-100 mt-1">
              <span className="text-slate-500">状态</span>
              <span className={
                data.status === 'normal' ? 'text-emerald-600' :
                data.status === 'warning' ? 'text-orange-600' :
                data.status === 'error' ? 'text-red-600' : 'text-gray-500'
              }>
                {STATUS_LABELS[data.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
            {data.sourceFile} · 第{data.sourceRow}行
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-5 flex-shrink-0">
        <h2 className="text-xl font-bold text-slate-800">图表可视化</h2>
        <p className="text-sm text-slate-500 mt-1">扭矩柱状图与明细数据同口径联动，点击柱体查看详情，阈值线标注安全范围</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5 flex-shrink-0">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">设备数量</div>
          <div className="text-xl font-bold text-slate-800">{new Set(results.map(r => r.deviceId)).size}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">平均扭矩</div>
          <div className="text-xl font-bold text-blue-600">
            {(results.reduce((s, r) => s + r.normalizedValue, 0) / results.length).toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">N·m</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">异常数量</div>
          <div className="text-xl font-bold text-orange-500">
            {results.filter(r => r.status !== 'normal' && r.status !== 'unknown').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-1">平均阈值</div>
          <div className="text-xl font-bold text-emerald-600">
            {avgThreshold > 0 ? avgThreshold.toFixed(1) : '-'}
            <span className="text-xs font-normal text-slate-400 ml-1">N·m</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            扭矩对比图
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block"></span>
              <span>正常</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-orange-500 inline-block"></span>
              <span>异常</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500 inline-block"></span>
              <span>错误</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-red-400 inline-block" style={{ borderTop: '2px dashed #f87171' }}></span>
              <span>安全阈值</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 60 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  handleBarClick(e.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="deviceId"
                tick={{ fontSize: 11, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                domain={[0, Math.ceil(maxValue)]}
                label={{ value: 'N·m', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              {avgThreshold > 0 && (
                <ReferenceLine
                  y={avgThreshold}
                  stroke="#f87171"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{ value: `平均阈值 ${avgThreshold.toFixed(0)} N·m`, fill: '#ef4444', fontSize: 11, position: 'right' }}
                />
              )}
              <Bar dataKey="normalizedValue" name="扭矩值" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.status)}
                    opacity={selectedRecordId && entry.id !== selectedRecordId ? 0.4 : 1}
                    stroke={entry.id === selectedRecordId ? '#1e40af' : 'transparent'}
                    strokeWidth={entry.id === selectedRecordId ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {selectedResult && (
        <div className="mt-4 bg-white rounded-lg border border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-800 mb-1">{selectedResult.deviceId}</div>
              {selectedResult.deviceName && (
                <div className="text-xs text-slate-500 mb-2">{selectedResult.deviceName}</div>
              )}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">铭牌扭矩</div>
                  <div className="font-mono text-slate-700">
                    {selectedResult.originalValue ?? '-'} {selectedResult.originalUnit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">换算后</div>
                  <div className="font-mono text-blue-600">
                    {selectedResult.normalizedValue.toFixed(2)} N·m
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">复算值</div>
                  <div className="font-mono text-emerald-600">
                    {selectedResult.calculatedTorque !== null ? `${selectedResult.calculatedTorque.toFixed(2)} N·m` : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">状态</div>
                  <div className={`font-medium ${
                    selectedResult.status === 'normal' ? 'text-emerald-600' :
                    selectedResult.status === 'warning' ? 'text-orange-600' :
                    selectedResult.status === 'error' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {STATUS_LABELS[selectedResult.status]}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>来源：{selectedResult.sourceFile}</div>
              <div>第 {selectedResult.sourceRow} 行</div>
            </div>
          </div>

          {selectedResult.thresholdCheck && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
              <Target className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="text-xs">
                <span className="text-slate-500">安全阈值：</span>
                <span className={`font-medium ${selectedResult.thresholdCheck.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedResult.thresholdCheck.threshold.toFixed(2)} N·m
                </span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-slate-500">占比：</span>
                <span className="font-mono">
                  {(selectedResult.thresholdCheck.ratio * 100).toFixed(1)}%
                </span>
                <div className="text-slate-400 mt-1">
                  阈值来源：{selectedResult.thresholdCheck.thresholdSource}
                </div>
              </div>
            </div>
          )}

          {selectedResult.anomalies.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="text-xs font-medium text-orange-600 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                {selectedResult.anomalies.length} 项异常
              </div>
              <div className="space-y-1">
                {selectedResult.anomalies.map((a, idx) => (
                  <div key={idx} className="text-xs text-slate-600 pl-4 border-l-2 border-orange-200">
                    {a.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedResult && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 flex-shrink-0">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-xs text-blue-600">
            点击图表中的柱体可查看该设备的详细信息，与明细页数据同口径
          </span>
        </div>
      )}
    </div>
  );
}
