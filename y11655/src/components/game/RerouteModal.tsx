import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Route } from '../../types';
import { Button } from '../common/Button';
import { X, Check, RotateCcw } from 'lucide-react';

interface RerouteModalProps {
  route: Route;
  onClose: () => void;
}

export const RerouteModal: React.FC<RerouteModalProps> = ({ route, onClose }) => {
  const { stations, reroute } = useGameStore();
  const [newStations, setNewStations] = useState<string[]>([...route.stations]);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const getStationName = (stationId: string) => {
    return stations.find((s) => s.id === stationId)?.name || stationId;
  };

  const handleRemoveStation = (index: number) => {
    if (newStations.length <= 2) return;
    setNewStations(newStations.filter((_, i) => i !== index));
  };

  const handleAddStation = (stationId: string) => {
    if (!newStations.includes(stationId)) {
      setNewStations([...newStations, stationId]);
    }
  };

  const handleDragStart = (stationId: string) => {
    setIsDragging(stationId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!isDragging || isDragging === targetId) return;

    const fromIndex = newStations.indexOf(isDragging);
    const toIndex = newStations.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const updated = [...newStations];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      setNewStations(updated);
    }
  };

  const handleConfirm = () => {
    reroute(route.id, newStations);
    onClose();
  };

  const handleReset = () => {
    setNewStations([...route.originalStations]);
  };

  const availableStations = stations.filter(
    (s) => !newStations.includes(s.id) && !s.isBlocked
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dispatch-panel border border-dispatch-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-dispatch-border flex items-center justify-between">
          <div>
            <h2 className="font-mono font-semibold text-lg">调整线路 - {route.name}</h2>
            <p className="text-sm text-dispatch-text-muted mt-1">
              拖拽站点调整顺序，或点击可用站点添加到线路
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dispatch-bg rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <div className="text-sm text-dispatch-text-muted mb-3 flex items-center justify-between">
              <span>当前线路 ({newStations.length} 站)</span>
              <Button size="sm" variant="secondary" onClick={handleReset}>
                <RotateCcw size={14} className="mr-1" />
                重置
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-dispatch-bg rounded-lg border-2 border-dashed border-dispatch-border">
              {newStations.map((stationId, index) => {
                const station = stations.find((s) => s.id === stationId);
                return (
                  <div
                    key={stationId}
                    draggable
                    onDragStart={() => handleDragStart(stationId)}
                    onDragOver={(e) => handleDragOver(e, stationId)}
                    onDragEnd={() => setIsDragging(null)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-move transition-all ${
                      station?.isBlocked
                        ? 'bg-dispatch-danger/20 text-dispatch-danger border border-dispatch-danger/50'
                        : 'bg-dispatch-panel border border-dispatch-border hover:border-dispatch-primary'
                    } ${isDragging === stationId ? 'opacity-50' : ''}`}
                  >
                    <span className="text-xs text-dispatch-text-muted font-mono">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{getStationName(stationId)}</span>
                    {station?.isBlocked && (
                      <span className="text-xs text-dispatch-danger">⚠️ 封路</span>
                    )}
                    <button
                      onClick={() => handleRemoveStation(index)}
                      className="ml-1 p-0.5 hover:bg-dispatch-danger/20 hover:text-dispatch-danger rounded transition-colors"
                      disabled={newStations.length <= 2}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-sm text-dispatch-text-muted mb-3">
              可用站点 ({availableStations.length} 个)
            </div>
            <div className="flex flex-wrap gap-2 min-h-[60px] p-4 bg-dispatch-bg rounded-lg border border-dispatch-border">
              {availableStations.length > 0 ? (
                availableStations.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => handleAddStation(station.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dispatch-panel border border-dispatch-border hover:border-dispatch-primary hover:bg-dispatch-primary/10 transition-all text-sm"
                  >
                    <span className="text-sm font-medium">{station.name}</span>
                    <span className="text-xs text-dispatch-text-muted">+</span>
                  </button>
                ))
              ) : (
                <span className="text-dispatch-text-muted text-sm">所有可用站点已添加</span>
              )}
            </div>
          </div>

          <div className="p-4 bg-dispatch-warning/10 border border-dispatch-warning/30 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-dispatch-warning">⚠️</span>
              <div className="text-sm text-dispatch-text">
                <div className="font-medium">改线提示</div>
                <div className="text-dispatch-text-muted mt-1">
                  跳过封路站点可避免跳站投诉，但绕行会增加行驶时间。请平衡运营效率与乘客满意度。
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-dispatch-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            <Check size={16} className="mr-1" />
            确认改线
          </Button>
        </div>
      </div>
    </div>
  );
};
