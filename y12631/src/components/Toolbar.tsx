interface ToolbarProps {
  selectedTool: 'wall' | 'path' | 'start' | 'end' | 'item' | 'obstacle' | 'erase';
  onToolSelect: (tool: 'wall' | 'path' | 'start' | 'end' | 'item' | 'obstacle' | 'erase') => void;
  onClear: () => void;
  onConfirm: () => void;
  status: 'draft' | 'completed' | 'review';
}

const tools = [
  { id: 'wall' as const, icon: '🧱', label: '墙壁' },
  { id: 'path' as const, icon: '✅', label: '路径' },
  { id: 'start' as const, icon: '🚶', label: '起点' },
  { id: 'end' as const, icon: '🏁', label: '终点' },
  { id: 'item' as const, icon: '⭐', label: '道具' },
  { id: 'obstacle' as const, icon: '⚠️', label: '障碍物' },
  { id: 'erase' as const, icon: '🗑️', label: '擦除' },
];

export const Toolbar = ({ selectedTool, onToolSelect, onClear, onConfirm, status }: ToolbarProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">🛠️ 工具栏</h3>
      
      <div className="grid grid-cols-4 gap-2 mb-4">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`flex flex-col items-center p-2 rounded-lg transition-all ${
              selectedTool === tool.id
                ? 'bg-primary-500 text-white shadow-md scale-105'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => onToolSelect(tool.id)}
            title={tool.label}
          >
            <span className="text-xl">{tool.icon}</span>
            <span className="text-xs mt-1">{tool.label}</span>
          </button>
        ))}
      </div>
      
      <div className="flex gap-2">
        <button
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          onClick={onClear}
        >
          <span>🗑️</span>
          <span>清空</span>
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            status === 'completed'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-secondary-500 text-white hover:bg-secondary-600'
          }`}
          onClick={onConfirm}
          disabled={status === 'completed'}
        >
          <span>✅</span>
          <span>确认完成</span>
        </button>
      </div>
      
      <div className="mt-3 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
          status === 'review' ? 'bg-orange-100 text-orange-700' :
          'bg-green-100 text-green-700'
        }`}>
          {status === 'draft' && '📝 草稿'}
          {status === 'review' && '🔍 审核中'}
          {status === 'completed' && '✅ 已完成'}
        </span>
      </div>
    </div>
  );
};
