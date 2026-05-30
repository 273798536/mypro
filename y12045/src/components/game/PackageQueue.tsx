import { motion, AnimatePresence } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { PackageCard } from './PackageCard';

export function PackageQueue() {
  const { packages, time } = useGameStore();
  
  const waitingPackages = packages.filter(p => p.status === 'waiting' && !p.assignedLine);

  return (
    <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
      <div className="flex items-center gap-2 mb-4">
        <Inbox size={20} className="text-blue-400" />
        <h3 className="text-white font-bold">待分拣包裹</h3>
        <span className="ml-auto bg-[#3a3a52] text-gray-300 text-xs px-2 py-1 rounded">
          {waitingPackages.length} 件
        </span>
      </div>

      <div className="min-h-[160px] overflow-x-auto pb-2">
        {waitingPackages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
            <Inbox size={40} className="mb-2 opacity-30" />
            <span className="text-sm">等待包裹到达...</span>
          </div>
        ) : (
          <div className="flex gap-3">
            <AnimatePresence mode="popLayout">
              {waitingPackages.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  currentTime={time}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-[#3a3a52]">
        <p className="text-xs text-gray-400">
          💡 点击包裹卡片选择，然后点击目标分拣线的按钮进行分配
        </p>
      </div>
    </div>
  );
}
