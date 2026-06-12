import { useLightingStore } from '@/store/lightingStore';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileWarning,
  Lightbulb,
  BarChart3,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { getProcessingStatus, points, exceptions, processedPointIds, resetAllData, setViewMode, setSelectedExceptionId } = useLightingStore();
  const status = getProcessingStatus();

  const progressPercent = status.totalPoints > 0 
    ? Math.round((status.processedPoints / status.totalPoints) * 100) 
    : 0;

  const exceptionProgressPercent = status.totalExceptions > 0
    ? Math.round((status.resolvedExceptions / status.totalExceptions) * 100)
    : 0;

  const pendingExceptions = exceptions.filter((e) => e.status === 'pending');
  const evidenceNeededExceptions = exceptions.filter((e) => e.status === 'evidence_needed');
  const unresolvedExceptions = exceptions.filter((e) => e.status !== 'resolved');

  const schemeStats = points.reduce((acc, point) => {
    acc[point.lightingScheme] = (acc[point.lightingScheme] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const showcaseStats = points.reduce((acc, point) => {
    if (!acc[point.showcaseId]) {
      acc[point.showcaseId] = { name: point.showcaseName, count: 0, processed: 0 };
    }
    acc[point.showcaseId].count++;
    if (processedPointIds.includes(point.id)) {
      acc[point.showcaseId].processed++;
    }
    return acc;
  }, {} as Record<string, { name: string; count: number; processed: number }>);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              项目经理总览
            </h2>
            <p className="text-gray-500 mt-1">博物馆展柜灯光方案比选 - 处理进度总览</p>
          </div>
          <button
            onClick={resetAllData}
            className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重置所有数据
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总点位数量</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{status.totalPoints}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">处理进度</span>
                <span className="font-medium text-gray-900">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已处理 {status.processedPoints}
                </span>
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  待处理 {status.pendingPoints}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总异常数量</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{status.totalExceptions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">解决进度</span>
                <span className="font-medium text-gray-900">{exceptionProgressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${exceptionProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  已解决 {status.resolvedExceptions}
                </span>
                <span className="text-orange-600 flex items-center gap-1">
                  <FileWarning className="w-3 h-3" />
                  待处理 {status.pendingExceptions}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">需补充证据</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{status.evidenceNeededExceptions}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <FileWarning className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">需要跟进的异常</p>
              {evidenceNeededExceptions.length > 0 ? (
                <div className="space-y-1">
                  {evidenceNeededExceptions.slice(0, 3).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setSelectedExceptionId(ex.id);
                        setViewMode('exceptions');
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 transition-colors truncate"
                    >
                      {ex.id}: {ex.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  暂无需要补证的异常
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待处理异常</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pendingExceptions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">按优先级排序</p>
              {pendingExceptions.length > 0 ? (
                <div className="space-y-1">
                  {pendingExceptions.slice(0, 3).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setSelectedExceptionId(ex.id);
                        setViewMode('exceptions');
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 bg-amber-50 text-amber-700 rounded hover:bg-amber-100 transition-colors truncate flex items-center gap-1"
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        ex.severity === 'high' ? 'bg-red-500' :
                        ex.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                      )} />
                      {ex.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  全部处理完毕
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              按灯光方案统计
            </h3>
            <div className="space-y-3">
              {Object.entries(schemeStats).map(([scheme, count]) => {
                const schemePoints = points.filter((p) => p.lightingScheme === scheme);
                const processedCount = schemePoints.filter((p) => processedPointIds.includes(p.id)).length;
                const percent = Math.round((processedCount / count) * 100);
                return (
                  <div key={scheme}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{scheme}</span>
                      <span className="text-gray-500">{processedCount}/{count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              按展柜统计
            </h3>
            <div className="space-y-3">
              {Object.entries(showcaseStats).map(([id, data]) => {
                const percent = data.count > 0 ? Math.round((data.processed / data.count) * 100) : 0;
                return (
                  <div key={id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{data.name}</span>
                      <span className="text-gray-500">{data.processed}/{data.count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          percent === 100 ? 'bg-green-500' :
                          percent >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            未解决异常清单 ({unresolvedExceptions.length})
          </h3>
          {unresolvedExceptions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <p>所有异常已处理完毕</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">编号</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">标题</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">类型</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">严重程度</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">状态</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">处理人</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">关联点位</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {unresolvedExceptions.map((ex) => (
                    <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs text-gray-600">{ex.id}</td>
                      <td className="py-2 px-3 text-gray-900">{ex.title}</td>
                      <td className="py-2 px-3 text-gray-600">
                        {ex.type === 'name_inconsistency' ? '名称不一致' :
                         ex.type === 'lux_out_of_range' ? '照度超标' :
                         ex.type === 'cri_too_low' ? 'CRI偏低' :
                         ex.type === 'adjacent_merge_ambiguous' ? '合并歧义' : ex.type}
                      </td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          ex.severity === 'high' ? 'bg-red-100 text-red-800' :
                          ex.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        )}>
                          {ex.severity === 'high' ? '高危' : ex.severity === 'medium' ? '中危' : '低危'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          ex.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                          ex.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-orange-100 text-orange-800'
                        )}>
                          {ex.status === 'pending' ? '待处理' :
                           ex.status === 'processing' ? '处理中' : '需补证据'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{ex.assignee}</td>
                      <td className="py-2 px-3 text-gray-600 font-mono text-xs">
                        {ex.relatedPointIds.join(', ')}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => {
                            setSelectedExceptionId(ex.id);
                            setViewMode('exceptions');
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
