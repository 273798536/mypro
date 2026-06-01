import clsx from 'clsx';
import type { Matrix2x2 } from '../types/matrix';

interface MatrixDisplayProps {
  matrix: Matrix2x2;
  label?: string;
  isCorrect?: boolean;
}

export default function MatrixDisplay({ matrix, label, isCorrect }: MatrixDisplayProps) {
  return (
    <div className="matrix-display">
      {label && (
        <div className={clsx(
          'text-sm font-medium mb-2',
          isCorrect ? 'text-green-600' : 'text-gray-500'
        )}>
          {label}
        </div>
      )}
      <div className={clsx(
        'relative inline-block',
        isCorrect && 'text-green-600'
      )}>
        <div className="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 rounded-l-lg border-gray-300" />
        <div className="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 rounded-r-lg border-gray-300" />
        <div className="px-4 py-2">
          <div className="flex items-center gap-4 mb-1">
            <span className={clsx(
              'w-12 text-right font-mono text-lg',
              isCorrect && 'font-bold'
            )}>
              {matrix[0][0]}
            </span>
            <span className={clsx(
              'w-12 text-right font-mono text-lg',
              isCorrect && 'font-bold'
            )}>
              {matrix[0][1]}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className={clsx(
              'w-12 text-right font-mono text-lg',
              isCorrect && 'font-bold'
            )}>
              {matrix[1][0]}
            </span>
            <span className={clsx(
              'w-12 text-right font-mono text-lg',
              isCorrect && 'font-bold'
            )}>
              {matrix[1][1]}
            </span>
          </div>
        </div>
      </div>
      {isCorrect && (
        <div className="mt-2 flex items-center gap-2 text-green-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">完全匹配！</span>
        </div>
      )}
    </div>
  );
}
