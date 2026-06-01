import type { StepLog } from '../types/matrix';

interface StepLoggerProps {
  steps: StepLog[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getActionLabel(action: StepLog['action']): string {
  switch (action) {
    case 'place':
      return '放置';
    case 'remove':
      return '移除';
    case 'swap':
      return '交换';
  }
}

function getActionColor(action: StepLog['action']): string {
  switch (action) {
    case 'place':
      return 'bg-green-100 text-green-800';
    case 'remove':
      return 'bg-red-100 text-red-800';
    case 'swap':
      return 'bg-blue-100 text-blue-800';
  }
}

export default function StepLogger({ steps }: StepLoggerProps) {
  if (steps.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">步骤日志</h3>
        <p className="text-gray-500 text-sm">还没有任何操作，开始拖拽变换块吧！</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-4">步骤日志</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {steps.map((step) => (
          <div
            key={`${step.stepNumber}-${step.timestamp}`}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
          >
            <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full font-bold text-sm">
              {step.stepNumber}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(step.action)}`}>
              {getActionLabel(step.action)}
            </span>
            <span className="flex-1 text-sm text-gray-700">
              向量块 <code className="bg-gray-200 px-1 rounded">{step.blockId}</code>
              {step.position && (
                <span> → 网格坐标 ({step.position.x}, {step.position.y})</span>
              )}
            </span>
            <span className="text-xs text-gray-400">
              {formatTime(step.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
