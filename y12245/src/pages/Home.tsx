import React from 'react';
import { useNavigate } from 'react-router-dom';
import { levels, getLevelDifficultyColor, getLevelDifficultyLabel } from '../data/levels';
import { Flag, Play, History, BookOpen, AlertTriangle, Zap, Activity } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const getFunctionIcon = (type: string) => {
    switch (type) {
      case 'polynomial':
        return <Activity className="w-5 h-5" />;
      case 'trigonometric':
        return <Zap className="w-5 h-5" />;
      case 'piecewise':
        return <AlertTriangle className="w-5 h-5" />;
      case 'composite':
        return <Flag className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const startGame = (levelId: string) => {
    navigate(`/game/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">函数参数赛车</h1>
              <p className="text-xs text-slate-400">数学兴趣班教学工具</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-all border border-slate-600/50"
          >
            <History className="w-4 h-4" />
            <span className="text-sm">历史记录</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            选择挑战关卡
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            通过调整函数参数控制赛车轨迹，理解参数如何影响曲线形状。
            每一关都包含不同的数学概念挑战！
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => (
            <div
              key={level.id}
              className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition-all hover:shadow-xl hover:shadow-slate-900/50"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      {getFunctionIcon(level.functionType)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{level.name}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getLevelDifficultyColor(level.difficulty)}`}
                      >
                        {getLevelDifficultyLabel(level.difficulty)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-mono">
                      {level.functionType}
                    </span>
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-4">{level.description}</p>

                <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-slate-500 mb-1">函数表达式</div>
                  <code className="text-cyan-400 text-sm font-mono">
                    {level.functionExpression}
                  </code>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {level.obstacles.map((obstacle, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs ${
                        obstacle.type === 'out_of_bounds'
                          ? 'bg-red-500/20 text-red-400'
                          : obstacle.type === 'curve_break'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {obstacle.type === 'out_of_bounds' && '⚠️ 参数越界'}
                      {obstacle.type === 'curve_break' && '💔 曲线断裂'}
                      {obstacle.type === 'speed_mismatch' && '⚡ 速度误判'}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-slate-500 mb-4 italic">
                  💡 {level.hint}
                </div>

                <button
                  onClick={() => startGame(level.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 group-hover:shadow-blue-500/30"
                >
                  <Play className="w-5 h-5" />
                  开始挑战
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">参数越界</h4>
            <p className="text-slate-400 text-sm">
              当参数设置超出安全范围时，赛车会冲出赛道边界。学习控制参数的合理范围。
            </p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">曲线断裂</h4>
            <p className="text-slate-400 text-sm">
              分段函数在分界点处需要保持连续，否则赛车轨迹会出现断裂。
            </p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-orange-400" />
            </div>
            <h4 className="text-white font-semibold mb-2">速度误判</h4>
            <p className="text-slate-400 text-sm">
              函数导数过大时，曲线斜率变化过快，会导致赛车速度失控。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
