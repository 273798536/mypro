import React from 'react';
import { motion } from 'framer-motion';
import { ConveyorBelt as ConveyorBeltType, ExitType, EXIT_LABELS } from '../types';
import { ChevronRight } from 'lucide-react';

interface ConveyorBeltProps {
  belt: ConveyorBeltType;
  exits: ExitType[];
  onSwitchExit: (exit: ExitType) => void;
  isActive?: boolean;
}

export const ConveyorBelt: React.FC<ConveyorBeltProps> = ({ 
  belt, 
  exits, 
  onSwitchExit,
  isActive = false 
}) => {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-gray-700">{belt.name}</span>
        <span className="text-xs text-gray-500">→</span>
        <span className="text-sm font-bold text-aviation-600">
          {belt.targetExit ? EXIT_LABELS[belt.targetExit] : '未设置'}
        </span>
      </div>
      
      <div className="relative h-16 bg-conveyor-700 rounded-lg overflow-hidden border-2 border-conveyor-800">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-conveyor-500 flex items-center justify-around">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="w-4 h-1 bg-conveyor-400 rounded"
                animate={{ x: [0, 20, 0] }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: i * 0.05 
                }}
              />
            ))}
          </div>
        </div>
        
        {isActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="w-8 h-8 bg-aviation-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <ChevronRight className="text-white" size={20} />
            </motion.div>
          </div>
        )}
      </div>
      
      <div className="mt-2 flex gap-1 flex-wrap">
        {exits.map(exit => (
          <button
            key={exit}
            onClick={() => onSwitchExit(exit)}
            className={`px-2 py-1 text-[10px] rounded transition-all ${
              belt.targetExit === exit
                ? 'bg-aviation-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {EXIT_LABELS[exit]}
          </button>
        ))}
      </div>
    </div>
  );
};
