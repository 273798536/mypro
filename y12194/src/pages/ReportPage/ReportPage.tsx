import { useState } from 'react';
import {
  FileText,
  Download,
  FileJson,
  FileSpreadsheet,
  FileCode,
  AlertTriangle,
  CheckCircle,
  BarChart2,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartStore } from '../../store/useChartStore';
import { QualityReport } from '../../types';
import { cn, formatTimestamp, exportToJSON, exportToCSV } from '../../utils';
import { ProjectSidebar } from '../../components/ProjectSidebar/ProjectSidebar';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export const ReportPage = () => {
  const { getCurrentProject, generateReport } = useChartStore();
  const project = getCurrentProject();
  const [report, setReport] = useState<QualityReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateReport();
      setReport(result);
      setIsGenerating(false);
    }, 500);
  };

  const handleExportJSON = () => {
    if (report) {
      exportToJSON(report, `quality-report-${Date.now()}.json`);
    }
  };

  const handleExportCSV = () => {
    if (report) {
      const issuesData = [
        ...report.timingOffsetIssues.map(i => ({ ...i, isTimingOffset: true })),
        ...report.otherIssues.map(i => ({ ...i, isTimingOffset: false })),
      ].map(issue => ({
        类型: issue.type,
        严重程度: issue.severity,
        时间: issue.time,
        描述: issue.description,
        音画偏移: issue.isTimingOffset ? '是' : '否',
      }));
      exportToCSV(issuesData, `quality-report-${Date.now()}.csv`);
    }
  };

  if (!project) {
    return (
      <div className="flex h-[calc(100vh-64px)]">
        <ProjectSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">请先选择或导入一个谱面项目</p>
          </div>
        </div>
      </div>
    );
  }

  const hasIssues = project.issues.length > 0;

  const issueTypeData = [
    { name: '音画偏移', value: project.issues.filter(i => i.type === 'timing_offset').length, color: '#ef4444' },
    { name: '双押过密', value: project.issues.filter(i => i.type === 'dense_chord').length, color: '#f59e0b' },
    { name: '长按漏判', value: project.issues.filter(i => i.type === 'hold_miss').length, color: '#3b82f6' },
    { name: '难度标签', value: project.issues.filter(i => i.type === 'difficulty_label').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const severityData = [
    { name: '严重', count: project.issues.filter(i => i.severity === 'critical').length },
    { name: '警告', count: project.issues.filter(i => i.severity === 'warning').length },
    { name: '提示', count: project.issues.filter(i => i.severity === 'info').length },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ProjectSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">报告输出</h1>
              <p className="text-slate-400 text-sm">生成质检报告并导出</p>
            </div>
            <div className="flex items-center gap-3">
              {!report && hasIssues && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <BarChart2 className="w-4 h-4" />
                  {isGenerating ? '生成中...' : '生成报告'}
                </button>
              )}
              {report && (
                <>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  >
                    <FileJson className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {report ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">{project.name}</h2>
                    <p className="text-sm text-slate-400">{project.fileName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">报告生成时间</p>
                    <p className="text-sm text-slate-300">{formatTimestamp(report.generatedAt)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-900/50">
                    <p className="text-xs text-slate-500 mb-1">总Note数</p>
                    <p className="text-2xl font-bold text-white">{report.totalNotes}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-xs text-red-400 mb-1">严重</p>
                    <p className="text-2xl font-bold text-red-400">{report.issuesCount.critical}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-400 mb-1">警告</p>
                    <p className="text-2xl font-bold text-amber-400">{report.issuesCount.warning}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-blue-400 mb-1">提示</p>
                    <p className="text-2xl font-bold text-blue-400">{report.issuesCount.info}</p>
                  </div>
                </div>
              </div>

              {report.timingOffsetIssues.length > 0 && (
                <div className="p-6 rounded-xl bg-red-500/5 border-2 border-red-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-red-400">
                      ⚠️ 音画偏移 - 失败路径高亮
                    </h3>
                    <span className="text-xs text-slate-500">
                      (共 {report.timingOffsetIssues.length} 处，已单独列出)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {report.timingOffsetIssues.slice(0, 5).map(issue => (
                      <div
                        key={issue.id}
                        className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                      >
                        <p className="text-sm text-slate-300">{issue.description}</p>
                      </div>
                    ))}
                    {report.timingOffsetIssues.length > 5 && (
                      <p className="text-xs text-slate-500 text-center">
                        还有 {report.timingOffsetIssues.length - 5} 处...
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">问题类型分布</h3>
                  {issueTypeData.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={issueTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {issueTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center">
                      <div className="text-center">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                        <p className="text-slate-400">无问题</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">严重程度分布</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData}>
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-300 mb-4">统计数据</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Note密度</p>
                    <p className="text-xl font-bold text-white">
                      {report.statistics.noteDensity} <span className="text-sm text-slate-400">个/秒</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">平均间隔</p>
                    <p className="text-xl font-bold text-white">
                      {report.statistics.averageInterval} <span className="text-sm text-slate-400">ms</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">难度评分</p>
                    <p className="text-xl font-bold text-white">
                      {report.statistics.difficultyScore} <span className="text-sm text-slate-400">/ 100</span>
                    </p>
                  </div>
                </div>
              </div>

              {report.otherIssues.length > 0 && (
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-4">其他问题列表</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {report.otherIssues.map(issue => (
                      <div
                        key={issue.id}
                        className={cn(
                          'p-3 rounded-lg border',
                          issue.severity === 'critical' && 'bg-red-500/10 border-red-500/30',
                          issue.severity === 'warning' && 'bg-amber-500/10 border-amber-500/30',
                          issue.severity === 'info' && 'bg-blue-500/10 border-blue-500/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-300">{issue.description}</p>
                          <span className="text-xs text-slate-500">{issue.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-600" />
              </div>
              {hasIssues ? (
                <>
                  <p className="text-slate-400 mb-4">点击"生成报告"创建质检报告</p>
                  <p className="text-xs text-slate-600 max-w-sm">
                    报告将包含问题统计、图表分析和详细问题列表，支持JSON和CSV格式导出
                  </p>
                </>
              ) : (
                <>
                  <p className="text-slate-400 mb-4">请先完成质检分析</p>
                  <p className="text-xs text-slate-600 max-w-sm">
                    请前往"质检分析"页面执行质检检测后再生成报告
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
