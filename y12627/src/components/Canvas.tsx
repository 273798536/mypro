import { useRef, useEffect, useCallback, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import type { Tank } from '@/types';

export function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);
  const [showRecoveryRipple, setShowRecoveryRipple] = useState(false);

  const {
    tanks,
    scale,
    scaleRatio,
    offsetX,
    offsetY,
    gridSize,
    snapEnabled,
    selectedTankId,
    isPanning,
    dragTankId,
    dragOffsetX,
    dragOffsetY,
    panStartX,
    panStartY,
    getTankColor,
    screenToWorld,
    setSelectedTankId,
    setIsPanning,
    setDragTank,
    setOffset,
    moveTank
  } = useCanvasStore();

  const addRipple = useCallback((x: number, y: number, color: string) => {
    const id = Math.random().toString(36).substring(2);
    setRipples(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 800);
  }, []);

  const getMousePos = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePos(e);
    const target = e.target as SVGElement;
    
    if (target.closest('.tank-group')) {
      const tankId = target.closest('.tank-group')?.getAttribute('data-tank-id');
      if (tankId) {
        const tank = tanks.find(t => t.id === tankId);
        if (tank) {
          const world = screenToWorld(pos.x, pos.y);
          setDragTank(tankId, world.x - tank.x, world.y - tank.y);
          setSelectedTankId(tankId);
        }
      }
    } else {
        setIsPanning(true, pos.x - offsetX, pos.y - offsetY);
        setSelectedTankId(null);
      }
  }, [getMousePos, tanks, screenToWorld, setDragTank, setSelectedTankId, setIsPanning, offsetX, offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const pos = getMousePos(e);
    
    if (isPanning) {
      setOffset(pos.x - panStartX, pos.y - panStartY);
    } else if (dragTankId) {
      const world = screenToWorld(pos.x, pos.y);
      const newX = world.x - dragOffsetX;
      const newY = world.y - dragOffsetY;
      moveTank(dragTankId, newX, newY);
    }
  }, [getMousePos, isPanning, dragTankId, dragOffsetX, dragOffsetY, panStartX, panStartY, setOffset, screenToWorld, moveTank]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (dragTankId) {
      setDragTank(null);
    }
  }, [isPanning, dragTankId, setIsPanning, setDragTank]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scale * delta));
    if (newScale !== scale) {
      const pos = getMousePos(e);
      const worldBefore = screenToWorld(pos.x, pos.y);
      useCanvasStore.getState().setScale(newScale);
      const worldAfter = screenToWorld(pos.x, pos.y);
      setOffset(
        offsetX + (worldAfter.x - worldBefore.x) * newScale,
        offsetY + (worldAfter.y - worldBefore.y) * newScale
      );
    }
  }, [scale, getMousePos, screenToWorld, offsetX, offsetY, setOffset]);

  const handleTankClick = useCallback((tank: Tank, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTankId(tank.id);
    if (tank.status === 'recovered') {
      addRipple(tank.x + tank.width / 2, tank.y + tank.height / 2, '#48C9B0');
    }
  }, [setSelectedTankId, addRipple]);

  useEffect(() => {
    const hasError = tanks.some(t => t.status === 'error');
    if (hasError) {
      const errorTank = tanks.find(t => t.status === 'error');
      if (errorTank) {
        addRipple(
          errorTank.x + errorTank.width / 2,
          errorTank.y + errorTank.height / 2,
          '#E74C3C'
        );
      }
    }
  }, [tanks, addRipple]);

  const hasScaleError = scaleRatio !== '1:100';

  const renderGrid = () => {
    const lines = [];
    const viewBoxWidth = 2000;
    const viewBoxHeight = 1200;
    
    for (let x = 0; x <= viewBoxWidth; x += gridSize) {
      const isMajor = x % (gridSize * 5) === 0;
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={viewBoxHeight}
          className={isMajor ? 'grid-line-major' : 'grid-line'}
        />
      );
    }
    for (let y = 0; y <= viewBoxHeight; y += gridSize) {
      const isMajor = y % (gridSize * 5) === 0;
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={viewBoxWidth}
          y2={y}
          className={isMajor ? 'grid-line-major' : 'grid-line'}
        />
      );
    }
    return lines;
  };

  const renderScaleBar = () => {
    const scaleValue = parseInt(scaleRatio.split(':')[1]) || 100;
    const barLength = 100;
    const realLength = (barLength * scaleValue) / 100;
    
    return (
      <g transform={`translate(30, 1100)`}>
        <line x1={0} y1={0} x2={barLength} y2={0} stroke="#0F4C75" strokeWidth={3} />
        <line x1={0} y1={-5} x2={0} y2={5} stroke="#0F4C75" strokeWidth={3} />
        <line x1={barLength} y1={-5} x2={barLength} y2={5} stroke="#0F4C75" strokeWidth={3} />
        <text x={barLength / 2} y={25} fill="#0F4C75" fontSize={14} fontWeight={500} textAnchor="middle">
          比例尺 {scaleRatio}（图上{barLength}px = 实际{realLength}cm
        </text>
        {hasScaleError && (
          <text x={barLength / 2} y={45} fill="#E74C3C" fontSize={12} fontWeight={600} textAnchor="middle">
          ⚠️ 比例尺错误！应为 1:100
        </text>
        )}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      className={`svg-canvas w-full h-full ${isPanning ? 'panning' : ''} ${hasScaleError ? 'error-pulse' : ''}`}
      viewBox="0 0 2000 1200"
      preserveAspectRatio="xMidYMid meet"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <pattern id="water-pattern" patternUnits="userSpaceOnUse" width="40" height="40">
          <rect width="40" height="40" fill="rgba(15, 76, 117, 0.02)" />
          <path d="M0 20 Q10 15, 20 20 T40 20" fill="none" stroke="rgba(15, 76, 117, 0.05)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="2000" height="1200" fill="url(#water-pattern)" />

      <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
        {snapEnabled && renderGrid()}
        
        {tanks.map(tank => {
          const color = getTankColor(tank);
          const isSelected = selectedTankId === tank.id;
          const isError = tank.status === 'error';
          
          return (
            <g
              key={tank.id}
              className="tank-group"
              data-tank-id={tank.id}
              onClick={(e) => handleTankClick(tank, e)}
            >
              <rect
                className={`tank-rect ${isSelected ? 'selected' : ''} ${isError ? 'error-pulse' : ''}`}
                x={tank.x}
                y={tank.y}
                width={tank.width}
                height={tank.height}
                fill={color}
                fillOpacity={0.25}
                stroke={color}
                strokeWidth={isSelected ? 4 : 2}
                rx={8}
                ry={8}
              />
              
              <text
                x={tank.x + tank.width / 2}
                y={tank.y + tank.height / 2 - 8}
                textAnchor="middle"
                fill="#0F4C75"
                fontSize={16}
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {tank.name}
              </text>
              
              <text
                x={tank.x + tank.width / 2}
                y={tank.y + tank.height / 2 + 18}
                textAnchor="middle"
                fill="#555"
                fontSize={12}
                style={{ pointerEvents: 'none' }}
              >
                {tank.width} × {tank.height} {tank.unit || '?'}
              </text>
              
              {tank.status === 'warning' && (
                <text
                  x={tank.x + tank.width - 15}
                  y={tank.y + 25}
                  fontSize={20}
                  style={{ pointerEvents: 'none' }}
                >
                  📝
                </text>
              )}
              
              {tank.status === 'error' && (
                <text
                  x={tank.x + tank.width - 15}
                  y={tank.y + 25}
                  fontSize={20}
                  style={{ pointerEvents: 'none' }}
                >
                  ⚠️
                </text>
              )}
              
              {tank.status === 'recovered' && (
                <text
                  x={tank.x + tank.width - 15}
                  y={tank.y + 25}
                  fontSize={20}
                  style={{ pointerEvents: 'none' }}
                >
                  ✅
                </text>
              )}
              
              {tank.missingUnit && (
                <text
                  x={tank.x + 15}
                  y={tank.y + 25}
                  fill="#E74C3C"
                  fontSize={12}
                  fontWeight={700}
                  style={{ pointerEvents: 'none' }}
                >
                  缺单位
                </text>
              )}
            </g>
          );
        })}

        {ripples.map(ripple => (
          <circle
            key={ripple.id}
            cx={ripple.x}
            cy={ripple.y}
            r={0}
            fill="none"
            stroke={ripple.color}
            strokeWidth={3}
            className="ripple-effect"
            opacity={0.6}
          />
        ))}

        {renderScaleBar()}
      </g>

      <g transform="translate(30, 30)">
        <rect x={0} y={0} width={200} height={60} fill="white" fillOpacity={0.9} rx={8} />
        <text x={20} y={28} fill="#0F4C75" fontSize={14} fontWeight={600}>
          缩放: {Math.round(scale * 100)}%
        </text>
        <text x={20} y={50} fill="#555" fontSize={12}>
          比例尺: <tspan fill={hasScaleError ? '#E74C3C' : '#27AE60'} fontWeight={600}>
            {scaleRatio}
          </tspan>
          {hasScaleError && ' ⚠️'}
        </text>
      </g>
    </svg>
  );
}
