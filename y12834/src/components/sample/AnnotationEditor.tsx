import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Square,
  Trash2,
  Bot,
  MousePointer2,
  User,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { ImageAnnotation, PathologyNote } from '@/types';
import { Badge } from '@/components/ui/Badge';

/**
 * 标注编辑器组件属性接口
 */
interface AnnotationEditorProps {
  /** 版本ID */
  versionId: string;
  /** 标注列表 */
  annotations: ImageAnnotation[];
  /** 病理备注列表（用于关联选择） */
  pathologyNotes?: PathologyNote[];
  /** 添加标注回调 */
  onAddAnnotation: (annotation: Omit<ImageAnnotation, 'id' | 'created_at'>) => void;
  /** 更新标注回调 */
  onUpdateAnnotation: (id: string, updates: Partial<ImageAnnotation>) => void;
  /** 删除标注回调 */
  onDeleteAnnotation: (id: string) => void;
}

/**
 * 可用标注标签（示例数据）
 */
const AVAILABLE_LABELS = [
  '肝肿大',
  '脾坏死',
  '肾囊肿',
  '肠道炎症',
  '鳃丝增生',
  '心肌病变',
];

/**
 * 工具类型
 */
type Tool = 'select' | 'rectangle';

/**
 * 标注编辑器组件
 * 包含画布区域、左侧工具栏和右侧属性面板
 */
