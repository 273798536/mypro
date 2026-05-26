import type { BookItem } from '@/types';
import { ITEM_TYPE_LABELS } from '@/types';
import { AlertCircle, Tag, User } from 'lucide-react';

interface BookCardProps {
  book: BookItem;
  isDragging?: boolean;
  isProcessed?: boolean;
  onDragStart?: (book: BookItem) => void;
  onDragEnd?: () => void;
}

export function BookCard({ book, isDragging, isProcessed, onDragStart, onDragEnd }: BookCardProps) {
  return (
    <div
      draggable={!isProcessed}
      onDragStart={() => onDragStart?.(book)}
      onDragEnd={onDragEnd}
      className={`
        relative w-32 h-44 rounded-lg cursor-grab active:cursor-grabbing
        transition-all duration-200 shadow-lg
        ${isDragging ? 'opacity-50 scale-95 rotate-3' : 'hover:scale-105 hover:-translate-y-1'}
        ${isProcessed ? 'opacity-30 cursor-not-allowed' : ''}
      `}
      style={{ backgroundColor: book.coverColor }}
    >
      <div className="absolute inset-0 p-2 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-xs font-bold text-center px-1 line-clamp-4 leading-tight">
            {book.title}
          </p>
        </div>
        
        <div className="mt-auto space-y-1">
          <div className="flex items-center justify-center gap-1 text-white/80 text-[10px]">
            <Tag size={10} />
            <span>{book.category}</span>
          </div>
          
          {book.isReserved && (
            <div className="flex items-center justify-center gap-1 bg-blue-500/80 rounded px-1 py-0.5 text-white text-[10px]">
              <User size={10} />
              <span>{book.reservedBy}</span>
            </div>
          )}
          
          {book.isDamaged && (
            <div className="flex items-center justify-center gap-1 bg-red-500/80 rounded px-1 py-0.5 text-white text-[10px]">
              <AlertCircle size={10} />
              <span>破损</span>
            </div>
          )}
          
          <div className="text-center text-white/60 text-[9px]">
            {ITEM_TYPE_LABELS[book.type]}
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20 rounded-l-lg" />
    </div>
  );
}
