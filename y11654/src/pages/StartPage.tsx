import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  ShieldAlert, 
  Wind, 
  Weight, 
  UserX, 
  ChevronRight,
  Info,
  Target,
  Award
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { Difficulty, DIFFICULTY_CONFIG } from '../types/game';
import { cn } from '../lib/utils';

export default function StartPage() {
  const navigate = useNavigate();
  const { startGame } = useGameStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [showInstructions, setShowInstructions] = useState(false);
  
  const difficulties: { key: Difficulty; label: string; description: string; color: string }[] = [
    { 
      key: 'easy', 
      label: '简单模式', 
      description: `${DIFFICULTY_CONFIG.easy.maxRounds}回合，风速变化慢，风险概率低`,
      color: 'success'
    },
    { 
      key: 'normal', 
      label: '普通模式', 
      description: `${DIFFICULTY_CONFIG.normal.maxRounds}回合，标准难度，适合训练`,
      color: 'info'
    },
    { 
      key: 'hard', 
      label: '困难模式', 
      description: `${DIFFICULTY_CONFIG.hard.maxRounds}回合，风速变化快，高风险概率`,
      color: 'danger'
    },
  ];
  
  const riskTypes = [
    { 
      icon: Weight, 
      title: '超重吊装', 
      description: '吊物重量超过额定载荷时，必须拒绝起吊',
      color: 'text-danger-500'
    },
    { 
      icon: Wind, 
      title: '风速超限', 
      description: '风速超过安全阈值时，必须紧急停止作业',
      color: 'text-primary-500'
    },
    { 
      icon: UserX, 
      title: '人员闯入', 
      description: '有人员闯入警戒区域时，必须立即紧急停止',
      color: 'text-danger-500'
    },
  ];
  
  const handleStart = () => {
    startGame(selectedDifficulty);
    navigate('/game');
  };
  
  return (
    <div className="min-h-screen bg-dark-950 bg-grid-pattern flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12 animate-slide-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500/20 rounded-2xl mb-6">
              <ShieldAlert className="w-10 h-10 text-primary-500" />
            </div>
            <h1 className="text-5xl md:text-6xl font-industrial font-bold text-white mb-4 tracking-tight">
              塔吊<span className="text-primary-500">风速</span>指挥赛
            </h1>
            <p className="text-xl text-dark-400 max-w-2xl mx-auto">
              通过模拟真实吊装场景，提升塔吊指挥人员的风险识别能力和安全操作意识
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {riskTypes.map((risk, index) => (
              <div 
                key={risk.title}
                className="bg-dark-800/50 backdrop-blur-sm rounded-xl p-6 border border-dark-700 hover:border-dark-600 transition-all duration-300 hover:transform hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", risk.color.replace('text-', 'bg-').replace('500', '500/20'))}>
                  <risk.icon className={cn("w-6 h-6", risk.color)} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{risk.title}</h3>
                <p className="text-dark-400 text-sm">{risk.description}</p>
              </div>
            ))}
          </div>
          
          {!showInstructions ? (
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-industrial font-bold text-white">选择难度</h2>
                <button 
                  onClick={() => setShowInstructions(true)}
                  className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
                >
                  <Info className="w-5 h-5" />
                  <span>游戏说明</span>
                </button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {difficulties.map((diff) => (
                  <button
                    key={diff.key}
                    onClick={() => setSelectedDifficulty(diff.key)}
                    className={cn(
                      "relative p-6 rounded-xl border-2 transition-all duration-300 text-left",
                      selectedDifficulty === diff.key
                        ? diff.color === 'success' 
                          ? 'border-success-500 bg-success-500/10'
                          : diff.color === 'info'
                            ? 'border-info-500 bg-info-500/10'
                            : 'border-danger-500 bg-danger-500/10'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600'
                    )}
                  >
                    {selectedDifficulty === diff.key && (
                      <div className={cn(
                        "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center",
                        diff.color === 'success' ? 'bg-success-500' :
                        diff.color === 'info' ? 'bg-info-500' : 'bg-danger-500'
                      )}>
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "inline-block px-3 py-1 rounded-full text-xs font-medium mb-3",
                      diff.color === 'success' ? 'bg-success-500/20 text-success-400' :
                      diff.color === 'info' ? 'bg-info-500/20 text-info-400' : 
                      'bg-danger-500/20 text-danger-400'
                    )}>
                      {diff.label}
                    </div>
                    <p className="text-dark-400 text-sm">{diff.description}</p>
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleStart}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:transform hover:-translate-y-0.5"
              >
                <Play className="w-6 h-6" />
                开始训练
              </button>
            </div>
          ) : (
            <div className="bg-dark-800/50 backdrop-blur-sm rounded-2xl p-8 border border-dark-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-industrial font-bold text-white">游戏说明</h2>
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  返回选择难度
                </button>
              </div>
              
              <div className="space-y-6 text-dark-300">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-info-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-info-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">游戏目标</h3>
                    <p>在限定时间内完成吊装任务，正确识别并应对各种安全风险，获取最高分数。</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-success-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">操作方式</h3>
                    <p>使用右侧控制面板选择指挥指令：起吊、下放、移动、停止、紧急停止、确认安全、拒绝起吊。</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">评分规则</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>安全完成吊装：+100分</li>
                      <li>正确识别风险：+50分</li>
                      <li>响应迅速（3秒内）：额外+20分</li>
                      <li>错误指令：-30分，严重错误直接失败</li>
                      <li>响应超时（超过5秒）：-20分</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleStart}
                className="w-full mt-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
              >
                <Play className="w-6 h-6" />
                开始训练
              </button>
            </div>
          )}
          
          <div className="mt-8 text-center text-dark-500 text-sm">
            <p>材料来源：塔吊操作规程 | 吊装安全规范 | 气象作业标准 | 现场安全管理</p>
          </div>
        </div>
      </div>
    </div>
  );
}
