import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trophy, BookOpen, ChevronRight, Wind, Coins } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export default function MainMenu() {
  const navigate = useNavigate();
  const { levels, setCurrentLevel, sessions } = useGameStore();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  const getBestScore = (levelId: string) => {
    const levelSessions = sessions.filter(s => s.levelId === levelId && s.success);
    if (levelSessions.length === 0) return null;
    return Math.max(...levelSessions.map(s => s.score || 0));
  };
  
  const handleStart = () => {
    if (selectedLevel) {
      setCurrentLevel(selectedLevel);
      navigate('/build');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      <header className="p-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
            style={{ fontFamily: "'Orbitron', sans-serif" }}>
          桥梁受力搭建赛
        </h1>
        <p className="text-blue-300 text-sm">物理社团 · 结构力学模拟平台</p>
      </header>
      
      <main className="px-4 pb-4">
        <div className="w-full max-w-5xl mx-auto">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Coins className="text-cyan-400" size={18} />
            选择关卡
          </h2>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            {levels.map((level, index) => {
              const bestScore = getBestScore(level.id);
              const isSelected = selectedLevel === level.id;
              
              return (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel(level.id)}
                  className={`p-3 rounded-xl text-left transition-all border-2 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400'
                      : 'bg-slate-800/60 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm">第 {index + 1} 关: {level.name}</div>
                  <div className="text-slate-400 text-xs">{level.description}</div>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="text-yellow-400">预算 {level.budget}</span>
                    <span className="text-cyan-400">风载 {level.windLoad}</span>
                  </div>
                  {bestScore !== null && (
                    <div className="text-cyan-400 font-bold text-xs mt-1">最佳: {bestScore} 分</div>
                  )}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={handleStart}
            disabled={!selectedLevel}
            className={`w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              selectedLevel
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/30 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play size={20} />
            开始搭建
          </button>
          
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700">
              <div className="text-xl font-bold text-cyan-400">{sessions.filter(s => s.success).length}</div>
              <div className="text-slate-400 text-xs">通关</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700">
              <div className="text-xl font-bold text-yellow-400">
                {sessions.length > 0 ? Math.max(...sessions.map(s => s.score || 0)) : 0}
              </div>
              <div className="text-slate-400 text-xs">最高分</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700">
              <div className="text-xl font-bold text-green-400">
                {sessions.length > 0 ? Math.round(sessions.filter(s => s.success).length / sessions.length * 100) : 0}%
              </div>
              <div className="text-slate-400 text-xs">成功率</div>
            </div>
          </div>
          
          <div className="mt-4 bg-slate-800/60 rounded-xl p-3 border border-slate-700">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <BookOpen className="text-green-400" size={14} />
              操作说明
            </h3>
            <ul className="space-y-0.5 text-slate-300 text-xs">
              <li>• 选择材料 → 点击节点 → 连接创建杆件</li>
              <li>• 右键删除节点/杆件，拖拽移动节点</li>
              <li>• 杆件颜色：绿色安全→黄色警告→红色危险</li>
              <li>• 风载增加侧向力，预算越少得分越高</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
