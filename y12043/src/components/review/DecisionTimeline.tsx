import { useState } from 'react';
import { motion } from 'framer-motion';
import { Decision, Fund } from '@/types';
import { ChevronDown, ChevronRight, GitBranch, TrendingDown, DollarSign } from 'lucide-react';

interface DecisionTimelineProps {
  decisions: Decision[];
  funds: Fund[];
}

export function DecisionTimeline({ decisions, funds }: DecisionTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const getBranchColor = (branch: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-emerald-500',
      'B': 'bg-amber-500',
      'C': 'bg-red-500',
    };
    return colors[branch] || 'bg-gray-500';
  };

  const getBranchLabel = (branch: string) => {
    const labels: Record<string, string> = {
      'A': '稳健路线',
      'B': '波动路线',
      'C': '高风险路线',
    };
    return labels[branch] || '未知路线';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">决策时间线</h3>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        {decisions.map((decision, index) => {
          const fund = funds.find(f => f.id === decision.fundId);
          const isExpanded = expandedStep === decision.step;
          
          return (
            <motion.div
            key={decision.step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-10 pb-6 last:pb-0"
          >
            <div 
              className={`absolute left-0 w-8 h-8 rounded-full ${getBranchColor(decision.routeBranch)} 
                flex items-center justify-center text-white text-xs font-bold shadow-md`}
            >
              {decision.step}
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedStep(isExpanded ? null : decision.step)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getBranchColor(decision.routeBranch)}`}></div>
                    <span className="font-medium text-gray-800">
                      {fund?.name || '跳过选择'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getBranchColor(decision.routeBranch)}`}>
                      路线{decision.routeBranch}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      ¥{decision.amount.toLocaleString()}
                    </span>
                    {isExpanded ? 
                      <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-4 pb-4 border-t border-gray-100"
                >
                  <div className="pt-4 space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {getBranchLabel(decision.routeBranch)}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        投资金额: ¥{decision.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-sm bg-amber-50 p-2 rounded-lg">
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-700">
                        {decision.triggerReason}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}
