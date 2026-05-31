import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { ClueCard } from './ClueCard';

export const CluePool = () => {
  const unassignedClues = useGameStore((state) => state.unassignedClues);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/10 rounded-lg">
          <Inbox className="text-accent-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">线索池</h2>
          <p className="text-sm text-white/60">
            剩余 {unassignedClues.length} 份材料待归类
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {unassignedClues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-white/40">
            <Inbox size={48} className="mb-2 opacity-50" />
            <p>所有线索已归类</p>
          </div>
        ) : (
          unassignedClues.map((clue, index) => (
            <ClueCard
              key={clue.id}
              clue={clue}
              delay={index * 0.05}
            />
          ))
        )}
      </div>
    </motion.div>
  );
};
