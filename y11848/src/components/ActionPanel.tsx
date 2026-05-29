import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SAMPLE_KEYS, SAMPLE_VALUES } from '../constants/game';
import { getRandomItem } from '../utils/gameUtils';

export const ActionPanel: React.FC = () => {
  const { 
    selectedCacheId, 
    cache, 
    handleWrite, 
    handleDelete,
    handlePreventBreakdown,
    requestQueue,
  } = useGameStore();
  
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  const selectedEntry = cache.find(e => e.id === selectedCacheId);
  
  const hotKeysInQueue = requestQueue.filter(r => r.isHotKey).map(r => r.key);
  const uniqueHotKeys = [...new Set(hotKeysInQueue)];

  const handleQuickWrite = () => {
    const key = customKey || getRandomItem(SAMPLE_KEYS);
    const value = customValue || getRandomItem(SAMPLE_VALUES);
    handleWrite(key, value);
    setCustomKey('');
    setCustomValue('');
  };

  const handleDeleteSelected = () => {
    if (selectedEntry) {
      handleDelete(selectedEntry.key);
    }
  };

  return (
    <div className="bg-tech-blue/50 rounded-xl p-4 border border-tech-cyan/20">
      <h3 className="text-tech-cyan font-bold text-lg mb-4 flex items-center gap-2">
        <span className="text-2xl">🎮</span>
        操作面板
      </h3>

      {selectedEntry ? (
        <div className="mb-4 p-3 bg-tech-cyan/10 rounded-lg border border-tech-cyan/30">
          <div className="text-sm text-gray-400 mb-2">已选中缓存:</div>
          <div className="font-mono text-white text-sm mb-1">{selectedEntry.key}</div>
          <div className="font-mono text-gray-400 text-xs truncate">{selectedEntry.value}</div>
          <button
            onClick={handleDeleteSelected}
            className="mt-3 w-full px-3 py-1.5 bg-tech-red text-white rounded text-sm hover:bg-tech-red/80 transition-colors"
          >
            🗑️ 删除此缓存
          </button>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
          <div className="text-sm text-gray-400 text-center">点击缓存格子选中</div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Key (可选)</label>
          <input
            type="text"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="例如: user:1001"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Value (可选)</label>
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder='例如: {"name":"test"}'
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-tech-cyan"
          />
        </div>

        <button
          onClick={handleQuickWrite}
          className="w-full py-2.5 bg-tech-cyan text-tech-dark rounded-lg font-bold hover:bg-tech-cyan/80 transition-colors flex items-center justify-center gap-2"
        >
          <span>✏️</span> 写入缓存
        </button>

        {uniqueHotKeys.length > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <span>🔥</span> 热点Key预警 (可能引发击穿)
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueHotKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handlePreventBreakdown(key)}
                  className="px-3 py-1.5 bg-tech-purple/20 border border-tech-purple text-tech-purple rounded text-xs font-mono hover:bg-tech-purple hover:text-white transition-colors"
                >
                  🛡️ {key}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              点击按钮提前预热/刷新缓存，防止击穿
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
