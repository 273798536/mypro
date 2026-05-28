import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePathStore } from '@/store/pathStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { useRevisionStore } from '@/store/revisionStore';
import { useVectorField } from '@/hooks/useVectorField';
import { usePathInterpolation } from '@/hooks/usePathInterpolation';
import { CANVAS_CONFIG } from '@/shared/constants';
import type { Point2D, PathNode } from '@/types';

interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function VisualizationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { vectorFields, activeVectorFieldId, activePathId, paths, updateNode, addNode, deleteNode } = usePathStore();
  const { config, selectedPathIds, togglePathSelection } = useIntegrationStore();
  const { addEntry } = useRevisionStore();

  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 40,
    offsetX: 300,
    offsetY: 250,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draggingNode, setDraggingNode] = useState<{ pathId: string; nodeId: string } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [mousePos, setMousePos] = useState<Point2D | null>(null);

  const activeVf = vectorFields.find((vf) => vf.id === activeVectorFieldId);
  const { parsedField, generateGridVectors } = useVectorField(activeVf || null);
  const activePaths = paths.filter((p) => p.vectorFieldId === activeVectorFieldId);
  const activePath = activePaths.find((p) => p.id === activePathId);

  const { interpolatedPoints } = usePathInterpolation(
    activePath?.nodes || [],
    config.stepSize
  );

  const gridVectors = useMemo(() => generateGridVectors(12), [generateGridVectors]);

  const worldToScreen = useCallback(
    (point: Point2D): Point2D => {
      return {
        x: point.x * canvasState.scale + canvasState.offsetX,
        y: -point.y * canvasState.scale + canvasState.offsetY,
      };
    },
    [canvasState]
  );

  const screenToWorld = useCallback(
    (point: Point2D): Point2D => {
      return {
        x: (point.x - canvasState.offsetX) / canvasState.scale,
        y: -(point.y - canvasState.offsetY) / canvasState.scale,
      };
    },
    [canvasState]
  );

  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: Point2D,
      to: Point2D,
      color: string,
      size: number = CANVAS_CONFIG.vectorArrowSize
    ) => {
      const headlen = size;
      const angle = Math.atan2(to.y - from.y, to.x - from.x);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(
        to.x - headlen * Math.cos(angle - Math.PI / 6),
        to.y - headlen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        to.x - headlen * Math.cos(angle + Math.PI / 6),
        to.y - headlen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridSize = canvasState.scale;
    const startX = Math.floor(-canvasState.offsetX / gridSize) * gridSize;
    const startY = Math.floor(-canvasState.offsetY / gridSize) * gridSize;

    for (let x = startX; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + canvasState.offsetX, 0);
      ctx.lineTo(x + canvasState.offsetX, rect.height);
      ctx.stroke();
    }
    for (let y = startY; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + canvasState.offsetY);
      ctx.lineTo(rect.width, y + canvasState.offsetY);
      ctx.stroke();
    }

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    const origin = worldToScreen({ x: 0, y: 0 });
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(rect.width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, rect.height);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    const axisStep = 1;
    for (let x = -10; x <= 10; x += axisStep) {
      const pos = worldToScreen({ x, y: 0 });
      if (pos.x > 0 && pos.x < rect.width && x !== 0) {
        ctx.fillText(x.toString(), pos.x - 5, origin.y + 15);
      }
    }
    for (let y = -10; y <= 10; y += axisStep) {
      const pos = worldToScreen({ x: 0, y });
      if (pos.y > 0 && pos.y < rect.height && y !== 0) {
        ctx.fillText(y.toString(), origin.x + 5, pos.y + 3);
      }
    }

    if (gridVectors.length > 0) {
      const maxMagnitude = Math.max(...gridVectors.map((v) => v.magnitude), 1);
      gridVectors.forEach(({ point, vector, magnitude }) => {
        const from = worldToScreen(point);
        const scale = (magnitude / maxMagnitude) * 25;
        const vecLength = Math.sqrt(vector.x ** 2 + vector.y ** 2) || 1;
        const to = {
          x: from.x + (vector.x / vecLength) * scale,
          y: from.y - (vector.y / vecLength) * scale,
        };

        const intensity = Math.min(magnitude / maxMagnitude, 1);
        const r = Math.floor(30 + intensity * 200);
        const g = Math.floor(64 + intensity * 100);
        const b = Math.floor(150 - intensity * 100);
        const color = `rgb(${r},${g},${b})`;

        drawArrow(ctx, from, to, color, 5);
      });
    }

    activePaths.forEach((path) => {
      const isSelected = selectedPathIds.includes(path.id);
      const isActive = path.id === activePathId;
      const points = path.nodes.sort((a, b) => a.order - b.order);

      if (points.length < 2) return;

      ctx.strokeStyle = path.color;
      ctx.lineWidth = isActive ? 3 : isSelected ? 2.5 : 1.5;
      ctx.globalAlpha = isSelected ? 1 : 0.6;

      ctx.beginPath();
      const first = worldToScreen(points[0]);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < points.length; i++) {
        const screenPoint = worldToScreen(points[i]);
        ctx.lineTo(screenPoint.x, screenPoint.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      points.forEach((node, idx) => {
        const screenPoint = worldToScreen(node);
        const isDragging = draggingNode?.nodeId === node.id;
        const radius = isDragging
          ? CANVAS_CONFIG.nodeHoverRadius
          : CANVAS_CONFIG.nodeRadius;

        ctx.fillStyle = isActive ? path.color : `${path.color}99`;
        ctx.strokeStyle = isActive ? '#1e40af' : '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(idx.toString(), screenPoint.x, screenPoint.y);
      });

      if (isActive && interpolatedPoints.length > 1) {
        ctx.fillStyle = `${path.color}44`;
        interpolatedPoints.forEach((point) => {
          const sp = worldToScreen(point);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  }, [
    canvasState,
    activePaths,
    activePathId,
    selectedPathIds,
    gridVectors,
    worldToScreen,
    drawArrow,
    interpolatedPoints,
    draggingNode,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      if (e.button === 1 || e.buttons === 4) {
        setIsPanning(true);
        setDragStart({ x: screenX, y: screenY });
        return;
      }

      let foundNode = false;
      for (const path of activePaths) {
        for (const node of path.nodes) {
          const screenPoint = worldToScreen(node);
          const dist = Math.sqrt(
            (screenX - screenPoint.x) ** 2 + (screenY - screenPoint.y) ** 2
          );
          if (dist < CANVAS_CONFIG.nodeHoverRadius) {
            setDraggingNode({ pathId: path.id, nodeId: node.id });
            setIsDragging(true);
            foundNode = true;

            if (path.id !== activePathId) {
              usePathStore.getState().setActivePath(path.id);
            }
            break;
          }
        }
        if (foundNode) break;
      }

      if (!foundNode && e.detail === 2 && activePathId) {
        const worldPoint = screenToWorld({ x: screenX, y: screenY });
        const prevNodes = activePath?.nodes || [];
        addNode(activePathId, worldPoint);

        addEntry({
          targetType: 'path',
          targetId: activePathId,
          action: 'update',
          previousValue: { nodes: prevNodes },
          newValue: { nodes: [...prevNodes, { x: worldPoint.x, y: worldPoint.y }] },
          source: '画布编辑',
          correctionNote: `双击添加节点 (${worldPoint.x.toFixed(2)}, ${worldPoint.y.toFixed(2)})`,
        });
      }
    },
    [activePaths, activePathId, activePath, worldToScreen, screenToWorld, addNode, addEntry]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldPoint = screenToWorld({ x: screenX, y: screenY });
      setMousePos(worldPoint);

      if (isPanning && dragStart) {
        setCanvasState((prev) => ({
          ...prev,
          offsetX: prev.offsetX + (screenX - dragStart.x),
          offsetY: prev.offsetY + (screenY - dragStart.y),
        }));
        setDragStart({ x: screenX, y: screenY });
        return;
      }

      if (isDragging && draggingNode) {
        const worldPoint = screenToWorld({ x: screenX, y: screenY });
        const path = paths.find((p) => p.id === draggingNode.pathId);
        const node = path?.nodes.find((n) => n.id === draggingNode.nodeId);

        if (node) {
          const prevPos = { x: node.x, y: node.y };
          updateNode(draggingNode.pathId, draggingNode.nodeId, {
            x: Math.round(worldPoint.x * 100) / 100,
            y: Math.round(worldPoint.y * 100) / 100,
          });

          if (parsedField && Math.abs(prevPos.x - worldPoint.x) > 0.1 || Math.abs(prevPos.y - worldPoint.y) > 0.1) {
            addEntry({
              targetType: 'path',
              targetId: draggingNode.pathId,
              action: 'update',
              previousValue: { position: prevPos },
              newValue: { position: { x: worldPoint.x, y: worldPoint.y } },
              source: '画布拖拽',
              correctionNote: '拖拽移动节点',
            });
          }
        }
      }
    },
    [isPanning, isDragging, draggingNode, dragStart, screenToWorld, paths, updateNode, parsedField, addEntry]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setDraggingNode(null);
    setDragStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasState((prev) => ({
      ...prev,
      scale: Math.max(10, Math.min(150, prev.scale * delta)),
    }));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Delete' && activePath && activePath.nodes.length > 2) {
        const lastNode = activePath.nodes[activePath.nodes.length - 1];
        const prevNodes = [...activePath.nodes];
        deleteNode(activePathId!, lastNode.id);

        addEntry({
          targetType: 'path',
          targetId: activePathId!,
          action: 'update',
          previousValue: { nodes: prevNodes },
          newValue: { nodes: prevNodes.slice(0, -1) },
          source: '键盘操作',
          correctionNote: '删除最后一个节点',
        });
      }
    },
    [activePath, activePathId, deleteNode, addEntry]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleResetView = () => {
    setCanvasState({
      scale: 40,
      offsetX: 300,
      offsetY: 250,
    });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />

      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs shadow-sm border border-slate-200">
        {mousePos ? (
          <div className="font-mono text-slate-700">
            X: {mousePos.x.toFixed(2)}, Y: {mousePos.y.toFixed(2)}
          </div>
        ) : (
          <div className="text-slate-400">移动鼠标查看坐标</div>
        )}
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-1">
        <button
          onClick={handleResetView}
          className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs text-slate-600 rounded-md hover:bg-white shadow-sm border border-slate-200 transition-colors"
        >
          重置视图
        </button>
        <button
          onClick={() => setCanvasState((s) => ({ ...s, scale: s.scale * 1.2 }))}
          className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs text-slate-600 rounded-md hover:bg-white shadow-sm border border-slate-200 transition-colors"
        >
          放大 +
        </button>
        <button
          onClick={() => setCanvasState((s) => ({ ...s, scale: s.scale * 0.8 }))}
          className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs text-slate-600 rounded-md hover:bg-white shadow-sm border border-slate-200 transition-colors"
        >
          缩小 -
        </button>
      </div>

      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs shadow-sm border border-slate-200">
        <div className="text-slate-500">
          <span className="text-slate-700 font-medium">操作提示:</span> 双击添加节点 | 拖拽节点移动 | 滚轮缩放 | 中键平移
        </div>
      </div>
    </div>
  );
}
