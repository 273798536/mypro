import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import type { DedupStep } from '../../types';

interface DedupStepsProps {
  steps: DedupStep[];
}

export function DedupSteps({ steps }: DedupStepsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(2);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary-600" />
          <span className="font-medium text-gray-700 text-sm">去重排序步骤</span>
          <span className="badge badge-info text-xs">3步</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="flex gap-2 mb-4">
                {steps.map((step, idx) => (
                  <button
                    key={step.stepIndex}
                    onClick={() => setActiveStep(idx)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeStep === idx
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {activeStep > idx && (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      步骤{step.stepIndex}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-800 mb-3">
                  {steps[activeStep]?.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">处理前：</p>
                    <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto scrollbar-thin">
                      {steps[activeStep]?.before.map((nums, idx) => (
                        <div key={idx} className="text-xs text-gray-600 py-0.5">
                          {nums.join(' + ')}
                        </div>
                      )) || <span className="text-gray-400">-</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">处理后：</p>
                    <div className="bg-emerald-50 rounded p-3 max-h-32 overflow-y-auto scrollbar-thin">
                      {steps[activeStep]?.after.map((nums, idx) => (
                        <div key={idx} className="text-xs text-emerald-700 py-0.5">
                          {nums.join(' + ')}
                        </div>
                      )) || <span className="text-gray-400">-</span>}
                    </div>
                  </div>
                </div>

                {steps[activeStep]?.removedPartitions.length > 0 && (
                  <div className="mt-3 p-2 bg-red-50 rounded border border-red-100">
                    <p className="text-xs text-red-600 font-medium">
                      移除了 {steps[activeStep].removedPartitions.length} 个重复拆分
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
