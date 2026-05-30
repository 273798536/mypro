import React from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { ConflictRecord } from '../../types/game';
import { nodeTypeLabels } from '../../data/initialState';

interface ConflictModalProps {
  conflict: ConflictRecord;
  onResolve: (conflictId: string, chosenSide: 'ice' | 'recycle') => void;
  onClose: () => void;
  nodeName: string;
  nodeType: string;
}

const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  onResolve,
  onClose,
  nodeName,
  nodeType,
}) => {
  if (conflict.resolved) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-space-800 rounded-2xl max-w-2xl w-full p-6 glow-border-warning animate-in fade-in zoom-in duration-300">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <AlertTriangle className="text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-orbitron text-xl font-bold text-yellow-400">
                维护冲突
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {nodeTypeLabels[nodeType]}「{nodeName}」存在重复维护
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          冰矿队和回收队都对同一设备提交了维护方案。
          请选择要执行哪一个方案，两个方案不能同时执行。
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-space-700 rounded-xl p-4 border-2 border-transparent hover:border-cyan-500/50 transition-all cursor-pointer group"
               onClick={() => onResolve(conflict.id, 'ice')}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">❄️</span>
              <span className="font-bold text-cyan-400">冰矿队方案</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-400">操作：</span>
                <span className="text-white">{conflict.iceTeamRecord.action}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">效果：</span>
                <span className="text-green-400">
                  {conflict.iceTeamRecord.effect.health && `健康度 +${conflict.iceTeamRecord.effect.health}`}
                  {conflict.iceTeamRecord.effect.capacity && `容量 +${conflict.iceTeamRecord.effect.capacity}`}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1 text-cyan-400 text-sm">
                <Check size={14} />
                <span>选择此方案</span>
              </div>
            </div>
          </div>

          <div className="bg-space-700 rounded-xl p-4 border-2 border-transparent hover:border-green-500/50 transition-all cursor-pointer group"
               onClick={() => onResolve(conflict.id, 'recycle')}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">♻️</span>
              <span className="font-bold text-green-400">回收队方案</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-400">操作：</span>
                <span className="text-white">{conflict.recycleTeamRecord.action}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">效果：</span>
                <span className="text-green-400">
                  {conflict.recycleTeamRecord.effect.health && `健康度 +${conflict.recycleTeamRecord.effect.health}`}
                  {conflict.recycleTeamRecord.effect.capacity && `容量 +${conflict.recycleTeamRecord.effect.capacity}`}
                </span>
              </div>
            </div>
            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Check size={14} />
                <span>选择此方案</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          💡 提示：选择前请考虑哪个方案对当前局势更重要
        </div>
      </div>
    </div>
  );
};

export default ConflictModal;
