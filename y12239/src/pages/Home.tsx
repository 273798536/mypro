import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Play, History, BookOpen, TrendingUp, MapPin, Ruler, Route, Award } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export default function Home() {
  const navigate = useNavigate();
  const { startNewGame, sessions } = useGameStore();
  const [playerName, setPlayerName] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleStartGame = () => {
    if (!playerName.trim()) return;
    const session = startNewGame(playerName.trim());
    navigate(`/game/${session.id}`);
  };

  const handleContinueSession = (sessionId: string) => {
    navigate(`/game/${sessionId}`);
  };

  const handleViewReport = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session?.status === 'playing') {
      navigate(`/game/${sessionId}`);
    } else {
      navigate(`/report/${sessionId}`);
    }
  };

  const handleReview = (sessionId: string) => {
    navigate(`/review/${sessionId}`);
  };

  const recentSessions = [...sessions]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 5);

  const features = [
    {
      icon: Ruler,
      title: '三角计算',
      description: '在操作中感受三角函数的实际应用，每个角度都对应 sin/cos/tan 的实时计算',
      color: 'from-[#0F3460] to-[#1a4a8a]',
    },
    {
      icon: Route,
      title: '路径选择',
      description: '在地形障碍中规划最优测量路径，体验工程测绘的实际决策过程',
      color: 'from-[#16C79A] to-[#12a884]',
    },
    {
      icon: Award,
      title: '规则化评分',
      description: '每项操作都有明确的评分规则，错误分类追溯到具体规则条目',
      color: 'from-[#FFD93D] to-[#e6c236]',
    },
    {
      icon: BookOpen,
      title: '可追溯复核',
      description: '测绘点、角度尺、成绩一一对应，老师可手动修正并新旧对比',
      color: 'from-[#E94560] to-[#c73a52]',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F3460] via-[#1a4a8a] to-[#0F3460]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-[#16C79A]/10 rounded-full blur-3xl" />
        <div className="absolute top-[30%] right-[10%] w-96 h-96 bg-[#FFD93D]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[20%] w-80 h-80 bg-[#E94560]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="px-6 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Compass size={32} className="text-[#FFD93D]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-['Orbitron']">
                  几何测绘探险
                </h1>
                <p className="text-sm text-white/60">Geometry Survey Adventure</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                showHistory
                  ? 'bg-white text-[#0F3460]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <History size={18} />
              <span className="font-medium">历史记录</span>
              {sessions.length > 0 && (
                <span className="px-2 py-0.5 bg-[#FFD93D] text-[#0F3460] text-xs font-bold rounded-full">
                  {sessions.length}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {showHistory && recentSessions.length > 0 && (
            <div className="mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <History size={20} />
                最近的测绘任务
              </h2>
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          session.status === 'playing'
                            ? 'bg-[#16C79A]/20'
                            : session.status === 'reviewed'
                            ? 'bg-[#FFD93D]/20'
                            : 'bg-[#0F3460]/50'
                        )}
                      >
                        {session.status === 'playing' ? (
                          <Play size={20} className="text-[#16C79A]" />
                        ) : session.status === 'reviewed' ? (
                          <TrendingUp size={20} className="text-[#FFD93D]" />
                        ) : (
                          <Award size={20} className="text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">{session.playerName}</div>
                        <div className="text-sm text-white/50">
                          {new Date(session.startTime).toLocaleString('zh-CN')}
                          {session.scoreReport && (
                            <span className="ml-2 text-[#FFD93D]">
                              · 得分: {session.scoreReport.totalScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium',
                          session.status === 'playing'
                            ? 'bg-[#16C79A]/20 text-[#16C79A]'
                            : session.status === 'reviewed'
                            ? 'bg-[#FFD93D]/20 text-[#FFD93D]'
                            : 'bg-white/20 text-white'
                        )}
                      >
                        {session.status === 'playing'
                          ? '进行中'
                          : session.status === 'reviewed'
                          ? '已评阅'
                          : '已提交'}
                      </span>
                      <button
                        onClick={() => handleViewReport(session.id)}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm font-medium"
                      >
                        {session.status === 'playing' ? '继续' : '查看'}
                      </button>
                      {session.status !== 'playing' && (
                        <button
                          onClick={() => handleReview(session.id)}
                          className="px-4 py-2 bg-[#FFD93D] text-[#0F3460] rounded-lg hover:bg-[#e6c236] transition-all text-sm font-bold"
                        >
                          评阅
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showHistory && recentSessions.length === 0 && (
            <div className="mb-8 bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 text-center">
              <History size={48} className="mx-auto mb-4 text-white/30" />
              <p className="text-white/60 text-lg">暂无历史记录</p>
              <p className="text-white/40 text-sm">开始你的第一次几何测绘探险吧！</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD93D]/20 rounded-full mb-6">
                <span className="text-[#FFD93D] text-sm font-medium">数学教育 · 几何测绘</span>
              </div>
              <h2 className="text-5xl font-bold text-white mb-6 font-['Orbitron'] leading-tight">
                把每一次测量
                <br />
                变成<span className="text-[#FFD93D]">几何思考</span>
              </h2>
              <p className="text-lg text-white/70 mb-8 leading-relaxed">
                不是简单的点击得分游戏。在这里，你需要用角度尺测量、用测距仪读数、
                在地形障碍中规划最优路径。每一个错误都有具体的规则依据，
                每一份成绩都可以追溯复核。
              </p>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  输入你的姓名，开始探险
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
                    placeholder="请输入学生姓名"
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD93D] focus:ring-2 focus:ring-[#FFD93D]/30 transition-all"
                  />
                  <button
                    onClick={handleStartGame}
                    disabled={!playerName.trim()}
                    className={cn(
                      'flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300',
                      playerName.trim()
                        ? 'bg-gradient-to-r from-[#FFD93D] to-[#e6c236] text-[#0F3460] hover:shadow-xl hover:scale-105 active:scale-95'
                        : 'bg-white/20 text-white/50 cursor-not-allowed'
                    )}
                  >
                    <Play size={20} />
                    开始
                  </button>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#16C79A]/20 to-[#FFD93D]/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-4">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={index}
                        className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all group"
                      >
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 group-hover:scale-110 transition-transform',
                            feature.color
                          )}
                        >
                          <Icon size={24} className="text-white" />
                        </div>
                        <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#16C79A] flex items-center justify-center text-white text-sm font-bold border-2 border-white/10">
                        三
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#0F3460] flex items-center justify-center text-white text-sm font-bold border-2 border-white/10">
                        角
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#FFD93D] flex items-center justify-center text-[#0F3460] text-sm font-bold border-2 border-white/10">
                        测
                      </div>
                    </div>
                    <div className="text-sm text-white/60">
                      <span className="font-medium text-white">角度越界 · 单位错误 · 障碍穿越</span>
                      <br />
                      三类错误分开统计，规则可追溯
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <MapPin size={28} className="text-[#16C79A] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">测绘点可追溯</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                每个测绘点的选择、角度测量、距离输入都有独立的操作记录，
                复核时可以清楚看到数据从哪来。
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <Ruler size={28} className="text-[#FFD93D] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">规则化错误提示</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                做错时不只是扣分，会明确指出是三角计算还是路径选择的哪条规则没处理好，
                帮助理解错误原因。
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <TrendingUp size={28} className="text-[#E94560] mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">教师修正对比</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                数学老师可以手动修正角度尺或单位，新旧结果并排展示，
                修正记录完整保留，方便后续教学分析。
              </p>
            </div>
          </div>
        </main>

        <footer className="py-8 text-center text-white/40 text-sm">
          <p>几何测绘探险 · 让数学学习更有深度</p>
        </footer>
      </div>
    </div>
  );
}
