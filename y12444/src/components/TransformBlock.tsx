import clsx from 'clsx';
import type { TransformBlock } from '../types/matrix';

interface TransformBlockProps {
  block: TransformBlock;
  size?: 'normal' | 'small';
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function getTypeColor(type: TransformBlock['type']): string {
  switch (type) {
    case 'rotate':
      return 'from-blue-500 to-blue-600';
    case 'scale':
      return 'from-green-500 to-green-600';
    case 'shear':
      return 'from-orange-500 to-orange-600';
    case 'identity':
      return 'from-gray-400 to-gray-500';
  }
}

function getTypeIcon(type: TransformBlock['type']): string {
  switch (type) {
    case 'rotate':
      return '🔄';
    case 'scale':
      return '📐';
    case 'shear':
      return '↔️';
    case 'identity':
      return '➡️';
  }
}

export default function TransformBlockComponent({
  block,
  size = 'normal',
  draggable = true,
  isDragging = false,
  onDragStart,
  onDragEnd
}: TransformBlockProps) {
  const isSmall = size === 'small';

  return (
    <div
      className={clsx(
        'transform-block bg-gradient-to-br rounded-xl shadow-lg flex flex-col items-center justify-center',
        getTypeColor(block.type),
        isDragging && 'dragging',
        isSmall ? 'w-28 h-20 p-2' : 'w-32 h-24 p-3',
        !draggable && 'cursor-default'
      )}
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable && onDragStart) {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }
      }}
      onDragEnd={onDragEnd}
      title={block.description}
    >
      <span className={isSmall ? 'text-xl' : 'text-2xl'}>
        {getTypeIcon(block.type)}
      </span>
      <span className={clsx(
        'font-bold text-white text-center',
        isSmall ? 'text-xs' : 'text-sm'
      )}>
        {block.name}
      </span>
      {!isSmall && (
        <div className="mt-1 text-white/70 text-xs font-mono">
          [{block.matrix[0][0]} {block.matrix[0][1]}]
          <br />
          [{block.matrix[1][0]} {block.matrix[1][1]}]
        </div>
      )}
    </div>
  );
}
