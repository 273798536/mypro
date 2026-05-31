import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCcw, BarChart2, FileText, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { useState } from 'react';
import StarField from '../components/StarField';
import { useGameStore } from '../store/gameStore';
import { getDeductionSummary, getBonusSummary } from '../utils/scoringSystem';
import { SETTLEMENT_RULES } from '../utils/constants';
import { generateFlightReport, saveFlightReport } from '../utils/storage';

export default function Settlement() {
  const navigate = useNavigate();
  const { score, time, events, conflicts, position, margin, restartGame } = useGameStore();
  const [showDeductions, setShowDeductions] = useState(true);
  const [showBonuses, setShowBonuses] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const deductionSummary = getDeductionSummary(score);
  const bonusSummary = getBonusSummary(score);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs}秒`;
  };

  const getScoreGrade = (total: number): { grade: string; color: string; message: string } => {
    if (total >= 900) return { grade: 'S', color: 'text-neon-yellow', message: '完美飞行！' };
    if (total >= 800) return { grade: 'A', color: 'text-neon-green', message: '优秀飞行员' };
    if (total >= 600) return { grade: 'B', color: 'text-neon-cyan', message: '良好表现' };
    if (total >= 400) return { grade: 'C', color: 'text-neon-yellow', message: '需要加强训练' };
    return { grade: 'D', color: 'text-neon-red', message: '飞行失败' };
  };

  const grade = getScoreGrade(score.total);

  const handleGenerateReport = () => {
    const report = generateFlightReport(useGameStore.getState());
    saveFlightReport(report);
    navigate('/report');
  };

  const handleRestart = () => {
    restartGame();
    navigate('/flight');
  };

  const totalDeductions = deductionSummary.totalDeductions;
  const totalBonuses = bonusSummary.totalBonuses;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 flex items-center justify-between bg-space-900/80 backdrop-blur-sm border-b border-neon-cyan/20"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="font-orbitron text-xl text-neon-cyan flex items-center gap-2">
                <Calculator size={24} />
                飞行结算
              </h1>
              <p className="text-xs text-gray-400">Settlement Report</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/review')}
              className="px-4 py-2 rounded-lg border border-neon-purple/50 text-neon-purple hover:bg-neon-purple/10 transition-colors flex items-center gap-2"
            >
              <BarChart2 size={18} />
              复盘分析
            </button>
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 rounded-lg border border-neon-yellow/50 text-neon-yellow hover:bg-neon-yellow/10 transition-colors flex items-center gap-2"
            >
              <FileText size={18} />
              生成报告
            </button>
          </div>
        </motion.header>

        <main className="container px-6 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="panel-glass p-8 text-center mb-8"
          >
            <div className="text-6xl mb-4">
              {score.total >= 600 ? '🎉' : '💫'}
            </div>
            <h2 className="font-orbitron text-2xl text-white mb-2">飞行任务完成</h2>
            <p className="text-gray-400 mb-6">总飞行时长: {formatTime(time)}</p>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">评级</div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
                  className={`text-8xl font-orbitron font-bold ${grade.color}`}
                >
                  {grade.grade}
                </motion.div>
                <div className={`text-lg mt-2 ${grade.color}`}>{grade.message}</div>
              </div>

              <div className="w-px h-32 bg-space-600" />

              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">最终得分</div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="font-mono text-7xl font-bold text-neon-cyan"
                >
                  {score.total}
                </motion.div>
                <div className="text-sm text-gray-400 mt-2">
                  满分 1000 分
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">基础分</span>
                <span className="font-mono text-white">{score.baseScore}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neon-green flex items-center gap-1">
                  <CheckCircle size={14} /> 奖励分
                </span>
                <span className="font-mono text-neon-green">+{totalBonuses}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-neon-red flex items-center gap-1">
                  <XCircle size={14} /> 扣分项
                </span>
                <span className="font-mono text-neon-red">-{totalDeductions}</span>
              </div>
              <div className="w-full bg-space-700 h-3 rounded-full mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, Math.min(100, score.total / 10))}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className={`h-full ${
                    score.total >= 800 ? 'bg-neon-green' :
                    score.total >= 600 ? 'bg-neon-cyan' :
                    score.total >= 400 ? 'bg-neon-yellow' : 'bg-neon-red'
                  }`}
                />
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="panel-glass-red p-6"
            >
              <button
                onClick={() => setShowDeductions(!showDeductions)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h3 className="font-orbitron text-lg text-neon-red flex items-center gap-2">
                  <XCircle size={20} />
                  风险警报扣分明细
                  <span className="text-sm font-normal">
                    ({score.riskDeductions.length}项, 共{totalDeductions}分)
                  </span>
                </h3>
                {showDeductions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showDeductions && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {score.riskDeductions.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <CheckCircle className="mx-auto mb-2 text-neon-green" size={32} />
                      太棒了！没有任何扣分
                    </div>
                  ) : (
                    score.riskDeductions.map((deduction, index) => (
                      <motion.div
                        key={deduction.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-start justify-between p-3 bg-space-700/50 rounded-lg border border-neon-red/20"
                      >
                        <div className="flex-1">
                          <div className="text-white text-sm">{deduction.reason}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            时间: {formatTime(deduction.timestamp)}
                          </div>
                        </div>
                        <div className="font-mono text-neon-red font-bold">
                          -{deduction.points}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {Object.keys(deductionSummary.byRule).length > 0 && (
                <div className="mt-4 pt-4 border-t border-space-600">
                  <h4 className="text-xs text-gray-400 mb-2">按类型统计</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(deductionSummary.byRule).map(([rule, data]) => (
                      <div key={rule} className="text-xs bg-space-700/30 p-2 rounded">
                        <div className="text-gray-400">{rule}</div>
                        <div className="text-neon-red">
                          {data.count}次, 共{data.points}分
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="panel-glass-green p-6"
            >
              <button
                onClick={() => setShowBonuses(!showBonuses)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h3 className="font-orbitron text-lg text-neon-green flex items-center gap-2">
                  <CheckCircle size={20} />
                  奖励项明细
                  <span className="text-sm font-normal">
                    ({score.bonuses.length}项, 共{totalBonuses}分)
                  </span>
                </h3>
                {showBonuses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showBonuses && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {score.bonuses.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <AlertTriangle className="mx-auto mb-2 text-neon-yellow" size={32} />
                      暂无奖励，继续加油！
                    </div>
                  ) : (
                    score.bonuses.map((bonus, index) => (
                      <motion.div
                        key={bonus.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-start justify-between p-3 bg-space-700/50 rounded-lg border border-neon-green/20"
                      >
                        <div className="flex-1">
                          <div className="text-white text-sm">{bonus.reason}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            时间: {formatTime(bonus.timestamp)}
                          </div>
                        </div>
                        <div className="font-mono text-neon-green font-bold">
                          +{bonus.points}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {Object.keys(bonusSummary.byRule).length > 0 && (
                <div className="mt-4 pt-4 border-t border-space-600">
                  <h4 className="text-xs text-gray-400 mb-2">按类型统计</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(bonusSummary.byRule).map(([rule, data]) => (
                      <div key={rule} className="text-xs bg-space-700/30 p-2 rounded">
                        <div className="text-gray-400">{rule}</div>
                        <div className="text-neon-green">
                          {data.count}次, 共{data.points}分
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="panel-glass p-5">
              <h4 className="font-orbitron text-sm text-neon-cyan mb-3">飞行概况</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">总时长</span>
                  <span className="font-mono text-white">{formatTime(time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">事件总数</span>
                  <span className="font-mono text-white">{events.length} 个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">信息冲突</span>
                  <span className="font-mono text-white">{conflicts.length} 次</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">及时处理率</span>
                  <span className="font-mono text-neon-green">
                    {events.length > 0
                      ? `${((events.filter(e => e.handled).length / events.length) * 100).toFixed(0)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="panel-glass p-5">
              <h4 className="font-orbitron text-sm text-neon-cyan mb-3">最终仓位</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">类型</span>
                  <span className={`font-mono ${position.type === 'call' ? 'text-neon-green' : 'text-neon-red'}`}>
                    {position.type === 'call' ? '看涨 Call' : '看跌 Put'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">数量</span>
                  <span className="font-mono text-white">{position.quantity} 张</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">行权价</span>
                  <span className="font-mono text-white">${position.strike.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">标的价</span>
                  <span className="font-mono text-white">${position.underlying.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">仓位价值</span>
                  <span className="font-mono text-neon-green">${position.currentValue.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="panel-glass p-5">
              <h4 className="font-orbitron text-sm text-neon-cyan mb-3">保证金状态</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">当前保证金</span>
                  <span className="font-mono text-white">${margin.current.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">所需保证金</span>
                  <span className="font-mono text-white">${margin.required.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">保证金比率</span>
                  <span className={`font-mono ${
                    margin.ratio < 1.2 ? 'text-neon-red' :
                    margin.ratio < 1.5 ? 'text-neon-yellow' : 'text-neon-green'
                  }`}>
                    {margin.ratio.toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">警告次数</span>
                  <span className="font-mono text-neon-yellow">{margin.warnings.length} 次</span>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="panel-glass p-6 mb-8"
          >
            <button
              onClick={() => setShowRules(!showRules)}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="font-orbitron text-lg text-neon-yellow flex items-center gap-2">
                <Calculator size={20} />
                结算口径说明
              </h3>
              {showRules ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {showRules && (
              <div className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-space-900/50 p-4 rounded-lg border border-neon-yellow/20">
                {SETTLEMENT_RULES}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center gap-4"
          >
            <button
              onClick={handleRestart}
              className="btn-neon-green px-8 py-3 text-lg font-orbitron flex items-center gap-2"
            >
              <RotateCcw size={20} />
              再来一局
            </button>
            <button
              onClick={() => navigate('/review')}
              className="btn-neon px-8 py-3 text-lg font-orbitron flex items-center gap-2"
            >
              <BarChart2 size={20} />
              复盘分析
            </button>
            <button
              onClick={handleGenerateReport}
              className="btn-neon-yellow px-8 py-3 text-lg font-orbitron flex items-center gap-2"
            >
              <FileText size={20} />
              生成飞行报告
            </button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
