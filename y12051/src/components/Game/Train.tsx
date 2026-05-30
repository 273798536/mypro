import React from 'react';
import { motion } from 'framer-motion';
import { Note } from '../../types';

interface TrainProps {
  note: Note;
  position: number;
  showRemarks: boolean;
  trackColors: string[];
}

export const Train: React.FC<TrainProps> = ({ note, position, showRemarks, trackColors }) => {
  const isSyncopated = note.isSyncopated;
  const hasIssue = note.delayed || note.missingField;
  
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      initial={{ opacity: 0, x: 50 }}
      animate={{ 
        opacity: 1,
        x: position,
        y: (note.track - 1) * 80 + 20
      }}
      transition={{ 
        type: 'tween',
        ease: 'linear',
        duration: 0.05
      }}
    >
      {showRemarks && note.remark && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
            {note.remark}
          </span>
        </div>
      )}
      
      <div className="relative">
        {isSyncopated && (
          <motion.div
            className="absolute -inset-2 rounded-lg bg-yellow-400 opacity-30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
        
        {hasIssue && (
          <div className="absolute -top-2 -right-2 z-10">
            <span className="text-red-500 text-lg">⚠️</span>
          </div>
        )}
        
        <div 
          className={`w-16 h-12 rounded-lg flex items-center justify-center shadow-lg border-2 ${
            isSyncopated 
              ? 'border-yellow-500 bg-gradient-to-br from-yellow-400 to-orange-500' 
              : `border-transparent ${trackColors[note.track - 1]}`
          }`}
        >
          <span className="text-2xl">
            {isSyncopated ? '🚂' : '🚃'}
          </span>
        </div>
        
        <div className="flex justify-between px-1 mt-1">
          <div className="w-3 h-3 bg-gray-700 rounded-full" />
          <div className="w-3 h-3 bg-gray-700 rounded-full" />
        </div>
      </div>
      
      {isSyncopated && (
        <div className="mt-1">
          <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
            切分音
          </span>
        </div>
      )}
    </motion.div>
  );
};
