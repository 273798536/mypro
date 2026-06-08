import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ShotPoint, OutlierType } from '../types';
import { getOutlierTypeLabel } from '../mockData';

const OUTLIER_TYPE_COLORS: Record<OutlierType, string> = {
  drift: 'bg-purple-100 text-purple-800',
  'camera-loss': 'bg-red-100 text-red-800',
  interference: 'bg-orange-100 text-orange-800',
  noise: 'bg-yellow-100 text-yellow-800',
  unknown: 'bg-gray-100 text-gray-800',
};

const TREATMENT_SUGGESTIONS: Record<OutlierType, string> = {
  drift: '此异常由设备零点漂移引起。建议优先执行"重复运行"方案，使用基准值重新校准；如仍有偏差，再进行人工确认核对。',
  'camera-loss': '此异常位于相机视角丢失段。必须完整执行三步：先重复运行算法看是否能插值修复，然后补录该段数据，最后人工逐条验证。',
  interference: '此异常由场地电磁干扰（灯光频闪）造成。建议人工确认原始录像后手动修正坐标，或直接参考相邻正常点进行插值替换。',
  noise: '此异常为传感器随机噪声。"重复运行"方案通常可以自动过滤；如置信度仍低于 0.8，则进入人工确认环节。',
  unknown: '异常来源待排查。建议先在 3D 可视化中查看该点与周边轨迹的关系，然后走完整的三步处理流程。',
};

export function DetectionPage() {
  const { currentSession } = useApp();
  const [selectedPoint, setSelectedPoint] = useState<ShotPoint | null>(null);
  const [filter, setFilter] = useState<OutlierType | 'all'>('all');

  const outliers = useMemo(() => {
    if (!currentSession) return [];
    const list = currentSession.points.filter(p => p.isOutlier);
    return filter === 'all' ? list : list.filter(p => p.outlierType === filter);
  }, [currentSession, filter]);

  const normalCount = currentSession ? currentSession.points.filter(p => !p.isOutlier).length : 0;

  if (!currentSession) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">请先选择或导入一个会话</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">异常检测</h1>
        <p className="text-sm text-gray-500 mt-1">{currentSession.name} · 来源：{currentSession.materialName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-3xl font-bold text-gray-800">{currentSession.points.length}</div>
          <div className="text-sm text-gray-500 mt-1">总数据点</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-3xl font-bold text-red-600">{currentSession.points.filter(p => p.isOutlier).length}</div>
          <div className="text-sm text-gray-500 mt-1">异常点</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-3xl font-bold text-blue-600">{normalCount}</div>
          <div className="text-sm text-gray-500 mt-1">正常点</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="text-3xl font-bold text-accent">
            {currentSession.cameraLossSegments.length}
          </div>
          <div className="text-sm text-gray-500 mt-1">视角丢失段</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">异常点列表</h2>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="text-sm border rounded-md px-2 py-1 text-gray-700"
            >
              <option value="all">全部类型</option>
              <option value="drift">设备漂移</option>
              <option value="camera-loss">视角丢失</option>
              <option value="interference">信号干扰</option>
              <option value="noise">随机噪声</option>
              <option value="unknown">未知</option>
            </select>
          </div>
          <div className="divide-y max-h-[560px] overflow-auto">
            {outliers.length === 0 ? (
              <div className="p-8 text-center text-gray-400">没有匹配的异常点</div>
            ) : (
              outliers.map(point => {
                const typeInfo = getOutlierTypeLabel(point.outlierType);
                return (
                  <div
                    key={point.id}
                    onClick={() => setSelectedPoint(point)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedPoint?.id === point.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-800">{point.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${OUTLIER_TYPE_COLORS[point.outlierType]}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">#{point.index}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-mono">
                        ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
                      </span>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"
                        >
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${point.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(point.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-800">异常点详情</h2>
            </div>
            <div className="p-5">
              {selectedPoint ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">点 ID</label>
                      <p className="font-mono text-gray-800 mt-1">{selectedPoint.id}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">序列位置</label>
                      <p className="text-gray-800 mt-1">第 {selectedPoint.index} 帧</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">异常类型</label>
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${OUTLIER_TYPE_COLORS[selectedPoint.outlierType]}`}>
                          {getOutlierTypeLabel(selectedPoint.outlierType).label}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">置信度</label>
                      <p className="text-gray-800 mt-1">{Math.round(selectedPoint.confidence * 100)}%</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">来源描述</label>
                    <p className="text-gray-800 mt-1">{selectedPoint.source}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-xs text-gray-500">当前坐标</label>
                      <p className="font-mono text-sm text-gray-800 mt-1">
                        X:{selectedPoint.x.toFixed(4)}<br />
                        Y:{selectedPoint.y.toFixed(4)}<br />
                        Z:{selectedPoint.z.toFixed(4)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-xs text-blue-600">原始拟合值（参考）</label>
                      <p className="font-mono text-sm text-blue-900 mt-1">
                        X:{selectedPoint.originalX.toFixed(4)}<br />
                        Y:{selectedPoint.originalY.toFixed(4)}<br />
                        Z:{selectedPoint.originalZ.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">关联材料段</label>
                    <div className="mt-2 p-3 bg-accent/10 rounded-lg border border-accent/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{selectedPoint.materialName}</p>
                          <p className="text-xs text-gray-500 mt-1">段ID：{selectedPoint.materialId}</p>
                        </div>
                        <span className="material-icons text-accent">folder</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        来源文件：{currentSession.materialName}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">处理建议</label>
                    <div className="mt-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex gap-2">
                        <span className="material-icons text-yellow-600">lightbulb</span>
                        <p className="text-sm text-yellow-800 leading-relaxed">
                          {TREATMENT_SUGGESTIONS[selectedPoint.outlierType]}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedPoint.changeHistory.length > 0 && (
                    <div className="pt-3 border-t">
                      <label className="text-xs text-gray-500 uppercase tracking-wide">变更记录</label>
                      <div className="mt-2 space-y-2">
                        {selectedPoint.changeHistory.map((r, i) => (
                          <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                            <span className="text-gray-500">
                              {new Date(r.timestamp).toLocaleTimeString()} · {r.operator}
                            </span>
                            <p className="mt-1 text-gray-700">
                              {r.field}: <span className="line-through">{String(r.oldValue)}</span> →{' '}
                              <span className="text-green-700 font-medium">{String(r.newValue)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-16">
                  <span className="material-icons text-5xl">info</span>
                  <p className="mt-3">选择左侧异常点查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
