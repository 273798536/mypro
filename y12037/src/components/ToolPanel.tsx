import React from 'react';
import { motion } from 'framer-motion';
import { VolumeX, Zap, Clock } from 'lucide-react';
import { ToolType } from '@/types/game';
import { toolDescriptions } from '@/game/explanations';

interface ToolPanelProps {
  selectedTool: ToolType | null;
  onSelectTool: (tool: ToolType) => void;
  disabled?: boolean;
}

const toolIcons: Record<ToolType, React.ReactNode> = {
  removeNoise: <VolumeX size={28} />,
  fixPop: <Zap size={28} />,
  calibrateBeat: <Clock size={28} />,
};

export const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedTool,
  onSelectTool,
  disabled = false,
}) => {
  const tools: ToolType[] = ['removeNoise', 'fixPop', 'calibrateBeat'];

  const getToolStyles = (tool: ToolType, isSelected: boolean) => {
    const baseStyles = 'flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 border-2 cursor-pointer min-w-[120px]';
    
    if (disabled) {
      return `${baseStyles} opacity-50 cursor-not-allowed bg-gray-800 border-gray-700`;
    }

    if (isSelected) {
      const colorStyles: Record<ToolType, string> = {
        removeNoise: 'bg-gray-700 border-gray-400 shadow-lg shadow-gray-500/30',
        fixPop: 'bg-red-900/50 border-red-500 shadow-lg shadow-red-500/30',
        calibrateBeat: 'bg-amber-900/50 border-amber-500 shadow-lg shadow-amber-500/30',
      };
      return `${baseStyles} ${colorStyles[tool]} scale-105`;
    }

    return `${baseStyles} bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-500`;
  };

  const getTextColor = (tool: ToolType, isSelected: boolean) => {
    if (!isSelected) return 'text-gray-300';
    const colors: Record<ToolType, string> = {
      removeNoise: 'text-gray-200',
      fixPop: 'text-red-300',
      calibrateBeat: 'text-amber-300',
    };
    return colors[tool];
  };

  return (
    <div className="flex gap-4 justify-center flex-wrap">
      {tools.map((tool) => {
        const isSelected = selectedTool === tool;
        const description = toolDescriptions[tool];
        
        return (
          <motion.button
            key={tool}
            whileHover={!disabled ? { scale: 1.02 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            className={getToolStyles(tool, isSelected)}
            onClick={() => !disabled && onSelectTool(tool)}
            disabled={disabled}
          >
            <div className={getTextColor(tool, isSelected)}>
              {toolIcons[tool]}
            </div>
            <span className={`font-semibold text-sm ${getTextColor(tool, isSelected)}`}>
              {description.name}
            </span>
            <span className="text-xs text-gray-500 text-center">
              {description.description}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
