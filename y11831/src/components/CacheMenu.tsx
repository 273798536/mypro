import { Database, Zap, Target, Clock } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export function CacheMenu() {
  const { cache, menu } = useGameStore();
  const hitRate = cache.hitCount + cache.missCount > 0
    ? ((cache.hitCount / (cache.hitCount + cache.missCount)) * 100).toFixed(1)
    : '0.0';

  const getMenuName = (menuId: string) => {
    const item = menu.find(m => m.id === menuId);
    return item?.name || menuId;
  };

  const getMenuEmoji = (menuId: string) => {
    const item = menu.find(m => m.id === menuId);
    return item?.emoji || '🍽️';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-800">菜单缓存</h2>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            {cache.strategy}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {cache.items.length}/{cache.capacity}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <Zap className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-600">{cache.hitCount}</div>
          <div className="text-xs text-green-700">命中</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <Target className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-red-600">{cache.missCount}</div>
          <div className="text-xs text-red-700">未命中</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <div className="text-xl font-bold text-blue-600">{hitRate}%</div>
          <div className="text-xs text-blue-700">命中率</div>
        </div>
      </div>

      <div className="space-y-2">
        {cache.items.map((item, index) => (
          <div
            key={item.menuId}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{getMenuEmoji(item.menuId)}</span>
              <span className="text-sm font-medium text-gray-700">
                {getMenuName(item.menuId)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>访问: {item.accessCount}次</span>
              <span className="text-gray-400">|</span>
              <span>位置: #{index + 1}</span>
            </div>
          </div>
        ))}
        {cache.items.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">缓存为空</p>
          </div>
        )}
      </div>

      {cache.items.length < cache.capacity && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          还可缓存 {cache.capacity - cache.items.length} 个菜品
        </div>
      )}
    </div>
  );
}
