import { useState } from 'react';
import { GridCell } from '../types';

interface EditorCanvasProps {
  grid: GridCell[][];
  selectedTool: 'wall' | 'path' | 'start' | 'end' | 'item' | 'obstacle' | 'erase';
  onCellClick: (row: number, col: number) => void;
  onAnnotate?: (row: number, col: number, note: string, tag: 'none' | 'missing' | 'fixed') => void;
}

const getCellContent = (cell: GridCell): string => {
  if (cell.content) return cell.content;

  switch (cell.type) {
    case 'wall': return '🧱';
    case 'path': return '✅';
    case 'start': return '🚶';
    case 'end': return '🏁';
    case 'item': return '⭐';
    case 'obstacle': return '⚠️';
    default: return '';
  }
};

const getCellStyle = (cell: GridCell) => {
  let base = '';
  switch (cell.type) {
    case 'wall': base = 'bg-gray-600 border-gray-700 text-white'; break;
    case 'path': base = 'bg-green-200 border-green-400'; break;
    case 'start': base = 'bg-blue-300 border-blue-500'; break;
    case 'end': base = 'bg-yellow-300 border-yellow-500'; break;
    case 'item': base = 'bg-purple-200 border-purple-400'; break;
    case 'obstacle': base = 'bg-red-200 border-red-400'; break;
    default:
      if (cell.anomalyTag === 'missing') {
        base = 'bg-red-50 border-red-300 border-dashed';
      } else {
        base = 'bg-white border-gray-300';
      }
  }
  if (cell.anomalyTag === 'missing' && cell.type !== 'empty') {
    base += ' ring-2 ring-red-400';
  }
  if (cell.anomalyTag === 'fixed') {
    base += ' ring-2 ring-green-400';
  }
  if (cell.layer > 0 && cell.type !== 'empty') {
    base += ' shadow-md';
  }
  return base;
};

export const EditorCanvas = ({ grid, selectedTool, onCellClick, onAnnotate }: EditorCanvasProps) => {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [annotateText, setAnnotateText] = useState('');
  const [annotateTag, setAnnotateTag] = useState<'none' | 'missing' | 'fixed'>('none');

  const handleCellClick = (row: number, col: number) => {
    onCellClick(row, col);
  };

  const handleCellRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    setSelectedCell({ row, col });
    const cell = grid[row][col];
    setAnnotateText(cell.note || '');
    setAnnotateTag(cell.anomalyTag || 'none');
    setShowAnnotate(true);
  };

  const handleSaveAnnotation = () => {
    if (selectedCell && onAnnotate) {
      onAnnotate(selectedCell.row, selectedCell.col, annotateText, annotateTag);
    }
    setShowAnnotate(false);
    setSelectedCell(null);
    setAnnotateText('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="mb-3 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
        <span>💡 左键 = 绘制，右键 = 加批注/标异常</span>
        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">红边虚线 = 漏填</span>
        <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-200">绿圈 = 已修正</span>
        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-200">阴影 = 上层素材</span>
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 8}, minmax(0, 1fr))` }}>
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-lg sm:text-xl border-2 rounded-md grid-cell cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all relative group ${getCellStyle(cell)}`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              onContextMenu={(e) => handleCellRightClick(e, rowIndex, colIndex)}
              title={
                `位置: (${rowIndex}, ${colIndex})\n` +
                `类型: ${cell.type}\n` +
                `图层: 第${cell.layer}层\n` +
                (cell.note ? `备注: ${cell.note}\n` : '') +
                (cell.anomalyTag === 'missing' ? '⚠️ 标记为漏填' : cell.anomalyTag === 'fixed' ? '✅ 已修正' : '')
              }
            >
              {getCellContent(cell)}
              {cell.note && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  📝
                </span>
              )}
              {cell.anomalyTag === 'missing' && (
                <span className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  ?
                </span>
              )}
              {cell.layer > 0 && cell.type !== 'empty' && (
                <span className="absolute -top-1 -left-1 w-4 h-4 bg-purple-500 text-white text-[9px] rounded-full flex items-center justify-center">
                  L{cell.layer}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          当前工具:
          <span className="font-bold ml-2">
            {selectedTool === 'wall' && '🧱 墙壁'}
            {selectedTool === 'path' && '✅ 路径'}
            {selectedTool === 'start' && '🚶 起点'}
            {selectedTool === 'end' && '🏁 终点'}
            {selectedTool === 'item' && '⭐ 道具'}
            {selectedTool === 'obstacle' && '⚠️ 障碍物'}
            {selectedTool === 'erase' && '🗑️ 擦除'}
          </span>
        </div>
      </div>

      {showAnnotate && selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              📝 标注单元格 ({selectedCell.row}, {selectedCell.col})
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">备注说明</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none"
                rows={3}
                placeholder="比如：学生漏填、老师已批改、这里应该是墙..."
                value={annotateText}
                onChange={(e) => setAnnotateText(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">异常标记</label>
              <div className="flex gap-2">
                {[
                  { value: 'none' as const, label: '无', icon: '➖', color: 'bg-gray-100' },
                  { value: 'missing' as const, label: '漏填/异常', icon: '❓', color: 'bg-red-100 text-red-700' },
                  { value: 'fixed' as const, label: '已修正', icon: '✅', color: 'bg-green-100 text-green-700' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                      annotateTag === opt.value
                        ? `${opt.color} border-primary-400 ring-2 ring-primary-300`
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setAnnotateTag(opt.value)}
                  >
                    <span className="mr-1">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => {
                  setShowAnnotate(false);
                  setSelectedCell(null);
                }}
              >
                取消
              </button>
              <button
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                onClick={handleSaveAnnotation}
              >
                保存标注
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
