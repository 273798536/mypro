import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Edit2, Info } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TrackPoint } from '../../types';
import { formatDateTime } from '../../utils/coordinate';

const TrackTable: React.FC = () => {
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  
  const getFilteredPoints = useAppStore(state => state.getFilteredPoints);
  const sourceMaterials = useAppStore(state => state.sourceMaterials);
  const updatePoint = useAppStore(state => state.updatePoint);
  const updateReviewConclusion = useAppStore(state => state.updateReviewConclusion);
  const snappingEnabled = useAppStore(state => state.snappingEnabled);
  const dataVersion = useAppStore(state => state.dataVersion);

  const points = useMemo(() => getFilteredPoints(), [getFilteredPoints, dataVersion]);

  const getMaterialName = (id: string) => {
    return sourceMaterials.find(m => m.id === id)?.name || '未知';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      'normal': { label: '正常', color: 'text-azure-600 bg-azure-50', icon: CheckCircle },
      'out-of-bounds': { label: '边界越界', color: 'text-cinnabar-600 bg-cinnabar-50', icon: XCircle },
      'color-invalid': { label: '颜色异常', color: 'text-rattan-600 bg-rattan-50', icon: AlertTriangle },
      'missing-unit': { label: '缺项漏填', color: 'text-ochre-600 bg-ochre-50', icon: AlertTriangle },
      'supplementary': { label: '补录数据', color: 'text-ochre-500 bg-ochre-50', icon: Info },
    };
    return configs[status] || { label: status, color: 'text-ink-600 bg-ink-50', icon: Info };
  };

  const handleStartEdit = (point: TrackPoint) => {
    setEditingPointId(point.id);
    setEditNote(point.reviewConclusion?.reviewerNote || '');
  };

  const handleSaveEdit = (pointId: string) => {
    updateReviewConclusion(pointId, {
      reviewed: true,
      reviewerName: '当前训练员',
      reviewTime: Date.now(),
      reviewerNote: editNote,
      correctionSuggestion: editNote ? '已复核' : '无需修改'
    });
    setEditingPointId(null);
    setEditNote('');
  };

  const handleMarkAsFixed = (pointId: string) => {
    updatePoint(pointId, { status: 'normal' });
    updateReviewConclusion(pointId, {
      reviewed: true,
      reviewerName: '当前训练员',
      reviewTime: Date.now(),
      reviewerNote: '已修正为正常状态',
      correctionSuggestion: '已处理'
    });
  };

  return (
    <div className="bg-xuan-50 border border-ochre-300 rounded-lg overflow-hidden">
      <div className="bg-xuan-100 border-b border-ochre-300 px-4 py-2 flex items-center justify-between">
        <h3 className="font-serif text-ink-600">轨迹数据明细</h3>
        <span className="text-xs text-ochre-600">
          共 {points.length} 条记录 · 数据版本 v{dataVersion}
        </span>
      </div>
      
      <div className="overflow-auto max-h-96 old-table">
        <table className="w-full">
          <thead className="bg-xuan-100 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">点号</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">坐标</th>
              {snappingEnabled && (
                <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">吸附后坐标</th>
              )}
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">状态</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">颜色</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">海拔</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">来源材料</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">录入人</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">复核</th>
              <th className="text-left px-3 py-2 text-xs font-serif text-ochre-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, idx) => {
              const statusConfig = getStatusConfig(point.status);
              const StatusIcon = statusConfig.icon;
              const isEditing = editingPointId === point.id;
              const hasCollision = point.boundaryCollision;
              
              return (
                <React.Fragment key={point.id}>
                  <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-xuan-50'}>
                    <td className="px-3 py-2 text-sm text-ink-600 font-mono">
                      {point.id.slice(-8)}
                    </td>
                    <td className="px-3 py-2 text-sm text-ink-600 font-mono">
                      {point.originalLng.toFixed(5)}, {point.originalLat.toFixed(5)}
                    </td>
                    {snappingEnabled && (
                      <td className="px-3 py-2 text-sm text-azure-600 font-mono">
                        {point.snappedLng?.toFixed(5) || '-'}, {point.snappedLat?.toFixed(5) || '-'}
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border border-ochre-300"
                          style={{ backgroundColor: point.color }}
                        />
                        <span className="text-xs text-ink-500 font-mono">{point.color}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-ink-600">
                      {point.elevation?.toFixed(1) || '-'} m
                    </td>
                    <td className="px-3 py-2 text-sm text-ochre-600">
                      {getMaterialName(point.sourceMaterial)}
                    </td>
                    <td className="px-3 py-2 text-sm text-ink-600">
                      {point.operator}
                    </td>
                    <td className="px-3 py-2">
                      {point.reviewConclusion?.reviewed ? (
                        <span className="text-xs text-azure-600">已复核</span>
                      ) : (
                        <span className="text-xs text-ochre-400">待复核</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(point)}
                          className="p-1 hover:bg-ochre-100 rounded text-ochre-600"
                          title="添加复核备注"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {point.status !== 'normal' && (
                          <button
                            onClick={() => handleMarkAsFixed(point.id)}
                            className="p-1 hover:bg-azure-100 rounded text-azure-600 text-xs px-1.5"
                            title="标记为已修正"
                          >
                            修正
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {hasCollision && (
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-xuan-50'}>
                      <td colSpan={snappingEnabled ? 10 : 9} className="px-6 py-1">
                        <div className="text-xs text-cinnabar-600 bg-cinnabar-50 rounded px-3 py-1.5 border-l-2 border-cinnabar-400">
                          <strong>边界碰撞检测：</strong>
                          {point.boundaryCollision?.boundaryName} · 
                          {point.boundaryCollision?.type === 'inside' ? ' 进入保护区' : ' 靠近边界'} · 
                          距离：{Math.abs(point.boundaryCollision?.distance || 0).toFixed(1)}米 · 
                          阈值：{point.boundaryCollision?.threshold}米
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {isEditing && (
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-xuan-50'}>
                      <td colSpan={snappingEnabled ? 10 : 9} className="px-6 py-2">
                        <div className="flex items-center gap-3 bg-xuan-100 rounded p-2">
                          <input
                            type="text"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            placeholder="输入复核备注..."
                            className="flex-1 px-3 py-1.5 text-sm border border-ochre-300 rounded focus:outline-none focus:border-ochre-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(point.id)}
                            className="px-3 py-1.5 bg-ochre-500 text-white text-sm rounded hover:bg-ochre-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingPointId(null);
                              setEditNote('');
                            }}
                            className="px-3 py-1.5 bg-ochre-200 text-ochre-700 text-sm rounded hover:bg-ochre-300"
                          >
                            取消
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {point.detectionResults && point.detectionResults.length > 0 && (
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-xuan-50'}>
                      <td colSpan={snappingEnabled ? 10 : 9} className="px-6 py-1">
                        {point.detectionResults.map((result, ridx) => (
                          <div key={ridx} className="text-xs text-ochre-600">
                            {result.type !== point.status && (
                              <span className="text-ochre-500">
                                检测项：{result.type} · 置信度：{(result.confidence * 100).toFixed(0)}% · 
                              </span>
                            )}
                            {result.details && (
                              <span>{result.details}</span>
                            )}
                          </div>
                        ))}
                        {point.supplementaryNote && (
                          <div className="text-xs text-ochre-500 italic mt-1">
                            备注：{point.supplementaryNote}
                          </div>
                        )}
                        {point.reviewConclusion?.reviewerNote && (
                          <div className="text-xs text-azure-600 mt-1">
                            复核：{point.reviewConclusion.reviewerNote} · {formatDateTime(point.reviewConclusion.reviewTime)}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrackTable;
