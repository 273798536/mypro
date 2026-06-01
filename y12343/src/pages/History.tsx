import { useStore } from '@/store';
import { History, Plus, Edit3, Trash2, RefreshCw, FilePlus, AlertCircle } from 'lucide-react';

export default function HistoryPage() {
  const { history } = useStore();

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus className="w-4 h-4" />;
      case 'update': return <Edit3 className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'supplement': return <FilePlus className="w-4 h-4" />;
      case 'recalculate': return <RefreshCw className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'create': return 'bg-accent-success/20 text-accent-success';
      case 'update': return 'bg-accent-info/20 text-accent-info';
      case 'delete': return 'bg-accent-error/20 text-accent-error';
      case 'supplement': return 'bg-accent-warning/20 text-accent-warning';
      case 'recalculate': return 'bg-primary-500/20 text-primary-400';
      default: return 'bg-primary-500/20 text-primary-400';
    }
  };

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'create': return '创建';
      case 'update': return '更新';
      case 'delete': return '删除';
      case 'supplement': return '补录';
      case 'recalculate': return '重算';
      default: return '操作';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">历史追溯</h1>
        <p className="text-primary-300 mt-1">系统操作日志与数据变更记录</p>
      </div>

      <div className="card overflow-hidden">
        {history.length === 0 ? (
          <div className="text-center py-16 text-primary-400">
            <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">暂无操作记录</p>
            <p className="text-sm mt-1">系统会自动记录所有数据操作</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-dark-border" />
            
            <div className="space-y-1 p-6">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="relative pl-12 pb-6 last:pb-0 animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`absolute left-4 w-8 h-8 rounded-full flex items-center justify-center ${getOperationColor(record.operationType)}`}>
                    {getOperationIcon(record.operationType)}
                  </div>

                  <div className="bg-dark-bg/50 rounded-lg p-4 hover:bg-dark-bg/80 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getOperationColor(record.operationType)}`}>
                          {getOperationLabel(record.operationType)}
                        </span>
                        <span className="text-sm text-white font-medium">
                          {record.operationDetail}
                        </span>
                      </div>
                      <span className="text-xs text-primary-400">
                        {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    <div className="text-sm text-primary-300">
                      <span className="text-primary-400">操作者: </span>
                      {record.operator}
                    </div>

                    {record.affectedItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {record.affectedItems.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-dark-border/50 rounded text-xs text-primary-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">操作类型说明</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-3 bg-dark-bg/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-accent-success/20 text-accent-success flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-white">创建</p>
              <p className="text-xs text-primary-400">新建数据记录</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-bg/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-accent-info/20 text-accent-info flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-white">更新</p>
              <p className="text-xs text-primary-400">修改数据内容</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-bg/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-accent-error/20 text-accent-error flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-white">删除</p>
              <p className="text-xs text-primary-400">删除数据记录</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-bg/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-accent-warning/20 text-accent-warning flex items-center justify-center">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-white">补录</p>
              <p className="text-xs text-primary-400">补充缺失数据</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-dark-bg/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-white">重算</p>
              <p className="text-xs text-primary-400">重新计算报告</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
