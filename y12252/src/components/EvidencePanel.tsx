import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import EvidenceCard from './EvidenceCard';
import type { CounterExample } from '@/types/game';
import { cn } from '@/lib/utils';

export default function EvidencePanel() {
  const counterExamples = useGameStore((s) => s.counterExamples);
  const setCounterExampleStatus = useGameStore((s) => s.setCounterExampleStatus);

  const excluded = counterExamples.filter((e) => e.status === 'excluded');
  const unexcluded = counterExamples.filter((e) => e.status === 'unexcluded');
  const pending = counterExamples.filter((e) => e.status === 'pending');

  const handleStatusChange = (id: string, status: CounterExample['status']) => {
    setCounterExampleStatus(id, status);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-lg border border-amber-800/40 overflow-hidden',
        'bg-gradient-to-b from-[#2a1a0e]/95 to-[#1a0f06]/95'
      )}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-900/80 via-amber-800/60 to-amber-900/80 px-3 py-2 border-b border-amber-700/30">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <h2
          className="text-sm font-bold text-amber-200 tracking-wide"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          反例证据
        </h2>
        <span className="ml-auto text-[10px] text-amber-500 bg-amber-900/50 px-1.5 py-0.5 rounded">
          {counterExamples.length}
        </span>
      </div>

      <div className="flex items-center gap-3 px-3 py-1.5 bg-amber-950/40 border-b border-amber-800/20 text-[10px]">
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          未排除 {unexcluded.length}
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          待判定 {pending.length}
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          已排除 {excluded.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-amber-800 scrollbar-track-transparent">
        <AnimatePresence>
          {counterExamples.map((evidence) => (
            <EvidenceCard
              key={evidence.id}
              evidence={evidence}
              onStatusChange={handleStatusChange}
            />
          ))}
        </AnimatePresence>
        {counterExamples.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-amber-700/50">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="text-xs italic">暂无反例证据</p>
          </div>
        )}
      </div>
    </div>
  );
}
