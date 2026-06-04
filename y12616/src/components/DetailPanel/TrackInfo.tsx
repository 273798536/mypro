
import React, { useState } from 'react';
import { MapPin, Ruler, FileText, Calendar, Edit3, Check, X, RefreshCw } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';
import { dataSourceLabels } from '../../data/sampleData';

export const TrackInfo: React.FC = () => {
  const selectedPath = usePathStore((state) => state.getSelectedPath());
  const selectedNode = usePathStore((state) => state.getSelectedNode());
  const updatePathScale = usePathStore((state) => state.updatePathScale);
  const flipNodeCoordinates = usePathStore((state) => state.flipNodeCoordinates);
  const addHistoryAction = useHistoryStore((state) => state.addAction);
  const { calculatePathLength } = useAnomalyDetection();

  const [isEditingScale, setIsEditingScale] = useState(false);
  const [tempRatio, setTempRatio] = useState('');
  const [tempUnit, setTempUnit] = useState<'meter' | 'kilometer' | 'unknown'>('meter');

  if (!selectedPath) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MapPin size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">选择一条路径查看详情</p>
      </div>
    );
  }

  const pathLength = calculatePathLength(selectedPath.nodes);
  const sourceInfo = dataSourceLabels[selectedPath.source.type];

  const handleSaveScale = () => {
    addHistoryAction(
      'update_scale',
      `更新路径 "${selectedPath.name}" 比例尺`,
      { pathId: selectedPath.id, ratio: selectedPath.scale.ratio, unit: selectedPath.scale.unit },
      { pathId: selectedPath.id, ratio: tempRatio, unit: tempUnit }
    );
    updatePathScale(selectedPath.id, tempRatio, tempUnit);
    setIsEditingScale(false);
  };

  const handleFlipCoordinates = () => {
    if (!selectedNode) return;
    addHistoryAction(
      'flip_coordinate',
      `翻转节点 "${selectedNode.label || selectedNode.id}" 坐标`,
      { pathId: selectedPath.id, nodeId: selectedNode.id, x: selectedNode.x, y: selectedNode.y },
      { pathId: selectedPath.id, nodeId: selectedNode.id, x: selectedNode.y, y: selectedNode.x }
    );
    flipNodeCoordinates(selectedPath.id, selectedNode.id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <MapPin size={14} className="text-orange-400" />
          路径信息
        </h3>
        <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
          <div className="text-base font-medium text-white">{selectedPath.name}</div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: sourceInfo?.color + '20', color: sourceInfo?.color }}
            >
              {sourceInfo?.label}
            </span>
            <span className="text-xs text-slate-400">
              路径长度: {pathLength.toFixed(1)} px
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <FileText size={10} />
            {selectedPath.source.name}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar size={10} />
            更新于 {new Date(selectedPath.updatedAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <Ruler size={14} className="text-blue-400" />
          比例尺设置
        </h3>
        <div className="bg-slate-800/50 rounded-lg p-3">
          {isEditingScale ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempRatio}
                  onChange={(e) => setTempRatio(e.target.value)}
                  placeholder="1:5000"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={tempUnit}
                  onChange={(e) => setTempUnit(e.target.value as typeof tempUnit)}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="meter">米</option>
                  <option value="kilometer">千米</option>
                  <option value="unknown">未知</option>
                </select>
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setIsEditingScale(false)}
                  className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={handleSaveScale}
                  className="p-1.5 rounded bg-green-600 text-white hover:bg-green-500"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-between cursor-pointer hover:bg-slate-700/50 -m-1 p-1 rounded"
              onClick={() => {
                setTempRatio(selectedPath.scale.ratio);
                setTempUnit(selectedPath.scale.unit);
                setIsEditingScale(true);
              }}
            >
              <div>
                <div className="text-sm text-slate-200">
                  比例尺: <span className="font-mono">{selectedPath.scale.ratio}</span>
                </div>
                <div className="text-xs text-slate-400">
                  单位: {selectedPath.scale.unit === 'meter' ? '米' : selectedPath.scale.unit === 'kilometer' ? '千米' : '未知'}
                  {!selectedPath.scale.isCorrect && (
                    <span className="ml-2 text-yellow-400">⚠ 待确认</span>
                  )}
                </div>
              </div>
              <Edit3 size={14} className="text-slate-500" />
            </div>
          )}
        </div>
      </div>

      {selectedNode && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-green-400" />
            选中节点
          </h3>
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium text-slate-200">
              {selectedNode.label || '未命名节点'}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              坐标: ({selectedNode.x}, {selectedNode.y})
            </div>
            <div className="text-xs text-slate-400">
              单位: {selectedNode.unit === 'meter' ? '米' : selectedNode.unit === 'kilometer' ? '千米' : '未知'}
            </div>
            <button
              onClick={handleFlipCoordinates}
              className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition-colors text-xs"
            >
              <RefreshCw size={12} />
              翻转 X/Y 坐标
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
