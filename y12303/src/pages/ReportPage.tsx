import { FileText, Download, RefreshCw, PieChart, TrendingUp } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { downloadReport } from '../utils/reportGenerator';

const COLORS = ['#059669', '#DC2626', '#D97706', '#7C3AED'];

export function ReportPage() {
  const cracks = useAppStore((state) => state.cracks);
  const reports = useAppStore((state) => state.reports);
  const generateReport = useAppStore((state) => state.generateReport);

  const stats = {
    total: cracks.length,
    duplicate: cracks.filter((c) => c.isDuplicate).length,
    missing: cracks.filter((c) => c.status === 'missing_field').length,
    late: cracks.filter((c) => c.status === 'late_added').length,
    normal: cracks.filter((c) => c.status === 'normal' && !c.isDuplicate).length,
    highRisk: cracks.filter((c) => c.riskLevel === 'high').length,
    mediumRisk: cracks.filter((c) => c.riskLevel === 'medium').length,
    lowRisk: cracks.filter((c) => c.riskLevel === 'low').length,
  };

  const statusData = [
    { name: '正常', value: stats.normal, color: '#059669' },
    { name: '重复', value: stats.duplicate, color: '#DC2626' },
    { name: '缺字段', value: stats.missing, color: '#D97706' },
    { name: '晚补', value: stats.late, color: '#7C3AED' },
  ];

  const riskData = [
    { name: '低风险', count: stats.lowRisk, fill: '#059669' },
    { name: '中风险', count: stats.mediumRisk, fill: '#D97706' },
    { name: '高风险', count: stats.highRisk, fill: '#DC2626' },
  ];

  const latestReport = reports[reports.length - 1];

  const handleGenerateReport = () => {
    generateReport();
  };

  const handleDownloadReport = () => {
    if (latestReport) {
      downloadReport(latestReport);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">风险报告</h2>
              <p className="text-xs text-slate-500">数据统计与风险评估报告</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              生成报告
            </button>
            {latestReport && (
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-600/20 rounded flex items-center justify-center">
                <PieChart className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-xs text-slate-500">监测点总数</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-status-duplicate/10 rounded-lg p-4 border border-status-duplicate/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-status-duplicate/20 rounded flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-status-duplicate" />
              </div>
              <span className="text-xs text-slate-500">重复记录</span>
            </div>
            <p className="text-3xl font-bold text-status-duplicate">{stats.duplicate}</p>
          </div>
          <div className="bg-status-missing/10 rounded-lg p-4 border border-status-missing/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-status-missing/20 rounded flex items-center justify-center">
                <FileText className="w-4 h-4 text-status-missing" />
              </div>
              <span className="text-xs text-slate-500">数据缺失</span>
            </div>
            <p className="text-3xl font-bold text-status-missing">{stats.missing}</p>
          </div>
          <div className="bg-status-normal/10 rounded-lg p-4 border border-status-normal/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-status-normal/20 rounded flex items-center justify-center">
                <PieChart className="w-4 h-4 text-status-normal" />
              </div>
              <span className="text-xs text-slate-500">高风险</span>
            </div>
            <p className="text-3xl font-bold text-status-normal">{stats.highRisk}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-4">数据状态分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-4">风险等级分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {latestReport && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">最新报告</h3>
              <span className="text-xs text-slate-500">生成时间: {latestReport.generateTime}</span>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {latestReport.content}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
