import React, { useState } from 'react';
import { GameState, GameStep } from '../types/game';
import { CalcTraceDisplay } from './CalcTraceDisplay';

interface GameResultProps {
  state: GameState;
  onRestart: () => void;
}

const getGrade = (score: number): { grade: string; color: string; message: string } => {
  if (score >= 150) return { grade: 'S', color: 'text-yellow-400', message: '海绵城市大师！完美调度！' };
  if (score >= 100) return { grade: 'A', color: 'text-green-400', message: '优秀！城市雨洪调度得当' };
  if (score >= 50) return { grade: 'B', color: 'text-blue-400', message: '良好，仍有优化空间' };
  if (score >= 0) return { grade: 'C', color: 'text-yellow-400', message: '及格，需要加强调度策略' };
  return { grade: 'D', color: 'text-red-400', message: '需要重新学习海绵城市知识' };
};

export const GameResult: React.FC<GameResultProps> = ({ state, onRestart }) => {
  const [selectedStep, setSelectedStep] = useState<GameStep | null>(
    state.steps[state.steps.length - 1] || null
  );

  const gradeInfo = getGrade(state.score);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎮 游戏结束</h1>
          <p className="text-gray-400">完成 {state.totalRounds} 回合雨洪调度</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 mb-6 border border-gray-600 text-center">
          <div className={`text-8xl font-bold ${gradeInfo.color} mb-4`}>
            {gradeInfo.grade}
          </div>
          <div className="text-2xl font-mono text-white mb-2">
            总分: <span className={state.score >= 0 ? 'text-green-400' : 'text-red-400'}>{state.score}</span>
          </div>
          <div className="text-gray-300">{gradeInfo.message}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">📊 得分明细</h2>
            <div className="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left text-gray-300 p-3">步骤</th>
                    <th className="text-left text-gray-300 p-3">操作</th>
                    <th className="text-right text-gray-300 p-3">分数变化</th>
                  </tr>
                </thead>
                <tbody>
                  {state.steps.map((step, index) => (
                    <tr
                      key={step.index}
                      onClick={() => setSelectedStep(step)}
                      className={`
                        border-t border-gray-700 cursor-pointer transition-colors
                        ${selectedStep?.index === step.index ? 'bg-blue-600/30' : 'hover:bg-gray-700/50'}
                      `}
                    >
                      <td className="p-3 text-gray-400 font-mono">#{index}</td>
                      <td className="p-3 text-white">{step.action}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        step.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {step.scoreChange > 0 ? '+' : ''}
                        {step.scoreChange}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-500 bg-gray-700/50">
                    <td colSpan={2} className="p-3 text-white font-bold">总计</td>
                    <td className={`p-3 text-right font-mono font-bold text-lg ${
                      state.score >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {state.score}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <CalcTraceDisplay step={selectedStep} />
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">⚠️ 问题回顾</h2>
          {state.confirmedAlerts.length === 0 && state.activeAlerts.length === 0 ? (
            <div className="text-green-400 text-center py-4">
              ✓ 完美！游戏过程中没有出现任何问题
            </div>
          ) : (
            <div className="space-y-2">
              {[...state.confirmedAlerts, ...state.activeAlerts].map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-900/50 border border-red-500' : 'bg-yellow-900/50 border border-yellow-500'
                  }`}
                >
                  <span className="font-bold text-white">
                    {alert.type === 'pump_overload' && '⚡ 泵站过载'}
                    {alert.type === 'low_area_flood' && '🌊 低洼积水'}
                    {alert.type === 'garden_depleted' && '🌱 绿地耗尽'}
                  </span>
                  <span className="text-gray-300 text-sm ml-2">- 第{alert.stepIndex}步</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={onRestart}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            🔄 重新开始
          </button>
        </div>
      </div>
    </div>
  );
};
