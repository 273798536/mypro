import { motion } from 'framer-motion';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Briefcase } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { CaseCard } from './CaseCard';
import { ClueCard } from './ClueCard';
import type { Clue } from '@/types';

export const CaseArea = () => {
  const cases = useGameStore((state) => state.cases);
  const assignClue = useGameStore((state) => state.assignClue);
  const [activeClue, setActiveClue] = useState<Clue | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveClue(active.data.current?.clue || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClue(null);

    if (over && active.id !== over.id) {
      const clueId = active.id as string;
      const caseId = over.id as string;
      assignClue(clueId, caseId);
    }
  };

  const completedCount = cases.filter((c) => c.isCompleted).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/10 rounded-lg">
          <Briefcase className="text-accent-400" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-serif font-bold text-white">案件档案</h2>
          <p className="text-sm text-white/60">
            已完成 {completedCount} / {cases.length} 个案件
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 space-y-4 overflow-y-auto pr-2">
          {cases.map((caseItem, index) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} index={index} />
          ))}
        </div>

        <DragOverlay>
          {activeClue ? (
            <div className="opacity-80 rotate-3 scale-105">
              <ClueCard clue={activeClue} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
};
