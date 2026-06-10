import { AlertTriangle, ArrowRight, User, Check } from 'lucide-react';
import { ActionableError } from '@/types';
import { cn } from '@/lib/utils';

interface ActionableErrorDisplayProps {
  error: ActionableError;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function ActionableErrorDisplay({
  error,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel = '立即处理',
  secondaryLabel,
}: ActionableErrorDisplayProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900">{error.title}</h3>
          <p className="mt-1 text-sm text-red-700">{error.description}</p>
        </div>
      </div>

      {error.missingItems.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-medium text-red-900">发现问题：</h4>
          <ul className="mt-2 space-y-2">
            {error.missingItems.map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-white p-3 text-sm"
              >
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                <div>
                  <span className="font-medium text-gray-900">{item.sampleName}</span>
                  <span className="text-gray-500">（{item.sampleId}）</span>
                  <span className="text-gray-700">：{item.issue}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error.nextSteps.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-medium text-red-900">下一步操作：</h4>
          <ol className="mt-2 space-y-2">
            {error.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-xs font-medium text-red-700">
                  {index + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {error.contactInfo && (
        <div className="mt-5 flex items-center gap-3 rounded-lg bg-red-100 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
            <User className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-900">{error.contactInfo.name}</p>
            <p className="text-xs text-red-700">{error.contactInfo.role}</p>
          </div>
        </div>
      )}

      <div className={cn('mt-6 flex gap-3', error.canSkip ? 'justify-between' : 'justify-end')}>
        {error.canSkip && secondaryLabel && (
          <button
            onClick={onSecondaryAction}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {secondaryLabel}
          </button>
        )}
        <button
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
