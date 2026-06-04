import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { snapToGrid, generateId } from '../utils';
import { Annotation, AnomalyType } from '../types';

export default function GridCanvas() {
  const {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    gridSize,
    snapToGrid: snapEnabled,
    setSnapToGrid,
    setGridSize,
    layers,
  } = useApp();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<AnomalyType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getMousePosition = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    if (snapEnabled) {
      x = snapToGrid(x, gridSize);
      y = snapToGrid(y, gridSize);
    }
    return { x, y };
  }, [snapEnabled, gridSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePosition(e);

    if (selectedAnnotation) {
      const ann = annotations.find(a => a.id === selectedAnnotation);
      if (ann) {
        const inX = pos.x >= ann.x && pos.x <= ann.x + ann.width;
        const inY = pos.y >= ann.y && pos.y <= ann.y + ann.height;
        if (inX && inY) {
          setIsDragging(true);
          setDragOffset({ x: pos.x - ann.x, y: pos.y - ann.y });
          return;
        }
      }
    }

    if (selectedTool) {
      setIsDrawing(true);
      setDrawingStart(pos);
      setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }

    setSelectedAnnotation(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePosition(e);

    if (isDragging && selectedAnnotation) {
      const ann = annotations.find(a => a.id === selectedAnnotation);
      if (ann) {
        let newX = pos.x - dragOffset.x;
        let newY = pos.y - dragOffset.y;
        if (snapEnabled) {
          newX = snapToGrid(newX, gridSize);
          newY = snapToGrid(newY, gridSize);
        }
        updateAnnotation(selectedAnnotation, { x: newX, y: newY });
      }
      return;
    }

    if (isDrawing && drawingStart) {
      let width = pos.x - drawingStart.x;
      let height = pos.y - drawingStart.y;
      
      let x = drawingStart.x;
      let y = drawingStart.y;
      
      if (width < 0) {
        x = pos.x;
        width = Math.abs(width);
      }
      if (height < 0) {
        y = pos.y;
        height = Math.abs(height);
      }

      setCurrentRect({ x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.width > 10 && currentRect.height > 10 && selectedTool) {
      const newAnnotation: Annotation = {
        id: generateId(),
        ...currentRect,
        type: selectedTool,
        label: selectedTool,
        color: '#ef4444',
        layerId: layers.find(l => l.type === 'annotation')?.id || '',
      };
      addAnnotation(newAnnotation);
    }

    setIsDrawing(false);
    setIsDragging(false);
    setDrawingStart(null);
    setCurrentRect(null);
  };

  const handleAnnotationClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedAnnotation(id);
    setSelectedTool(null);
  };

  const handleDeleteSelected = () => {
    if (selectedAnnotation) {
      deleteAnnotation(selectedAnnotation);
      setSelectedAnnotation(null);
    }
  };

  const toolOptions: { type: AnomalyType; label: string; color: string }[] = [
    { type: 'missing_material', label: '素材缺失', color: '#ef4444' },
    { type: 'color_mismatch', label: '颜色不符', color: '#f97316' },
    { type: 'connection_error', label: '连接错误', color: '#eab308' },
    { type: 'label_missing', label: '标签缺失', color: '#8b5cf6' },
    { type: 'safety_hazard', label: '安全隐患', color: '#dc2626' },
  ];

  const visibleAnnotations = annotations.filter(a => {
    const layer = layers.find(l => l.id === a.layerId);
    return layer?.visible ?? true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 bg-white border-b flex items-center gap-4">
        <span className="text-sm text-gray-600">标注工具:</span>
        <div className="flex items-center gap-2">
          {toolOptions.map(tool => (
            <button
              key={tool.type}
              onClick={() => {
                setSelectedTool(selectedTool === tool.type ? null : tool.type);
                setSelectedAnnotation(null);
              }}
              className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                selectedTool === tool.type
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            className="rounded"
          />
          网格吸附
        </label>

        <select
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
          className="px-2 py-1 text-sm border rounded"
        >
          <option value={10}>10px</option>
          <option value={20}>20px</option>
          <option value={40}>40px</option>
        </select>

        {selectedAnnotation && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              删除选中
            </button>
          </>
        )}
      </div>

      <div
        ref={canvasRef}
        className="flex-1 grid-canvas relative overflow-auto cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {visibleAnnotations.map(ann => (
          <div
            key={ann.id}
            onClick={(e) => handleAnnotationClick(e, ann.id)}
            className={`absolute border-2 cursor-move transition-shadow ${
              selectedAnnotation === ann.id
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-red-500 hover:shadow'
            }`}
            style={{
              left: ann.x,
              top: ann.y,
              width: ann.width,
              height: ann.height,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
            }}
          >
            <span
              className="absolute -top-6 left-0 px-2 py-0.5 text-xs text-white rounded"
              style={{ backgroundColor: ann.color }}
            >
              {ann.label}
            </span>
          </div>
        ))}

        {currentRect && (
          <div
            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
            style={{
              left: currentRect.x,
              top: currentRect.y,
              width: currentRect.width,
              height: currentRect.height,
            }}
          />
        )}

        {visibleAnnotations.length === 0 && !selectedTool && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg">选择标注工具开始标注</p>
              <p className="text-sm mt-1">支持网格吸附，可精确对齐</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
