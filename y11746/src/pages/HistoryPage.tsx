import React from 'react';
import { History, Package, ArrowRight, FileText, Database, User } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { dataSourceLabels } from '../types';

const recordTypeLabels: Record<string, string> = {
  donation: '捐赠记录',
  invoice: '票据记录',
  refund: '退款记录',
  physical: '实物记录',
  project: '项目记录',
};

export const HistoryPage: React.FC = () => {
  const auditLogs = useAppStore(state => state.auditLogs);
  const isDataLoaded = useAppStore(state => state.isDataLoaded);

  if (!isDataLoaded) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">请先导入数据或加载样例数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">修正痕迹</h2>
        <p className="text-sm text-gray-500 mt-1">
          共 {auditLogs.length} 条修改记录，支持数据溯源
        </p>
      </div>

      {auditLogs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <History size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无修改记录</p>
          <p className="text-sm text-gray-400 mt-1">处理异常后会在这里显示修改痕迹</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="relative">
            {auditLogs.map((log, index) => (
              <div key={log.id} className="relative flex">
                {index !== auditLogs.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-200" />
                )}

                <div className="flex-shrink-0 w-12 pt-5">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-4 border-blue-100" />
                </div>

                <div className="flex-1 py-4 pr-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {recordTypeLabels[log.recordType] || log.recordType}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.operatedAt).toLocaleString('zh-CN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <User size={14} className="text-gray-400" />
                        <span>{log.operator}</span>
                        <span className="text-gray-300">|</span>
                        <Database size={14} className="text-gray-400" />
                        <span>{dataSourceLabels[log.source]}</span>
                        <span className="text-gray-300">|</span>
                        <FileText size={14} className="text-gray-400" />
                        <span className="font-mono text-xs">{log.recordId}</span>
                      </div>

                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-400 mb-1">修改前</div>
                          <div className="text-sm text-gray-600 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                            {log.oldValue || '(空)'}
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs text-gray-400 mb-1">修改后</div>
                          <div className="text-sm text-green-700 font-mono bg-green-50 px-2 py-1 rounded border border-green-200">
                            {log.newValue || '(空)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {auditLogs.length > 0 && (
        <div className="mt-4 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <History size={18} className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">修改记录说明</p>
              <p className="mt-1 text-blue-600">
                所有修改操作都会被记录，包括操作人、操作时间、修改字段的前后值、数据来源等信息。
                记录保存在本地浏览器中，用于数据溯源和审计。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
