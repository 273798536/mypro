import { MousePointer2, PenTool, Circle, Trash2, Undo2, Info } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useSelectionStore } from '@/store/useSelectionStore';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/types';

interface ToolPanelProps {
  sampleName?: string;
  manualNote?: string;
}

const tools: { type: ToolType; label: string; icon: typeof MousePointer2 }[] = [
  { type: 'none', label: '平移', icon: MousePointer2 },
  { type: 'polygon', label: '多边形', icon: PenTool },
  { type: 'circle', label: '圆形', icon: Circle }
];

export function ToolPanel({ sampleName, manualNote }: ToolPanelProps) {
  const { tool, setTool, currentPoints, isDrawing, setCurrentPoints, setIsDrawing } = useCanvasStore();
  const { selections, clearSelections, removeSelection, currentSelectionId, setCurrentSelectionId } = useSelectionStore();

  const handleToolSelect = (toolType: ToolType) => {
    if (isDrawing) {
      setIsDrawing(false);
      setCurrentPoints([]);
    }
    setTool(toolType);
  };

  const handleUndo = () => {
    if (currentPoints.length > 0) {
      setCurrentPoints(currentPoints.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清除所有圈选吗？')) {
      clearSelections();
      setCurrentPoints([]);
      setIsDrawing(false);
    }
  };

  return (
    <div className="w-72 bg-white border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-800 mb-3">工具面板</h3>
        
        <div className="grid grid-cols-3 gap-2">
          {tools.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => handleToolSelect(type)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg transition-all',
                tool === type
                  ? 'bg-[#2D5A27] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleUndo}
            disabled={currentPoints.length === 0}
            className="flex-1 flex items-center justify-center gap-1 p-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-4 h-4" />
            撤销
          </button>
          <button
            onClick={handleClearAll}
            disabled={selections.length === 0 && currentPoints.length === 0}
            className="flex-1 flex items-center justify-center gap-1 p-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            清除
          </button>
        </div>
      </div>

      {sampleName && (
        <div className="p-4 border-b bg-gray-50">
          <h4 className="font-medium text-gray-700 text-sm mb-2">当前样例</h4>
          <p className="text-sm text-gray-900 font-medium">{sampleName}</p>
          
          {manualNote && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-yellow-800 mb-1">人工备注</p>
                  <p className="text-xs text-yellow-700 leading-relaxed">{manualNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <h4 className="font-medium text-gray-700 text-sm mb-3">
          已完成圈选 ({selections.length})
        </h4>
        
        {selections.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无圈选记录</p>
        ) : (
          <div className="space-y-2">
            {selections.map((selection, index) => (
              <div
                key={selection.id}
                onClick={() => setCurrentSelectionId(selection.id)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  currentSelectionId === selection.id
                    ? 'border-[#2D5A27] bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">圈选 #{index + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelection(selection.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selection.color }}
                  />
                  <span className="text-xs text-gray-500">
                    {selection.points.length} 个点
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selection.isOutOfBounds && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                      颜色越界
                    </span>
                  )}
                  {selection.isColliding && (
                    <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                      边界碰撞
                    </span>
                  )}
                  {!selection.isOutOfBounds && !selection.isColliding && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      正常
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDrawing && (
        <div className="p-4 border-t bg-blue-50">
          <p className="text-sm text-blue-700">
            <span className="font-medium">绘制中...</span>
            <br />
            <span className="text-xs">
              点击添加顶点，双击完成多边形
            </span>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            当前点数: {currentPoints.length}
          </p>
        </div>
      )}

      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500">
          <span className="font-medium">操作提示:</span><br />
          • 选择多边形工具后点击添加顶点<br />
          • 双击完成当前圈选<br />
          • 按住 Alt + 拖动可平移视图<br />
          • 滚轮可缩放图像
        </p>
      </div>
    </div>
  );
}
