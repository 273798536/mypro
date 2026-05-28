import { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getValidationSummary, getStepProgress } from '@/utils/dataValidator';

export function ValidationBar() {
  const { validationResult, setDataPackage } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  const { loadMockData } = useAppStore();

  if (!validationResult) {
    return (
      <div className="bg-ocean-light border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-400">
          <AlertCircle className="w-5 h-5" />
          <span>暂无数据，请导入或加载示例数据</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadMockData()}
            className="px-4 py-1.5 bg-sun-orange hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            加载示例数据
          </button>
        </div>
      </div>
    );
  }

  const summary = getValidationSummary(validationResult);
  const hasErrors = validationResult.errors.length > 0;
  const hasWarnings = validationResult.warnings.length > 0;
  const hasReviews = validationResult.needsReview.length > 0;

  const statusConfig = {
    error: {
      bg: 'bg-coral-red/90',
      icon: <AlertCircle className="w-5 h-5" />,
      text: 'text-white',
    },
    warning: {
      bg: 'bg-dawn-gold/90',
      icon: <AlertTriangle className="w-5 h-5 text-amber-900" />,
      text: 'text-amber-900',
    },
    success: {
      bg: 'bg-mint-green/90',
      icon: <CheckCircle className="w-5 h-5" />,
      text: 'text-white',
    },
  }[summary.status];

  return (
    <div className={`${statusConfig.bg} border-b border-white/20 transition-all`}>
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusConfig.icon}
          <span className={`font-medium ${statusConfig.text}`}>{summary.message}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            {hasErrors && (
              <span className="px-2 py-0.5 bg-red-800/50 rounded text-white">
                {validationResult.errors.length} 错误
              </span>
            )}
            {hasWarnings && (
              <span className="px-2 py-0.5 bg-amber-800/50 rounded text-amber-100">
                {validationResult.warnings.length} 警告
              </span>
            )}
            {hasReviews && (
              <span className="px-2 py-0.5 bg-blue-800/50 rounded text-blue-100">
                {validationResult.needsReview.length} 待复核
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1 rounded hover:bg-white/20 transition-colors ${statusConfig.text}`}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-4 border-t border-white/10 pt-4">
          {validationResult.errors.map((error, idx) => {
            const progress = getStepProgress(error);
            return (
              <div key={idx} className="mb-4 p-4 bg-red-900/30 rounded-lg border border-red-500/30">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-white">{error.humanMessage}</div>
                    <div className="text-sm text-red-200 mt-1">错误代码: {error.code}</div>
                  </div>
                  <X className="w-5 h-5 text-red-300" />
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-red-200 mb-1">
                    <span>验证进度</span>
                    <span>第 {progress.current} / {progress.total} 步</span>
                  </div>
                  <div className="flex gap-1">
                    {progress.steps.map((step, stepIdx) => (
                      <div
                        key={stepIdx}
                        className={`flex-1 h-2 rounded-sm ${
                          stepIdx < progress.current - 1
                            ? 'bg-red-500'
                            : stepIdx === progress.current - 1
                            ? 'bg-dawn-gold animate-pulse'
                            : 'bg-red-900/50'
                        }`}
                        title={step}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-red-300 mt-1">
                    {progress.steps.map((step, stepIdx) => (
                      <span
                        key={stepIdx}
                        className={stepIdx === progress.current - 1 ? 'text-dawn-gold font-medium' : ''}
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                </div>

                {error.code === 'TIMEZONE_MISMATCH_LOCATION' && (
                  <div className="mt-3 p-3 bg-white/10 rounded text-sm text-red-100">
                    <div className="font-medium mb-1">💡 问题说明：</div>
                    <p>{error.humanMessage}</p>
                    <p className="mt-2 text-red-200">
                      举个例子：如果你的手表是UTC时间，但人在北京（UTC+8），那么当手表显示12点时，
                      北京实际已经是晚上8点，太阳早就落山了。所有的日照计算都会跟着出错。
                    </p>
                    <p className="mt-2 text-red-200">
                      建议修正时区为：<span className="font-mono bg-white/20 px-2 py-0.5 rounded">
                        {error.details.expected as string}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {validationResult.warnings.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-amber-200 mb-2">⚠️ 警告信息</h4>
              {validationResult.warnings.map((warning, idx) => (
                <div key={idx} className="p-3 bg-amber-900/30 rounded-lg border border-amber-500/30 mb-2">
                  <div className="text-amber-100">{warning.humanMessage}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
