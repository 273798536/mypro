import { X, Upload, Download, Edit, Trash2, FileInput } from 'lucide-react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { OperationType } from '@/types';

interface HistoryModalProps {
  onClose: () => void;
}

const typeIcons: Record<OperationType, typeof Upload> = {
  create: Upload,
  update: Edit,
  delete: Trash2,
  export: Download,
  import: FileInput,
};

const typeLabels: Record<OperationType, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  export: '导出',
  import: '导入',
};

const typeColors: Record<OperationType, string> = {
  create: 'text-emerald-400 bg-emerald-500/20',
  update: 'text-blue-400 bg-blue-500/20',
  delete: 'text-red-400 bg-red-500/20',
  export: 'text-purple-400 bg-purple-500/20',
  import: 'text-amber-400 bg-amber-500/20',
};

export function HistoryModal({ onClose }: HistoryModalProps) {
  const { history } = useWarehouseStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-bold text-lg">操作历史记录</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                暂无操作记录
              </div>
            ) : (
              history.map((entry) => {
                const Icon = typeIcons[entry.operationType];
                return (
                  <div
                    key={entry.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${typeColors[entry.operationType]}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium">
                            {entry.description}
                          </span>
                          <span className="text-xs text-slate-500">
                            {entry.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                          <span>操作人：{entry.operator}</span>
                          <span>
                            {new Date(entry.timestamp).toLocaleString('zh-CN')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded ${typeColors[entry.operationType]}`}
                          >
                            {typeLabels[entry.operationType]}
                          </span>
                        </div>
                        {entry.dataSource && (
                          <p className="text-xs text-slate-500 mb-2">
                            数据来源：{entry.dataSource}
                          </p>
                        )}
                        {entry.beforeData && entry.afterData && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="bg-slate-900/50 rounded p-2">
                              <p className="text-[10px] text-slate-500 mb-1">修改前</p>
                              <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap break-all">
                                {entry.beforeData}
                              </pre>
                            </div>
                            <div className="bg-slate-900/50 rounded p-2">
                              <p className="text-[10px] text-slate-500 mb-1">修改后</p>
                              <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap break-all">
                                {entry.afterData}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
