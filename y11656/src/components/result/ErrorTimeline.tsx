import type { GameAction } from '@/types';
import { ERROR_TYPE_LABELS, TARGET_AREA_LABELS } from '@/types';
import { getErrorSuggestion } from '@/utils/scoring';
import { AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useState } from 'react';

interface ErrorTimelineProps {
  actions: GameAction[];
}

export function ErrorTimeline({ actions }: ErrorTimelineProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const errors = actions.filter(a => !a.isCorrect);

  if (errors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-amber-900 mb-4">错误回放</h2>
        <div className="text-center py-8 text-green-600">
          <AlertCircle size={48} className="mx-auto mb-3" />
          <p className="font-semibold">太棒了！没有任何错误！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-amber-900 mb-4">错误回放</h2>
      
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-red-200" />
        
        <div className="space-y-4">
          {errors.map((error, index) => (
            <div key={index} className="relative pl-10">
              <div className="absolute left-2 w-5 h-5 rounded-full bg-red-500 border-4 border-white shadow" />
              
              <div className="bg-red-50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-red-700">
                      {ERROR_TYPE_LABELS[error.errorType!]}
                    </span>
                    <span className="text-sm text-red-600">《{error.itemTitle}》</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-600 font-bold">{error.points}分</span>
                    {expandedIndex === index ? (
                      <ChevronUp size={20} className="text-red-500" />
                    ) : (
                      <ChevronDown size={20} className="text-red-500" />
                    )}
                  </div>
                </button>
                
                {expandedIndex === index && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="bg-white rounded p-3 text-sm">
                      <p className="text-amber-700">
                        <span className="font-semibold">操作：</span>
                        将《{error.itemTitle}》拖入 {TARGET_AREA_LABELS[error.target]}
                      </p>
                      <p className="text-amber-700 mt-1">
                        <span className="font-semibold">正确区域：</span>
                        {TARGET_AREA_LABELS[error.correctTarget]}
                      </p>
                    </div>
                    <div className="bg-amber-100 rounded p-3">
                      <p className="text-amber-800 font-semibold mb-1">修正建议</p>
                      <p className="text-amber-700 text-sm">
                        {getErrorSuggestion(error.errorType!)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
