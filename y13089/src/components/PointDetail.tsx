import { useState } from 'react';
import { useLightingStore } from '@/store/lightingStore';
import { formatOriginalPointEvidence, generateMergeWarning } from '@/utils/mergePoints';
import {
  X,
  MapPin,
  FileText,
  AlertTriangle,
  MessageSquare,
  Send,
  Lightbulb,
  Layers,
  Database,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PointDetail() {
  const {
    points,
    selectedPointId,
    setSelectedPointId,
    mergedGroups,
    exceptions,
    getPointRemarks,
    addRemark,
    togglePointProcessed,
    processedPointIds
  } = useLightingStore();

  const [newRemark, setNewRemark] = useState('');
  const [showMergeWarning, setShowMergeWarning] = useState(false);

  const point = points.find((p) => p.id === selectedPointId);
  const remarks = selectedPointId ? getPointRemarks(selectedPointId) : [];
  const relatedGroups = mergedGroups.filter((g) =>
    g.points.some((p) => p.id === selectedPointId)
  );
  const relatedExceptions = exceptions.filter((e) =>
    e.relatedPointIds.includes(selectedPointId || '')
  );

  if (!point) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>请从左侧列表选择一个点位查看详情</p>
        </div>
      </div>
    );
  }

  const isProcessed = processedPointIds.includes(point.id);
  const hasNameInconsistency = point.name !== point.originalName;

  const handleAddRemark = () => {
    if (!newRemark.trim() || !selectedPointId) return;
    addRemark({
      targetId: selectedPointId,
      targetType: 'point',
      content: newRemark.trim(),
      author: '阿乔'
    });
    setNewRemark('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{point.name}</h3>
              {hasNameInconsistency && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  名称不一致
                </span>
              )}
            </div>
            {hasNameInconsistency && (
              <p className="text-sm text-amber-600 mt-1">
                原始名称: <span className="font-medium">{point.originalName}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">{point.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => togglePointProcessed(point.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md border transition-colors",
                isProcessed
                  ? "bg-green-50 text-green-700 border-green-300"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              )}
            >
              {isProcessed ? '已处理' : '标记处理'}
            </button>
            <button
              onClick={() => setSelectedPointId(null)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            灯光参数
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">照度</span>
              <p className={cn(
                "font-medium",
                point.lux > 150 ? "text-red-600" : "text-gray-900"
              )}>
                {point.lux} lux
              </p>
            </div>
            <div>
              <span className="text-gray-500">色温</span>
              <p className="font-medium text-gray-900">{point.colorTemperature} K</p>
            </div>
            <div>
              <span className="text-gray-500">显色指数</span>
              <p className={cn(
                "font-medium",
                point.cri < 90 ? "text-orange-600" : "text-green-600"
              )}>
                CRI {point.cri}
              </p>
            </div>
            <div>
              <span className="text-gray-500">光束角</span>
              <p className="font-medium text-gray-900">{point.beamAngle}°</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            空间位置
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">三维坐标</span>
              <span className="font-mono text-gray-900">
                ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">所属展柜</span>
              <span className="font-medium text-gray-900">{point.showcaseName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">灯光方案</span>
              <span className="font-medium text-gray-900">{point.lightingScheme}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-500" />
            原始数据溯源
          </h4>
          <div className="bg-gray-50 rounded p-3 text-sm font-mono text-gray-700 whitespace-pre-wrap break-all">
            {formatOriginalPointEvidence(point)}
          </div>
        </div>

        {relatedGroups.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              相邻点位合并信息
            </h4>
            {relatedGroups.map((group) => (
              <div key={group.groupId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">合并组</span>
                  <span className="font-medium text-gray-900">
                    {group.groupId} ({group.points.length}个点位)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">名称一致性</span>
                  <span className={cn(
                    "font-medium",
                    group.isNameConsistent ? "text-green-600" : "text-amber-600"
                  )}>
                    {group.isNameConsistent ? '一致' : '不一致'}
                  </span>
                </div>
                {!group.isNameConsistent && (
                  <div className="text-sm">
                    <span className="text-gray-500">不一致名称: </span>
                    <span className="text-amber-600">
                      {group.inconsistentNames.join(', ')}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowMergeWarning(!showMergeWarning)}
                  className="w-full mt-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                >
                  {showMergeWarning ? '隐藏' : '查看'}原始点位证据链
                </button>
                {showMergeWarning && (
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap break-all">
                    {generateMergeWarning(group)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {relatedExceptions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              关联异常 ({relatedExceptions.length})
            </h4>
            <div className="space-y-2">
              {relatedExceptions.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700">
                        {ex.severity === 'high' ? '高' : ex.severity === 'medium' ? '中' : '低'}
                      </span>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {ex.title}
                      </span>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      ex.status === 'resolved' ? "bg-green-100 text-green-700" :
                      ex.status === 'processing' ? "bg-blue-100 text-blue-700" :
                      ex.status === 'evidence_needed' ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {ex.status === 'pending' ? '待处理' :
                       ex.status === 'processing' ? '处理中' :
                       ex.status === 'evidence_needed' ? '需补证据' : '已解决'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{ex.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-500" />
            人工备注 ({remarks.length})
          </h4>
          
          {remarks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">暂无备注</p>
          ) : (
            <div className="space-y-3 mb-4">
              {remarks.map((remark) => (
                <div key={remark.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{remark.author}</span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {remark.createdAt}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{remark.content}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRemark()}
              placeholder="添加备注..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddRemark}
              disabled={!newRemark.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            导入信息
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">来源文件</span>
              <span className="font-medium text-gray-900">{point.sourceFile}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">行号</span>
              <span className="font-mono text-gray-900">第 {point.rowNumber} 行</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">导入时间</span>
              <span className="font-medium text-gray-900">{point.importedAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
