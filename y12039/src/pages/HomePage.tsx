import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore, type ScenarioType } from '../store/useGameStore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Play, Upload, Zap, Rocket, AlertTriangle, Wind, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { initGame, hasPowerNodes, addPowerNodes, loadScenario } = useGameStore();
  const navigate = useNavigate();

  const handleStart = (withPowerNodes: boolean = false) => {
    initGame(withPowerNodes);
    navigate('/game');
  };

  const handleScenario = (scenario: ScenarioType) => {
    loadScenario(scenario);
    navigate('/game');
  };

  const scenarios = [
    {
      id: 'oxygen_depletion' as ScenarioType,
      name: '氧气耗尽危机',
      icon: <Wind className="w-6 h-6" />,
      desc: '初始氧气仅30%，3个危急舱段同时泄漏',
      difficulty: '困难'
    },
    {
      id: 'task_conflict' as ScenarioType,
      name: '任务冲突挑战',
      icon: <AlertTriangle className="w-6 h-6" />,
      desc: '5个高优先级任务同时出现，人员不足',
      difficulty: '中等'
    },
    {
      id: 'fatigue_management' as ScenarioType,
      name: '人员疲劳管理',
      icon: <Users className="w-6 h-6" />,
      desc: '初始疲劳度70%以上，需合理安排休息',
      difficulty: '中等'
    }
  ];

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-8">
      <div className="scanline fixed inset-0 pointer-events-none z-50" />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Rocket className="w-12 h-12 text-cyber-cyan" />
        </div>
        <h1 className="text-5xl font-bold text-cyber-cyan font-orbitron tracking-wider mb-2">
          空间站维修排班
        </h1>
        <p className="text-gray-400 text-lg">SPACE STATION MAINTENANCE SCHEDULER</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-8 max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full" glow>
            <h2 className="text-xl font-bold text-cyber-cyan mb-4 flex items-center gap-2">
              <Play className="w-5 h-5" />
              标准模式
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              导入舱段地图和维修任务，体验完整的空间站维修管理流程。
              合理分配人员，平衡资源消耗，完成所有维修任务。
            </p>

            <div className="space-y-3">
              <Button variant="success" className="w-full" onClick={() => handleStart(false)}>
                <Play className="w-4 h-4 mr-2" />
                开始游戏
              </Button>

              {!hasPowerNodes && (
                <Button variant="primary" className="w-full" onClick={() => {
                  addPowerNodes();
                  handleStart(true);
                }}>
                  <Zap className="w-4 h-4 mr-2" />
                  含电力节点模式
                </Button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3">游戏特性</h3>
              <ul className="text-xs text-gray-500 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-cyber-cyan">✓</span>
                  真实的氧气和电力消耗系统
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-cyan">✓</span>
                  任务冲突检测与惩罚机制
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-cyan">✓</span>
                  人员疲劳度管理
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-cyan">✓</span>
                  暂停、重开、复盘功能
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyber-cyan">✓</span>
                  确定性结果，每次运行一致
                </li>
              </ul>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <h2 className="text-xl font-bold text-warning-orange mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              边界样例挑战
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              测试你的决策能力！这些场景设计了极端条件，
              看看你能否在危机中生存下来。
            </p>

            <div className="space-y-3">
              {scenarios.map((scenario) => (
                <motion.div
                  key={scenario.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-warning-orange/50 transition-colors cursor-pointer"
                  onClick={() => handleScenario(scenario.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-warning-orange mt-1">{scenario.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{scenario.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-warning-orange/20 text-warning-orange">
                          {scenario.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{scenario.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                自定义导入
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                支持导入自定义舱段地图和维修任务配置
              </p>
              <Button variant="secondary" className="w-full" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                导入JSON配置
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center text-gray-600 text-xs"
      >
        <p>提示：重复运行相同场景会得到相同结果 - 游戏使用确定性算法</p>
      </motion.div>
    </div>
  );
};
