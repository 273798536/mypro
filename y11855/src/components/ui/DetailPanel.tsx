import { useState } from 'react';
import { ChevronUp, ChevronDown, X, MapPin, Ruler, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useAppStore, useFilteredBuildings, useBuildingIssues, useBuildingCollisions } from '../../store/useAppStore';
import {
  BUILDING_TYPE_LABELS,
  BUILDING_STATUS_LABELS,
  SURFACE_TYPE_LABELS,
  ISSUE_TYPE_LABELS,
  SEVERITY_COLORS,
  BUILDING_TYPE_COLORS
} from '../../types';

export function DetailPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'selected' | 'list'>('selected');
  
  const currentScene = useAppStore(state => state.currentScene);
  const selectedElement = useAppStore(state => state.selectedElement);
  const setSelectedElement = useAppStore(state => state.setSelectedElement);
  const collisionResults = useAppStore(state => state.collisionResults);
  const isCollisionDetected = useAppStore(state => state.isCollisionDetected);
  const filteredBuildings = useFilteredBuildings();

  const selectedBuilding = selectedElement?.type === 'building'
    ? currentScene?.buildings.find(b => b.id === selectedElement.id)
    : null;
    
  const selectedSurface = selectedElement?.type === 'surface'
    ? currentScene?.surfaces.find(s => s.id === selectedElement.id)
    : null;
    
  const selectedRunway = selectedElement?.type === 'runway'
    ? currentScene?.runway
    : null;

  const buildingIssues = selectedBuilding ? useBuildingIssues(selectedBuilding.id) : [];
  const buildingCollisions = selectedBuilding ? useBuildingCollisions(selectedBuilding.id) : [];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={14} className="text-orange-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  const renderSelectedContent = () => {
    if (!selectedElement) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
          <Info size={32} className="mb-3 opacity-50" />
          <p className="text-sm">点击3D视图中的元素查看详情</p>
          <p className="text-xs mt-1 opacity-70">支持跑道、建筑、净空面</p>
        </div>
      );
    }

    if (selectedBuilding) {
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: BUILDING_TYPE_COLORS[selectedBuilding.type] }}
                />
                <h3 className="text-white font-medium text-sm">{selectedBuilding.name || selectedBuilding.id}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: {selectedBuilding.id}</p>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <MapPin size={12} />
                类型
              </div>
              <p className="text-white text-sm">{BUILDING_TYPE_LABELS[selectedBuilding.type]}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Ruler size={12} />
                高度
              </div>
              <p className="text-white text-sm font-mono">{selectedBuilding.height}m</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">状态</div>
              <p className="text-white text-sm">{BUILDING_STATUS_LABELS[selectedBuilding.status]}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">层数</div>
              <p className="text-white text-sm font-mono">{selectedBuilding.floors || '-'}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs mb-2">坐标位置</div>
            <p className="text-white text-xs font-mono">
              X: {selectedBuilding.position[0].toFixed(2)},&nbsp;
              Y: {selectedBuilding.position[1].toFixed(2)},&nbsp;
              Z: {selectedBuilding.position[2].toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs mb-2">建筑尺寸</div>
            <p className="text-white text-xs font-mono">
              宽 {selectedBuilding.footprint[0]}m × 深 {selectedBuilding.footprint[1]}m
            </p>
          </div>

          {isCollisionDetected && (
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-2 flex items-center gap-2">
                <AlertCircle size={12} className="text-red-500" />
                碰撞检测结果
              </div>
              {buildingCollisions.length > 0 ? (
                <div className="space-y-2">
                  {buildingCollisions.map((collision, idx) => {
                    const surface = currentScene?.surfaces.find(s => s.id === collision.surfaceId);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-red-400">
                          穿透 {SURFACE_TYPE_LABELS[surface?.type || 'inner']}
                        </span>
                        <span className="text-red-400 font-mono">+{collision.exceededHeight.toFixed(1)}m</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-400 text-xs">
                  <CheckCircle size={12} />
                  符合限高要求
                </div>
              )}
            </div>
          )}

          {buildingIssues.length > 0 && (
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-2 flex items-center gap-2">
                <AlertTriangle size={12} className="text-orange-500" />
                数据问题 ({buildingIssues.length})
              </div>
              <div className="space-y-2">
                {buildingIssues.map((issue, idx) => (
                  <div key={idx} className="border-l-2 pl-2" style={{ borderColor: SEVERITY_COLORS[issue.severity] }}>
                    <div className="flex items-center gap-1.5">
                      {getSeverityIcon(issue.severity)}
                      <span className="text-xs text-slate-300">{issue.message}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 ml-5">{issue.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedBuilding.address && (
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">地址</div>
              <p className="text-white text-xs">{selectedBuilding.address}</p>
            </div>
          )}
        </div>
      );
    }

    if (selectedSurface) {
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-medium text-sm">
                {SURFACE_TYPE_LABELS[selectedSurface.type]}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: {selectedSurface.id}</p>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">最大限高</div>
              <p className="text-white text-sm font-mono">{selectedSurface.maxHeight}m</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">边界点数</div>
              <p className="text-white text-sm font-mono">{selectedSurface.boundaryPoints.length}</p>
            </div>
          </div>

          {selectedSurface.description && (
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">说明</div>
              <p className="text-white text-xs">{selectedSurface.description}</p>
            </div>
          )}

          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs mb-2">边界坐标</div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {selectedSurface.boundaryPoints.map((point, idx) => (
                <p key={idx} className="text-xs font-mono text-slate-300">
                  [{point[0].toFixed(1)}, {point[1].toFixed(1)}, {point[2].toFixed(1)}]
                </p>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (selectedRunway) {
      return (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-medium text-sm">{selectedRunway.name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">ID: {selectedRunway.id}</p>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">跑道长度</div>
              <p className="text-white text-sm font-mono">{selectedRunway.length}m</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">跑道宽度</div>
              <p className="text-white text-sm font-mono">{selectedRunway.width}m</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">航向角</div>
              <p className="text-white text-sm font-mono">{selectedRunway.heading}°</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="text-slate-400 text-xs mb-1">坐标系</div>
              <p className="text-white text-sm">{selectedRunway.coordinateSystem}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="text-slate-400 text-xs mb-2">中心坐标</div>
            <p className="text-white text-xs font-mono">
              X: {selectedRunway.coordinates[0].toFixed(2)},&nbsp;
              Y: {selectedRunway.coordinates[1].toFixed(2)},&nbsp;
              Z: {selectedRunway.coordinates[2].toFixed(2)}
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderListContent = () => {
    return (
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredBuildings.map(building => {
          const issues = useBuildingIssues(building.id);
          const collisions = useBuildingCollisions(building.id);
          const hasIssue = issues.length > 0 || (collisions.length > 0 && isCollisionDetected);
          
          return (
            <div
              key={building.id}
              onClick={() => setSelectedElement({ type: 'building', id: building.id })}
              className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                selectedElement?.id === building.id
                  ? 'bg-blue-900/30 border-blue-500'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded"
                  style={{ backgroundColor: BUILDING_TYPE_COLORS[building.type] }}
                />
                <span className="text-xs text-white">{building.name || building.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">{building.height}m</span>
                {hasIssue && <AlertCircle size={12} className="text-orange-500" />}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-700 flex flex-col">
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-slate-700 cursor-pointer hover:bg-slate-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">数据明细</span>
            {collisionResults.length > 0 && isCollisionDetected && (
              <span className="px-2 py-0.5 bg-red-900/50 text-red-400 text-xs rounded border border-red-700">
                {collisionResults.length} 处超高
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-800 rounded p-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('selected'); }}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'selected'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              选中详情
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('list'); }}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              建筑列表 ({filteredBuildings.length})
            </button>
          </div>
        </div>
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
      </div>
      
      {isExpanded && (
        <div className="h-[280px] overflow-y-auto p-4">
          {activeTab === 'selected' ? renderSelectedContent() : renderListContent()}
        </div>
      )}
    </div>
  );
}
