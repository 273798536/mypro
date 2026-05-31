import { MousePointer2, Ruler, PenTool, RefreshCw, ArrowRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { ToolType } from '@/types';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  onSubmit?: () => void;
  canSubmit?: boolean;
}

const tools: { type: ToolType; icon: typeof MousePointer2; label: string; description: string }[] = [
  { type: 'select', icon: MousePointer2, label: '选择', description: '点击选择测绘点' },
  { type: 'angle', icon: Ruler, label: '角度尺', description: '测量两点间角度' },
  { type: 'distance', icon: PenTool, label: '测距仪', description: '输入距离和单位' },
  { type: 'path', icon: PenTool, label: '路径笔', description: '绘制测量路径' },
  { type: 'reset', icon: RefreshCw, label: '重置', description: '清除当前操作' },
];

export function Toolbar({ onSubmit, canSubmit = false }: ToolbarProps) {
  const { currentTool, setCurrentTool, cancelPathDrawing, currentSession } = useGameStore();

  const handleToolClick = (tool: ToolType) => {
    if (tool === 'reset') {
      cancelPathDrawing();
      return;
    }
    setCurrentTool(tool);
  };

  const targetPoints = currentSession?.surveyPoints.filter((p) => p.isTarget) || [];
  const measuredCount = targetPoints.filter((p) => p.measured).length;

  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg border border-[#0F3460]/10">
      <div className="text-xs font-semibold text-[#0F3460]/60 uppercase tracking-wider mb-2">
        测绘工具
      </div>
      <div className="flex flex-col gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.type;
          return (
            <button
              key={tool.type}
              onClick={() => handleToolClick(tool.type)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:bg-[#0F3460]/5 active:scale-[0.98]',
                isActive
                  ? 'bg-[#0F3460] text-white shadow-md hover:bg-[#0F3460]/90'
                  : 'text-[#2C3E50] hover:text-[#0F3460]'
              )}
              title={tool.description}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="font-medium text-sm">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-[#0F3460]/10">
        <div className="text-xs font-semibold text-[#0F3460]/60 uppercase tracking-wider mb-3">
          任务进度
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#2C3E50]">已测目标点</span>
          <span className="text-sm font-bold text-[#0F3460]">
            {measuredCount} / {targetPoints.length}
          </span>
        </div>
        <div className="h-2 bg-[#0F3460]/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0F3460] to-[#16C79A] rounded-full transition-all duration-500"
            style={{
              width: `${targetPoints.length > 0 ? (measuredCount / targetPoints.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300',
            canSubmit
              ? 'bg-gradient-to-r from-[#0F3460] to-[#1a4a8a] text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-[#0F3460]/20 text-[#0F3460]/50 cursor-not-allowed'
          )}
        >
          <span>提交测绘结果</span>
          <ArrowRight size={18} />
        </button>
      )}
    </div>
  );
}
