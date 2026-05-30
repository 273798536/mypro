import { motion } from 'framer-motion';
import { Package, AlertTriangle, Clock, Star, Truck } from 'lucide-react';
import type { Package as PackageType } from '../../engine/types';
import { PACKAGE_TYPE_COLORS, PACKAGE_TYPE_LABELS } from '../../config/constants';
import { useGameStore } from '../../store/useGameStore';

interface PackageCardProps {
  pkg: PackageType;
  onClick?: () => void;
  selected?: boolean;
  showProgress?: boolean;
  currentTime?: number;
}

export function PackageCard({ pkg, onClick, selected, showProgress, currentTime = 0 }: PackageCardProps) {
  const { selectedPackageId, selectPackage, assignPackage, status } = useGameStore();
  
  const typeColor = PACKAGE_TYPE_COLORS[pkg.type];
  const typeLabel = PACKAGE_TYPE_LABELS[pkg.type];
  
  const isSelected = selected || selectedPackageId === pkg.id;
  const isWaiting = pkg.status === 'waiting' && !pkg.assignedLine;
  const canInteract = status === 'playing' && isWaiting;

  const remainingTime = pkg.deadline - (currentTime || 0);
  const isUrgent = remainingTime < 10;
  const waitTime = (currentTime || 0) - pkg.createdAt;

  const handleClick = () => {
    if (!canInteract) return;
    if (onClick) {
      onClick();
    } else {
      selectPackage(isSelected ? undefined : pkg.id);
    }
  };

  const handleAssignLine = (lineId: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canInteract) {
      assignPackage(pkg.id, lineId);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={canInteract ? { scale: 1.02, y: -2 } : {}}
      whileTap={canInteract ? { scale: 0.98 } : {}}
      onClick={handleClick}
      className={`
        relative w-32 h-40 rounded-lg border-2 overflow-hidden
        transition-all duration-200 cursor-pointer
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a2e]' : ''}
        ${canInteract ? 'hover:shadow-lg' : 'opacity-80'}
        ${isUrgent && isWaiting ? 'animate-pulse' : ''}
      `}
      style={{ 
        borderColor: typeColor,
        backgroundColor: `${typeColor}15`,
      }}
    >
      <div 
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: typeColor }}
      />

      <div className="p-2 h-full flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
            style={{ backgroundColor: typeColor, color: '#1a1a2e' }}
          >
            {typeLabel}
          </span>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={10}
                className={i < pkg.priority ? 'fill-current' : 'opacity-20'}
                style={{ color: typeColor }}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center mb-1"
            style={{ backgroundColor: `${typeColor}30` }}
          >
            {pkg.type === 'urgent' ? (
              <AlertTriangle size={24} style={{ color: typeColor }} />
            ) : pkg.type === 'damaged' ? (
              <Package size={24} style={{ color: typeColor }} />
            ) : (
              <Truck size={24} style={{ color: typeColor }} />
            )}
          </div>
          <span className="text-[10px] text-gray-400 font-mono">{pkg.id.slice(0, 6)}</span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">目的地</span>
            <span className="font-bold text-white">{pkg.destination}</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400">处理</span>
            <span className="font-mono text-white">{pkg.processingTime.toFixed(1)}s</span>
          </div>
          
          {isWaiting && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-400">剩余</span>
              <span className={`font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-white'}`}>
                {Math.max(0, remainingTime).toFixed(0)}s
              </span>
            </div>
          )}

          {showProgress && pkg.status === 'processing' && (
            <div className="mt-1">
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: typeColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pkg.progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isSelected && canInteract && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 p-2"
        >
          <span className="text-xs text-white font-bold mb-1">分配到</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(lineId => (
              <button
                key={lineId}
                onClick={handleAssignLine(lineId)}
                className="w-8 h-8 rounded text-white text-xs font-bold transition-transform hover:scale-110"
                style={{ backgroundColor: ['#165DFF', '#FF7D00', '#00B42A'][lineId] }}
              >
                {['A', 'B', 'C'][lineId]}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {pkg.status === 'completed' && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
          <span className="text-green-400 font-bold text-sm">已完成</span>
        </div>
      )}
      
      {pkg.status === 'failed' && (
        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
          <span className="text-red-400 font-bold text-sm">失败</span>
        </div>
      )}
    </motion.div>
  );
}
