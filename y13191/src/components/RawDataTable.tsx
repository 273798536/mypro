import React, { useMemo } from 'react';
import { Table, AlertTriangle, XCircle, Edit3, Eye } from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { getIssueTypeLabel } from '../utils/qualityCheck';

const RawDataTable: React.FC = () => {
  const { rawLogs, qualityIssues, resultsA, selectedLogId, setSelectedLogId, fieldMappingResult } = useAnalysisStore();

  const issueMap = useMemo(() => {
    const map = new Map<string, typeof qualityIssues>();
    qualityIssues.forEach((issue) => {
      const existing = map.get(issue.logId) || [];
      existing.push(issue);
      map.set(issue.logId, existing);
    });
    return map;
  }, [qualityIssues]);

  const resultMap = useMemo(() => {
    const map = new Map(resultsA.map((r) => [r.logId, r]));
    return map;
  }, [resultsA]);

  const getRowClassName = (logId: string) => {
    const issues = issueMap.get(logId);
    const isSelected = selectedLogId === logId;
    let className = 'transition-colors ';

    if (isSelected) {
      className += 'bg-blue-50 ';
    }

    if (issues) {
      const hasError = issues.some((i) => i.severity === 'error');
      const hasWarning = issues.some((i) => i.severity === 'warning');
      if (hasError) {
        className += 'bg-gray-100 ';
      } else if (hasWarning) {
        className += 'bg-amber-50 ';
      }
    }

    return className;
  };

  if (rawLogs.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Table className="w-5 h-5 text-blue-900" />
          原始数据
        </h2>
        <p className="text-gray-500 text-center py-8">请先上传传感器日志数据</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Table className="w-5 h-5 text-blue-900" />
        原始数据
        <span className="text-sm font-normal text-gray-500">({rawLogs.length} 条记录)</span>
      </h2>

      {fieldMappingResult && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-sm text-xs">
          <span className="font-medium text-gray-700">字段映射：</span>
          <span className="text-gray-600 ml-2">
            "{fieldMappingResult.mapping.deviceId}"→设备编号 | 
            "{fieldMappingResult.mapping.resistance}"→内阻 | 
            "{fieldMappingResult.mapping.temperature}"→温度 | 
            "{fieldMappingResult.mapping.timestamp}"→时间 |
            "{fieldMappingResult.mapping.manualRemark}"→备注
          </span>
        </div>
      )}

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-gray-600 font-medium w-16">行号</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">设备编号</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">原始内阻</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">温度</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">采集时间</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">处理结果</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium">人工备注</th>
              <th className="px-3 py-2 text-left text-gray-600 font-medium w-20">操作</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rawLogs.map((log) => {
              const issues = issueMap.get(log.id);
              const result = resultMap.get(log.id);
              const hasOverride = log.manualRemark && log.manualRemark.trim() !== '';

              return (
                <tr
                  key={log.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${getRowClassName(log.id)}`}
                >
                  <td className="px-3 py-2 text-gray-500">{log.rawLineNumber}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {issues && (
                        <span title={issues.map((i) => getIssueTypeLabel(i.issueType)).join(', ')}>
                          {issues.some((i) => i.severity === 'error') ? (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </span>
                      )}
                      {hasOverride && <Edit3 className="w-4 h-4 text-blue-500" />}
                      <span className={issues ? 'text-gray-500' : 'text-gray-800'}>
                        {log.deviceId || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={issues ? 'text-gray-400' : 'text-gray-800'}>
                      {log.resistance !== null ? `${log.resistance}${log.resistanceUnit}` : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={issues ? 'text-gray-400' : 'text-gray-800'}>
                      {log.temperature !== null ? `${log.temperature}°C` : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{log.timestamp || '-'}</td>
                  <td className="px-3 py-2">
                    {result && !result.hasQualityIssue ? (
                      result.isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                          🔴 预警
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                          🟢 正常
                        </span>
                      )
                    ) : issues ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                        ⚠️ 数据异常
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate" title={log.manualRemark || ''}>
                    {log.manualRemark ? (
                      <span className="text-blue-600">"{log.manualRemark}"</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    {log.manualOperator && (
                      <span className="text-gray-500 text-xs ml-1">({log.manualOperator})</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="查看计算过程"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>重复/警告</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-3 h-3 text-gray-400" />
          <span>坏数据/缺失</span>
        </div>
        <div className="flex items-center gap-1">
          <Edit3 className="w-3 h-3 text-blue-500" />
          <span>有人工备注</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-red-100 rounded"></span>
          <span>预警</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-green-100 rounded"></span>
          <span>正常</span>
        </div>
      </div>
    </div>
  );
};

export default RawDataTable;
