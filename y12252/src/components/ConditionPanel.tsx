import { AnimatePresence } from 'framer-motion';
import { Layers, Map } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import ConditionCard from './ConditionCard';
import { cn } from '@/lib/utils';

export default function ConditionPanel() {
  const conditions = useGameStore((s) => s.conditions);
  const placeCardOnCanvas = useGameStore((s) => s.placeCardOnCanvas);

  const notOnCanvas = conditions.filter((c) => !c.isOnCanvas);
  const onCanvas = conditions.filter((c) => c.isOnCanvas);

  const handleDragStart = (e: React.DragEvent, card: typeof conditions[0]) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.setData('source', 'panel');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placeCardOnCanvas(cardId, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-lg border border-amber-800/40 overflow-hidden',
        'bg-gradient-to-b from-[#2a1a0e]/95 to-[#1a0f06]/95'
      )}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-900/80 via-amber-800/60 to-amber-900/80 px-3 py-2 border-b border-amber-700/30">
        <Layers className="h-4 w-4 text-amber-400" />
        <h2
          className="text-sm font-bold text-amber-200 tracking-wide"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          条件卡牌
        </h2>
        <span className="ml-auto text-[10px] text-amber-500 bg-amber-900/50 px-1.5 py-0.5 rounded">
          {conditions.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin scrollbar-thumb-amber-800 scrollbar-track-transparent">
        <section>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <h3 className="text-xs font-semibold text-amber-400 tracking-wider">未放置</h3>
            <span className="text-[10px] text-amber-600 ml-1">({notOnCanvas.length})</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {notOnCanvas.map((card) => (
                <ConditionCard
                  key={card.id}
                  card={card}
                  onDragStart={handleDragStart}
                />
              ))}
            </AnimatePresence>
            {notOnCanvas.length === 0 && (
              <p className="text-amber-700/60 text-xs text-center py-3 italic">
                所有条件已放置
              </p>
            )}
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-amber-700/30 to-transparent" />

        <section
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            'rounded-md border border-dashed border-amber-700/30 p-2 min-h-[60px]',
            'transition-colors',
            onCanvas.length === 0 ? 'bg-amber-950/20' : 'bg-transparent'
          )}
        >
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Map className="h-3 w-3 text-blue-400" />
            <h3 className="text-xs font-semibold text-blue-400 tracking-wider">画布上</h3>
            <span className="text-[10px] text-blue-600 ml-1">({onCanvas.length})</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {onCanvas.map((card) => (
                <ConditionCard
                  key={card.id}
                  card={card}
                  onDragStart={handleDragStart}
                />
              ))}
            </AnimatePresence>
            {onCanvas.length === 0 && (
              <p className="text-amber-700/40 text-xs text-center py-2 italic">
                拖拽条件卡至此处
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
