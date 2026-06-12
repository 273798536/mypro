import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { CadElement, Point } from '@/types';

interface CadCanvasProps {
  width?: number;
  height?: number;
}

export default function CadCanvas({ width = 800, height = 500 }: CadCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const {
    layers,
    viewState,
    setViewState,
    collisions,
    selectedCollisionId,
    selectCollision,
  } = useAppStore();

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.3, Math.min(3, viewState.scale * delta));

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - width / 2) / viewState.scale + viewState.centerX;
      const worldY = (mouseY - height / 2) / viewState.scale + viewState.centerY;

      const newCenterX = worldX - (mouseX - width / 2) / newScale;
      const newCenterY = worldY - (mouseY - height / 2) / newScale;

      setViewState({
        scale: newScale,
        centerX: newCenterX,
        centerY: newCenterY,
      });
    },
    [viewState.scale, viewState.centerX, viewState.centerY, width, height, setViewState],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setViewState({
      centerX: viewState.centerX - dx / viewState.scale,
      centerY: viewState.centerY - dy / viewState.scale,
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const worldToScreen = (x: number, y: number) => ({
    x: (x - viewState.centerX) * viewState.scale + width / 2,
    y: (y - viewState.centerY) * viewState.scale + height / 2,
  });

  const renderElement = (element: CadElement, color: string, opacity: number) => {
    const screenPoints = element.points.map((p) => worldToScreen(p.x, p.y));

    switch (element.type) {
      case 'line':
        const pathD = screenPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        return (
          <g key={element.id}>
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2 / viewState.scale}
              opacity={opacity}
              vectorEffect="non-scaling-stroke"
            />
            {element.label && (
              <text
                x={screenPoints[0].x}
                y={screenPoints[0].y - 10}
                fill={color}
                fontSize={12}
                opacity={opacity}
                style={{ fontSize: '11px', userSelect: 'none' }}
              >
                {element.label}
              </text>
            )}
          </g>
        );

      case 'rect':
      case 'polygon':
        const polyPoints = screenPoints.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <g key={element.id}>
            <polygon
              points={polyPoints}
              fill={color}
              fillOpacity={opacity * 0.3}
              stroke={color}
              strokeWidth={2 / viewState.scale}
              opacity={opacity}
              vectorEffect="non-scaling-stroke"
            />
            {element.label && (
              <text
                x={(screenPoints[0].x + screenPoints[2].x) / 2}
                y={(screenPoints[0].y + screenPoints[2].y) / 2}
                fill="#fff"
                fontSize={11}
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={opacity}
                style={{ fontSize: '10px', userSelect: 'none' }}
              >
                {element.label}
              </text>
            )}
          </g>
        );

      case 'circle':
        return (
          <g key={element.id}>
            <circle
              cx={screenPoints[0].x}
              cy={screenPoints[0].y}
              r={8 / viewState.scale}
              fill={color}
              fillOpacity={opacity * 0.5}
              stroke={color}
              strokeWidth={1.5 / viewState.scale}
              opacity={opacity}
            />
            {element.label && (
              <text
                x={screenPoints[0].x}
                y={screenPoints[0].y + 20}
                fill={color}
                fontSize={10}
                textAnchor="middle"
                opacity={opacity}
                style={{ fontSize: '10px', userSelect: 'none' }}
              >
                {element.label}
              </text>
            )}
          </g>
        );

      default:
        return null;
    }
  };

  const renderCollisionPoints = () => {
    return collisions.map((c) => {
      if (c.isRevoked) return null;
      const pos = worldToScreen(c.x, c.y);
      const isSelected = selectedCollisionId === c.id;
      const color =
        c.severity === 'critical'
          ? '#e74c3c'
          : c.severity === 'warning'
            ? '#f39c12'
            : '#3498db';

      return (
        <g
          key={c.id}
          onClick={(e) => {
            e.stopPropagation();
            selectCollision(isSelected ? null : c.id);
          }}
          style={{ cursor: 'pointer' }}
        >
          {isSelected && (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={20 / viewState.scale}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              opacity={0.8}
              className="animate-pulse"
            />
          )}
          <circle
            cx={pos.x}
            cy={pos.y}
            r={12 / viewState.scale}
            fill={color}
            opacity={0.9}
          />
          <circle
            cx={pos.x}
            cy={pos.y}
            r={6 / viewState.scale}
            fill="#fff"
          />
        </g>
      );
    });
  };

  const renderGrid = () => {
    const gridSize = 50;
    const lines = [];
    const startX = Math.floor((viewState.centerX - width / 2 / viewState.scale) / gridSize) * gridSize;
    const endX = viewState.centerX + width / 2 / viewState.scale;
    const startY = Math.floor((viewState.centerY - height / 2 / viewState.scale) / gridSize) * gridSize;
    const endY = viewState.centerY + height / 2 / viewState.scale;

    for (let x = startX; x < endX; x += gridSize) {
      const screenX = (x - viewState.centerX) * viewState.scale + width / 2;
      lines.push(
        <line
          key={`v-${x}`}
          x1={screenX}
          y1={0}
          x2={screenX}
          y2={height}
          stroke="#2c3e50"
          strokeWidth={0.5}
          opacity={0.3}
        />,
      );
    }

    for (let y = startY; y < endY; y += gridSize) {
      const screenY = (y - viewState.centerY) * viewState.scale + height / 2;
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={screenY}
          x2={width}
          y2={screenY}
          stroke="#2c3e50"
          strokeWidth={0.5}
          opacity={0.3}
        />,
      );
    }

    return lines;
  };

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderGrid()}

        {layers
          .filter((l) => l.visible)
          .map((layer) => (
            <g key={layer.id}>
              {layer.elements.map((el) =>
                renderElement(el, layer.color, layer.opacity),
              )}
            </g>
          ))}

        {renderCollisionPoints()}
      </svg>

      <div className="absolute bottom-3 left-3 flex gap-2">
        <button
          onClick={() => setViewState({ scale: Math.min(3, viewState.scale * 1.3) })}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center text-lg border border-slate-600 transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setViewState({ scale: Math.max(0.3, viewState.scale * 0.7) })}
          className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center text-lg border border-slate-600 transition-colors"
        >
          −
        </button>
        <button
          onClick={() =>
            setViewState({ scale: 1, centerX: 550, centerY: 320 })
          }
          className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs border border-slate-600 transition-colors"
        >
          重置视图
        </button>
      </div>

      <div className="absolute top-3 right-3 bg-slate-800/90 text-slate-300 text-xs px-2 py-1 rounded border border-slate-600 font-mono">
        缩放: {(viewState.scale * 100).toFixed(0)}%
      </div>

      <div className="absolute top-3 left-3 bg-slate-800/90 text-slate-300 text-xs px-2 py-1 rounded border border-slate-600">
        鼠标拖拽平移 · 滚轮缩放 · 点击碰撞点选中
      </div>
    </div>
  );
}
