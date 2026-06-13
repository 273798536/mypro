import { useState } from 'react';
import { Calculator, Info, ChevronDown, ChevronUp, BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/common/Card';
import { FormulaInfo, CalculationParameters, BoundarySampleAnalysis, SensitivityReport } from '@/types/experiment';

interface FormulaDisplayProps {
  formula: FormulaInfo;
  result?: number;
  className?: string;
  parameters?: CalculationParameters;
  boundaryAnalysis?: BoundarySampleAnalysis;
  sensitivityReport?: SensitivityReport;
}

export const FormulaDisplay = ({ formula, result, className, parameters, boundaryAnalysis, sensitivityReport }: FormulaDisplayProps) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <Card
      title="计算公式"
      subtitle="点击展开查看详细变量说明"
      icon={<Calculator className="w-5 h-5" />}
      headerRight={
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
      }
      className={className}
    >
      <div className="bg-gradient-to-r from-[#0F3460]/10 to-[#16C79A]/10 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">公式</p>
            <p className="text-2xl font-mono font-bold text-[#0F3460]">
              {formula.expression}
            </p>
          </div>
          {result !== undefined && (
            <div className="text-right ml-4">
              <p className="text-xs text-gray-500 mb-1">计算结果</p>
              <p className="text-2xl font-mono font-bold text-[#16C79A]">
                {result.toFixed(4)}
              </p>
              <p className="text-xs text-gray-400">{formula.unit}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg mb-4">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">{formula.description}</p>
          <p className="mt-0.5 text-blue-600">
            单位：{formula.unit}
          </p>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-700">变量说明</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(formula.variables).map(([symbol, info], index) => (
                  <motion.div
                    key={symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#0F3460]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-mono font-bold text-[#0F3460]">
                        {symbol}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{info.description}</p>
                      <p className="text-xs text-gray-500">
                        <span className="font-mono text-[#0F3460]">{info.value}</span>
                        <span className="mx-1">·</span>
                        <span>{info.unit}</span>
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {boundaryAnalysis && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">边界样本分析</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">最小值影响</p>
              <p className="text-sm font-mono font-bold text-blue-700">
                {boundaryAnalysis.minValue?.toFixed(4) || '-'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                变化: {boundaryAnalysis.minImpact ? ((boundaryAnalysis.minImpact - 1) * 100).toFixed(1) : '-'}%
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">正常值</p>
              <p className="text-sm font-mono font-bold text-green-700">
                {boundaryAnalysis.normalValue?.toFixed(4) || '-'}
              </p>
              <p className="text-xs text-green-600 mt-1">基准值</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">最大值影响</p>
              <p className="text-sm font-mono font-bold text-amber-700">
                {boundaryAnalysis.maxValue?.toFixed(4) || '-'}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                变化: {boundaryAnalysis.maxImpact ? ((boundaryAnalysis.maxImpact - 1) * 100).toFixed(1) : '-'}%
              </p>
            </div>
          </div>
        </div>
      )}
      
      {sensitivityReport && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">参数敏感性分析</h4>
          </div>
          <div className="space-y-2">
            {Object.entries(sensitivityReport).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{key}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#0F3460] to-[#16C79A] rounded-full"
                      style={{ width: `${Math.min(value * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-medium text-[#0F3460] w-16 text-right">
                    {(value * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
