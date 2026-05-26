import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trophy, BookOpen, Settings, ChevronRight, Star, Target, Wind, Coins } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <svg className="absolute w-full h-full opacity-10" viewBox="0 0 1200 800">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3b82f6" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <g stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.3">
            <path d="M 100 600 L 300 450 L 500 600" />
            <path d="M 300 450 L 300 600" />
            <path d="M 700 600 L 900 400 L 1100 600" />
            <path d="M 800 500 L 800 600" />
            <path d="M 900 400 L 1000 500" />
          </g>
        </svg>
        
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full filter blur-[100px] opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500 rounded-full filter blur-[120px] opacity-15 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="p-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2"
              style={{ fontFamily: "'Orbitron', sans-serif" }}>
            桥梁受力搭建赛
          </h1>
          <p className="text-blue-300 text-lg">物理社团 · 结构力学模拟平台</p>
        </header>
        
        <main className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Target className="text-cyan-400" />
                选择关卡
              </h2>
              
              <div className="space-y-3">
                {levels.map((level, index) => {
                  const bestScore = getBestScore(level.id);
                  const isSelected = selectedLevel === level.id;
                  
                  return (
                    <button
                      key={level.id}
                      onClick={() => setSelectedLevel(level.id)}
                      className={`w-full p-4 rounded-xl text-left transition-all duration-300 border-2 ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-700/50 border-transparent hover:bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-lg">第 {index + 1} 关: {level.name}</div>
                          <div className="text-slate-400 text-sm mt-1">{level.description}</div>
                          <div className="flex gap-4 mt-2 text-xs">
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Coins size={14} /> 预算 {level.budget}
                            </span>
                            <span className="flex items-center gap-1 text-cyan-400">
                              <Wind size={14} /> 风载 {level.windLoad}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {bestScore !== null && (
                            <>
                              <div className="text-cyan-400 font-bold">{bestScore} 分</div>
                              <div className="flex gap-1 mt-1">
                                {[...Array(3)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={16}
                                    className={i < (sessions.find(s => s.levelId === level.id && s.success)?.stars || 0)
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-slate-600'
                                    }
                                  />
                                ))}
                              </div>
                            </>
                          )}
                          <ChevronRight className={`ml-auto transition-transform ${isSelected ? 'translate-x-1' : ''}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={handleStart}
                disabled={!selectedLevel}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                  selectedLevel
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02]'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play size={24} />
                开始搭建
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Trophy className="text-yellow-400" />
                  游戏成就
                </h2>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-cyan-400">{sessions.filter(s => s.success).length}</div>
                    <div className="text-slate-400 text-sm mt-1">通关次数</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400">
                      {sessions.length > 0 ? Math.max(...sessions.map(s => s.score || 0)) : 0}
                    </div>
                    <div className="text-slate-400 text-sm mt-1">最高得分</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {sessions.length > 0 ? Math.round(sessions.filter(s => s.success).length / sessions.length * 100) : 0}%
                    </div>
                    <div className="text-slate-400 text-sm mt-1">成功率</div>
                  </div>
                </div>
                
                {sessions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3 text-slate-300">最近记录</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {[...sessions].reverse().slice(0, 5).map(session => {
                        const level = levels.find(l => l.id === session.levelId);
                        return (
                          <div key={session.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-2">
                            <span className="text-sm">{level?.name}</span>
                            <span className={`text-sm font-bold ${session.success ? 'text-green-400' : 'text-red-400'}`}>
                              {session.success ? `${session.score}分` : '失败'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                  <BookOpen className="text-green-400" />
                  游戏说明
                </h2>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    点击放置节点，连接节点创建杆件
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    选择不同材料，平衡成本与强度
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    杆件颜色显示应力：绿色安全 → 黄色警告 → 红色危险
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    风载会增加侧向力，注意结构稳定性
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    预算越少、用时越短，得分越高
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
        
        <footer className="p-6 text-center text-slate-500 text-sm">
          物理社团桥梁搭建游戏 · 版本 1.0.0
        </footer>
      </div>
    </div>
  );
}
