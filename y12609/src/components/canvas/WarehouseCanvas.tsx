import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { formatPoints } from '@/utils/geometry';
import { pointInPolygon } from '@/utils/geometry';
import type { Point } from '@/types';

export function WarehouseCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    annotations,
    getCurrentSample,
    toolMode,
    isDrawing,
    currentPoints,
    zoom,
    pan,
    selectedAnnotationId,
    validationResults,
    setZoom,
    setPan,
    setIsDrawing,
    addCurrentPoint,
    finishDrawing,
    cancelDrawing,
    setSelectedAnnotationId,
    deleteAnnotation,
    setCurrentPoints
  } = useStore();

  const sample = getCurrentSample();

  const getSVGPoint = useCallback((e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  }, [zoom, pan]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!sample) return;
    const point = getSVGPoint(e);

    if (toolMode === 'draw') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([point]);
      } else {
        if (currentPoints.length >= 2) {
          const firstPoint = currentPoints[0];
          const dist = Math.sqrt(
            Math.pow(point.x - firstPoint.x, 2) +
            Math.pow(point.y - firstPoint.y, 2)
          );
          if (dist < 15) {
            finishDrawing();
            return;
          }
        }
        addCurrentPoint(point);
      }
    } else if (toolMode === 'select') {
      let clickedAnnotation = null;
      for (let i = annotations.length - 1; i >= 0; i--) {
        if (pointInPolygon(point, annotations[i].points)) {
          clickedAnnotation = annotations[i];
          break;
        }
      }
      setSelectedAnnotationId(clickedAnnotation?.id || null);
    } else if (toolMode === 'delete') {
      for (let i = annotations.length - 1; i >= 0; i--) {
        if (pointInPolygon(point, annotations[i].points)) {
          deleteAnnotation(annotations[i].id);
          break;
        }
      }
    }
  }, [toolMode, isDrawing, currentPoints, annotations, sample, getSVGPoint, setIsDrawing, setCurrentPoints, addCurrentPoint, finishDrawing, setSelectedAnnotationId, deleteAnnotation]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isDrawing) {
      cancelDrawing();
    }
  }, [isDrawing, cancelDrawing]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(zoom * delta);
  }, [zoom, setZoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (toolMode === 'pan' && e.buttons === 1) {
      setPan({
        x: pan.x + e.movementX,
        y: pan.y + e.movementY
      });
    }
  }, [toolMode, pan, setPan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) cancelDrawing();
        setSelectedAnnotationId(null);
      }
      if (e.key === 'Enter' && isDrawing && currentPoints.length >= 3) {
        finishDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, currentPoints, cancelDrawing, finishDrawing, setSelectedAnnotationId]);

  useEffect(() => {
    const state = useStore.getState();
    state.validateAll();
  }, []);

  if (!sample) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <p className="text-slate-500">请先选择一个样例</p>
      </div>
    );
  }

  const getFrequencyColor = (freq: number) => {
    if (freq >= 350) return 'bg-red-100 border-red-300 text-red-800';
    if (freq >= 200) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (freq >= 100) return 'bg-amber-100 border-amber-300 text-amber-800';
    if (freq >= 50) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair select-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8">
            <path d="M0,8 l8,-8" stroke="#991b1b" strokeWidth="1" strokeOpacity="0.6" />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <rect
            x="0"
            y="0"
            width={sample.canvasWidth}
            height={sample.canvasHeight}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {sample.warehouseLayout.map(shelf => (
            <g key={shelf.id}>
              <rect
                x={shelf.x}
                y={shelf.y}
                width={shelf.width}
                height={shelf.height}
                className={`${getFrequencyColor(shelf.pickFrequency)} border-2`}
                fill="currentColor"
                fillOpacity="0.3"
                rx="2"
              />
              <text
                x={shelf.x + shelf.width / 2}
                y={shelf.y + shelf.height / 2 + 4}
                textAnchor="middle"
                className="text-xs font-mono fill-slate-700"
              >
                {shelf.label}
              </text>
              <text
                x={shelf.x + shelf.width / 2}
                y={shelf.y + shelf.height + 14}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-500"
              >
                {shelf.pickFrequency}次
              </text>
            </g>
          ))}

          {annotations.map(annotation => {
            const results = validationResults.get(annotation.id) || [];
            const hasBlockers = results.some(r => r.blocked);
            const isSelected = selectedAnnotationId === annotation.id;
            const isDuplicate = annotation.isDuplicate;

            return (
              <g key={annotation.id}>
                <polygon
                  points={formatPoints(annotation.points)}
                  fill={annotation.color}
                  fillOpacity={hasBlockers ? 0.25 : 0.5}
                  stroke={isSelected ? '#1e40af' : annotation.color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={hasBlockers ? '6 3' : 'none'}
                  className={isDuplicate ? 'animate-pulse' : ''}
                  style={{
                    transition: 'all 0.3s ease'
                  }}
                />
                {isDuplicate && (
                  <polygon
                    points={formatPoints(annotation.points)}
                    fill="url(#hatch)"
                    fillOpacity="0.5"
                    stroke="none"
                    pointerEvents="none"
                  />
                )}
                {annotation.manualNote && (
                  <g pointerEvents="none">
                    <rect
                      x={annotation.points[0].x + 5}
                      y={annotation.points[0].y - 18}
                      width="16"
                      height="16"
                      fill="#fef3c7"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      rx="2"
                    />
                    <text
                      x={annotation.points[0].x + 13}
                      y={annotation.points[0].y - 6}
                      textAnchor="middle"
                      className="text-[10px] fill-amber-700 font-bold"
                    >
                      📝
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {isDrawing && currentPoints.length > 0 && (
            <g>
              <polygon
                points={formatPoints(currentPoints)}
                fill="#3b82f6"
                fillOpacity="0.2"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              {currentPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
        </g>
      </svg>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200">
        <span className="text-xs text-slate-600 font-mono">缩放: {Math.round(zoom * 100)}%</span>
        <span className="text-slate-300">|</span>
        <span className="text-xs text-slate-600 font-mono">
          {isDrawing ? `绘制中: ${currentPoints.length}个点` : toolMode === 'select' ? '选择模式' : toolMode === 'draw' ? '绘制模式' : toolMode === 'pan' ? '平移模式' : '删除模式'}
        </span>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-1 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200">
        <span className="text-[10px] text-slate-500">操作提示</span>
        <span className="text-[10px] text-slate-600">• 点击开始绘制多边形</span>
        <span className="text-[10px] text-slate-600">• 点击起点或按 Enter 完成</span>
        <span className="text-[10px] text-slate-600">• 右键或 ESC 取消绘制</span>
        <span className="text-[10px] text-slate-600">• 滚轮缩放 · 平移模式拖拽</span>
      </div>
    </div>
  );
}
