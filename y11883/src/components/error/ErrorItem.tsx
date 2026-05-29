import { motion } from 'framer-motion';
import { XCircle, Lightbulb } from 'lucide-react';
import type { InputError } from '../../types';

interface ErrorItemProps {
  error: InputError;
}

const errorTypeConfig = {
  format: {
    label: '格式错误',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
  },
  invalid_number: {
    label: '数字无效',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
  },
  condition_conflict: {
    label: '条件冲突',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
  },
};

export function ErrorItem({ error }: ErrorItemProps) {
  const config = errorTypeConfig[error.errorType];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border bg-white border-red-100`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-red-100">
          <XCircle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-red-600">
              第{error.lineNumber}行
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              {config.label}
            </span>
          </div>
          <p className="text-sm text-gray-700 font-mono bg-gray-50 px-2 py-1 rounded mt-1 text-xs">
            {error.rawInput}
          </p>
          <p className="text-sm text-red-600 mt-2">
            {error.message}
          </p>
          {error.suggestion && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-600">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{error.suggestion}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
