import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Eye, X, Clock, Users, TrendingUp, BarChart3, Lightbulb, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimulationResult, DataGroup } from '@/types';

const groupConfig: Record<DataGroup, { label: string; color: string; bgColor: string; borderColor: string }> = {
  normal: { label: '正常数据', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  boundary: { label: '边界值', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  badInput: { label: '坏输入', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

export default function Results() {
  const { results, experiments, tracePanelOpen, selectedResult, openTracePanel, closeTracePanel } = useStore();
  const [groupFilter, setGroupFilter] = useState<DataGroup | 'all'>('all');

  const filteredResults = groupFilter === 'all'
    ? results
    : results.filter(r => r.dataGroup === groupFilter);

  const normalResults = results.filter(r => r.dataGroup === 'normal');
  const boundaryResults = results.filter(r => r.dataGroup === 'boundary');
  const badInputResults = results.filter(r => r.dataGroup === 'badInput');

  function getExperimentName(experimentId: string) {
    return experiments.find(e => e.id === experimentId)?.name || '未知实验';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">结果分析</h2>
          <p className="text-sm text-slate-500 mt-1">查看排队模拟结果，支持追溯排队过程和优化建议</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGroupFilter('all')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              groupFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            全部 ({results.length})
          </button>
          <button
            onClick={() => setGroupFilter('normal')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              groupFilter === 'normal'
                ? 'bg-green-600 text-white'
                : 'bg-white text-green-600 hover:bg-green-50 border border-green-200'
            )}
          >
            正常 ({normalResults.length})
          </button>
          <button
            onClick={() => setGroupFilter('boundary')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              groupFilter === 'boundary'
                ? 'bg-amber-500 text-white'
                : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-200'
            )}
          >
            边界值 ({boundaryResults.length})
          </button>
          <button
            onClick={() => setGroupFilter('badInput')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              groupFilter === 'badInput'
                ? 'bg-red-500 text-white'
                : 'bg-white text-red-600 hover:bg-red-50 border border-red-200'
            )}
          >
            坏输入 ({badInputResults.length})
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无模拟结果</h3>
          <p className="text-slate-500">请先前往批量实验页面运行实验方案</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResultSummaryCard
              title="正常数据结果"
              results={normalResults}
              icon={<Users className="w-5 h-5" />}
              colorClass="green"
            />
            <ResultSummaryCard
              title="边界值结果"
              results={boundaryResults}
              icon={<Activity className="w-5 h-5" />}
              colorClass="amber"
            />
            <ResultSummaryCard
              title="坏输入结果"
              results={badInputResults}
              icon={<TrendingUp className="w-5 h-5" />}
              colorClass="red"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">模拟结果列表</h3>
              <p className="text-xs text-slate-500 mt-1">点击"查看详情"可追溯排队模拟过程</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">实验名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">数据分组</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">平均等待</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">最大等待</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">平均队列</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">窗口利用率</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">已办理</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                        {getExperimentName(result.experimentId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border',
                          groupConfig[result.dataGroup].color,
                          groupConfig[result.dataGroup].bgColor,
                          groupConfig[result.dataGroup].borderColor
                        )}>
                          {groupConfig[result.dataGroup].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {result.avgWaitTime} 分钟
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'text-sm font-medium',
                          result.maxWaitTime > 30 ? 'text-red-600' :
                          result.maxWaitTime > 15 ? 'text-amber-600' : 'text-slate-600'
                        )}>
                          {result.maxWaitTime} 分钟
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {result.avgQueueLength} 人
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                result.windowUtilization > 0.8 ? 'bg-red-500' :
                                result.windowUtilization > 0.6 ? 'bg-amber-500' : 'bg-green-500'
                              )}
                              style={{ width: `${Math.min(result.windowUtilization * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">
                            {(result.windowUtilization * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {result.totalServed} 人
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openTracePanel(result)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tracePanelOpen && selectedResult && (
        <TracePanel result={selectedResult} onClose={closeTracePanel} getExperimentName={getExperimentName} />
      )}
    </div>
  );
}

function ResultSummaryCard({
  title,
  results,
  icon,
  colorClass
}: {
  title: string;
  results: SimulationResult[];
  icon: React.ReactNode;
  colorClass: 'green' | 'amber' | 'red';
}) {
  const colorMap = {
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconBg: 'bg-green-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', iconBg: 'bg-amber-100' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-100' },
  };

  const colors = colorMap[colorClass];
  const avgWaitTime = results.length > 0
    ? (results.reduce((sum, r) => sum + r.avgWaitTime, 0) / results.length).toFixed(1)
    : '-';

  return (
    <div className={cn('rounded-xl border-2 p-5', colors.bg, colors.border)}>
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-xl', colors.iconBg)}>
          <div className={colors.text}>{icon}</div>
        </div>
        <div className="flex-1">
          <h3 className={cn('font-semibold', colors.text)}>{title}</h3>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500">实验数</div>
              <div className="text-2xl font-bold text-slate-800">{results.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">平均等待</div>
              <div className="text-2xl font-bold text-slate-800">{avgWaitTime}<span className="text-sm font-normal text-slate-500 ml-1">分钟</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TracePanel({
  result,
  onClose,
  getExperimentName
}: {
  result: SimulationResult;
  onClose: () => void;
  getExperimentName: (id: string) => string;
}) {
  const [activeTab, setActiveTab] = useState<'queue' | 'optimization' | 'distribution'>('queue');

  const queueChartData = result.queueTrace.timeline
    .filter(e => e.type === 'arrive')
    .map((e, i) => ({
      time: `${Math.floor(e.time / 60) + 8}:${String(Math.floor(e.time % 60)).padStart(2, '0')}`,
      queueLength: Math.min(i % 5 + 1, 8)
    }));

  const distributionChartData = result.waitDistribution.buckets.map(b => ({
    range: b.range,
    count: b.count
  }));

  const utilizationData = result.queueTrace.windowActivity.map(a => ({
    window: `窗口${a.windowNo}`,
    繁忙时间: Math.round(a.busyTime),
    空闲时间: Math.max(0, 480 - Math.round(a.busyTime))
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">结果追溯</h3>
            <p className="text-sm text-slate-500 mt-1">{getExperimentName(result.experimentId)} - {groupConfig[result.dataGroup].label}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('queue')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'queue'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Activity className="w-4 h-4" />
              排队模拟
            </button>
            <button
              onClick={() => setActiveTab('optimization')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'optimization'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Lightbulb className="w-4 h-4" />
              窗口优化
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'distribution'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <BarChart3 className="w-4 h-4" />
              等待分布
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'queue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-xs text-blue-600">平均等待时间</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{result.avgWaitTime} 分钟</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <div className="text-xs text-amber-600">最大等待时间</div>
                  <div className="text-2xl font-bold text-amber-700 mt-1">{result.maxWaitTime} 分钟</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-xs text-green-600">平均队列长度</div>
                  <div className="text-2xl font-bold text-green-700 mt-1">{result.avgQueueLength} 人</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-xs text-purple-600">窗口利用率</div>
                  <div className="text-2xl font-bold text-purple-700 mt-1">{(result.windowUtilization * 100).toFixed(0)}%</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4">队列长度变化趋势</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={queueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="queueLength"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        name="队列长度"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4">窗口活动统计</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={utilizationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="window" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Bar dataKey="繁忙时间" fill="#3b82f6" stackId="a" />
                      <Bar dataKey="空闲时间" fill="#e2e8f0" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-blue-100 text-sm">推荐窗口数量</div>
                    <div className="text-5xl font-bold mt-2">{result.optimization.recommendedWindows}</div>
                    <div className="text-blue-100 mt-2">个窗口</div>
                  </div>
                  <div className="p-4 bg-white/20 rounded-xl">
                    <Lightbulb className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  高峰时段建议
                </h4>
                <ul className="space-y-3">
                  {result.optimization.peakHourSuggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-slate-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  成本效益分析
                </h4>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {result.optimization.costAnalysis}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'distribution' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-sm text-slate-500">90% 分位等待时间</div>
                  <div className="text-3xl font-bold text-slate-800 mt-2">
                    {result.waitDistribution.percentile90.toFixed(1)}
                    <span className="text-sm font-normal text-slate-500 ml-1">分钟</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">90% 的访客等待时间不超过此值</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-sm text-slate-500">95% 分位等待时间</div>
                  <div className="text-3xl font-bold text-slate-800 mt-2">
                    {result.waitDistribution.percentile95.toFixed(1)}
                    <span className="text-sm font-normal text-slate-500 ml-1">分钟</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">95% 的访客等待时间不超过此值</div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4">等待时间分布</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        formatter={(value: number) => [`${value} 人`, '访客数量']}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="访客数量" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h4 className="font-semibold text-slate-800 mb-4">分布详情</h4>
                <div className="space-y-3">
                  {result.waitDistribution.buckets.map((bucket, i) => {
                    const total = result.waitDistribution.buckets.reduce((sum, b) => sum + b.count, 0);
                    const percent = total > 0 ? (bucket.count / total * 100).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-slate-600">{bucket.range}</div>
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-sm font-medium text-slate-800">{bucket.count} 人</span>
                          <span className="text-xs text-slate-400 ml-1">({percent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
