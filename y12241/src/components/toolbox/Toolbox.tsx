import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import ToolCard from './ToolCard';
import { ToolType } from '../../types';
import {
  useGameStore,
  useUnlockedTools,
  useSelectedTool,
  useUsedTools,
  useCurrentStage,
} from '../../store/useGameStore';

const tools: ToolType[] = ['power_station', 'wire', 'repair_team'];

const stageHints = {
  1: '💡 第一阶段：先选择电源站，点击一个变电站放置电源',
  2: '💡 第二阶段：选择导线，依次点击两个节点进行连接',
  3: '💡 第三阶段：选择维修队，点击异常节点进行修复',
};

export default function Toolbox() {
  const unlockedTools = useUnlockedTools();
  const selectedTool = useSelectedTool();
  const usedTools = useUsedTools();
  const currentStage = useCurrentStage();
  const selectTool = useGameStore(state => state.actions.selectTool);

  const handleToolClick = (tool: ToolType) => {
    if (selectedTool === tool) {
      selectTool(null);
    } else {
      selectTool(tool);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-slate-200">工具箱</h2>
        <div className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono">
          阶段 {currentStage}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4"
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            {stageHints[currentStage as keyof typeof stageHints]}
          </p>
        </div>
      </motion.div>

      <div className="space-y-3 flex-1">
        {tools.map(tool => (
          <ToolCard
            key={tool}
            tool={tool}
            unlocked={unlockedTools.includes(tool)}
            used={usedTools.has(tool)}
            selected={selectedTool === tool}
            onClick={() => handleToolClick(tool)}
          />
        ))}
      </div>

      {selectedTool && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-slate-700/50"
        >
          <p className="text-xs text-slate-400 text-center">
            {selectedTool === 'power_station' && '点击任意变电站放置电源'}
            {selectedTool === 'wire' && '点击第一个节点，然后点击第二个节点连接'}
            {selectedTool === 'repair_team' && '点击异常节点进行修复'}
          </p>
          <button
            onClick={() => selectTool(null)}
            className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            取消选择
          </button>
        </motion.div>
      )}
    </div>
  );
}
