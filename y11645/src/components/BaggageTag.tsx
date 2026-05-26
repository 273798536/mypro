import React from 'react';
import { motion } from 'framer-motion';
import { Baggage } from '../types';
import { AlertTriangle, Clock, Plane, Package, ArrowRight } from 'lucide-react';

interface BaggageTagProps {
  baggage: Baggage;
  onSelectBelt?: (beltId: number) => void;
  selectedBelt?: number | null;
  showControls?: boolean;
}

export const BaggageTag: React.FC<BaggageTagProps> = ({ 
  baggage, 
  onSelectBelt,
  selectedBelt,
  showControls = true 
}) => {
  const isUrgent = baggage.priority === 'urgent';
  
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative rounded-lg p-3 shadow-lg border-2 min-w-[160px] ${
        baggage.isOversized 
          ? 'bg-warning-50 border-warning-400' 
          : baggage.isDelayed 
            ? 'bg-red-50 border-red-400'
            : isUrgent 
              ? 'bg-orange-50 border-orange-400' 
              : 'bg-amber-50 border-amber-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold text-sm text-gray-800">{baggage.flightNo}</span>
        <span className="text-xs text-gray-600">{baggage.gate}口</span>
      </div>
      
      <div className="text-xs text-gray-700 mb-2 flex items-center gap-1">
        <Plane size={12} />
        <span>{baggage.destination}</span>
      </div>
      
      <div className="flex gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Package size={12} />
          <span className={baggage.isOversized ? 'text-warning-600 font-bold' : 'text-gray-600'}>
            {baggage.weight}kg
          </span>
        </div>
        {baggage.isTransfer && baggage.transferTime && (
          <div className={`flex items-center gap-1 ${
            baggage.transferTime < 30 ? 'text-orange-600 font-bold' : 'text-gray-600'
          }`}>
            <Clock size={12} />
            <span>{baggage.transferTime}分钟转机</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-1 mt-2 flex-wrap">
        {baggage.isOversized && (
          <span className="px-1.5 py-0.5 bg-warning-500 text-white text-[10px] rounded flex items-center gap-0.5">
            <AlertTriangle size={10} /> 超规
          </span>
        )}
        {baggage.isDelayed && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded flex items-center gap-0.5">
            <Clock size={10} /> 延误
          </span>
        )}
        {isUrgent && (
          <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded flex items-center gap-0.5">
            <AlertTriangle size={10} /> 加急
          </span>
        )}
      </div>
      
      {showControls && onSelectBelt && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="text-[10px] text-gray-500 mb-1">选择传送带:</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(beltId => (
              <button
                key={beltId}
                onClick={() => onSelectBelt(beltId)}
                className={`flex-1 py-1 text-xs rounded transition-all ${
                  selectedBelt === beltId
                    ? 'bg-aviation-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ArrowRight size={14} className="mx-auto" />
                {beltId}号
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
