import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuditStore } from '@/store/useAuditStore';
import StatCard from '@/components/common/StatCard';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import ActionPanel from '@/components/ActionPanel';
import { formatDate, formatPercent, formatNumber } from '@/utils/formatters';
import {
  Activity,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  ChevronRight,
  Settings,
  Download,
} from 'lucide-react';
import { exportToCSV, exportToJSON, downloadFile } from '@/utils/exportUtils';

const PIE_COLORS = ['#0d9488', '#d97706', '#dc2626', '#4f46e5'];

export default function Dashboard() {
  const {
    batches,
    currentBatchId,
    setCurrentBatch,
    getBatchById,
    getSamplesByBatch,
    getAbnormalSamples,
    qcThresholds,
    updateQCThresholds,
    reEvaluateAllWithNewThresholds,
  } = useAuditStore();

  const [showQCControls, setShowQCControls] = useState(false);
  const [tempThresholds, setTempThresholds] = useState(qcThresholds);

  const currentBatch = getBatchById(currentBatchId || '');
  const batchSamples = currentBatchId ? getSamplesByBatch(currentBatchId) : [];
  const abnormalSamples = currentBatchId ? getAbnormalSamples(currentBatchId) : [];

  const trendData = useMemo(() => {
    return [...batches]
      .reverse()
      .slice(-6)
      .map(b => ({
        name: b.name.split('-').slice(-1)[0],
        异常率: b.contaminationRate,
        样本数: b.sampleCount,
      }));
  }, [batches]);

  const contaminationTypeData = useMemo(() => {
    const counts: Record<string, number> = {
      mycoplasma: 0,
      cross_sample: 0,
      reagent: 0,
      unknown: 0,
    };
    abnormalSamples.forEach(s => {
      if (s.contamination.detected) {
        counts[s.contamination.type] = (counts[s.contamination.type] || 0) + 1;
      }
    });
    const labels: Record<string, string> = {
      mycoplasma: '支原体污染',
      cross_sample: '交叉样本',
      reagent: '试剂污染',
      unknown: '其他异常',
    };
    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] || key,
      value,
    }));
  }, [abnormalSamples]);

  const normalCount = batchSamples.filter(s => s.status === 'normal').length;
  const warningCount = batchSamples.filter(s => s.status === 'warning').length;
  const contaminatedCount = batchSamples.filter(s => s.status === 'contaminated').length;
  const confirmedCount = batchSamples.filter(s => s.status === 'manually_confirmed').length;

  const handleExport = (format: 'csv' | 'json') => {
    if (!currentBatch || !currentBatchId) return;
    const content =
      format === 'csv'
        ? exportToCSV(currentBatch, batchSamples)
        : exportToJSON(currentBatch, batchSamples);
    const filename = `${currentBatch.name}-审计结果.${format}`;
    const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
    downloadFile(content, filename, mimeType);
  };

  const handleApplyThresholds = () => {
    reEvaluateAllWithNewThresholds(tempThresholds);
    setShowQCControls(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-slate-100">蛋白互作网络审计</h1>
          <p className="text-sm text-slate-500 mt-1">
            当前批次：{currentBatch?.name || '未选择'} · {formatDate(currentBatch?.createdAt || '')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentBatchId || ''}
            onChange={e => setCurrentBatch(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowQCControls(!showQCControls)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm text-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
            质控参数
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 bg-teal-700 hover:bg-teal-600 rounded text-sm text-white transition-colors">
              <Download className="w-4 h-4" />
              导出
            </button>
            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 first:rounded-t last:rounded-b"
              >
                CSV 格式
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 first:rounded-t last:rounded-b"
              >
                JSON 格式
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQCControls && (
        <Card title="质控参数调整" subtitle="调整后将重新评估所有样本状态，记录版本差异">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">最低蛋白浓度 (μg/mL)</label>
              <input
                type="number"
                step="0.1"
                value={tempThresholds.minProteinConcentration}
                onChange={e =>
                  setTempThresholds(t => ({ ...t, minProteinConcentration: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">最低纯度 (%)</label>
              <input
                type="number"
                value={tempThresholds.minPurity}
                onChange={e =>
                  setTempThresholds(t => ({ ...t, minPurity: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">最低完整性 (%)</label>
              <input
                type="number"
                value={tempThresholds.minIntegrity}
                onChange={e =>
                  setTempThresholds(t => ({ ...t, minIntegrity: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">最大背景噪声 (dB)</label>
              <input
                type="number"
                value={tempThresholds.maxBackgroundNoise}
                onChange={e =>
                  setTempThresholds(t => ({ ...t, maxBackgroundNoise: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">污染置信度阈值</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={tempThresholds.contaminationConfidenceThreshold}
                onChange={e =>
                  setTempThresholds(t => ({ ...t, contaminationConfidenceThreshold: parseFloat(e.target.value) }))
                }
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setTempThresholds(qcThresholds);
                setShowQCControls(false);
              }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              取消
            </button>
            <button
              onClick={handleApplyThresholds}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium"
            >
              应用并重新评估
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总样本数"
          value={batchSamples.length}
          unit="份"
          icon={<Beaker className="w-5 h-5" />}
          color="teal"
          trend="neutral"
          trendValue={`批次：${currentBatch?.name.split('-').pop()}`}
        />
        <StatCard
          title="正常样本"
          value={normalCount + confirmedCount}
          unit="份"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="teal"
          trend="neutral"
          trendValue={`通过率 ${formatNumber(((normalCount + confirmedCount) / batchSamples.length) * 100, 1)}%`}
        />
        <StatCard
          title="警告样本"
          value={warningCount}
          unit="份"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
          trend="neutral"
          trendValue="需关注"
        />
        <StatCard
          title="污染样本"
          value={contaminatedCount}
          unit="份"
          icon={<Activity className="w-5 h-5" />}
          color="red"
          trend="neutral"
          trendValue={`污染率 ${currentBatch?.contaminationRate}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="质控趋势" subtitle="近6个批次异常率变化" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="异常率"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ fill: '#d97706', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="污染类型分布" subtitle="当前批次统计">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contaminationTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {contaminationTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="异常样本列表"
          subtitle={`共 ${abnormalSamples.length} 个样本需复核`}
          className="lg:col-span-2"
          headerAction={
            <Link
              to="/review"
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              全部复核 <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {abnormalSamples.slice(0, 6).map(sample => (
              <Link
                key={sample.id}
                to={`/sample/${sample.id}`}
                className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sample.status === 'contaminated' ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm text-slate-200 group-hover:text-teal-300 transition-colors">
                      {sample.name}
                    </p>
                    <p className="text-xs text-slate-500">{sample.sourceMaterial}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono">
                    置信度 {formatPercent(sample.contamination.confidence)}
                  </span>
                  <StatusBadge status={sample.status} size="sm" />
                </div>
              </Link>
            ))}
            {abnormalSamples.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">暂无异常样本</p>
            )}
          </div>
        </Card>

        <Card title="操作面板" subtitle="审计操作工具">
          <ActionPanel batchId={currentBatchId || 'batch-001'} />
        </Card>
      </div>

      <Card title="历史审计批次" subtitle="点击查看批次详情">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="pb-3 pl-2 font-medium">批次名称</th>
                <th className="pb-3 font-medium">创建时间</th>
                <th className="pb-3 font-medium">样本数</th>
                <th className="pb-3 font-medium">异常数</th>
                <th className="pb-3 font-medium">污染率</th>
                <th className="pb-3 font-medium">状态</th>
                <th className="pb-3 pr-2 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr
                  key={batch.id}
                  className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                    batch.id === currentBatchId ? 'bg-teal-900/20' : ''
                  }`}
                >
                  <td className="py-3 pl-2">
                    <button
                      onClick={() => setCurrentBatch(batch.id)}
                      className="text-slate-200 hover:text-teal-300 font-mono text-left"
                    >
                      {batch.name}
                    </button>
                  </td>
                  <td className="py-3 text-slate-400">{formatDate(batch.createdAt)}</td>
                  <td className="py-3 text-slate-300 font-mono">{batch.sampleCount}</td>
                  <td className="py-3">
                    <span
                      className={`font-mono ${
                        batch.abnormalCount > 0 ? 'text-amber-400' : 'text-teal-400'
                      }`}
                    >
                      {batch.abnormalCount}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`font-mono ${
                        batch.contaminationRate > 10 ? 'text-red-400' : 'text-slate-300'
                      }`}
                    >
                      {batch.contaminationRate}%
                    </span>
                  </td>
                  <td className="py-3">
                    <StatusBadge status={batch.status} size="sm" />
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <Link
                      to={`/report/${batch.id}`}
                      className="text-teal-400 hover:text-teal-300 text-xs"
                    >
                      查看报告
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
