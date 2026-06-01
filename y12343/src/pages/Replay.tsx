import { useState } from 'react';
import { useStore } from '@/store';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  ReferenceLine,
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, Info } from 'lucide-react';

export default function ReplayPage() {
  const { reports, coils, magneticSequences } = useStore();
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  const selectedReport = reports.find(r => r.id === selectedReportId);
  const coil = selectedReport ? coils.find(c => c.id === selectedReport.coilId) : null;
  const sequence = selectedReport ? magneticSequences.find(s => s.id === selectedReport.magneticId) : null;

  const chartData = selectedReport?.calculationResults.map((r, i) => ({
    index: i,
    time: Number(r.time.toFixed(4)),
    magneticFlux: Number(r.magneticFlux.toFixed(6)),
    emf: Number(r.emf.toFixed(4)),
    dPhiDt: Number(r.dPhiDt.toFixed(4)),
  })) || [];

  const anomalyIndices = selectedReport?.anomalies
    .filter(a => a.dataPointIndex !== undefined)
    .map(a => a.dataPointIndex!) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">曲线回放</h1>
        <p className="text-primary-300 mt-1">实验数据可视化与边界校验分析</p>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-4">
          <label className="label mb-0 whitespace-nowrap">选择报告</label>
          <select
            value={selectedReportId}
            onChange={e => setSelectedReportId(e.target.value)}
            className="input max-w-md"
          >
            <option value="">请选择测算报告</option>
            {reports.map(report => (
              <option key={report.id} value={report.id}>
                {report.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedReport ? (
        <div className="card p-12 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-primary-400 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">请选择报告</h3>
          <p className="text-primary-400">
            从上方下拉菜单中选择一个测算报告查看详细曲线分析
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-primary-400">关联线圈</p>
              <p className="text-lg font-semibold text-white mt-1">{coil?.name || '-'}</p>
              <p className="text-xs text-primary-400 mt-1">{coil?.turns} 匝</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-primary-400">磁场序列</p>
              <p className="text-lg font-semibold text-white mt-1">{sequence?.name || '-'}</p>
              <p className="text-xs text-primary-400 mt-1">{chartData.length} 数据点</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-primary-400">平均电动势</p>
              <p className="text-lg font-semibold text-white mt-1 font-mono">
                {selectedReport.boundaryCheck.avgEmf.toFixed(4)}
              </p>
              <p className="text-xs text-primary-400 mt-1">{selectedReport.emfUnit}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-primary-400">异常检测</p>
              <p className={`text-lg font-semibold mt-1 ${
                selectedReport.anomalies.length > 0 ? 'text-accent-error' : 'text-accent-success'
              }`}>
                {selectedReport.anomalies.length} 个
              </p>
              <p className="text-xs text-primary-400 mt-1">
                {selectedReport.anomalies.length > 0 ? '发现异常' : '数据正常'}
              </p>
            </div>
          </div>

          {selectedReport.anomalies.length > 0 && (
            <div className="card p-6 border-l-4 border-accent-warning">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-accent-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white mb-2">异常检测结果</h3>
                  <div className="space-y-2">
                    {selectedReport.anomalies.map((anomaly, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg ${
                          anomaly.severity === 'critical' ? 'bg-accent-error/10' : 'bg-accent-warning/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`badge ${
                            anomaly.severity === 'critical' ? 'badge-error' : 'badge-warning'
                          }`}>
                            {anomaly.type === 'missing_turns' ? '匝数缺失' :
                             anomaly.type === 'time_unit_error' ? '时间异常' :
                             anomaly.type === 'flux_reversal' ? '磁通反向' : '其他'}
                          </span>
                          <span className="text-sm text-primary-200">
                            {anomaly.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                磁场变化曲线
              </h3>
              <div className="text-sm text-primary-400">
                单位: {sequence?.magneticUnit || 'T'}
              </div>
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.3)" />
                  <XAxis
                    dataKey="time"
                    stroke="#8892b0"
                    tick={{ fill: '#8892b0', fontSize: 12 }}
                    label={{ value: `时间 (${sequence?.timeUnit || 's'})`, position: 'insideBottom', offset: -5, fill: '#8892b0', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#8892b0"
                    tick={{ fill: '#8892b0', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 31, 56, 0.95)',
                      border: '1px solid rgba(30, 58, 95, 0.5)',
                      borderRadius: '8px',
                      color: '#eef5ff',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#8892b0' }} />
                  <Area
                    type="monotone"
                    dataKey="magneticFlux"
                    name="磁通量"
                    stroke="#3498db"
                    fill="rgba(52, 152, 219, 0.2)"
                    strokeWidth={2}
                  />
                  {anomalyIndices.map(idx => (
                    <ReferenceLine
                      key={idx}
                      x={chartData[idx]?.time}
                      stroke="#e74c3c"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-400" />
                感应电动势曲线
              </h3>
              <div className="text-sm text-primary-400">
                单位: {selectedReport.emfUnit}
              </div>
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.3)" />
                  <XAxis
                    dataKey="time"
                    stroke="#8892b0"
                    tick={{ fill: '#8892b0', fontSize: 12 }}
                    label={{ value: `时间 (${sequence?.timeUnit || 's'})`, position: 'insideBottom', offset: -5, fill: '#8892b0', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#8892b0"
                    tick={{ fill: '#8892b0', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 31, 56, 0.95)',
                      border: '1px solid rgba(30, 58, 95, 0.5)',
                      borderRadius: '8px',
                      color: '#eef5ff',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#8892b0' }} />
                  <Bar
                    dataKey="emf"
                    name="感应电动势"
                    fill="rgba(46, 204, 113, 0.6)"
                    radius={[4, 4, 0, 0]}
                  />
                  {anomalyIndices.map(idx => (
                    <ReferenceLine
                      key={idx}
                      x={chartData[idx]?.time}
                      stroke="#e74c3c"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">边界校验结果</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-dark-bg/50 rounded-lg p-4">
                <p className="text-sm text-primary-400">最小电动势</p>
                <p className="text-xl font-semibold text-white mt-1 font-mono">
                  {selectedReport.boundaryCheck.minEmf.toFixed(4)}
                </p>
                <p className="text-xs text-primary-400 mt-1">{selectedReport.emfUnit}</p>
              </div>
              <div className="bg-dark-bg/50 rounded-lg p-4">
                <p className="text-sm text-primary-400">最大电动势</p>
                <p className="text-xl font-semibold text-white mt-1 font-mono">
                  {selectedReport.boundaryCheck.maxEmf.toFixed(4)}
                </p>
                <p className="text-xs text-primary-400 mt-1">{selectedReport.emfUnit}</p>
              </div>
              <div className="bg-dark-bg/50 rounded-lg p-4">
                <p className="text-sm text-primary-400">平均电动势</p>
                <p className="text-xl font-semibold text-white mt-1 font-mono">
                  {selectedReport.boundaryCheck.avgEmf.toFixed(4)}
                </p>
                <p className="text-xs text-primary-400 mt-1">{selectedReport.emfUnit}</p>
              </div>
              <div className="bg-dark-bg/50 rounded-lg p-4">
                <p className="text-sm text-primary-400">边界状态</p>
                <p className={`text-xl font-semibold mt-1 ${
                  selectedReport.boundaryCheck.isWithinBounds ? 'text-accent-success' : 'text-accent-warning'
                }`}>
                  {selectedReport.boundaryCheck.isWithinBounds ? '正常' : '超限'}
                </p>
                <p className="text-xs text-primary-400 mt-1">
                  {selectedReport.boundaryCheck.isWithinBounds ? '在合理范围内' : '超出预期范围'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 overflow-hidden">
            <h3 className="text-lg font-semibold text-white mb-4">详细数据表</h3>
            <div className="overflow-x-auto scrollbar-thin max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-dark-bg/80 sticky top-0">
                  <tr>
                    <th className="table-header">#</th>
                    <th className="table-header">时间</th>
                    <th className="table-header">磁通量</th>
                    <th className="table-header">dΦ/dt</th>
                    <th className="table-header">电动势</th>
                    <th className="table-header">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, index) => (
                    <tr
                      key={index}
                      className={
                        anomalyIndices.includes(index)
                          ? 'anomaly-highlight'
                          : index % 2 === 0
                          ? 'table-row-even'
                          : 'table-row-odd'
                      }
                    >
                      <td className="table-cell font-mono text-primary-400">{index + 1}</td>
                      <td className="table-cell font-mono">{row.time}</td>
                      <td className="table-cell font-mono">{row.magneticFlux}</td>
                      <td className="table-cell font-mono">{row.dPhiDt}</td>
                      <td className="table-cell font-mono">{row.emf}</td>
                      <td className="table-cell">
                        {anomalyIndices.includes(index) ? (
                          <span className="badge-error">异常</span>
                        ) : (
                          <span className="badge-success">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
