import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Trophy, AlertTriangle, Wind, Zap, UserX, Clock, ArrowLeft, RotateCcw, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ResultPage: React.FC = () => {
  const { score, penalties, tasks, hasPowerNodes, restartGame } = useGameStore();
  const navigate = useNavigate();

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const totalPenalty = penalties.reduce((sum, p) => sum + p.penalty, 0);

  const getGrade = () => {
    if (score >= 800) return { grade: 'S', color: 'text-yellow-400', desc: '完美指挥官' };
    if (score >= 600) return { grade: 'A', color: 'text-success-green', desc: '优秀指挥官' };
    if (score >= 400) return { grade: 'B', color: 'text-cyber-cyan', desc: '合格指挥官' };
    if (score >= 200) return { grade: 'C', color: 'text-warning-orange', desc: '需要改进' };
    return { grade: 'D', color: 'text-alert-red', desc: '空间站危机' };
  };

  const gradeInfo = getGrade();

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'oxygen': return '氧气警报';
      case 'power': return '电力警报';
      case 'fatigue': return '人员疲劳';
      case 'conflict': return '任务冲突';
      case 'timeout': return '任务超时';
      default: return '未知';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'oxygen': return <Wind className="w-4 h-4" />;
      case 'power': return <Zap className="w-4 h-4" />;
      case 'fatigue': return <UserX className="w-4 h-4" />;
      case 'conflict': return <AlertTriangle className="w-4 h-4" />;
      case 'timeout': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleRestart = () => {
    restartGame();
    navigate('/game');
  };

  return (
    <div className="w-full min-h-screen flex flex-col p-8 gap-6 overflow-y-auto">
      <div className="scanline fixed inset-0 pointer-events-none z-50" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-cyber-cyan font-orbitron tracking-wider mb-2">
          任务结算
        </h1>
        <p className="text-gray-500 text-sm">MISSION COMPLETE</p>
      </motion.div>

      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-4"
        >
          <Card className="text-center py-8" glow>
            <div className={`text-8xl font-bold font-orbitron ${gradeInfo.color} mb-2`}>
              {gradeInfo.grade}
            </div>
            <div className={`text-lg ${gradeInfo.color} mb-4`}>{gradeInfo.desc}</div>
            
            <div className="flex items-center justify-center gap-2 text-4xl font-bold text-cyber-cyan mb-6">
              <Trophy className="w-10 h-10" />
              <span>{score.toFixed(0)}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-success-green text-2xl font-bold">{completedTasks}</div>
                <div className="text-gray-400">已完成</div>
              </div>
              <div>
                <div className="text-alert-red text-2xl font-bold">{failedTasks}</div>
                <div className="text-gray-400">失败</div>
              </div>
              <div>
                <div className="text-warning-orange text-2xl font-bold">-{totalPenalty}</div>
                <div className="text-gray-400">扣分</div>
              </div>
            </div>
          </Card>

          <Card className="mt-6">
            <h3 className="font-bold text-cyber-cyan mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              操作
            </h3>
            <div className="space-y-3">
              <Button variant="primary" className="w-full" onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                再来一局
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/replay')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                查看复盘
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-8"
        >
          <Card>
            <h3 className="font-bold text-cyber-cyan mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              警报扣分明细
            </h3>

            {penalties.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🎉</div>
                <p>完美！没有任何警报扣分</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {penalties.map((penalty, index) => (
                  <motion.div
                    key={penalty.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      penalty.severity === 'critical'
                        ? 'bg-alert-red/10 border-alert-red/30'
                        : 'bg-warning-orange/10 border-warning-orange/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={penalty.severity === 'critical' ? 'text-alert-red' : 'text-warning-orange'}>
                        {getAlertTypeIcon(penalty.type)}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{penalty.message}</div>
                        <div className="text-xs text-gray-500">
                          {getAlertTypeLabel(penalty.type)} · {Math.floor(penalty.timestamp)}秒
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${
                      penalty.severity === 'critical' ? 'text-alert-red' : 'text-warning-orange'
                    }`}>
                      -{penalty.penalty}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {hasPowerNodes && (
            <Card className="mt-6">
              <h3 className="font-bold text-cyber-cyan mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                电力节点影响明细
              </h3>
              <div className="space-y-2">
                {tasks.filter(t => t.powerNodeImpact?.affected).map(task => (
                  <div key={task.id} className="p-3 rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-cyber-cyan text-xs">⚡ 受电力节点影响</span>
                        <div className="font-medium">{task.name}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.status === 'completed' ? 'bg-success-green/20 text-success-green' :
                        task.status === 'failed' ? 'bg-alert-red/20 text-alert-red' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '进行中'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};
