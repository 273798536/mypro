import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, CopyCheck, User } from 'lucide-react';
import type { AnswerComparison } from '../../types';

interface AnswerCompareProps {
  comparison: AnswerComparison;
  studentAnswers: string[];
}

export function AnswerCompare({ comparison, studentAnswers }: AnswerCompareProps) {
  if (studentAnswers.length === 0) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <User className="w-4 h-4" />
          <span className="text-sm">未提供学生答案</span>
        </div>
      </div>
    );
  }

  const totalCorrect = comparison.correctAnswers.length;
  const totalWrong = comparison.wrongAnswers.length;
  const totalMissed = comparison.missedAnswers.length;
  const totalDuplicate = comparison.duplicateAnswers.length;
  const total = studentAnswers.length;

  const accuracy = total > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong + totalDuplicate)) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 bg-gradient-to-br from-primary-50 to-white rounded-lg border border-primary-100 overflow-hidden"
    >
      <div className="px-4 py-3 bg-primary-100/50 border-b border-primary-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary-600" />
            <span className="font-medium text-primary-800 text-sm">学生答案对比</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${
              accuracy >= 80 ? 'text-emerald-600' : accuracy >= 60 ? 'text-amber-600' : 'text-red-600'
            }`}>
              正确率 {accuracy}%
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center p-2 bg-emerald-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-emerald-700">{totalCorrect}</div>
            <div className="text-xs text-emerald-600">正确</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-red-700">{totalWrong}</div>
            <div className="text-xs text-red-600">错误</div>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-amber-700">{totalMissed}</div>
            <div className="text-xs text-amber-600">遗漏</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <CopyCheck className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-700">{totalDuplicate}</div>
            <div className="text-xs text-blue-600">重复</div>
          </div>
        </div>

        {comparison.correctAnswers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-emerald-700 mb-1">✓ 正确答案：</p>
            <div className="flex flex-wrap gap-1">
              {comparison.correctAnswers.map((a, i) => (
                <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {comparison.wrongAnswers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-red-700 mb-1">✗ 错误答案：</p>
            <div className="flex flex-wrap gap-1">
              {comparison.wrongAnswers.map((a, i) => (
                <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {comparison.missedAnswers.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-amber-700 mb-1">⚠ 遗漏答案：</p>
            <div className="flex flex-wrap gap-1">
              {comparison.missedAnswers.map((a, i) => (
                <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {comparison.duplicateAnswers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">↻ 重复提交：</p>
            <div className="flex flex-wrap gap-1">
              {comparison.duplicateAnswers.map((a, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
