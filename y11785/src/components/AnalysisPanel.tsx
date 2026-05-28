import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNetworkStore } from '../store/networkStore';
import { getBottleneckColor, getBottleneckSeverity } from '../utils/bottleneckAnalyzer';
import { TrendingUp, AlertTriangle, Clock, Download, Zap } from 'lucide-react';

export function AnalysisPanel() {
  const { currentScenario, isAnalyzing, runAnalysis, setSelectedEdge } = useNetworkStore();
  const { lastAnalysis, nodes, edges } = currentScenario;

  const utilizationData = edges
    .filter(e => !e.disabled && e.capacity > 0)
    .map(edge => {
      const flow = lastAnalysis?.edgeFlows[edge.id] || 0;
      const utilization = edge.capacity > 0 ? (flow / edge.capacity) * 100 : 0;
      return {
        id: edge.id,
        name: `${nodes.find(n => n.id === edge.from)?.name || edge.from}→${nodes.find(n => n.id === edge.to)?.name || edge.to}`,
        flow,
        capacity: edge.capacity,
        utilization: Math.min(utilization, 100)
      };
    })
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 10);

  const handleBottleneckClick = (edgeId: string) => {
    setSelectedEdge(edgeId);
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-4">分析结果</h3>
        
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || nodes.length === 0 || edges.length === 0}
          className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              计算中...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              运行最大流分析
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {lastAnalysis ? (
          <>
            {/* 最大流统计 */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 opacity-80" />
                <span className="text-sm opacity-80">最大吞吐量</span>
              </div>
              <div className="text-3xl font-bold">{lastAnalysis.maxFlow.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                <Clock className="w-3 h-3" />
                计算耗时 {lastAnalysis.computeTime.toFixed(2)}ms
              </div>
            </div>

            {/* 瓶颈清单 */}
            {lastAnalysis.bottlenecks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h4 className="font-semibold text-slate-700">瓶颈清单</h4>
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                    {lastAnalysis.bottlenecks.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {lastAnalysis.bottlenecks.map((bottleneck, index) => {
                    const edge = edges.find(e => e.id === bottleneck.edgeId);
                    const fromNode = nodes.find(n => n.id === edge?.from);
                    const toNode = nodes.find(n => n.id === edge?.to);
                    const color = getBottleneckColor(bottleneck.utilization);
                    const severity = getBottleneckSeverity(bottleneck.utilization);
                    
                    return (
                      <div
                        key={bottleneck.edgeId}
                        className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors bg-white shadow-sm"
                        onClick={() => handleBottleneckClick(bottleneck.edgeId)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">
                            #{index + 1} {fromNode?.name} → {toNode?.name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              severity === 'critical' ? 'bg-red-100 text-red-600' :
                              severity === 'high' ? 'bg-orange-100 text-orange-600' :
                              'bg-yellow-100 text-yellow-600'
                            }`}
                          >
                            {severity === 'critical' ? '严重' : severity === 'high' ? '高风险' : '中等'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-500 mb-2">
                          流量 {bottleneck.flow} / 容量 {bottleneck.capacity}
                        </div>
                        
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${bottleneck.utilization * 100}%`,
                              backgroundColor: color
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-slate-500">利用率</span>
                          <span style={{ color }}>{(bottleneck.utilization * 100).toFixed(1)}%</span>
                        </div>
                        
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          {bottleneck.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 利用率图表 */}
            {utilizationData.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-700 mb-3">线路利用率 Top 10</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={utilizationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
                      <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(1)}%`, '利用率']}
                        labelFormatter={(label) => `线路: ${label}`}
                      />
                      <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                        {utilizationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBottleneckColor(entry.utilization / 100)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">点击"运行最大流分析"<br />查看瓶颈分析结果</p>
          </div>
        )}
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={() => {
            const report = useNetworkStore.getState().exportReport();
            const blob = new Blob([report], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `瓶颈分析报告_${new Date().toISOString().slice(0, 10)}.md`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!lastAnalysis}
          className="w-full py-2 px-4 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          导出分析报告
        </button>
      </div>
    </div>
  );
}
