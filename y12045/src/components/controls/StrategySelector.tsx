import { motion } from 'framer-motion';
import { ListOrdered, TrendingUp, Zap, GitBranch, ArrowRightLeft, MapPin } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { QUEUE_STRATEGY_LABELS, PATH_STRATEGY_LABELS } from '../../config/constants';
import type { QueueStrategy, PathStrategy } from '../../engine/types';

const queueStrategies: { id: QueueStrategy; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'fifo', 
    icon: <ListOrdered size={16} />, 
    description: '先进先出，按到达顺序处理' 
  },
  { 
    id: 'priority', 
    icon: <TrendingUp size={16} />, 
    description: '优先级高的包裹先处理' 
  },
  { 
    id: 'sjf', 
    icon: <Zap size={16} />, 
    description: '处理时间短的包裹优先' 
  },
];

const pathStrategies: { id: PathStrategy; icon: React.ReactNode; description: string }[] = [
  { 
    id: 'round-robin', 
    icon: <GitBranch size={16} />, 
    description: '轮流分配到各线路' 
  },
  { 
    id: 'shortest-queue', 
    icon: <ArrowRightLeft size={16} />, 
    description: '分配到最短队列' 
  },
  { 
    id: 'destination-match', 
    icon: <MapPin size={16} />, 
    description: '按目的地匹配线路' 
  },
];

export function StrategySelector() {
  const { queueStrategy, pathStrategy, setQueueStrategy, setPathStrategy, status } = useGameStore();
  const canChange = status === 'playing' || status === 'paused' || status === 'idle';

  return (
    <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
      <h3 className="text-white font-bold mb-4">分拣策略</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-2 block">队列排序策略</label>
          <div className="grid grid-cols-3 gap-2">
            {queueStrategies.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => canChange && setQueueStrategy(strategy.id)}
                disabled={!canChange}
                className={`
                  relative p-2 rounded-lg border-2 transition-all text-left
                  ${queueStrategy === strategy.id 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-[#3a3a52] hover:border-gray-500'}
                  ${!canChange ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={queueStrategy === strategy.id ? 'text-blue-400' : 'text-gray-400'}>
                    {strategy.icon}
                  </span>
                  <span className={`text-xs font-bold ${queueStrategy === strategy.id ? 'text-white' : 'text-gray-300'}`}>
                    {QUEUE_STRATEGY_LABELS[strategy.id].split(' ')[0]}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">{strategy.description}</p>
                
                {queueStrategy === strategy.id && (
                  <motion.div
                    layoutId="queue-indicator"
                    className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full m-1"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-2 block">路径分配策略</label>
          <div className="grid grid-cols-3 gap-2">
            {pathStrategies.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => canChange && setPathStrategy(strategy.id)}
                disabled={!canChange}
                className={`
                  relative p-2 rounded-lg border-2 transition-all text-left
                  ${pathStrategy === strategy.id 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-[#3a3a52] hover:border-gray-500'}
                  ${!canChange ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={pathStrategy === strategy.id ? 'text-green-400' : 'text-gray-400'}>
                    {strategy.icon}
                  </span>
                  <span className={`text-xs font-bold ${pathStrategy === strategy.id ? 'text-white' : 'text-gray-300'}`}>
                    {PATH_STRATEGY_LABELS[strategy.id].split(' ')[0]}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500">{strategy.description}</p>
                
                {pathStrategy === strategy.id && (
                  <motion.div
                    layoutId="path-indicator"
                    className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full m-1"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#3a3a52]">
        <p className="text-[10px] text-gray-500">
          💡 策略可在游戏中实时切换，观察不同算法对分拣效率的影响
        </p>
      </div>
    </div>
  );
}
