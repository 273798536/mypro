import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Lock, Play, Pause } from 'lucide-react';
import type { SortingLine as SortingLineType, Package } from '../../engine/types';
import { useGameStore } from '../../store/useGameStore';
import { PackageCard } from './PackageCard';

interface SortingLineProps {
  line: SortingLineType;
  currentTime: number;
}

export function SortingLine({ line, currentTime }: SortingLineProps) {
  const { selectedPackageId, assignPackage, status, queueStrategy } = useGameStore();
  
  const canAssign = status === 'playing' && selectedPackageId && line.currentLoad < line.capacity && line.status !== 'blocked';
  const congestionPercent = (line.currentLoad / line.capacity) * 100;
  const isCongested = congestionPercent >= 80;

  const handleClick = () => {
    if (canAssign && selectedPackageId) {
      assignPackage(selectedPackageId, line.id);
    }
  };

  return (
    <motion.div
      layout
      className={`
        relative flex-1 min-w-0 rounded-xl border-2 overflow-hidden
        transition-all duration-300
        ${line.status === 'blocked' ? 'border-red-500' : ''}
        ${canAssign ? 'cursor-pointer hover:border-white' : ''}
      `}
      style={{ 
        borderColor: line.status === 'blocked' ? undefined : line.color,
        backgroundColor: `${line.color}10`,
      }}
      onClick={handleClick}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
              style={{ backgroundColor: line.color }}
            >
              {line.destination}
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">{line.name}</h4>
              <p className="text-xs text-gray-400">目的地 {line.destination}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1">
              {line.status === 'blocked' ? (
                <span className="flex items-center gap-1 text-red-400 text-xs">
                  <Lock size={12} /> 堵塞中
                </span>
              ) : line.currentPackage ? (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <Play size={12} /> 运行中
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400 text-xs">
                  <Pause size={12} /> 空闲
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {line.currentLoad}/{line.capacity} 件
            </p>
          </div>
        </div>

        <div className="h-1.5 bg-[#3a3a52] rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${congestionPercent}%`,
              backgroundColor: isCongested ? '#F53F3F' : line.color,
            }}
          />
        </div>

        {line.currentPackage && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-2">正在处理</p>
            <div className="flex justify-center">
              <PackageCard
                pkg={line.currentPackage}
                currentTime={currentTime}
                showProgress
              />
            </div>
          </div>
        )}

        {line.queue.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">队列 ({line.queue.length})</p>
              <span className="text-[10px] text-gray-500">
                策略: {queueStrategy === 'fifo' ? 'FIFO' : queueStrategy === 'priority' ? '优先级' : 'SJF'}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <AnimatePresence mode="popLayout">
                {line.queue.map((pkg, idx) => (
                  <motion.div
                    key={pkg.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex-shrink-0"
                  >
                    <MiniPackageCard pkg={pkg} currentTime={currentTime} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {canAssign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"
          >
            <div 
              className="px-4 py-2 rounded-lg font-bold text-white border-2 border-dashed"
              style={{ borderColor: line.color, color: line.color }}
            >
              点击分配到此线路
            </div>
          </motion.div>
        )}

        {line.status === 'blocked' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-sm"
          >
            <div className="text-center">
              <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-bold">线路堵塞</p>
              <p className="text-xs text-red-300">
                预计 {Math.max(0, line.blockedUntil - currentTime).toFixed(0)}s 后恢复
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function MiniPackageCard({ pkg, currentTime }: { pkg: Package; currentTime: number }) {
  const typeColors: Record<string, string> = {
    normal: '#E5E6EB',
    urgent: '#F53F3F',
    damaged: '#FFAA00',
  };
  
  const color = typeColors[pkg.type];
  const remainingTime = pkg.deadline - currentTime;
  const isUrgent = remainingTime < 10;

  return (
    <div 
      className="w-16 h-20 rounded-lg border p-1.5 flex flex-col"
      style={{ 
        borderColor: color,
        backgroundColor: `${color}20`,
      }}
    >
      <div 
        className="text-[8px] px-1 py-0.5 rounded text-center font-bold mb-1"
        style={{ backgroundColor: color, color: '#1a1a2e' }}
      >
        {pkg.type === 'urgent' ? '急' : pkg.type === 'damaged' ? '损' : '普'}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[10px] font-mono text-white">{pkg.id.slice(0, 4)}</div>
      </div>
      <div className={`text-[8px] text-center font-mono ${isUrgent ? 'text-red-400' : 'text-gray-400'}`}>
        {Math.max(0, remainingTime).toFixed(0)}s
      </div>
    </div>
  );
}
