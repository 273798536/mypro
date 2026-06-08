import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { OutlierType } from '../types';
import { getOutlierTypeLabel } from '../mockData';

const OUTLIER_TYPE_BADGE: Record<OutlierType, string> = {
  drift: 'bg-purple-100 text-purple-800',
  'camera-loss': 'bg-red-100 text-red-800',
  interference: 'bg-orange-100 text-orange-800',
  noise: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-gray-100 text-gray-800',
};

export function ReportPage() {
  const { currentSession } = useApp();

  const stats = useMemo(() => {
    if (!currentSession) return null;
    const outliers = currentSession.points.filter(p => p.isOutlier);
    const normal = currentSession.points.filter(p => !p.isOutlier);

    const byMaterial = new Map<string, { name: string; file: string; outlierIds: string[]; total: number }>();
    currentSession.materialSegments.forEach(seg => {
      byMaterial.set(seg.id, { name: seg.name, file: seg.sourceFile, outlierIds: [], total: 0 });
    });
    currentSession.points.forEach(p => {
      const m = byMaterial.get(p.materialId);
      if (m) {
        m.total++;
        if (p.isOutlier) m.outlierIds.push(p.id);
      }
    });

    const byType = new Map<OutlierType, number>();
    outliers.forEach(p => byType.set(p.outlierType, (byType.get(p.outlierType) || 0) + 1));

    return { outliers, normal, byMaterial, byType };
  }, [currentSession]);

  if (!currentSession || !stats) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">请先选择或导入一个会话</div>
      </div>
    );
  }

  const allSolved = Object.values(currentSession.solutions).every(s => s.applied);

  return (
    <div className="max-w-4xl mx-auto p-6 pb-16">
      <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-blue-800 text-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm uppercase tracking-wider">Basketball Parabola Analysis</p>
              <h1 className="text-3xl font-bold mt-1">篮球投篮抛物面分析报告</h1>
              <p className="text-blue-200 mt-2">{currentSession.name}</p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
                allSolved ? 'bg-green-400/20 text-green-100 border border-green-300/40' : 'bg-yellow-400/20 text-yellow-100 border border-yellow-300/40'
              }`}>
                {allSolved ? '处理完成' : '处理中'}
              </div>
              <p className="text-blue-200 text-xs mt-3">报告编号：{currentSession.id.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Meta */}
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-gray-500">报告生成时间</p>
              <p className="font-medium text-gray-800 mt-1">{new Date().toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-gray-500">数据来源文件</p>
              <p className="font-medium text-gray-800 mt-1 font-mono">{currentSession.materialName}</p>
            </div>
            <div>
              <p className="text-gray-500">数据采集时间</p>
              <p className="font-medium text-gray-800 mt-1">{new Date(currentSession.createdAt).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          {/* Summary */}
          <section className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons text-primary text-xl">insights</span>
              数据摘要
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-gray-800">{currentSession.points.length}</div>
                <div className="text-xs text-gray-500 mt-1">总数据点</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">{stats.normal.length}</div>
                <div className="text-xs text-gray-500 mt-1">正常点</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="text-3xl font-bold text-red-600">{stats.outliers.length}</div>
                <div className="text-xs text-gray-500 mt-1">异常点</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-3xl font-bold text-yellow-600">
                  {currentSession.cameraLossSegments.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">视角丢失段</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(stats.byType.entries()).map(([type, count]) => (
                <span key={type} className={`text-xs px-3 py-1 rounded-full ${OUTLIER_TYPE_BADGE[type]}`}>
                  {getOutlierTypeLabel(type).label} × {count}
                </span>
              ))}
            </div>
          </section>

          {/* Material tracking - key for client */}
          <section className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons text-accent text-xl">folder</span>
              异常点材料追踪
              <span className="text-xs font-normal text-gray-500 ml-1">（甲方重点：快速定位问题在第几段材料）</span>
            </h2>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-left">
                    <th className="px-4 py-3 font-medium">材料段ID</th>
                    <th className="px-4 py-3 font-medium">材料段名称</th>
                    <th className="px-4 py-3 font-medium">来源文件</th>
                    <th className="px-4 py-3 font-medium text-center">总点数</th>
                    <th className="px-4 py-3 font-medium text-center">异常点数</th>
                    <th className="px-4 py-3 font-medium">异常点ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from(stats.byMaterial.values()).map(m => (
                    <tr key={m.name} className={m.outlierIds.length > 0 ? 'bg-red-50/40' : ''}>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {Array.from(stats.byMaterial.keys())[Array.from(stats.byMaterial.values()).indexOf(m)]}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{m.file}</td>
                      <td className="px-4 py-3 text-center">{m.total}</td>
                      <td className={`px-4 py-3 text-center font-bold ${
                        m.outlierIds.length > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {m.outlierIds.length}
                      </td>
                      <td className="px-4 py-3">
                        {m.outlierIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {m.outlierIds.map(id => (
                              <span key={id} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono">
                                {id}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-green-600 text-xs">✓ 无异常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Outlier details */}
          {stats.outliers.length > 0 && (
            <section className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="material-icons text-red-500 text-xl">warning</span>
                异常点详情
              </h2>
              <div className="space-y-3">
                {stats.outliers.map(point => (
                  <div key={point.id} className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-800">{point.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${OUTLIER_TYPE_BADGE[point.outlierType]}`}>
                          {getOutlierTypeLabel(point.outlierType).label}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">
                          {point.materialName}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">置信度 {Math.round(point.confidence * 100)}%</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">坐标：</span>
                        <span className="font-mono text-gray-800">
                          ({point.x.toFixed(4)}, {point.y.toFixed(4)}, {point.z.toFixed(4)})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">材料来源：</span>
                        <span className="text-gray-800 font-mono text-xs">
                          {point.materialId} · {currentSession.materialName}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">异常来源：</span>
                        <span className="text-gray-800">{point.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Processing flow */}
          <section className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons text-green-600 text-xl">task_alt</span>
              处理流程记录
            </h2>
            <div className="flex items-stretch gap-3">
              {(['re-run', 're-record', 'manual'] as const).map((t, i) => {
                const sol = currentSession.solutions[t];
                const labels = { 're-run': '重复运行', 're-record': '补录', 'manual': '人工确认' };
                return (
                  <div key={t} className="flex flex-1 items-stretch gap-3">
                    <div className={`flex-1 p-4 rounded-xl border ${
                      sol.applied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm ${
                          sol.applied ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          {sol.applied ? '✓' : i + 1}
                        </div>
                        <span className="font-medium text-gray-800">{labels[t]}</span>
                      </div>
                      {sol.applied ? (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>执行人：{sol.operator}</p>
                          <p>时间：{new Date(sol.appliedAt!).toLocaleString('zh-CN')}</p>
                          <p>影响点：{sol.affectedPointIds.length} 个</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">未执行</p>
                      )}
                    </div>
                    {i < 2 && (
                      <div className="flex items-center text-gray-300">
                        <span className="material-icons">arrow_forward</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Conclusions */}
          <section className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons text-primary text-xl">description</span>
              结论
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">原始结论</p>
                <p className="text-sm text-gray-700 leading-relaxed">{currentSession.conclusions.raw}</p>
              </div>
              <div className={`p-4 rounded-xl ${allSolved ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <p className={`text-xs uppercase tracking-wide mb-2 ${allSolved ? 'text-green-600' : 'text-yellow-700'}`}>
                  {allSolved ? '最终结论' : '处理中结论'}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentSession.conclusions.processed || '待所有方案执行完毕后生成。'}
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="border-t pt-6 flex gap-3">
            <button className="flex-1 bg-primary text-white py-3 rounded-xl font-medium hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
              <span className="material-icons">download</span>
              导出 PDF 报告
            </button>
            <button className="px-6 py-3 rounded-xl border text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
              <span className="material-icons">print</span>
              打印
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
