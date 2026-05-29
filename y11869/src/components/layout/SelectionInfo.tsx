import { MapPin, Package, FileText, Move, AlertTriangle } from 'lucide-react';
import { useYardStore } from '@/store/yardStore';
import { useState } from 'react';

export function SelectionInfo() {
  const {
    selectedSlotId,
    selectedContainerId,
    getSlotById,
    getContainerById,
    getContainersBySlot,
    getConflictsBySlot,
    moveContainer,
    calculateImpact,
  } = useYardStore();

  const [targetSlotId, setTargetSlotId] = useState('');
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const selectedSlot = selectedSlotId ? getSlotById(selectedSlotId) : null;
  const selectedContainer = selectedContainerId ? getContainerById(selectedContainerId) : null;
  const containersInSlot = selectedSlotId ? getContainersBySlot(selectedSlotId) : [];
  const slotConflicts = selectedSlotId ? getConflictsBySlot(selectedSlotId) : [];

  if (!selectedSlot) return null;

  const handleMove = () => {
    if (selectedContainerId && targetSlotId) {
      moveContainer(selectedContainerId, targetSlotId);
      setShowMoveDialog(false);
      setTargetSlotId('');
    }
  };

  const handleRecalculate = () => {
    if (selectedSlotId) {
      calculateImpact(selectedSlotId);
    }
  };

  return (
    <div className="absolute top-20 left-72 z-10 w-72 bg-yard-darker/95 border border-yard-light/30 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden">
      <div className="p-3 border-b border-yard-light/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-blue" />
            <span className="text-neutral-light font-mono font-bold">
              {selectedSlot.id}
            </span>
          </div>
          {selectedSlot.isLocked && (
            <span className="text-xs px-2 py-0.5 rounded bg-accent-orange/20 text-accent-orange">
              已锁定
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-neutral-gray">
          行: {String.fromCharCode(65 + selectedSlot.row)} 贝: {selectedSlot.bay + 1} 层: {selectedSlot.tier + 1}
        </div>
      </div>

      {containersInSlot.length > 0 && (
        <div className="p-3 border-b border-yard-light/20">
          <div className="text-xs text-neutral-gray mb-2 flex items-center gap-1">
            <Package className="w-3 h-3" />
            集装箱 ({containersInSlot.length})
          </div>
          <div className="space-y-2">
            {containersInSlot.map((container) => (
              <div
                key={container.id}
                className={`bg-yard-dark/50 border rounded p-2 cursor-pointer transition-colors ${
                  selectedContainerId === container.id ? 'border-accent-blue/50' : 'border-yard-light/20 hover:border-yard-light/40'
                }`}
                onClick={() => {}}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-light font-mono">
                    {container.containerNo}
                  </span>
                  <div className="flex items-center gap-1">
                    {container.isHazardous && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red">
                        危险
                      </span>
                    )}
                    <span className="text-xs text-neutral-gray">
                      {container.size}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-gray">
                    类型: {container.type === 'dry' ? '干货' : container.type === 'reefer' ? '冷藏' : container.type === 'hazardous' ? '危险品' : '开顶'}
                  </span>
                  {container.hazardClass && (
                    <span className="text-xs text-neutral-gray">
                      类别: {container.hazardClass}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedContainer && (
            <div className="mt-3 pt-3 border-t border-yard-light/20">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMoveDialog(!showMoveDialog)}
                  className="flex-1 flex items-center justify-center gap-1 bg-accent-blue hover:bg-accent-blue/80 text-white text-xs py-1.5 rounded transition-colors"
                >
                  <Move className="w-3 h-3" />
                  移箱
                </button>
                <button
                  onClick={handleRecalculate}
                  className="flex-1 flex items-center justify-center gap-1 bg-accent-green hover:bg-accent-green/80 text-white text-xs py-1.5 rounded transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  分析影响
                </button>
              </div>

              {showMoveDialog && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={targetSlotId}
                    onChange={(e) => setTargetSlotId(e.target.value.toUpperCase())}
                    placeholder="目标箱位 (如: A05-2)"
                    className="w-full bg-yard-dark border border-yard-light/30 text-neutral-light text-xs px-2 py-1.5 rounded focus:outline-none focus:border-accent-blue"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleMove}
                      disabled={!targetSlotId.trim()}
                      className="flex-1 bg-accent-green hover:bg-accent-green/80 disabled:bg-yard-light/30 disabled:cursor-not-allowed text-white text-xs py-1.5 rounded transition-colors"
                    >
                      确认移箱
                    </button>
                    <button
                      onClick={() => {
                        setShowMoveDialog(false);
                        setTargetSlotId('');
                      }}
                      className="flex-1 bg-yard-light/20 hover:bg-yard-light/30 text-neutral-light text-xs py-1.5 rounded transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {slotConflicts.length > 0 && (
        <div className="p-3 border-b border-yard-light/20">
          <div className="text-xs text-neutral-gray mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-accent-red" />
            相关冲突 ({slotConflicts.length})
          </div>
          <div className="space-y-1">
            {slotConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="text-xs text-neutral-light bg-accent-red/10 px-2 py-1 rounded"
              >
                • {conflict.description}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3">
        <div className="text-xs text-neutral-gray mb-1">快捷操作</div>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-yard-dark hover:bg-yard-light/20 border border-yard-light/20 text-neutral-light text-xs py-1.5 rounded transition-colors">
            查看历史
          </button>
          <button className="bg-yard-dark hover:bg-yard-light/20 border border-yard-light/20 text-neutral-light text-xs py-1.5 rounded transition-colors">
            导出记录
          </button>
        </div>
      </div>
    </div>
  );
}
