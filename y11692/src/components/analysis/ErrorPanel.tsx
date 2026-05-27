import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import type { ErrorAnalysis } from '@/types';
import { getErrorTypeName, formatErrorLocation } from '@/utils/analysis/errorDetector';

interface ErrorPanelProps {
  errors: ErrorAnalysis[];
  onResolve?: (errorId: string) => void;
  showResolved?: boolean;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  errors,
  onResolve,
  showResolved = true
}) => {
  const unresolvedErrors = errors.filter(e => !e.isResolved);
  const resolvedErrors = errors.filter(e => e.isResolved);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-amber-500 bg-amber-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return '严重';
      case 'medium':
        return '中等';
      case 'low':
        return '轻微';
      default:
        return '未知';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">错误分析</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-red-600 font-medium">
            {unresolvedErrors.length} 个待处理
          </span>
          {showResolved && resolvedErrors.length > 0 && (
            <span className="text-green-600 font-medium">
              {resolvedErrors.length} 个已修正
            </span>
          )}
        </div>
      </div>

      {errors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 bg-green-50 rounded-xl border-2 border-dashed border-green-200">
          <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
          <p className="text-green-700 font-medium">暂无错误</p>
          <p className="text-green-600 text-sm">这道题的解答完全正确！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unresolvedErrors.map((error, index) => (
            <div
              key={error.id}
              className={`p-4 rounded-lg border-l-4 ${getSeverityColor(error.severity)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(error.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">
                      {getErrorTypeName(error.type)}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      error.severity === 'high' ? 'bg-red-100 text-red-700' :
                      error.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {getSeverityLabel(error.severity)}
                    </span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">
                    {error.description}
                  </p>
                  {error.location && (
                    <p className="text-gray-500 text-xs mb-2">
                      📍 位置：{formatErrorLocation(error)}
                    </p>
                  )}
                  <div className="bg-white bg-opacity-60 rounded p-2 text-sm">
                    <span className="text-gray-600 font-medium">💡 建议：</span>
                    <span className="text-gray-700">{error.suggestion}</span>
                  </div>
                  {onResolve && (
                    <button
                      onClick={() => onResolve(error.id)}
                      className="mt-3 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      标记为已修正
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {showResolved && resolvedErrors.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                已修正的问题
              </h4>
              <div className="space-y-2">
                {resolvedErrors.map(error => (
                  <div
                    key={error.id}
                    className="p-3 rounded-lg bg-gray-50 border border-gray-200 opacity-70"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600 line-through">
                        {getErrorTypeName(error.type)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
