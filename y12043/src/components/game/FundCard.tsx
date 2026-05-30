import { motion } from 'framer-motion';
import { Fund } from '@/types';
import { RiskIndicator } from '@/components/common/RiskIndicator';
import { TrendingUp, Flame, FileText } from 'lucide-react';

interface FundCardProps {
  fund: Fund;
  onSelect: (fund: Fund) => void;
  disabled?: boolean;
  selected?: boolean;
}

export function FundCard({ fund, onSelect, disabled, selected }: FundCardProps) {
  const industryColor = fund.industryId ? getIndustryColor(fund.industryId) : '#6B7280';
  
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02, y: -4 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={() => !disabled && onSelect(fund)}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300
        ${selected 
          ? 'ring-2 ring-amber-400 bg-gradient-to-br from-amber-50 to-orange-50' 
          : 'bg-white hover:shadow-lg'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'shadow-md'}
        border border-gray-100
      `}
    >
      {fund.isHot && (
        <div className="absolute -top-2 -right-2">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold"
          >
            <Flame className="w-3 h-3" />
            热门
          </motion.div>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-800 text-sm leading-tight">{fund.name}</h4>
          <p className="text-xs text-gray-500">{fund.code}</p>
        </div>
        <div 
          className="px-2 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: industryColor }}
        >
          {fund.industryName || '综合'}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <RiskIndicator level={fund.riskLevel} size="sm" />
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-lg font-bold text-green-600">
            +{(fund.expectedReturn * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">预期收益</span>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 flex items-start gap-1 bg-gray-50 p-2 rounded-lg">
        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2">{fund.note}</span>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">手续费率</span>
        <span className="text-sm font-medium text-gray-600">
          {(fund.feeRate * 100).toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
}

function getIndustryColor(industryId: string): string {
  const colors: Record<string, string> = {
    tech: '#3B82F6',
    finance: '#10B981',
    consumer: '#F59E0B',
    healthcare: '#EF4444',
    energy: '#8B5CF6',
    manufacturing: '#6B7280',
  };
  return colors[industryId] || '#6B7280';
}
