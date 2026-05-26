import { BookCard } from './BookCard';
import { DropZone } from './DropZone';
import { Timer } from '../common/Timer';
import type { BookItem, TargetArea } from '@/types';

interface GameBoardProps {
  items: BookItem[];
  processedItems: Set<string>;
  timeRemaining: number;
  totalTime: number;
  score: number;
  levelName: string;
  draggedItem: BookItem | null;
  onDragStart: (book: BookItem) => void;
  onDragEnd: () => void;
  onDrop: (target: TargetArea) => void;
}

const dropTargets: TargetArea[] = ['return', 'damaged', 'reserved', 'shelf-A', 'shelf-B', 'shelf-C'];

export function GameBoard({
  items,
  processedItems,
  timeRemaining,
  totalTime,
  score,
  levelName,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDrop,
}: GameBoardProps) {
  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">{levelName}</h1>
            <p className="text-amber-700">拖拽书籍到正确的区域</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-800">{score}</div>
              <div className="text-sm text-amber-600">当前得分</div>
            </div>
            <Timer timeRemaining={timeRemaining} totalTime={totalTime} />
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-amber-800 mb-3">待处理书籍</h2>
          <div className="flex flex-wrap gap-3 p-4 bg-amber-100/50 rounded-xl min-h-52">
            {items.map(book => (
              <BookCard
                key={book.id}
                book={book}
                isDragging={draggedItem?.id === book.id}
                isProcessed={processedItems.has(book.id)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-amber-800 mb-3">处理区域</h2>
          <div className="grid grid-cols-3 gap-4">
            {dropTargets.map(target => (
              <DropZone
                key={target}
                target={target}
                isActive={draggedItem !== null}
                onDrop={onDrop}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-amber-600 text-sm">
          进度：{processedItems.size} / {items.length}
        </div>
      </div>
    </div>
  );
}
