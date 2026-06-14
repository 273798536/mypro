import React from 'react';
import { AlertTriangle, AlertCircle, FileWarning } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { getIssueTypeLabel, getSeverityLabel } from '../utils/qualityCheck';

const QualityReport: React.FC = () => {
  const { qualityIssues, rawLogs } = useAnalysisStore();

  if (rawLogs.length === 0) {
    return null;
  }

  const errorCount = qualityIssues.filter((i) => i.severity === 'error').length;
  const warningCount = qualityIssues.filter((i) => i.severity === 'warning').length;

  const groupedIssues = qualityIssues.reduce((acc, issue) => {
    const type = issue.issueType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(issue);
    return acc;
  }, {} as Record<string, typeof qualityIssues>);

  if (qualityIssues.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-blue-900" />
          数据质量检查
        </h2>
        <div className="p-4 bg-green-50 border border-green-200 rounded-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">数据质量良好</p>
            <p className="text-sm text-green-600">未发现重复记录、坏数据或异常值</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileWarning className="w-5 h-5 text-blue-900" />
        数据质量检查
        <span className="text-sm font-normal text-gray-500">
          （共 {qualityIssues.length} 个问题）
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm">
          <div className="text-2xl font-bold text-gray-800">{rawLogs.length}</div>
          <div className="text-sm text-gray-500">总记录数</div>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-sm">
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          <div className="text-sm text-red-500">错误（数据异常）</div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
          <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
          <div className="text-sm text-amber-500">警告（重复/缺失）</div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedIssues).map(([type, issues]) => {
          const hasError = issues.some((i) => i.severity === 'error');
          return (
            <div
              key={type}
              className={`border rounded-sm overflow-hidden ${
                hasError ? 'border-gray-300' : 'border-amber-200'
              }`}
            >
              <div
                className={`px-4 py-2 flex items-center gap-2 ${
                  hasError ? 'bg-gray-100' : 'bg-amber-50'
                }`}
              >
                {hasError ? (
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium text-gray-700">
                  {getIssueTypeLabel(type as any)}
                </span>
                <span className="text-sm text-gray-500">({issues.length} 条)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium w-16">行号</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">设备编号</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">严重程度</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">问题描述</th>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">原始引用</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {issues.map((issue) => (
                      <tr
                        key={issue.issueId}
                        className={`border-t border-gray-100 ${
                          issue.severity === 'error' ? 'bg-gray-50 text-gray-500' : 'bg-amber-50/50'
                        }`}
                      >
                        <td className="px-3 py-2">{issue.rawLineNumber}</td>
                        <td className="px-3 py-2">{issue.deviceId || '-'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                              issue.severity === 'error'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-amber-200 text-amber-700'
                            }`}
                          >
                            {issue.severity === 'error' ? '❌' : '⚠️'}
                            {getSeverityLabel(issue.severity)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{issue.description}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {issue.rawReference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-sm text-sm text-yellow-800">
        <strong>处理说明：</strong>存在数据质量问题的记录已在结果中标注为"数据异常"，不会计入有效的预警统计结果。建议检查数据源，清理重复记录和坏数据。
      </div>
    </div>
  );
};

export default QualityReport;
