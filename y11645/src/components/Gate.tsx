import React from 'react';
import { motion } from 'framer-motion';
import { ExitType, EXIT_LABELS } from '../types';
import { Package, AlertTriangle, Clock, Plane } from 'lucide-react';

interface GateProps {
  type: ExitType;
  count: number;
  isHighlighted?: boolean;
}

const getGateIcon = (type: ExitType) => {
  switch (type) {
    case 'oversized':
      return <Package size={20} />;
    case 'transfer_urgent':
      return <AlertTriangle size={20} />;
    case 'transfer_normal':
      return <Clock size={20} />;
    case 'delayed':
      return <Clock size={20} />;
    default:
      return <Plane size={20} />;
  }
};

const getGateColor = (type: ExitType) => {
  switch (type) {
    case 'gate_A': return 'bg-blue-500';
    case 'gate_B': return 'bg-green-500';
    case 'gate_C': return 'bg-purple-500';
    case 'gate_D': return 'bg-indigo-500';
    case 'oversized': return 'bg-warning-500';
    case 'transfer_urgent': return 'bg-orange-500';
    case 'transfer_normal': return 'bg-teal-500';
    case 'delayed': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export const Gate: React.FC<GateProps> = ({ type, count, isHighlighted = false }) => {
  return (
    <motion.div
      className={`relative rounded-lg p-3 border-2 transition-all ${
        isHighlighted 
          ? 'border-yellow-400 ring-2 ring-yellow-200' 
          : 'border-gray-200'
      }`}
      animate={isHighlighted ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg text-white ${getGateColor(type)}`}>
          {getGateIcon(type)}
        </div>
        <div>
          <div className="font-medium text-sm text-gray-800">{EXIT_LABELS[type]}</div>
          <div className="text-xs text-gray-500">已处理: {count}件</div>
        </div>
      </div>
      
      {count > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-aviation-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {count}
        </div>
      )}
    </motion.div>
  );
};
