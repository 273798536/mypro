import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useExperimentStore } from '@/store/experimentStore';
import { canvasToGrid, gridToCanvas, isWithinBoundary, snapToGrid } from '@/utils/grid';
import { generateFunctionPoints } from '@/utils/mathParser';
import { getLevelById } from '@/data/levels';
import { Point } from '@/types';

interface GridCanvasProps {
  width: number;
  height: number;
}

export const GridCanvas: React.FC<GridCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  
  const {
    currentLevelId,
    annotations,
    currentPoints,
    isDrawing,
    selectedColor,
    currentTool,
    boundaryFailed,
    boundaryFailAnimation,
    startDrawing,
    addPoint,
    finishDrawing,
    cancelDrawing,
    setBoundaryFailed,
    setBoundaryFailAnimation
  } = useExperimentStore();

  const currentLevel = currentLevelId ? getLevelById(currentLevelId) : null;
  const gridSize = currentLevel?.gridSize || 20;
  const boundary = currentLevel?.boundary || { x: 5, y: 5 };

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const centerX = width / 2;
    const centerY = height / 2;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '10px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const xMax = Math.ceil(width / 2 / gridSize);
    for (let i = -xMax; i <= xMax; i++) {
      if (i !== 0) {
        const x = centerX + i * gridSize;
        ctx.fillText(String(i), x, centerY + 5);
      }
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yMax = Math.ceil(height / 2 / gridSize);
    for (let i = -yMax; i <= yMax; i++) {
      if (i !== 0) {
        const y = centerY - i * gridSize;
        ctx.fillText(String(i), centerX - 8, y);
      }
    }

    ctx.fillText('0', centerX - 8, centerY + 12);

    ctx.strokeStyle = boundaryFailAnimation ? '#EC4899' : '#94A3B8';
    ctx.lineWidth = boundaryFailAnimation ? 3 : 1;
    ctx.setLineDash(boundaryFailAnimation ? [5, 5] : []);
    
    const boundaryLeft = centerX - boundary.x * gridSize;
    const boundaryRight = centerX + boundary.x * gridSize;
    const boundaryTop = centerY - boundary.y * gridSize;
    const boundaryBottom = centerY + boundary.y * gridSize;
    
    ctx.strokeRect(boundaryLeft, boundaryTop, boundaryRight - boundaryLeft, boundaryBottom - boundaryTop);
    ctx.setLineDash([]);

    if (boundaryFailAnimation) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(boundaryLeft, boundaryTop, boundaryRight - boundaryLeft, boundaryBottom - boundaryTop);
      ctx.restore();
    }

    if (currentLevel?.targetFunction) {
      const functionPoints = generateFunctionPoints(
        currentLevel.targetFunction,
        -boundary.x,
        boundary.x,
        0.1
      );

      if (functionPoints.length > 0) {
        ctx.strokeStyle = '#0F3B5F';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        
        const firstPoint = gridToCanvas(functionPoints[0], gridSize, width, height);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        functionPoints.forEach(point => {
          const canvasPoint = gridToCanvas(point, gridSize, width, height);
          ctx.lineTo(canvasPoint.x, canvasPoint.y);
        });
        
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [width, height, gridSize, boundary, currentLevel, boundaryFailAnimation]);

  const drawAnnotations = useCallback((ctx: CanvasRenderingContext2D) => {
    annotations.forEach(annotation => {
      if (annotation.points.length < 2) return;

      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color + '40';
      ctx.lineWidth = 3;

      if (annotation.type === 'curve') {
        ctx.beginPath();
        const firstPoint = gridToCanvas(annotation.points[0], gridSize, width, height);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        annotation.points.forEach(point => {
          const canvasPoint = gridToCanvas(point, gridSize, width, height);
          ctx.lineTo(canvasPoint.x, canvasPoint.y);
        });
        ctx.stroke();
      } else if (annotation.type === 'region') {
        ctx.beginPath();
        const firstPoint = gridToCanvas(annotation.points[0], gridSize, width, height);
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        annotation.points.forEach(point => {
          const canvasPoint = gridToCanvas(point, gridSize, width, height);
          ctx.lineTo(canvasPoint.x, canvasPoint.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (annotation.issues.length > 0) {
        ctx.save();
        const lastPoint = annotation.points[annotation.points.length - 1];
        const canvasPoint = gridToCanvas(lastPoint, gridSize, width, height);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(canvasPoint.x + 10, canvasPoint.y - 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 8px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', canvasPoint.x + 10, canvasPoint.y - 10);
        ctx.restore();
      }
    });
  }, [annotations, gridSize, width, height]);

  const drawCurrentDrawing = useCallback((ctx: CanvasRenderingContext2D) => {
    if (currentPoints.length === 0) return;

    ctx.strokeStyle = selectedColor;
    ctx.fillStyle = selectedColor + '40';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    if (currentTool === 'draw') {
      ctx.beginPath();
      const firstPoint = gridToCanvas(currentPoints[0], gridSize, width, height);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      currentPoints.forEach(point => {
        const canvasPoint = gridToCanvas(point, gridSize, width, height);
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });
      ctx.stroke();
    } else if (currentTool === 'fill' && currentPoints.length >= 3) {
      ctx.beginPath();
      const firstPoint = gridToCanvas(currentPoints[0], gridSize, width, height);
      ctx.moveTo(firstPoint.x, firstPoint.y);
      
      currentPoints.forEach(point => {
        const canvasPoint = gridToCanvas(point, gridSize, width, height);
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.setLineDash([]);

    currentPoints.forEach(point => {
      const canvasPoint = gridToCanvas(point, gridSize, width, height);
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(canvasPoint.x, canvasPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [currentPoints, selectedColor, currentTool, gridSize, width, height]);

  const drawHoverIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!hoveredPoint) return;

    const canvasPoint = gridToCanvas(hoveredPoint, gridSize, width, height);
    
    const inBoundary = isWithinBoundary(hoveredPoint, boundary);
    ctx.strokeStyle = inBoundary ? '#2DD4BF' : '#EC4899';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(
      canvasPoint.x - gridSize / 2,
      canvasPoint.y - gridSize / 2,
      gridSize,
      gridSize
    );
    ctx.setLineDash([]);

    ctx.fillStyle = inBoundary ? '#2DD4BF' : '#EC4899';
    ctx.font = '11px "Fira Code", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`(${hoveredPoint.x}, ${hoveredPoint.y})`, canvasPoint.x + 8, canvasPoint.y - 8);
  }, [hoveredPoint, gridSize, width, height, boundary]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx);
    drawAnnotations(ctx);
    drawCurrentDrawing(ctx);
    drawHoverIndicator(ctx);
  }, [drawGrid, drawAnnotations, drawCurrentDrawing, drawHoverIndicator]);

  const getGridPointFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const rawPoint = canvasToGrid({ x, y }, gridSize, width, height);
    return snapToGrid(rawPoint, 1);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentLevelId || currentTool === 'select' || currentTool === 'erase') return;

    const gridPoint = getGridPointFromEvent(e);
    if (!gridPoint) return;

    const inBoundary = isWithinBoundary(gridPoint, boundary);
    if (!inBoundary) {
      setBoundaryFailed(true);
      setBoundaryFailAnimation(true);
      setTimeout(() => setBoundaryFailAnimation(false), 1000);
      return;
    }

    setBoundaryFailed(false);
    startDrawing();
    addPoint(gridPoint);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const gridPoint = getGridPointFromEvent(e);
    if (!gridPoint) return;

    setHoveredPoint(gridPoint);

    if (isDrawing) {
      const inBoundary = isWithinBoundary(gridPoint, boundary);
      if (!inBoundary) {
        setBoundaryFailed(true);
        setBoundaryFailAnimation(true);
        setTimeout(() => setBoundaryFailAnimation(false), 1000);
        return;
      }
      
      const lastPoint = currentPoints[currentPoints.length - 1];
      if (!lastPoint || lastPoint.x !== gridPoint.x || lastPoint.y !== gridPoint.y) {
        addPoint(gridPoint);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    if (currentPoints.length >= 2) {
      const type = currentTool === 'fill' ? 'region' : 'curve';
      finishDrawing(type, '', '');
    } else {
      cancelDrawing();
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    if (isDrawing && currentPoints.length >= 2) {
      const type = currentTool === 'fill' ? 'region' : 'curve';
      finishDrawing(type, '', '');
    } else if (isDrawing) {
      cancelDrawing();
    }
  };

  const handleDoubleClick = () => {
    if (isDrawing && currentPoints.length >= 2) {
      const type = currentTool === 'fill' ? 'region' : 'curve';
      finishDrawing(type, '', '');
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-lg shadow-md cursor-crosshair transition-all duration-300 ${
        boundaryFailAnimation ? 'animate-shake' : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      style={{ fontFamily: '"Fira Code", monospace' }}
    />
  );
};
