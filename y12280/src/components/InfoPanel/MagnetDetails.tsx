import { Info, MapPin, Zap, GitBranch, Clock, Database } from 'lucide-react';
import { useMagneticStore } from '@/store/magneticStore';

export function MagnetDetails() {
  const { magnets, selectedMagnetId } = useMagneticStore();
  const selectedMagnet = magnets.find(m => m.id === selectedMagnetId);

  if (!selectedMagnet) {
    return (
      <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <Info size={16} />
          <span className="text-sm">未选择磁体</span>
        </div>
        <p className="text-xs text-gray-600">
          点击3D场景中的磁体或在列表中选择以查看详细信息
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800/30 rounded-lg border border-cyan-500/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
          <Info size={16} />
          磁体明细
        </h3>
        <span className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded">
          已选中
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 font-medium">{selectedMagnet.name}</span>
          <span className="text-xs bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded">
            {selectedMagnet.type === 'bar' ? '条形' : '马蹄形'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MapPin size={12} />
            <span>位置坐标</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-900/50 p-2 rounded text-center">
              <div className="text-[10px] text-gray-500">X</div>
              <div className="text-cyan-400 font-mono text-sm">
                {selectedMagnet.position.x.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded text-center">
              <div className="text-[10px] text-gray-500">Y</div>
              <div className="text-cyan-400 font-mono text-sm">
                {selectedMagnet.position.y.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded text-center">
              <div className="text-[10px] text-gray-500">Z</div>
              <div className="text-cyan-400 font-mono text-sm">
                {selectedMagnet.position.z.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Zap size={12} />
            <span>磁极方向</span>
          </div>
          <div className="bg-gray-900/50 p-2 rounded">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>
                <span className="text-gray-300">N极</span>
              </div>
              <span className="text-gray-500">→</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-300">S极</span>
                <span className="w-3 h-3 bg-blue-500 rounded-full inline-block"></span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">
              ({selectedMagnet.poleDirection.x.toFixed(2)}, 
              {selectedMagnet.poleDirection.y.toFixed(2)}, 
              {selectedMagnet.poleDirection.z.toFixed(2)})
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Zap size={12} />
            <span>磁场强度</span>
          </div>
          <div className="bg-gray-900/50 p-3 rounded">
            <div className="text-2xl font-bold text-center text-cyan-400 font-mono">
              {selectedMagnet.strength}
            </div>
            <div className="text-[10px] text-center text-gray-500 mt-1">
              单位: A·m²
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-700/50 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Database size={12} />
            <span>数据来源: {selectedMagnet.source}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <GitBranch size={12} />
            <span>版本: v{selectedMagnet.version}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} />
            <span>创建: {new Date(selectedMagnet.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
