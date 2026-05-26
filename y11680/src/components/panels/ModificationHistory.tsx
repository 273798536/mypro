import { useStore } from '../../store/useStore';

export default function ModificationHistory() {
  const history = useStore((state) => state.modificationHistory);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-400';
      case 'update':
        return 'text-blue-400';
      case 'delete':
        return 'text-red-400';
      case 'import':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return '创建';
      case 'update':
        return '更新';
      case 'delete':
        return '删除';
      case 'import':
        return '导入';
      default:
        return action;
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-2">
        暂无修改记录
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {history.slice(0, 20).map((log) => (
        <div key={log.id} className="flex items-start gap-2 text-xs py-1 border-b border-dark-900">
          <span className="text-gray-500 font-mono flex-shrink-0">
            {formatTime(log.timestamp)}
          </span>
          <span className={`${getActionColor(log.action)} flex-shrink-0`}>
            [{getActionLabel(log.action)}]
          </span>
          <span className="text-gray-300 truncate">{log.description}</span>
        </div>
      ))}
    </div>
  );
}
