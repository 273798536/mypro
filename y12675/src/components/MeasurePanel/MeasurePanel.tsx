import { useState } from 'react';
import { 
  Ruler, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  AlertCircle, 
  ZoomIn,
  Link2
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { calculateDistance, formatDistance } from '../../utils/dataProcessing';
import type { MeasurementRecord } from '../../types';

export default function MeasurePanel() {
  const { 
    pointCloudData, 
    measurements, 
    addMeasurement, 
    removeMeasurement,
    updateMeasurement,
    selectedDefects,
    selectDefect,
    clearSelection,
    setTime,
    setTimeState
  } = useAppStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editConclusion, setEditConclusion] = useState('');

  const selectedDefectData = selectedDefects
    .map((id) => pointCloudData?.points.find((p) => p.id === id))
    .filter(Boolean);

  const relatedMeasurements = selectedDefects.length > 0
    ? measurements.filter(m => 
        m.defectIds.some(id => selectedDefects.includes(id))
      )
    : [];

  const canMeasure = selectedDefectData.length >= 2;

  const handleAddMeasurement = () => {
    if (!canMeasure || selectedDefectData.length < 2) return;

    const distances: number[] = [];
    for (let i = 0; i < selectedDefectData.length; i++) {
      for (let j = i + 1; j < selectedDefectData.length; j++) {
        distances.push(
          calculateDistance(
            selectedDefectData[i]!.position,
            selectedDefectData[j]!.position
          )
        );
      }
    }

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

    const measurement: MeasurementRecord = {
      id: `measurement-${Date.now()}`,
      defectIds: selectedDefects,
      distance: avgDistance,
      timestamp: Date.now(),
      notes: '',
      conclusion: '',
      status: 'needs_review',
    };

    addMeasurement(measurement);
  };

  const handleJumpToMeasurement = (measurement: MeasurementRecord) => {
    clearSelection();
    measurement.defectIds.forEach(id => selectDefect(id));
    const defect = pointCloudData?.points.find(p => p.id === measurement.defectIds[0]);
    if (defect) {
      setTime(defect.timestamp);
      setTimeState({ isPlaying: false });
    }
  };

  const handleStartEdit = (measurement: MeasurementRecord) => {
    setEditingId(measurement.id);
    setEditNotes(measurement.notes);
    setEditConclusion(measurement.conclusion);
  };

  const handleSaveEdit = (id: string) => {
    updateMeasurement(id, {
      notes: editNotes,
      conclusion: editConclusion,
      status: editConclusion ? 'direct_use' : 'needs_review',
    });
    setEditingId(null);
    setEditNotes('');
    setEditConclusion('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNotes('');
    setEditConclusion('');
  };

  return (
    <div className="bg-gray-900 bg-opacity-95 rounded-lg p-4 backdrop-blur-sm border border-green-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Ruler className="w-5 h-5 text-green-400" />
          <span className="text-green-400 text-sm font-medium">测量记录</span>
        </div>
        <button
          onClick={handleAddMeasurement}
          disabled={!canMeasure}
          className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>添加</span>
        </button>
      </div>

      {selectedDefectData.length > 0 && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">已选择缺陷 ({selectedDefectData.length})</div>
          <div className="space-y-1">
            {selectedDefectData.map((defect, index) => (
              <div 
                key={defect?.id || index} 
                className="text-xs text-gray-300 flex items-center justify-between group"
              >
                <span>{defect?.id} - {defect?.type}</span>
                <button
                  onClick={() => defect && selectDefect(defect.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="定位到缺陷"
                >
                  <ZoomIn className="w-3 h-3 text-cyan-400" />
                </button>
              </div>
            ))}
          </div>
          {selectedDefectData.length >= 2 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-400">可测量的距离组合</div>
              <div className="text-xs text-cyan-400 font-mono mt-1">
                {selectedDefectData.length >= 2 ? 
                  `${((selectedDefectData.length - 1) * selectedDefectData.length) / 2} 个组合` : 
                  '选择至少2个缺陷'
                }
              </div>
            </div>
          )}
          {relatedMeasurements.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1">
                <Link2 className="w-3 h-3" />
                <span>关联测量记录 ({relatedMeasurements.length})</span>
              </div>
              <div className="space-y-1">
                {relatedMeasurements.map(m => (
                  <div
                    key={m.id}
                    className="text-xs p-1.5 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors flex items-center justify-between"
                    onClick={() => handleJumpToMeasurement(m)}
                  >
                    <span className="text-cyan-400 font-mono">{formatDistance(m.distance)}</span>
                    <span className={m.status === 'direct_use' ? 'text-green-400' : 'text-orange-400'}>
                      {m.status === 'direct_use' ? '可用' : '需复核'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {measurements.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            暂无测量记录
          </div>
        ) : (
          measurements.map((measurement) => {
            const isSelected = measurement.defectIds.every(id => selectedDefects.includes(id)) 
              && measurement.defectIds.length === selectedDefects.length;
            
            return (
              <div
                key={measurement.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-green-900 bg-opacity-20 border-green-700' 
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
                onClick={() => !editingId && handleJumpToMeasurement(measurement)}
              >
                {editingId === measurement.id ? (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="text-xs text-gray-400">
                      距离: <span className="text-cyan-400 font-mono">
                        {formatDistance(measurement.distance)}
                      </span>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">备注</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded resize-none h-16"
                        placeholder="添加备注..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">结论</label>
                      <textarea
                        value={editConclusion}
                        onChange={(e) => setEditConclusion(e.target.value)}
                        className="w-full px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded resize-none h-16"
                        placeholder="输入结论后状态变为'可直接使用'..."
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(measurement.id)}
                        className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>保存</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <X className="w-3 h-3" />
                        <span>取消</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-xs text-gray-400 mb-1 flex items-center space-x-1">
                          <span>测量 #{measurement.id.split('-')[2]}</span>
                          {isSelected && (
                            <span className="px-1 py-0.5 bg-green-600 text-white rounded text-[10px]">
                              当前
                            </span>
                          )}
                        </div>
                        <div className="text-lg text-cyan-400 font-mono">
                          {formatDistance(measurement.distance)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {measurement.status === 'needs_review' ? (
                          <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>需复核</span>
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                            可用
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      关联: {measurement.defectIds.join(', ')}
                    </div>

                    {measurement.notes && (
                      <div className="text-xs text-gray-400 mb-2">
                        <span className="text-gray-500">备注:</span> {measurement.notes}
                      </div>
                    )}

                    {measurement.conclusion && (
                      <div className="text-xs text-gray-300 mb-2 p-2 bg-gray-700 rounded">
                        <span className="text-gray-500">结论:</span> {measurement.conclusion}
                      </div>
                    )}

                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleStartEdit(measurement)}
                        className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors flex items-center justify-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>编辑</span>
                      </button>
                      <button
                        onClick={() => handleJumpToMeasurement(measurement)}
                        className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded transition-colors flex items-center justify-center space-x-1"
                        title="定位到缺陷"
                      >
                        <ZoomIn className="w-3 h-3" />
                        <span>定位</span>
                      </button>
                      <button
                        onClick={() => removeMeasurement(measurement.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
