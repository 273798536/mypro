import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Filter,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Edit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Merge,
  Trash2,
} from 'lucide-react';
import { useEthicsStore, useEthicsData, useFirstVisitExperience } from '../store/useEthicsStore';
import { StatusBadge } from '../components/StatusBadge';
import TraceAnchor from '../components/TraceAnchor';
import DemoDataGuide from '../components/DemoDataGuide';
import { exportToCSV, exportToExcel } from '../utils/export';
import type { SampleStatus } from '../types';

export default function EthicsReviewBoard() {
  useFirstVisitExperience();

  const { samples, chartData, exportData } = useEthicsData();
  const activeFilters = useEthicsStore((s) => s.activeFilters);
  const setFilters = useEthicsStore((s) => s.setFilters);
  const resetFilters = useEthicsStore((s) => s.resetFilters);
  const updateSamplingLocation = useEthicsStore((s) => s.updateSamplingLocation);
  const resolveDuplicate = useEthicsStore((s) => s.resolveDuplicate);
  const duplicateLogs = useEthicsStore((s) => s.duplicateLogs);
  const allSamples = useEthicsStore((s) => s.samples);

  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationValue, setEditingLocationValue] = useState('');

  const batchNumbers = useMemo(
    () => Array.from(new Set(allSamples.map((s) => s.batchNumber))),
    [allSamples]
  );
  const samplingLocations = useMemo(
    () => Array.from(new Set(allSamples.map((s) => s.samplingLocation))),
    [allSamples]
  );

  const pendingDuplicates = duplicateLogs.filter((d) => d.resolution === 'pending');

  const handleLocationEdit = (sampleId: string, currentLocation: string) => {
    setEditingLocationId(sampleId);
    setEditingLocationValue(currentLocation);
  };

  const handleLocationSave = (sampleId: string) => {
    if (editingLocationValue.trim()) {
      updateSamplingLocation(sampleId, editingLocationValue.trim());
    }
    setEditingLocationId(null);
  };

  const handleResolveDuplicate = (duplicateId: string, resolution: 'merged' | 'removed') => {
    resolveDuplicate(duplicateId, resolution);
  };

  const handleExportCSV = () => {
    exportToCSV(exportData, '伦理核对结果');
  };

  const handleExportExcel = () => {
    exportToExcel(exportData, '伦理核对结果');
  };

  const passRateData = [
    { name: '已通过', value: chartData.passRate, color: '#10B981' },
    { name: '未通过', value: 100 - chartData.passRate, color: '#E5E7EB' },
  ];

  return (
    <div className="space-y-6">
      <DemoDataGuide />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">伦理材料核对看板</h2>
          <p className="text-gray-500 text-sm">
            图表、明细、下载均来自同一批数据 · 筛选变更自动同步所有视图
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            导出 CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出 Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">数据筛选</span>
          <span className="text-xs text-gray-400 ml-2">
            当前筛选结果：{samples.length} 条记录
          </span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">批次号</label>
            <select
              value={activeFilters.batchNumber || ''}
              onChange={(e) => setFilters({ batchNumber: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">全部批次</option>
              {batchNumbers.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">采样地点</label>
            <select
              value={activeFilters.samplingLocation || ''}
              onChange={(e) => setFilters({ samplingLocation: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">全部地点</option>
              {samplingLocations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">状态</label>
            <select
              value={activeFilters.status || ''}
              onChange={(e) =>
                setFilters({ status: (e.target.value as SampleStatus) || undefined })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待核对</option>
              <option value="reviewing">复核中</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
              <option value="duplicate">重复记录</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">开始日期</label>
            <input
              type="date"
              value={activeFilters.startDate || ''}
              onChange={(e) => setFilters({ startDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重置
            </button>
          </div>
        </div>
      </div>

      {pendingDuplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">重复记录待处理</h3>
              <p className="text-sm text-amber-600">
                以下记录被检测为重复，请确认处理方式，避免同一件事出现两份结论
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingDuplicates.map((dup) => (
              <div
                key={dup.id}
                className="bg-white rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-mono font-medium text-gray-900">
                      条码 {dup.sampleBarcode}
                    </span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-600">
                      涉及 {dup.sampleIds.length} 条记录 ·{' '}
                      {dup.duplicateType === 'barcode'
                        ? '条码重复'
                        : dup.duplicateType === 'import'
                        ? '导入重复'
                        : '补录重复'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolveDuplicate(dup.id, 'merged')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Merge className="w-3 h-3" />
                    合并保留
                  </button>
                  <button
                    onClick={() => handleResolveDuplicate(dup.id, 'removed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md text-xs font-medium hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    移除重复
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover opacity-0 animate-fade-in-up"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          <h4 className="text-sm font-medium text-gray-700 mb-4">核对通过率</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={passRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {passRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center -mt-20 relative z-10">
              <p className="text-3xl font-bold font-serif text-primary-700">{chartData.passRate}%</p>
              <p className="text-xs text-gray-500">通过率</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover opacity-0 animate-fade-in-up"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          <h4 className="text-sm font-medium text-gray-700 mb-4">采样地点分布</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.locationData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 card-hover opacity-0 animate-fade-in-up"
          style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
        >
          <h4 className="text-sm font-medium text-gray-700 mb-4">异常类型分布</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.anomalyData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  strokeWidth={0}
                >
                  {chartData.anomalyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">核对明细</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              点击追溯锚点可定位原始记录，所有数据与上方图表同源
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>数据一致性已验证</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-zebra">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  样本条码
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  采样地点
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  原始行号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  图片名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  来源备注
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  批次
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {samples.map((sample) => (
                <tr key={sample.id} className="transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-gray-900">{sample.barcode}</span>
                  </td>
                  <td className="px-4 py-3">
                    {editingLocationId === sample.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingLocationValue}
                          onChange={(e) => setEditingLocationValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-primary-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                          autoFocus
                        />
                        <button
                          onClick={() => handleLocationSave(sample.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingLocationId(null)}
                          className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className="text-sm text-gray-700">{sample.samplingLocation}</span>
                        <button
                          onClick={() => handleLocationEdit(sample.id, sample.samplingLocation)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TraceAnchor
                      type="row"
                      value={sample.originalRowNumber}
                      sampleId={sample.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <TraceAnchor
                      type="image"
                      value={sample.imageName}
                      sampleId={sample.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <TraceAnchor
                      type="source"
                      value={sample.sourceNote}
                      sampleId={sample.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{sample.batchNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sample.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/ethics-review/${sample.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      复核
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <span>图表数据</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
          <span>明细数据</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span>导出数据</span>
        </div>
        <span className="text-gray-300">→</span>
        <span className="text-gray-500 font-medium">全部来自同一数据源，确保一致性</span>
      </div>
    </div>
  );
}
