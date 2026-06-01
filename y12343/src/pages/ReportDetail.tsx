import { useParams, Link } from 'react-router-dom';
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
  Area,
  ReferenceLine,
  ComposedChart,
  Bar,
} from 'recharts';
import { ArrowLeft, AlertTriangle, Check, TrendingUp, Activity, RefreshCw } from 'lucide-react';

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { reports, coils, magneticSequences, recalculateReport } = useStore();

  const report = reports.find(r => r.id === id);
  const coil = report ? coils.find(c => c.id === report.coilId) : null;
  const sequence = report ? magneticSequences.find(s => s.id === report.magneticId) : null;

  if (!report) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-white">报告不存在</h2>
        <Link to="/reports" className="btn-primary mt-6 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回报告列表
        </Link>
      </div>
    );
  }

  const chartData = report.calculationResults.map((r, i) => ({
    index: i,
    time: Number(r.time.toFixed(4)),
    magneticFlux: Number(r.magneticFlux.toFixed(6)),
    emf: Number(r.emf.toFixed(4)),
    dPhiDt: Number(r.dPhiDt.toFixed(4)),
  }));

  const anomalyIndices = report.anomalies
    .filter(a => a.dataPointIndex !== undefined)
    .map(a => a.dataPointIndex!);

  const handleRecalculate = () => {
    if (id) {
      recalculateReport(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/reports"
            className="p-2 rounded-lg hover:bg-primary-600/20 text-primary-300 hover:text-primary-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{report.name}</h1>
            <p className="text-primary-300 mt-1">
              {new Date(report.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <button
          onClick={handleRecalculate}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重新计算
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-primary-400">关联线圈</p>
          <p className="text-lg font-semibold text-white mt-1">{coil?.name || '-'}</p>
          <p className="text-xs text-primary-400 mt-1">{coil?.turns} 匝 · {coil?.crossSection} {coil?.crossSectionUnit}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-primary-400">磁场序列</p>
          <p className="text-lg font-semibold text-white mt-1">{sequence?.name || '-'}</p>
          <p className="text-xs text-primary-400 mt-1">{chartData.length} 数据点</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-primary-400">平均电动势</p>
          <p className="text-lg font-semibold text-white mt-1 font-mono">
            {report.boundaryCheck.avgEmf.toFixed(4)}
          </p>
          <p className="text-xs text-primary-400 mt-1">{report.emfUnit}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-primary-400">异常检测</p>
          <p className={`text-lg font-semibold mt-1 ${
            report.anomalies.length > 0 ? 'text-accent-error' : 'text-accent-success'
          }`}>
            {report.anomalies.length} 个
          </p>
          <p className="text-xs text-primary-400 mt-1">
            {report.anomalies.length > 0 ? '发现异常' : '数据正常'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`card p-4 flex items-center gap-4 ${
          report.hasMissingTurns ? 'bg-accent-error/10 border-accent-error/30' : 'bg-accent-success/10 border-accent-success/30'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            report.hasMissingTurns ? 'bg-accent-error/20 text-accent-error' : 'bg-accent-success/20 text-accent-success'
          }`}>
            {report.hasMissingTurns ? <AlertTriangle className="w-6 h-6" /> : <Check className="w-6 h-6" />}
          </div>
          <div>
            <p className="font-medium text-white">匝数检测</p>
            <p className={`text-sm ${
              report.hasMissingTurns ? 'text-accent-error' : 'text-accent-success'
            }`}>
              {report.hasMissingTurns ? '检测到匝数缺失' : '匝数正常'}
            </p>
          </div>
        </div>
        <div className={`card p-4 flex items-center gap-4 ${
          report.hasTimeUnitError ? 'bg-accent-warning/10 border-accent-warning/30' : 'bg-accent-success/10 border-accent-success/30'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            report.hasTimeUnitError ? 'bg-accent-warning/20 text-accent-warning' : 'bg-accent-success/20 text-accent-success'
          }`}>
            {report.hasTimeUnitError ? <AlertTriangle className="w-6 h-6" /> : <Check className="w-6 h-6" />}
          </div>
          <div>
            <p className="font-medium text-white">时间单位检测</p>
            <p className={`text-sm ${
              report.hasTimeUnitError ? 'text-accent-warning' : 'text-accent-success'
            }`}>
              {report.hasTimeUnitError ? '检测到时间异常' : '时间序列正常'}
            </p>
          </div>
        </div>
        <div className={`card p-4 flex items-center gap-4 ${
          report.hasFluxReversal ? 'bg-accent-warning/10 border-accent-warning/30' : 'bg-accent-success/10 border-accent-success/30'
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            report.hasFluxReversal ? 'bg-accent-warning/20 text-accent-warning' : 'bg-accent-success/20 text-accent-success'
          }`}>
            {report.hasFluxReversal ? <AlertTriangle className="w-6 h-6" /> : <Check className="w-6 h-6" />}
          </div>
          <div>
            <p className="font-medium text-white">磁通反向检测</p>
            <p className={`text-sm ${
              report.hasFluxReversal ? 'text-accent-warning' : 'text-accent-success'
            }`}>
              {report.hasFluxReversal ? '检测到磁通反向' : '无磁通反向'}
            </p>
          </div>
        </div>
      </div>

      {report.anomalies.length > 0 && (
        <div className="card p-6 border-l-4 border-accent-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-accent-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-4">异常详情</h3>
              <div className="space-y-2">
                {report.anomalies.map((anomaly, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      anomaly.severity === 'critical' ? 'bg-accent-error/10' : 'bg-accent-warning/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          anomaly.severity === 'critical' ? 'badge-error' : 'badge-warning'
                        }`}>
                          {anomaly.type === 'missing_turns' ? '匝数缺失' :
                           anomaly.type === 'time_unit_error' ? '时间异常' :
                           anomaly.type === 'flux_reversal' ? '磁通反向' : '其他'}
                        </span>
                        <span className="text-sm text-primary-200 font-medium">
                          {anomaly.description}
                        </span>
                      </div>
                      {anomaly.dataPointIndex !== undefined && (
                        <span className="text-xs text-primary-400 font-mono">
                          数据点 #{anomaly.dataPointIndex + 1}
                        </span>
                      )}
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
        </div>
        <div className="chart-container" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 58, 95, 0.3)" />
              <XAxis
                dataKey="time"
                stroke="#8892b0"
                tick={{ fill: '#8892b0', fontSize: 12 }}
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
                name={`感应电动势 (${report.emfUnit})`}
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

      <div className="card p-6 overflow-hidden">
        <h3 className="text-lg font-semibold text-white mb-4">计算结果明细</h3>
        <div className="overflow-x-auto scrollbar-thin max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-dark-bg/80 sticky top-0">
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">时间</th>
                <th className="table-header">磁通量 ({sequence?.magneticUnit || 'T'})</th>
                <th className="table-header">dΦ/dt</th>
                <th className="table-header">电动势 ({report.emfUnit})</th>
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

      {report.remark && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-2">备注</h3>
          <p className="text-primary-300">{report.remark}</p>
        </div>
      )}
    </div>
  );
}
