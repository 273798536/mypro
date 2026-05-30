import React from 'react';
import { X, Download, Clock, AlertTriangle, Eye, User, Layers, Ruler, Box } from 'lucide-react';
import { useSandboxStore, yards, cranes, truckRoutes } from '../../store/useSandboxStore';

export const ReportModal: React.FC = () => {
  const {
    showReport,
    setShowReport,
    currentYardId,
    craneRadius,
    minHeightFilter,
    maxHeightFilter,
    coverageRate,
    conflicts,
    changeHistory,
  } = useSandboxStore();

  const yard = yards.find((y) => y.id === currentYardId) || yards[0];

  const pendingConflicts = conflicts.filter((c) => c.status === 'pending');
  const confirmedConflicts = conflicts.filter((c) => c.status === 'confirmed');
  const resolvedConflicts = conflicts.filter((c) => c.status === 'resolved');

  const crossingConflicts = conflicts.filter((c) => c.type === 'crossing');
  const overheightConflicts = conflicts.filter((c) => c.type === 'overheight');
  const blindConflicts = conflicts.filter((c) => c.type === 'blind');

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (!showReport) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl w-11/12 max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">港口堆场吊装沙盘报告</h2>
            <p className="text-sm text-gray-400 mt-1">
              生成时间: {formatTime(Date.now())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium transition-colors"
            >
              <Download size={16} />
              导出报告
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Eye size={20} className="text-blue-400" />
              一、3D堆场与路线来源说明
            </h3>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                    <Layers size={16} />
                    堆场模型数据
                  </h4>
                  <p>当前堆场: <span className="text-white font-mono">{yard.name}</span></p>
                  <p>堆场尺寸: <span className="text-white font-mono">{yard.width}m × {yard.depth}m</span></p>
                  <p>箱区数量: <span className="text-white font-mono">{yard.blocks.length}个</span></p>
                  <p>集装箱总数: <span className="text-white font-mono">
                    {yard.blocks.reduce((sum, b) => sum + b.containers.length, 0)}个
                  </span></p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                    <Ruler size={16} />
                    吊机配置数据
                  </h4>
                  <p>吊机数量: <span className="text-white font-mono">{cranes.length}台</span></p>
                  <p>当前作业半径: <span className="text-white font-mono">{craneRadius}m</span></p>
                  <p>最大作业高度: <span className="text-white font-mono">
                    {Math.max(...cranes.map(c => c.maxHeight))}m
                  </span></p>
                  <p>盲区数量: <span className="text-white font-mono">
                    {cranes.reduce((sum, c) => sum + c.blindAreas.length, 0)}处
                  </span></p>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-medium text-orange-400 mb-2 flex items-center gap-2">
                  <Box size={16} />
                  卡车路线数据
                </h4>
                <p>路线总数: <span className="text-white font-mono">{truckRoutes.length}条</span></p>
                <div className="flex gap-4 mt-2">
                  {truckRoutes.map((route, index) => (
                    <div key={route.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: route.color }}
                      ></div>
                      <span>{route.truckId}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  路线数据通过时间轴插值算法计算卡车位置，播放速度为10x
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Eye size={20} className="text-green-400" />
              二、覆盖检测结果
            </h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 font-mono">{coverageRate}%</div>
                <p className="text-sm text-gray-400 mt-1">堆场覆盖率</p>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all"
                    style={{ width: `${Math.min(coverageRate, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  覆盖率计算基于吊机作业半径圆形覆盖区域与堆场总面积的比值
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
              <strong>说明:</strong> 当前吊机半径 {craneRadius}m，可覆盖约 {coverageRate}% 的堆场区域。
              {coverageRate < 80 && ' 建议增大吊机作业半径或增加吊机数量以提高覆盖。'}
              {coverageRate >= 80 && ' 覆盖情况良好。'}
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-400" />
              三、冲突检测汇总
            </h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white font-mono">{conflicts.length}</div>
                <p className="text-xs text-gray-400 mt-1">冲突总数</p>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4 text-center border border-yellow-500/30">
                <div className="text-2xl font-bold text-yellow-400 font-mono">{pendingConflicts.length}</div>
                <p className="text-xs text-gray-400 mt-1">待确认</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/30">
                <div className="text-2xl font-bold text-green-400 font-mono">{confirmedConflicts.length}</div>
                <p className="text-xs text-gray-400 mt-1">已确认</p>
              </div>
              <div className="bg-gray-500/10 rounded-lg p-4 text-center border border-gray-500/30">
                <div className="text-2xl font-bold text-gray-400 font-mono">{resolvedConflicts.length}</div>
                <p className="text-xs text-gray-400 mt-1">已解决</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                <span className="text-orange-400">路线交叉冲突</span>
                <span className="text-white font-mono">{crossingConflicts.length} 处</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded">
                <span className="text-red-400">箱区超高冲突</span>
                <span className="text-white font-mono">{overheightConflicts.length} 处</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-500/10 border border-gray-500/30 rounded">
                <span className="text-gray-400">吊机盲区</span>
                <span className="text-white font-mono">{blindConflicts.length} 处</span>
              </div>
            </div>
          </section>

          <section className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-400" />
              四、待确认冲突详情
            </h3>
            {pendingConflicts.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无待确认的冲突</p>
            ) : (
              <div className="space-y-3">
                {pendingConflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="p-4 bg-gray-700/50 rounded-lg border-l-4 border-yellow-500"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          {conflict.type === 'crossing' ? '路线交叉' :
                           conflict.type === 'overheight' ? '箱区超高' : '吊机盲区'}
                        </span>
                        <p className="text-sm text-gray-300 mt-2">{conflict.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">位置</span>
                        <p className="text-sm font-mono text-gray-400">
                          ({conflict.position.x.toFixed(1)}, {conflict.position.z.toFixed(1)})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-600">
                      <User size={14} className="text-gray-500" />
                      <span className="text-xs text-gray-400">核实责任人:</span>
                      <span className="text-sm text-white">{conflict.assignee || '待分配'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-purple-400" />
              五、参数变更历史
            </h3>
            {changeHistory.length === 0 ? (
              <p className="text-gray-400 text-sm">暂无参数变更记录</p>
            ) : (
              <div className="space-y-2">
                {changeHistory.slice(0, 10).map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center gap-4 p-3 bg-gray-700/30 rounded text-sm"
                  >
                    <span className="text-xs text-gray-500 w-32">
                      {formatTime(change.timestamp)}
                    </span>
                    <span className="text-blue-400 font-medium w-24">{change.paramName}</span>
                    <span className="text-gray-400">
                      <span className="text-red-400">{String(change.oldValue)}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-400">{String(change.newValue)}</span>
                    </span>
                    <span className="text-gray-500 ml-auto text-xs">{change.user}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              * 以上变更将影响沙盘结论，所有改动均已记录在案。
            </p>
          </section>

          <section className="bg-gray-800 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4">六、参数配置</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">堆场模型:</span>
                <span className="text-white ml-2 font-mono">{yard.name}</span>
              </div>
              <div>
                <span className="text-gray-400">吊机半径:</span>
                <span className="text-white ml-2 font-mono">{craneRadius}m</span>
              </div>
              <div>
                <span className="text-gray-400">高度筛选:</span>
                <span className="text-white ml-2 font-mono">{minHeightFilter}m - {maxHeightFilter}m</span>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            报告生成系统: 港口堆场吊装沙盘 v1.0
          </p>
          <button
            onClick={() => setShowReport(false)}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-medium transition-colors"
          >
            关闭报告
          </button>
        </div>
      </div>
    </div>
  );
};
