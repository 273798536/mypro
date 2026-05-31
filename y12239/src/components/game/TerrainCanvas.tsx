import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getTaskById } from '@/data/tasks';
import { calculateTrigonometry } from '@/utils/geometry';
import { Point } from '@/types';

interface TerrainCanvasProps {
  width?: number;
  height?: number;
  onAngleMeasured?: (angle: number) => void;
}

export function TerrainCanvas({
  width = 700,
  height = 550,
  onAngleMeasured,
}: TerrainCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleStartRef = useRef<Point | null>(null);
  const angleVertexRef = useRef<Point | null>(null);
  const mousePosRef = useRef<Point | null>(null);

  const {
    currentSession,
    currentTool,
    selectedPoint,
    pathStartPoint,
    tempPath,
    isDrawingPath,
    highlightOperationId,
    selectSurveyPoint,
    addPathPoint,
    recordAngleMeasurement,
  } = useGameStore();

  const task = currentSession ? getTaskById(currentSession.taskId) : null;

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [width, height]);

  const drawContours = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const contours = [
      { y: 80, amplitude: 15 },
      { y: 160, amplitude: 20 },
      { y: 240, amplitude: 25 },
      { y: 320, amplitude: 20 },
      { y: 400, amplitude: 15 },
      { y: 480, amplitude: 10 },
    ];

    for (const contour of contours) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        const y = contour.y + Math.sin(x * 0.02) * contour.amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [width]);

  const drawObstacle = useCallback(
    (ctx: CanvasRenderingContext2D, points: Point[], type: string) => {
      const colors: Record<string, { fill: string; stroke: string }> = {
        building: { fill: 'rgba(233, 69, 96, 0.2)', stroke: '#E94560' },
        water: { fill: 'rgba(22, 199, 154, 0.2)', stroke: '#16C79A' },
        restricted: { fill: 'rgba(255, 217, 61, 0.2)', stroke: '#FFD93D' },
      };

      const color = colors[type] || colors.restricted;

      ctx.fillStyle = color.fill;
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;

      ctx.beginPath();
      points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = 10;
      patternCanvas.height = 10;
      const patternCtx = patternCanvas.getContext('2d');
      if (patternCtx) {
        patternCtx.strokeStyle = color.stroke;
        patternCtx.lineWidth = 1;
        patternCtx.beginPath();
        patternCtx.moveTo(0, 10);
        patternCtx.lineTo(10, 0);
        patternCtx.stroke();
      }

      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },
    []
  );

  const drawSurveyPoint = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      point: { x: number; y: number; name: string; isTarget: boolean; measured?: boolean; order: number },
      isSelected: boolean,
      isPathStart: boolean
    ) => {
      const baseColor = point.isTarget ? '#0F3460' : '#8892B0';
      const glowColor = isSelected ? 'rgba(255, 217, 61, 0.6)' : 'rgba(15, 52, 96, 0.3)';
      const radius = point.isTarget ? 12 : 8;

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 2.5);
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = point.measured ? '#16C79A' : baseColor;
      ctx.strokeStyle = isSelected || isPathStart ? '#FFD93D' : '#FFFFFF';
      ctx.lineWidth = isSelected || isPathStart ? 3 : 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (point.isTarget) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.order.toString(), point.x, point.y);
      }

      ctx.fillStyle = '#2C3E50';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(point.name, point.x, point.y + radius + 6);

      if (point.measured) {
        ctx.fillStyle = '#16C79A';
        ctx.beginPath();
        ctx.arc(point.x + radius - 2, point.y - radius + 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    []
  );

  const drawPath = useCallback(
    (ctx: CanvasRenderingContext2D, pathPoints: Point[], hasError: boolean, isTemp: boolean) => {
      if (pathPoints.length < 2) return;

      ctx.strokeStyle = hasError ? '#E94560' : isTemp ? 'rgba(15, 52, 96, 0.5)' : '#0F3460';
      ctx.lineWidth = isTemp ? 2 : 3;
      ctx.setLineDash(isTemp ? [8, 4] : []);

      ctx.beginPath();
      pathPoints.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      if (!isTemp) {
        const lastPoint = pathPoints[pathPoints.length - 1];
        const prevPoint = pathPoints[pathPoints.length - 2];
        const angle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x);

        ctx.fillStyle = hasError ? '#E94560' : '#0F3460';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(
          lastPoint.x - 10 * Math.cos(angle - Math.PI / 6),
          lastPoint.y - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          lastPoint.x - 10 * Math.cos(angle + Math.PI / 6),
          lastPoint.y - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    },
    []
  );

  const drawAngleMeasurement = useCallback(
    (ctx: CanvasRenderingContext2D, vertex: Point, start: Point, current: Point) => {
      const angle = Math.atan2(current.y - vertex.y, current.x - vertex.x);
      const startAngle = Math.atan2(start.y - vertex.y, start.x - vertex.x);

      ctx.strokeStyle = '#FFD93D';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(vertex.x, vertex.y);
      ctx.lineTo(start.x, start.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(vertex.x, vertex.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();

      ctx.strokeStyle = '#0F3460';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const radius = 50;
      ctx.arc(vertex.x, vertex.y, radius, startAngle, angle, startAngle > angle);
      ctx.stroke();

      const midAngle = (startAngle + angle) / 2;
      const labelRadius = radius + 20;
      const labelX = vertex.x + labelRadius * Math.cos(midAngle);
      const labelY = vertex.y + labelRadius * Math.sin(midAngle);

      const degrees = Math.abs(((angle - startAngle) * 180) / Math.PI);
      const displayAngle = Number(degrees.toFixed(1));

      ctx.fillStyle = '#0F3460';
      ctx.font = 'bold 14px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${displayAngle}°`, labelX, labelY);

      if (task) {
        const isOutOfRange = displayAngle < task.angleMin || displayAngle > task.angleMax;
        if (isOutOfRange) {
          ctx.fillStyle = '#E94560';
          ctx.font = '11px Inter';
          ctx.fillText(`(超出 ${task.angleMin}°-${task.angleMax}°)`, labelX, labelY + 18);
        }
      }

      const trig = calculateTrigonometry(displayAngle);
      ctx.fillStyle = '#2C3E50';
      ctx.font = '11px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`sin: ${trig.sin}`, width - 120, 30);
      ctx.fillText(`cos: ${trig.cos}`, width - 120, 48);
      ctx.fillText(`tan: ${trig.tan}`, width - 120, 66);
    },
    [task, width]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentSession) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#F5F7FA');
    bgGradient.addColorStop(1, '#E8ECF1');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx);
    drawContours(ctx);

    for (const obstacle of currentSession.obstacles) {
      drawObstacle(ctx, obstacle.polygonPoints, obstacle.type);
    }

    for (const op of currentSession.operations) {
      if (op.type === 'path_draw' && op.data.pathPoints) {
        const hasError = highlightOperationId === op.id;
        drawPath(ctx, op.data.pathPoints, hasError, false);
      }
    }

    if (isDrawingPath && tempPath.length > 0) {
      drawPath(ctx, tempPath, false, true);
    }

    if (currentTool === 'angle' && angleVertexRef.current && angleStartRef.current && mousePosRef.current) {
      drawAngleMeasurement(ctx, angleVertexRef.current, angleStartRef.current, mousePosRef.current);
    }

    for (const point of currentSession.surveyPoints) {
      const isSelected = selectedPoint === point.id;
      const isPathStart = pathStartPoint === point.id;
      drawSurveyPoint(ctx, point, isSelected, isPathStart);
    }

    if (currentSession.obstacles) {
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      for (const obstacle of currentSession.obstacles) {
        const centerX = obstacle.polygonPoints.reduce((sum, p) => sum + p.x, 0) / obstacle.polygonPoints.length;
        const centerY = obstacle.polygonPoints.reduce((sum, p) => sum + p.y, 0) / obstacle.polygonPoints.length;
        ctx.fillStyle = '#2C3E50';
        ctx.fillText(obstacle.name, centerX, centerY);
      }
    }
  }, [
    currentSession,
    selectedPoint,
    pathStartPoint,
    tempPath,
    isDrawingPath,
    currentTool,
    highlightOperationId,
    width,
    height,
    drawGrid,
    drawContours,
    drawObstacle,
    drawSurveyPoint,
    drawPath,
    drawAngleMeasurement,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findPointAtPos = (pos: Point): string | null => {
    if (!currentSession) return null;
    for (const point of currentSession.surveyPoints) {
      const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
      if (dist < 20) {
        return point.id;
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    mousePosRef.current = pos;

    if (isDrawingPath && currentTool === 'path') {
      addPathPoint(pos);
    }

    if (currentTool === 'angle' && angleVertexRef.current && angleStartRef.current) {
      draw();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentSession) return;
    const pos = getMousePos(e);
    const pointId = findPointAtPos(pos);

    if (currentTool === 'select' || currentTool === 'path') {
      if (pointId) {
        selectSurveyPoint(pointId);
      }
    } else if (currentTool === 'angle') {
      if (!angleVertexRef.current && pointId) {
        const point = currentSession.surveyPoints.find((p) => p.id === pointId);
        if (point) {
          angleVertexRef.current = { x: point.x, y: point.y };
        }
      } else if (!angleStartRef.current && pointId) {
        const point = currentSession.surveyPoints.find((p) => p.id === pointId);
        if (point && angleVertexRef.current) {
          angleStartRef.current = { x: point.x, y: point.y };
        }
      } else if (pointId && selectedPoint) {
        const point = currentSession.surveyPoints.find((p) => p.id === pointId);
        if (point && angleVertexRef.current && angleStartRef.current) {
          const angle = Math.atan2(point.y - angleVertexRef.current.y, point.x - angleVertexRef.current.x);
          const startAngle = Math.atan2(
            angleStartRef.current.y - angleVertexRef.current.y,
            angleStartRef.current.x - angleVertexRef.current.x
          );
          const degrees = Math.abs(((angle - startAngle) * 180) / Math.PI);
          const finalAngle = Number(degrees.toFixed(1));

          recordAngleMeasurement(selectedPoint, finalAngle, pointId);
          onAngleMeasured?.(finalAngle);

          angleVertexRef.current = null;
          angleStartRef.current = null;
        }
      }
      draw();
    }
  };

  const handleDoubleClick = () => {
    if (currentTool === 'angle') {
      angleVertexRef.current = null;
      angleStartRef.current = null;
      draw();
    }
  };

  const getCursor = () => {
    if (currentTool === 'select' || currentTool === 'path') return 'pointer';
    if (currentTool === 'angle') return 'crosshair';
    return 'default';
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-[#0F3460]/10">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: getCursor() }}
        className="block"
      />
      {currentTool === 'angle' && (angleVertexRef.current || angleStartRef.current) && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-[#0F3460] shadow-md">
          {!angleVertexRef.current ? '点击选择角的顶点' : !angleStartRef.current ? '点击选择角度起始边' : '点击选择角度终边（双击取消）'}
        </div>
      )}
      {isDrawingPath && (
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-[#0F3460] shadow-md">
          移动鼠标绘制路径，点击下一个测绘点完成
        </div>
      )}
    </div>
  );
}
