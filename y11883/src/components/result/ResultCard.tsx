import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, List, ChevronDown, ChevronUp, Layers, CheckCircle2 } from 'lucide-react';
import type { ProblemResult } from '../../types';
import { formatConditionsDescription } from '../../utils/validator';
import { DedupSteps } from './DedupSteps';
import { AnswerCompare } from './AnswerCompare';

interface ResultCardProps {
  result: ProblemResult;
  index: number;
}

export function ResultCard({ result, index }: ResultCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { input, partitions, dedupSteps, answerComparison, isProcessing, warnings } = result;

  const unconfirmedWarnings = warnings.filter(w => !w.confirmed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="card mb-4"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="card-header w-full flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            {input.lineNumber}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">
                目标数：<span className="text-primary-600 text-xl">{input.targetNumber}</span>
              </span>
              <span className="badge badge-info">
                <Hash className="w-3 h-3 mr-1" />
                {partitions.length} 种拆分
              </span>
              {isProcessing && (
                <span className="badge badge-warning animate-pulse">处理中...</span>
              )}
              {unconfirmedWarnings.length > 0 && (
                <span className="badge badge-warning">
                  ⚠️ {unconfirmedWarnings.length} 待确认
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatConditionsDescription(input.conditions)}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="card-body">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-primary-600" />
                  <span className="font-medium text-gray-700 text-sm">所有拆分方案</span>
                  <span className="text-xs text-gray-400">（点击可展开去重步骤）</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-thin p-1">
                  {partitions.map((part) => (
                    <motion.div
                      key={part.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-3 py-2 bg-gradient-to-r from-primary-50 to-white border border-primary-100 rounded-lg text-sm text-primary-700 font-medium text-center hover:shadow-md transition-shadow"
                    >
                      {part.numbers.join(' + ')}
                    </motion.div>
                  ))}
                </div>
              </div>

              <DedupSteps steps={dedupSteps} />
              
              <AnswerCompare 
                comparison={answerComparison} 
                studentAnswers={input.studentAnswer}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
