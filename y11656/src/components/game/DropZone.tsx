import type { TargetArea } from '@/types';
import { TARGET_AREA_LABELS } from '@/types';
import { Package, AlertTriangle, Bookmark, Library } from 'lucide-react';
import type { ReactNode } from 'react';

interface DropZoneProps {
  target: TargetArea;
  isActive: boolean;
  onDrop: (target: TargetArea) => void;
}

const zoneIcons: Record<TargetArea, ReactNode> = {
  return: <Package size={32} />,
  damaged: <AlertTriangle size={32} />,
  reserved: <Bookmark size={32} />,
  'shelf-A': <Library size={32} />,
  'shelf-B': <Library size={32} />,
  'shelf-C': <Library size={32} />,
};

const zoneColors: Record<TargetArea, string> = {
  return: 'border-orange-400 bg-orange-50 hover:bg-orange-100',
  damaged: 'border-red-400 bg-red-50 hover:bg-red-100',
  reserved: 'border-blue-400 bg-blue-50 hover:bg-blue-100',
  'shelf-A': 'border-green-400 bg-green-50 hover:bg-green-100',
  'shelf-B': 'border-purple-400 bg-purple-50 hover:bg-purple-100',
  'shelf-C': 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100',
};

const zoneActiveColors: Record<TargetArea, string> = {
  return: 'ring-4 ring-orange-300 bg-orange-200',
  damaged: 'ring-4 ring-red-300 bg-red-200',
  reserved: 'ring-4 ring-blue-300 bg-blue-200',
  'shelf-A': 'ring-4 ring-green-300 bg-green-200',
  'shelf-B': 'ring-4 ring-purple-300 bg-purple-200',
  'shelf-C': 'ring-4 ring-yellow-300 bg-yellow-200',
};

export function DropZone({ target, isActive, onDrop }: DropZoneProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(target);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center p-4 rounded-xl
        border-2 border-dashed transition-all duration-200 min-h-32
        ${zoneColors[target]}
        ${isActive ? zoneActiveColors[target] : ''}
      `}
    >
      <div className={`text-amber-800 ${isActive ? 'scale-110' : ''} transition-transform`}>
        {zoneIcons[target]}
      </div>
      <p className="mt-2 font-semibold text-amber-900 text-sm">
        {TARGET_AREA_LABELS[target]}
      </p>
    </div>
  );
}
