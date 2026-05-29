import { useState } from 'react';
import { useLedgerStore } from '../store/useLedgerStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, FileText, Download, AlertTriangle, CheckCircle, Clock, TrendingUp, Filter, ListChecks, XCircle } from 'lucide-react';
import { exportData } from '../utils/export';
import { getAnomalyLabel } from '../utils/export';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const { stats, getFilteredTransactions } = useLedgerStore();
  const filteredTxs = getFilteredTransactions();
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('excel');
  const [exportOptions, setExportOptions] = useState({
    includeUnhandled: true,
    includeRevised: true,
    includePendingReview: true,
    includeAnomalies: true,
  });

  const unhandledTxs = filteredTxs.filter(tx => tx.status === 'normal' && tx.anomalies.length === 0);
  const revisedTxs = filteredTxs.filter(tx => tx.status === 'revised');
  const pendingTxs = filteredTxs.filter(tx => tx.status === 'pending_review');
  const anomalyTxs = filteredTxs.filter(tx => tx.status === 'anomaly');

  const anomalyPieData = Object.entries(stats.anomalyBreakdown)
    .filter(([_, v]) => v > 0)
    .map(([k, v], i) => ({
      name: getAnomalyLabel(k),
      value: v,
      fill: COLORS[i % COLORS.length],
    }));

  const handleExport = () => {
    exportData(filteredTxs, stats, {
      format: exportFormat,
      ...exportOptions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">报告导出</h1>
          <p className="text-navy-400 text-sm mt-1">
            生成分类成本报告，支持多种格式导出
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-800 rounded-lg">
              <ListChecks className="w-5 h-5 text-navy-300" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">未处理</p>
              <p className="text-2xl font-bold text-white font-mono">{stats.unhandledCount}</p>
            </div>
          </div>
          <p className="text-navy-500 text-xs mt-2">
            ¥{unhandledTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
          </p>
        </div>

        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">已修正</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{stats.revisedCount}</p>
            </div>
          </div>
          <p className="text-navy-500 text-xs mt-2">
            ¥{revisedTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
          </p>
        </div>

        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">待人工确认</p>
              <p className="text-2xl font-bold text-amber-400 font-mono">{stats.pendingReviewCount}</p>
            </div>
          </div>
          <p className="text-navy-500 text-xs mt-2">
            ¥{pendingTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
          </p>
        </div>

        <div className="cli-card border-red-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">异常待处理</p>
              <p className="text-2xl font-bold text-red-400 font-mono">{stats.anomalyCount}</p>
            </div>
          </div>
          <p className="text-navy-500 text-xs mt-2">
            ¥{anomalyTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-navy-400" />
            每日成本趋势
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyCost}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSubsidy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                <XAxis dataKey="date" stroke="#829ab1" fontSize={11} />
                <YAxis stroke="#829ab1" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#102a43',
                    border: '1px solid #334e68',
                    borderRadius: '6px',
                    color: '#d9e2ec',
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                />
                <Legend />
                <Area type="monotone" dataKey="pointsCost" name="积分成本" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPoints)" />
                <Area type="monotone" dataKey="subsidyCost" name="补贴成本" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSubsidy)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            异常类型分布
          </h3>
          {anomalyPieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={anomalyPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {anomalyPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102a43',
                      border: '1px solid #334e68',
                      borderRadius: '6px',
                      color: '#d9e2ec',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-navy-500">
              暂无异常数据
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="cli-card lg:col-span-2">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-navy-400" />
            按活动成本对比
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.costByCampaign}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334e68" />
                <XAxis dataKey="campaignName" stroke="#829ab1" fontSize={11} />
                <YAxis stroke="#829ab1" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#102a43',
                    border: '1px solid #334e68',
                    borderRadius: '6px',
                    color: '#d9e2ec',
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, '成本']}
                />
                <Bar dataKey="cost" name="总成本" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cli-card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-navy-400" />
            导出设置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-navy-400 mb-2">导出格式</label>
              <div className="space-y-2">
                {(['csv', 'json', 'excel'] as const).map(f => (
                  <label key={f} className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      checked={exportFormat === f}
                      onChange={() => setExportFormat(f)}
                      className="accent-navy-500"
                    />
                    {f === 'csv' ? 'CSV 表格' : f === 'json' ? 'JSON 数据' : 'Markdown 报告'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-navy-400 mb-2">包含内容</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeUnhandled}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeUnhandled: e.target.checked })}
                    className="accent-navy-500 rounded"
                  />
                  未处理交易
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeRevised}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeRevised: e.target.checked })}
                    className="accent-navy-500 rounded"
                  />
                  已修正交易
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={exportOptions.includePendingReview}
                    onChange={(e) => setExportOptions({ ...exportOptions, includePendingReview: e.target.checked })}
                    className="accent-navy-500 rounded"
                  />
                  待人工确认
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAnomalies}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeAnomalies: e.target.checked })}
                    className="accent-navy-500 rounded"
                  />
                  异常交易
                </label>
              </div>
            </div>

            <button
              onClick={handleExport}
              className="w-full cli-btn-primary flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出报告
            </button>
          </div>
        </div>
      </div>

      <div className="cli-card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-navy-400" />
          分类明细预览
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-navy-200 text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-navy-400" />
                未处理交易 ({unhandledTxs.length} 笔)
              </h4>
              <span className="text-navy-400 text-xs font-mono">
                ¥{unhandledTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
              </span>
            </div>
            {unhandledTxs.length > 0 ? (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {unhandledTxs.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs py-1 px-2 bg-navy-900/50 rounded">
                    <span className="font-mono text-navy-300">{tx.id}</span>
                    <span className="text-navy-400">{tx.merchantName}</span>
                    <span className="font-mono text-white">¥{(tx.totalCost || 0).toFixed(2)}</span>
                  </div>
                ))}
                {unhandledTxs.length > 5 && (
                  <div className="text-center text-xs text-navy-500 py-1">
                    ... 还有 {unhandledTxs.length - 5} 条记录
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-navy-500 py-4">暂无未处理交易</div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-navy-200 text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                已修正交易 ({revisedTxs.length} 笔)
              </h4>
              <span className="text-navy-400 text-xs font-mono">
                ¥{revisedTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
              </span>
            </div>
            {revisedTxs.length > 0 ? (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {revisedTxs.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs py-1 px-2 bg-emerald-950/20 rounded">
                    <span className="font-mono text-navy-300">{tx.id}</span>
                    <span className="text-navy-400">{tx.merchantName}</span>
                    <span className="font-mono text-white">¥{(tx.totalCost || 0).toFixed(2)}</span>
                    <span className="text-emerald-400 text-[10px]">{tx.revisionHistory.length} 次修正</span>
                  </div>
                ))}
                {revisedTxs.length > 5 && (
                  <div className="text-center text-xs text-navy-500 py-1">
                    ... 还有 {revisedTxs.length - 5} 条记录
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-navy-500 py-4">暂无已修正交易</div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-navy-200 text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                需要人工确认 ({pendingTxs.length} 笔)
              </h4>
              <span className="text-navy-400 text-xs font-mono">
                ¥{pendingTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
              </span>
            </div>
            {pendingTxs.length > 0 ? (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {pendingTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs py-1 px-2 bg-amber-950/20 rounded">
                    <span className="font-mono text-navy-300">{tx.id}</span>
                    <span className="text-navy-400">{tx.merchantName}</span>
                    <span className="font-mono text-white">¥{(tx.totalCost || 0).toFixed(2)}</span>
                    <span className="text-amber-400 text-[10px] max-w-xs truncate">{tx.anomalyNotes}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-navy-500 py-4">暂无待确认交易</div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-navy-200 text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                异常交易 ({anomalyTxs.length} 笔)
              </h4>
              <span className="text-navy-400 text-xs font-mono">
                ¥{anomalyTxs.reduce((s, tx) => s + (tx.totalCost || 0), 0).toFixed(2)}
              </span>
            </div>
            {anomalyTxs.length > 0 ? (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {anomalyTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-xs py-1 px-2 bg-red-950/20 rounded">
                    <span className="font-mono text-navy-300">{tx.id}</span>
                    <span className="text-navy-400">{tx.merchantName}</span>
                    <span className="font-mono text-white">¥{(tx.totalCost || 0).toFixed(2)}</span>
                    <div className="flex gap-1">
                      {tx.anomalies.map(a => (
                        <span key={a} className="text-red-400 text-[10px]">{getAnomalyLabel(a)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-navy-500 py-4">暂无异常交易</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
