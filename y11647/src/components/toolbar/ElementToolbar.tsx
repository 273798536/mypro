import { MousePointer2, Bot, Circle, Square, Target, Route, Trash2 } from 'lucide-react';
import { useTacticsStore } from '../../store/useTacticsStore';
import type { ToolType } from '../../engine/types';

const tools: { type: ToolType; icon: typeof MousePointer2; label: string; color: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择', color: 'text-slate-300' },
  { type: 'robot', icon: Bot, label: '机器人', color: 'text-sky-400' },
  { type: 'ball', icon: Circle, label: '足球', color: 'text-amber-400' },
  { type: 'obstacle', icon: Square, label: '障碍', color: 'text-slate-400' },
  { type: 'passPoint', icon: Target, label: '传球点', color: 'text-emerald-400' },
  { type: 'path', icon: Route, label: '路径', color: 'text-orange-400' },
  { type: 'delete', icon: Trash2, label: '删除', color: 'text-red-400' },
];

export function ElementToolbar() {
  const { currentTool, setCurrentTool, isDrawingPath } = useTacticsStore();

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-800 rounded-xl shadow-xl">
      <h3 className="text-sm font-semibold text-slate-400 mb-1 px-2">工具栏</h3>
      {tools.map(({ type, icon: Icon, label, color }) => {
        const isActive = currentTool === type || (isDrawingPath && type === 'path');
        return (
          <button
            key={type}
            onClick={() => setCurrentTool(type)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'hover:bg-slate-700 text-slate-300'
            }`}
            title={label}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : color}`} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        );
      })}

      {isDrawingPath && (
        <div className="mt-2 p-3 bg-amber-900/30 border border-amber-500/50 rounded-lg">
          <p className="text-xs text-amber-300">
            正在绘制路径...
            <br />
            点击画布添加路径点
            <br />
            双击完成，右键取消
          </p>
        </div>
      )}
    </div>
  );
}
