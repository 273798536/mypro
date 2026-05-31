import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Music, Bell, FileAudio, FileText, Award } from 'lucide-react';
import type { Clue } from '@/types';
import { CLUE_TYPE_LABELS } from '@/types';

const iconMap = {
  song_segment: Music,
  platform_notice: Bell,
  sample_record: FileAudio,
  contract: FileText,
  auth_certificate: Award,
};

const typeColorMap = {
  song_segment: 'bg-purple-100 text-purple-700 border-purple-200',
  platform_notice: 'bg-blue-100 text-blue-700 border-blue-200',
  sample_record: 'bg-green-100 text-green-700 border-green-200',
  contract: 'bg-orange-100 text-orange-700 border-orange-200',
  auth_certificate: 'bg-amber-100 text-amber-700 border-amber-200',
};

interface ClueCardProps {
  clue: Clue;
  isDragging?: boolean;
  delay?: number;
}

export const ClueCard = ({ clue, isDragging = false, delay = 0 }: ClueCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: clue.id,
    data: { clue },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = iconMap[clue.type];

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`clue-card ${isDragging ? 'clue-card-dragging' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg border ${typeColorMap[clue.type]}`}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-800 truncate">{clue.title}</h4>
            {clue.isKeyEvidence && (
              <span className="px-1.5 py-0.5 text-xs bg-danger-100 text-danger-600 rounded font-medium">
                关键证据
              </span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${typeColorMap[clue.type]}`}>
            {CLUE_TYPE_LABELS[clue.type]}
          </span>
          <p className="mt-2 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">
            {clue.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
