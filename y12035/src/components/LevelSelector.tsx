import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { levels } from '@/data/levels';
import { Zap, Clock, AlertTriangle } from 'lucide-react';

interface LevelSelectorProps {
  onSelect: () => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelect }) => {
  const { initGame, level } = useGameStore();

  const handleLevelSelect = (levelId: number) => {
    initGame(levelId);
    onSelect();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4" style={{ border: '3px solid #D4AF37' }}>
        <h1
          className="text-4xl font-bold text-center mb-2"
          style={{ color: '#D4AF37', fontFamily: 'Playfair Display, serif' }}
        >
          债券久期弹球
        </h1>
        <p className="text-center text-gray-400 mb-8">
          在弹球游戏中学习债券久期与利率的关系
        </p>

        <div className="space-y-4 mb-8">
          {levels.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => handleLevelSelect(lvl.id)}
              className={`w-full p-5 rounded-xl text-left transition-all hover:scale-[1.02] ${level === lvl.id ? 'ring-2 ring-yellow-400' : ''}`}
              style={{
                background: level === lvl.id ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: level === lvl.id ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    关卡 {lvl.id}: {lvl.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    初始利率: {lvl.initialRate}% | 挡板数量: {lvl.paddles.length}
                  </p>
                </div>
                <div className="flex gap-2">
                  {lvl.durationBarDelayChance > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-900 rounded text-xs text-orange-300">
                      <Clock className="w-3 h-3" />
                      久期延迟
                    </div>
                  )}
                  {lvl.fieldMissingChance > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-900 rounded text-xs text-red-300">
                      <AlertTriangle className="w-3 h-3" />
                      字段缺失
                    </div>
                  )}
                  {lvl.id >= 2 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900 rounded text-xs text-yellow-300">
                      <Zap className="w-3 h-3" />
                      利率连跳
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-gray-500">
                <span>现金流道具: {lvl.cashflowItems.length}个</span>
                <span>字段缺失概率: {(lvl.fieldMissingChance * 100).toFixed(0)}%</span>
                <span>久期延迟概率: {(lvl.durationBarDelayChance * 100).toFixed(0)}%</span>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 bg-gray-800 rounded-xl">
          <h3 className="font-bold mb-2" style={{ color: '#D4AF37' }}>游戏核心机制</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• <span className="text-red-400">红色挡板</span>: 利率上升 → 债券价格下降</li>
            <li>• <span className="text-green-400">绿色挡板</span>: 利率下降 → 债券价格上升</li>
            <li>• <span className="text-yellow-400">黄色挡板</span>: 字段缺失，使用默认值</li>
            <li>• 连续碰撞同方向挡板3次触发<span className="text-yellow-400">利率连跳</span></li>
            <li>• 现金流道具碰撞后5秒内点击确认收集，否则<span className="text-red-400">漏计</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
