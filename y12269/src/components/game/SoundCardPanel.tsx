import { useGameStore } from '../../store/gameStore';
import { SoundCard } from './SoundCard';

export function SoundCardPanel() {
  const { availableSourceCards, currentPeriod } = useGameStore();

  const handleDragStart = (e: React.DragEvent, sourceId: string) => {
    e.dataTransfer.setData('sourceId', sourceId);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">🔊 声源卡 (拖拽放置)</h3>

      {availableSourceCards.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>暂无可放置的声源卡</p>
          <p className="text-sm mt-1">进入下一回合获取新的声源卡</p>
        </div>
      ) : (
        <div className="space-y-3">
          {availableSourceCards.map((source) => (
            <SoundCard
              key={source.id}
              source={source}
              currentPeriod={currentPeriod}
              onDragStart={(e) => handleDragStart(e, source.id)}
              compact
            />
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 提示：将声源卡拖拽到左侧地图区域的对应位置。注意查看声源的适用时段。
        </p>
      </div>
    </div>
  );
}
