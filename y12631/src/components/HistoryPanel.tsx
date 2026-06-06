import { Operation } from '../types';

interface HistoryPanelProps {
  operations: Operation[];
  onRestore: (operationId: string) => void;
}

const getOperationIcon = (type: Operation['type']) => {
  switch (type) {
    case 'import': return '📥';
    case 'edit': return '✏️';
    case 'correct': return '🔧';
    case 'confirm': return '✅';
    case 'restore': return '↩️';
    case 'annotate': return '📝';
    default: return '📝';
  }
};

const getOperationColor = (type: Operation['type']) => {
  switch (type) {
    case 'import': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'edit': return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'correct': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'confirm': return 'bg-green-50 text-green-700 border-green-200';
    case 'restore': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'annotate': return 'bg-pink-50 text-pink-700 border-pink-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

const getOperationLabel = (type: Operation['type']) => {
  switch (type) {
    case 'import': return '导入';
    case 'edit': return '编辑';
    case 'correct': return '修正';
    case 'confirm': return '确认';
    case 'restore': return '恢复';
    case 'annotate': return '批注';
    default: return '操作';
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const HistoryPanel = ({ operations, onRestore }: HistoryPanelProps) => {
  if (operations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3">📜 操作历史</h3>
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">📝</p>
          <p>暂无操作记录</p>
          <p className="text-sm mt-1">开始编辑迷宫后，操作会记录在这里</p>
          <p className="text-xs mt-2 text-gray-400">每条记录都保存了当时的分数，可以一键恢复</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">📜 操作历史</h3>
      <p className="text-xs text-gray-500 mb-3">每次导入、修改、批改都记下来了，可以点「恢复到此状态」回到那一步</p>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {[...operations].reverse().map((operation) => {
          const hasScoreChange = operation.scoreBefore !== undefined && operation.scoreAfter !== undefined;
          const scoreDiff = hasScoreChange
            ? (operation.scoreAfter || 0) - (operation.scoreBefore || 0)
            : 0;
          return (
            <div
              key={operation.id}
              className={`p-3 rounded-lg border ${getOperationColor(operation.type)}`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">{getOperationIcon(operation.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{operation.description}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-white/70 rounded">{getOperationLabel(operation.type)}</span>
                    </div>
                    {operation.annotation && (
                      <p className="text-xs mt-1 italic">📝 {operation.annotation}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTime(operation.timestamp)}</span>
              </div>

              {hasScoreChange && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-white/70 rounded">
                    {operation.scoreBefore}分 → {operation.scoreAfter}分
                  </span>
                  {scoreDiff !== 0 && (
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      scoreDiff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {scoreDiff > 0 ? '↑ 涨了' : '↓ 掉了'} {Math.abs(scoreDiff)} 分
                    </span>
                  )}
                </div>
              )}

              {operation.before && (
                <button
                  className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                  onClick={() => onRestore(operation.id)}
                >
                  <span>↩️</span>
                  <span>恢复到此状态</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
        <span className="text-sm text-gray-500">共 {operations.length} 条记录</span>
      </div>
    </div>
  );
};
