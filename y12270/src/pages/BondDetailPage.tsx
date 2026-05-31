import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, GitBranch, Hash, Clock, User, FileText, Link2, Building2, Target, PieChart as PieChartIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getIssueTypeLabel, getSeverityColor } from '../engine/QualityValidator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

const INDUSTRY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function BondDetailPage() {
  const { bondId } = useParams<{ bondId: string }>();
  const navigate = useNavigate();
  const { holdings, analysisResult, qualityIssues, exportRecords, exportCorrespondences } = useAppStore();

  const bond = holdings.find(h => h.bondId === bondId);
  const bondIssues = qualityIssues.filter(i => i.bondId === bondId);

  const industryDistribution = analysisResult ? (() => {
    const map = new Map<string, number>();
    holdings.forEach(h => {
      map.set(h.industry, (map.get(h.industry) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  })() : [];

  const durationByIndustry = analysisResult ? (() => {
    const map = new Map<string, { total: number; count: number }>();
    holdings.forEach(h => {
      const existing = map.get(h.industry) || { total: 0, count: 0 };
      map.set(h.industry, { total: existing.total + h.duration, count: existing.count + 1 });
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      avgDuration: data.total / data.count,
      bondDuration: bond?.industry === name ? bond.duration : null
    }));
  })() : [];

  const relatedExports = exportCorrespondences
    .filter(c => c.holdingSnapshot.some(h => h.bondId === bondId))
    .map(c => {
      const record = exportRecords.find(r => r.exportId === c.exportId);
      return { correspondence: c, record };
    })
    .filter(item => item.record);

  if (!bond) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-slate-900/80 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm">
            <ArrowLeft size={14} />
            返回
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
            <p className="text-slate-300 text-lg mb-2">未找到该债券</p>
            <p className="text-slate-500 text-sm">债券ID: {bondId}</p>
          </div>
        </div>
      </div>
    );
  }

  const durationDeviation = analysisResult
    ? bond.duration - analysisResult.avgDuration
    : 0;

  const yieldDeviation = analysisResult
    ? bond.yield - analysisResult.avgYield
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-12 bg-slate-900/80 border-b border-slate-700 flex items-center px-4 gap-2 flex-shrink-0">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-sm">
          <ArrowLeft size={14} />
          返回工作台
        </button>
        <span className="text-slate-600">/</span>
        <span className="text-slate-300 text-sm">债券详情</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-100 mb-2">{bond.bondName}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <Hash size={14} />
                    {bond.bondId}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 size={14} />
                    {bond.industry}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch size={14} />
                    {bond.source}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(bond.importTime).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-700/50 rounded-lg">
                <div className="text-[10px] text-slate-500 mb-1">持仓权重</div>
                <div className="text-lg font-bold text-slate-200">
                  {bond.weight !== null ? `${bond.weight}%` : '未设置'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={16} className="text-blue-400" />
                  <span className="text-xs text-slate-400">久期</span>
                </div>
                <div className="text-2xl font-bold text-blue-400">{bond.duration.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-1">年</div>
                {analysisResult && (
                  <div className={`mt-2 flex items-center gap-1 text-[10px] ${durationDeviation >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {durationDeviation >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    较平均值 {durationDeviation >= 0 ? '+' : ''}{durationDeviation.toFixed(2)}年
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span className="text-xs text-slate-400">收益率</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{bond.yield.toFixed(2)}%</div>
                {analysisResult && (
                  <div className={`mt-2 flex items-center gap-1 text-[10px] ${yieldDeviation >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {yieldDeviation >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    较平均值 {yieldDeviation >= 0 ? '+' : ''}{yieldDeviation.toFixed(2)}%
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-purple-400" />
                  <span className="text-xs text-slate-400">面值</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">{(bond.faceValue / 10000).toFixed(0)}</div>
                <div className="text-[10px] text-slate-500 mt-1">万元</div>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span className="text-xs text-slate-400">质量问题</span>
                </div>
                <div className={`text-2xl font-bold ${bondIssues.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {bondIssues.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {bondIssues.find(i => i.severity === 'high') ? '含高风险问题' : bondIssues.length > 0 ? '需关注' : '无问题'}
                </div>
              </div>
            </div>
          </div>

          {bondIssues.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-400" />
                数据质量问题
              </h2>
              <div className="space-y-3">
                {bondIssues.map(issue => (
                  <div
                    key={issue.issueId}
                    className={`p-4 bg-slate-900/50 rounded-lg border ${issue.resolved ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getSeverityColor(issue.severity) }}
                      />
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                      <span className="text-xs text-slate-500">
                        严重程度: {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                      </span>
                      {issue.resolved && (
                        <span className="text-xs text-emerald-400">已解决</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 mb-2">{issue.description}</p>
                    <div className="p-3 bg-slate-800/50 rounded text-xs">
                      <p className="text-amber-400/90 mb-1">影响说明: {issue.impact}</p>
                      <p className="text-slate-500">受影响结果: {issue.affectedResults.join(' → ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-blue-400" />
                行业久期对比
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationByIndustry} layout="vertical" margin={{ left: 60, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={60} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="avgDuration" fill="#3b82f6" radius={[0, 4, 4, 0]} name="行业平均久期" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {bond.industry && (
                <div className="mt-3 pt-3 border-t border-slate-700 text-xs">
                  <span className="text-slate-400">该债券所属行业「{bond.industry}」平均久期: </span>
                  <span className="text-blue-400 font-mono">
                    {durationByIndustry.find(d => d.name === bond.industry)?.avgDuration.toFixed(2)}年
                  </span>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <PieChartIcon size={18} className="text-emerald-400" />
                行业分布
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={industryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {industryDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={entry.name === bond.industry ? INDUSTRY_COLORS[index % INDUSTRY_COLORS.length] : `${INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]}66`}
                          stroke={entry.name === bond.industry ? INDUSTRY_COLORS[index % INDUSTRY_COLORS.length] : 'none'}
                          strokeWidth={entry.name === bond.industry ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="flex flex-wrap gap-2">
                  {industryDistribution.map((item, index) => (
                    <div
                      key={item.name}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${item.name === bond.industry ? 'bg-slate-700' : ''}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length] }}
                      />
                      <span className="text-slate-400">{item.name}</span>
                      <span className="text-slate-500">{item.value}只</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Link2 size={18} className="text-amber-400" />
              导出链路追溯
            </h2>
            {relatedExports.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                该债券暂无导出记录
              </div>
            ) : (
              <div className="space-y-3">
                {relatedExports.map(({ correspondence, record }) => record && (
                  <div key={record.exportId} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText size={14} className="text-blue-400" />
                          <span className="text-sm font-medium text-slate-200">{record.fileName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {record.exportedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(record.exportedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs flex items-center gap-1 ${record.consistencyPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                          {record.consistencyPassed ? '✓ 一致性通过' : '✗ 一致性失败'}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono mt-1">
                          {record.fileHash.slice(0, 16)}...
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded">
                      <div className="text-xs text-blue-300 mb-2">久期结论链路</div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">
                          债券持仓
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">
                          久期{bond.duration.toFixed(2)}年
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="px-2 py-1 bg-slate-800 rounded text-slate-400">
                          报告导出
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] text-slate-500">
                      分析参数: 久期范围{correspondence.parametersSnapshot.durationRange[0]}-{correspondence.parametersSnapshot.durationRange[1]}年, 
                      收益率范围{correspondence.parametersSnapshot.yieldRange[0]}-{correspondence.parametersSnapshot.yieldRange[1]}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Target size={18} className="text-purple-400" />
              久期分解
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-slate-900/50 rounded text-center">
                <div className="text-xs text-slate-500 mb-1">票面久期</div>
                <div className="text-lg font-bold text-slate-200">{bond.duration.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded text-center">
                <div className="text-xs text-slate-500 mb-1">修正久期</div>
                <div className="text-lg font-bold text-blue-400">{(bond.duration / (1 + bond.yield / 100)).toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded text-center">
                <div className="text-xs text-slate-500 mb-1">基点价值</div>
                <div className="text-lg font-bold text-emerald-400">{((bond.faceValue * bond.duration * 0.0001) / (1 + bond.yield / 100)).toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded text-center">
                <div className="text-xs text-slate-500 mb-1">凸性</div>
                <div className="text-lg font-bold text-amber-400">{(bond.duration * bond.duration / 100).toFixed(2)}</div>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded">
              <div className="text-xs text-slate-400 mb-2">久期偏离度分析</div>
              {analysisResult && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">组合平均久期</span>
                    <span className="text-slate-300 font-mono">{analysisResult.avgDuration.toFixed(2)}年</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">该债券久期</span>
                    <span className="text-blue-400 font-mono">{bond.duration.toFixed(2)}年</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">绝对偏离</span>
                    <span className={`font-mono ${Math.abs(durationDeviation) > 3 ? 'text-red-400' : Math.abs(durationDeviation) > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {durationDeviation >= 0 ? '+' : ''}{durationDeviation.toFixed(2)}年
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">相对偏离</span>
                    <span className="text-slate-300 font-mono">
                      {analysisResult.avgDuration > 0 ? `${((durationDeviation / analysisResult.avgDuration) * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="text-[11px] text-slate-400">
                      {Math.abs(durationDeviation) > 3
                        ? '⚠️ 该债券久期显著偏离组合平均，建议关注利率风险暴露'
                        : Math.abs(durationDeviation) > 1
                        ? '⚡ 该债券久期与组合平均存在一定差异，需结合投资策略评估'
                        : '✓ 该债券久期与组合平均接近，风险暴露较为均衡'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