export function AnnotationEditor({
  versionId,
  annotations,
  pathologyNotes = [],
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: AnnotationEditorProps) {
  /** 当前工具 */
  const [tool, setTool] = useState<Tool>('select');
  /** AI 自动标注开关 */
  const [aiAutoAnnotate, setAiAutoAnnotate] = useState(false);
  /** 选中的标注ID */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 画布容器引用 */
  const canvasRef = useRef<HTMLDivElement>(null);
  /** 是否正在绘制 */
  const [isDrawing, setIsDrawing] = useState(false);
  /** 绘制起点 */
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  /** 绘制当前点 */
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  /** 是否正在拖动 */
  const [isDragging, setIsDragging] = useState(false);
  /** 拖动偏移量 */
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /** 选中的标注数据 */
  const selectedAnnotation = annotations.find((a) => a.id === selectedId);

  /**
   * 获取画布相对坐标
   */
  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  }, []);

  /**
   * 鼠标按下事件
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (tool === 'rectangle') {
      setIsDrawing(true);
      setDrawStart(coords);
      setDrawEnd(coords);
      setSelectedId(null);
    } else if (tool === 'select') {
      const target = e.target as SVGElement;
      const annotationId = target.getAttribute('data-annotation-id');
      if (annotationId) {
        setSelectedId(annotationId);
        const ann = annotations.find((a) => a.id === annotationId);
        if (ann) {
          setIsDragging(true);
          dragOffsetRef.current = {
            x: coords.x - ann.x,
            y: coords.y - ann.y,
          };
        }
      } else {
        setSelectedId(null);
      }
    }
  };

  /**
   * 鼠标移动事件
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (isDrawing) {
      setDrawEnd(coords);
    } else if (isDragging && selectedId) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (ann) {
        const newX = Math.max(0, coords.x - dragOffsetRef.current.x);
        const newY = Math.max(0, coords.y - dragOffsetRef.current.y);
        onUpdateAnnotation(selectedId, { x: newX, y: newY });
      }
    }
  };

  /**
   * 鼠标释放事件
   */
  const handleMouseUp = () => {
    if (isDrawing && drawStart && drawEnd) {
      const x = Math.min(drawStart.x, drawEnd.x);
      const y = Math.min(drawStart.y, drawEnd.y);
      const width = Math.abs(drawEnd.x - drawStart.x);
      const height = Math.abs(drawEnd.y - drawStart.y);

      if (width > 10 && height > 10) {
        onAddAnnotation({
          version_id: versionId,
          x,
          y,
          width,
          height,
          label: '未分类',
          confidence: 1.0,
          source: 'human',
        });
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
    setIsDragging(false);
  };

  /**
   * 键盘事件 - Delete 删除选中标注
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        onDeleteAnnotation(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onDeleteAnnotation]);

  /**
   * 获取绘制中的矩形
   */
  const getDrawingRect = () => {
    if (!drawStart || !drawEnd) return null;
    return {
      x: Math.min(drawStart.x, drawEnd.x),
      y: Math.min(drawStart.y, drawEnd.y),
      width: Math.abs(drawEnd.x - drawStart.x),
      height: Math.abs(drawEnd.y - drawStart.y),
    };
  };

  const drawingRect = getDrawingRect();

  return (
    <div className="flex h-full bg-paper rounded-lg border border-deep-ocean/5 overflow-hidden">
      {/* 左侧工具栏 */}
      <div className="w-14 bg-white border-r border-deep-ocean/10 flex flex-col items-center py-3 gap-2">
        {/* 选择工具 */}
        <button
          onClick={() => setTool('select')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            tool === 'select'
              ? 'bg-deep-ocean text-paper'
              : 'bg-paper text-deep-ocean/60 hover:bg-paper-dark hover:text-deep-ocean'
          }`}
          title="选择工具 (V)"
        >
          <MousePointer2 size={20} />
        </button>

        {/* 矩形工具 */}
        <button
          onClick={() => setTool('rectangle')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            tool === 'rectangle'
              ? 'bg-deep-ocean text-paper'
              : 'bg-paper text-deep-ocean/60 hover:bg-paper-dark hover:text-deep-ocean'
          }`}
          title="矩形标注 (R)"
        >
          <Square size={20} />
        </button>

        <div className="w-8 h-px bg-deep-ocean/10 my-1" />

        {/* 删除工具 */}
        <button
          onClick={() => {
            if (selectedId) {
              onDeleteAnnotation(selectedId);
              setSelectedId(null);
            }
          }}
          disabled={!selectedId}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            selectedId
              ? 'bg-corral-severe/10 text-corral-severe hover:bg-corral-severe/20'
              : 'bg-paper text-deep-ocean/20 cursor-not-allowed'
          }`}
          title="删除标注 (Del)"
        >
          <Trash2 size={20} />
        </button>

        <div className="w-8 h-px bg-deep-ocean/10 my-1" />

        {/* AI 自动标注开关 */}
        <button
          onClick={() => setAiAutoAnnotate(!aiAutoAnnotate)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all relative ${
            aiAutoAnnotate
              ? 'bg-life-green text-paper'
              : 'bg-paper text-deep-ocean/60 hover:bg-paper-dark hover:text-deep-ocean'
          }`}
          title="AI 自动标注"
        >
          <Bot size={20} />
          {aiAutoAnnotate && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-life-green rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>

      {/* 中间画布区域 */}
      <div className="flex-1 flex flex-col">
        {/* 画布顶部信息栏 */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-deep-ocean/10">
          <div className="flex items-center gap-2">
            <span className="text-sm text-deep-ocean/60">
              标注数量:
            </span>
            <Badge variant="info">{annotations.length}</Badge>
            {aiAutoAnnotate && (
              <Badge variant="success">
                <span className="flex items-center gap-1">
                  <Sparkles size={12} />
                  AI 模式
                </span>
              </Badge>
            )}
          </div>
          <div className="text-xs text-deep-ocean/40">
            {tool === 'rectangle'
              ? '拖拽绘制矩形标注'
              : selectedId
              ? '拖动标注调整位置，Del 删除'
              : '点击选择标注'}
          </div>
        </div>

        {/* 画布主体 */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 relative bg-gradient-to-br from-paper to-paper-dark overflow-hidden ${
            tool === 'rectangle' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ minHeight: '400px' }}
        >
          {/* 模拟样本图片占位 */}
          <div className="absolute inset-0 flex items-center justify-center text-deep-ocean/20">
            <div className="text-center">
              <Square size={64} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">样本图片预览区域</p>
            </div>
          </div>

          {/* SVG 标注层 */}
          <svg className="absolute inset-0 w-full h-full">
            {/* 已有标注 */}
            {annotations.map((ann) => {
              const isSelected = ann.id === selectedId;
              return (
                <g key={ann.id}>
                  {/* 标注矩形 */}
                  <rect
                    data-annotation-id={ann.id}
                    x={ann.x}
                    y={ann.y}
                    width={ann.width}
                    height={ann.height}
                    fill={isSelected ? 'rgba(45, 90, 74, 0.15)' : 'rgba(30, 58, 95, 0.08)'}
                    stroke={
                      isSelected
                        ? '#2d5a4a'
                        : ann.source === 'ai'
                        ? '#d4a017'
                        : '#1e3a5f'
                    }
                    strokeWidth={isSelected ? 2.5 : 2}
                    strokeDasharray={ann.source === 'ai' ? '4 2' : 'none'}
                    className="cursor-move"
                    style={{ transition: 'all 0.15s' }}
                  />
                  {/* 标签背景 */}
                  <rect
                    data-annotation-id={ann.id}
                    x={ann.x}
                    y={ann.y - 22}
                    width={ann.label.length * 12 + 40}
                    height={20}
                    rx={4}
                    fill={
                      isSelected
                        ? '#2d5a4a'
                        : ann.source === 'ai'
                        ? '#d4a017'
                        : '#1e3a5f'
                    }
                    className="cursor-move"
                  />
                  {/* 标签文本 */}
                  <text
                    data-annotation-id={ann.id}
                    x={ann.x + 6}
                    y={ann.y - 7}
                    fill="white"
                    fontSize="11"
                    fontWeight="500"
                    className="cursor-move select-none"
                  >
                    {ann.label} {(ann.confidence * 100).toFixed(0)}%
                  </text>
                  {/* 来源标识 */}
                  <circle
                    data-annotation-id={ann.id}
                    cx={ann.x + ann.label.length * 12 + 30}
                    cy={ann.y - 12}
                    r={5}
                    fill="white"
                    className="cursor-move"
                  />
                </g>
              );
            })}

            {/* 绘制中的矩形 */}
            {drawingRect && (
              <rect
                x={drawingRect.x}
                y={drawingRect.y}
                width={drawingRect.width}
                height={drawingRect.height}
                fill="rgba(45, 90, 74, 0.1)"
                stroke="#2d5a4a"
                strokeWidth={2}
                strokeDasharray="5 3"
              />
            )}
          </svg>
        </div>
      </div>

      {/* 右侧属性面板 */}
      <div className="w-64 bg-white border-l border-deep-ocean/10 flex flex-col">
        <div className="px-4 py-3 border-b border-deep-ocean/10">
          <h3 className="text-sm font-semibold text-deep-ocean font-serif">
            标注属性
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {selectedAnnotation ? (
            <div className="space-y-4">
              {/* 标签 */}
              <div>
                <label className="block text-xs text-deep-ocean/60 mb-1.5">
                  标签
                </label>
                <select
                  value={selectedAnnotation.label}
                  onChange={(e) =>
                    onUpdateAnnotation(selectedAnnotation.id, {
                      label: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all"
                >
                  <option value="未分类">未分类</option>
                  {AVAILABLE_LABELS.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 置信度 */}
              <div>
                <label className="block text-xs text-deep-ocean/60 mb-1.5">
                  置信度: {(selectedAnnotation.confidence * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedAnnotation.confidence * 100}
                  onChange={(e) =>
                    onUpdateAnnotation(selectedAnnotation.id, {
                      confidence: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-life-green"
                />
              </div>

              {/* 来源 */}
              <div>
                <label className="block text-xs text-deep-ocean/60 mb-1.5">
                  来源
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onUpdateAnnotation(selectedAnnotation.id, {
                        source: 'ai',
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium transition-all ${
                      selectedAnnotation.source === 'ai'
                        ? 'bg-amber-warn/15 text-amber-warn border border-amber-warn/30'
                        : 'bg-paper text-deep-ocean/60 border border-deep-ocean/10 hover:bg-paper-dark'
                    }`}
                  >
                    <Bot size={14} />
                    AI
                  </button>
                  <button
                    onClick={() =>
                      onUpdateAnnotation(selectedAnnotation.id, {
                        source: 'human',
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium transition-all ${
                      selectedAnnotation.source === 'human'
                        ? 'bg-life-green/15 text-life-green border border-life-green/30'
                        : 'bg-paper text-deep-ocean/60 border border-deep-ocean/10 hover:bg-paper-dark'
                    }`}
                  >
                    <User size={14} />
                    人工
                  </button>
                </div>
              </div>

              {/* 关联病理备注 */}
              <div>
                <label className="block text-xs text-deep-ocean/60 mb-1.5 flex items-center gap-1">
                  <FileText size={12} />
                  关联病理备注
                </label>
                <select
                  value=""
                  className="w-full px-3 py-2 bg-paper border border-deep-ocean/15 rounded text-sm text-deep-ocean focus:outline-none focus:border-deep-ocean/40 transition-all"
                >
                  <option value="">未关联备注</option>
                  {pathologyNotes
                    .filter((n) => n.version_id === versionId)
                    .map((note) => (
                      <option key={note.id} value={note.id}>
                        {note.content.slice(0, 20)}...
                      </option>
                    ))}
                </select>
              </div>

              {/* 位置和尺寸 */}
              <div className="pt-3 border-t border-deep-ocean/10">
                <label className="block text-xs text-deep-ocean/60 mb-2">
                  位置和尺寸
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-deep-ocean/40">X</span>
                    <input
                      type="number"
                      value={Math.round(selectedAnnotation.x)}
                      onChange={(e) =>
                        onUpdateAnnotation(selectedAnnotation.id, {
                          x: Number(e.target.value),
                        })
                      }
                      className="w-full mt-0.5 px-2 py-1 bg-paper border border-deep-ocean/15 rounded text-xs text-deep-ocean tabular focus:outline-none focus:border-deep-ocean/40"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-deep-ocean/40">Y</span>
                    <input
                      type="number"
                      value={Math.round(selectedAnnotation.y)}
                      onChange={(e) =>
                        onUpdateAnnotation(selectedAnnotation.id, {
                          y: Number(e.target.value),
                        })
                      }
                      className="w-full mt-0.5 px-2 py-1 bg-paper border border-deep-ocean/15 rounded text-xs text-deep-ocean tabular focus:outline-none focus:border-deep-ocean/40"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-deep-ocean/40">宽</span>
                    <input
                      type="number"
                      value={Math.round(selectedAnnotation.width)}
                      onChange={(e) =>
                        onUpdateAnnotation(selectedAnnotation.id, {
                          width: Number(e.target.value),
                        })
                      }
                      className="w-full mt-0.5 px-2 py-1 bg-paper border border-deep-ocean/15 rounded text-xs text-deep-ocean tabular focus:outline-none focus:border-deep-ocean/40"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-deep-ocean/40">高</span>
                    <input
                      type="number"
                      value={Math.round(selectedAnnotation.height)}
                      onChange={(e) =>
                        onUpdateAnnotation(selectedAnnotation.id, {
                          height: Number(e.target.value),
                        })
                      }
                      className="w-full mt-0.5 px-2 py-1 bg-paper border border-deep-ocean/15 rounded text-xs text-deep-ocean tabular focus:outline-none focus:border-deep-ocean/40"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-deep-ocean/40">
              <Square size={32} className="mb-2 opacity-30" />
              <p className="text-sm">选择一个标注</p>
              <p className="text-xs mt-1">查看和编辑属性</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
