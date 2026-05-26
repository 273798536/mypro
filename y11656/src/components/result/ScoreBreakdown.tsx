import type { GameAction } from '@/types';
import { ERROR_TYPE_LABELS, TARGET_AREA_LABELS } from '@/types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface ScoreBreakdownProps {
  actions: GameAction[];
  totalScore: number;
  totalItems: number;
  correctCount: number;
  errorCount: number;
  duration: number;
}

export function ScoreBreakdown({
  actions,
  totalScore,
  totalItems,
  correctCount,
  errorCount,
  duration,
}: ScoreBreakdownProps) {
  const accuracy = totalItems > 0 ? ((correctCount / totalItems) * 100).toFixed(1) : '0';
  
  const errorTypeCounts: Record<string, number> = {};
  actions.filter(a => !a.isCorrect).forEach(a => {
    if (a.errorType) {
      errorTypeCounts[a.errorType] = (errorTypeCounts[a.errorType] || 0) + 1;
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-amber-900 mb-4">得分详情</h2>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-amber-50 rounded-lg">
          <div className="text-3xl font-bold text-amber-800">{totalScore}</div>
          <div className="text-sm text-amber-600">总分</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
          <div className="text-sm text-green-600">正确率</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{duration}s</div>
          <div className="text-sm text-blue-600">用时</div>
        </div>
        <div className="text-center p-4 bg-amber-50 rounded-lg">
          <div className="text-3xl font-bold text-amber-800">{totalItems}</div>
          <div className="text-sm text-amber-600">总数</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 bg-green-100 rounded-lg">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <div className="text-xl font-bold text-green-700">{correctCount}</div>
            <div className="text-sm text-green-600">正确操作</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-red-100 rounded-lg">
          <XCircle className="text-red-600" size={24} />
          <div>
            <div className="text-xl font-bold text-red-700">{errorCount}</div>
            <div className="text-sm text-red-600">错误操作</div>
          </div>
        </div>
      </div>

      {Object.keys(errorTypeCounts).length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-amber-800 mb-3">错误类型分布</h3>
          <div className="space-y-2">
            {Object.entries(errorTypeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="text-red-700">{ERROR_TYPE_LABELS[type as keyof typeof ERROR_TYPE_LABELS]}</span>
                <span className="font-bold text-red-600">{count} 次</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-amber-100">
        <h3 className="font-semibold text-amber-800 mb-3">操作明细</h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {actions.map((action, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 rounded ${
                action.isCorrect ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {action.isCorrect ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className="text-sm text-amber-800">{action.itemTitle}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-amber-600">
                  {TARGET_AREA_LABELS[action.target]}
                </span>
                <span className={`font-bold ${action.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {action.points > 0 ? `+${action.points}` : action.points}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
