import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore, storeActions } from '../../store/appStore';
import type { Path, Vector2D, PathNode } from '../../types';
import { vectorLength } from '../../utils/math/geometry';

interface CanvasState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

const VectorFieldCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 50,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<Vector2D | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    pathId: string;
    nodeId: string;
  } | null>(null);

  const activeField = useAppStore((state) =>
    state.vectorFields.find((f) => f.id === state.activeFieldId)
  );
  const paths = useAppStore((state) => state.paths);
  const selectedPathForDrawing = useAppStore(
    (state) => state.selectedPathForDrawing
  );
  const settings = useAppStore((state) => state.settings);
  const isDrawing = useAppStore((state) => state.isDrawing);

  const worldToScreen = useCallback(
    (x: number, y: number, canvas: HTMLCanvasElement) => {
      const centerX = canvas.width / 2 + canvasState.offsetX;
      const centerY = canvas.height / 2 + canvasState.offsetY;
      return {
        x: centerX + x * canvasState.zoom,
        y: centerY - y * canvasState.zoom,
      };
    },
    [canvasState]
  );

  const screenToWorld = useCallback(
    (screenX: number, screenY: number, canvas: HTMLCanvasElement) => {
      const centerX = canvas.width / 2 + canvasState.offsetX;
      const centerY = canvas.height / 2 + canvasState.offsetY;
      return {
        x: (screenX - centerX) / canvasState.zoom,
        y: -(screenY - centerY) / canvasState.zoom,
      };
    },
    [canvasState]
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      if (!settings.showGrid) return;

      const bounds = activeField?.bounds || {
        minX: -5,
        maxX: 5,
        minY: -5,
        maxY: 5,
      };

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;

      for (let x = Math.floor(bounds.minX); x <= bounds.maxX; x++) {
        const start = worldToScreen(x, bounds.minY, canvas);
        const end = worldToScreen(x, bounds.maxY, canvas);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      for (let y = Math.floor(bounds.minY); y <= bounds.maxY; y++) {
        const start = worldToScreen(bounds.minX, y, canvas);
        const end = worldToScreen(bounds.maxX, y, canvas);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1.5;

      const xAxisStart = worldToScreen(bounds.minX, 0, canvas);
      const xAxisEnd = worldToScreen(bounds.maxX, 0, canvas);
      ctx.beginPath();
      ctx.moveTo(xAxisStart.x, xAxisStart.y);
      ctx.lineTo(xAxisEnd.x, xAxisEnd.y);
      ctx.stroke();

      const yAxisStart = worldToScreen(0, bounds.minY, canvas);
      const yAxisEnd = worldToScreen(0, bounds.maxY, canvas);
      ctx.beginPath();
      ctx.moveTo(yAxisStart.x, yAxisStart.y);
      ctx.lineTo(yAxisEnd.x, yAxisEnd.y);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      for (let x = Math.floor(bounds.minX); x <= bounds.maxX; x++) {
        if (x !== 0) {
          const pos = worldToScreen(x, 0, canvas);
          ctx.fillText(x.toString(), pos.x, pos.y + 15);
        }
      }
      ctx.textAlign = 'right';
      for (let y = Math.floor(bounds.minY); y <= bounds.maxY; y++) {
        if (y !== 0) {
          const pos = worldToScreen(0, y, canvas);
          ctx.fillText(y.toString(), pos.x - 5, pos.y + 4);
        }
      }
    },
    [activeField, settings.showGrid, worldToScreen]
  );

  const drawVector = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      vecX: number,
      vecY: number,
      canvas: HTMLCanvasElement
    ) => {
      const start = worldToScreen(startX, startY, canvas);
      const vecLen = vectorLength({ x: vecX, y: vecY });
      const scale = vecLen > 0 ? Math.min(0.4, 0.3 / vecLen) : 0;
      const endWorldX = startX + vecX * scale;
      const endWorldY = startY + vecY * scale;
      const end = worldToScreen(endWorldX, endWorldY, canvas);

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 5) return;

      const hue = (Math.atan2(vecY, vecX) * 180) / Math.PI + 180;
      ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const arrowLen = 8;
      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - arrowLen * Math.cos(angle - Math.PI / 6),
        end.y - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        end.x - arrowLen * Math.cos(angle + Math.PI / 6),
        end.y - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    },
    [worldToScreen]
  );

  const drawVectorField = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      if (!activeField || !settings.showVectors) return;

      const { bounds, gridStep, computeVector } = activeField;

      for (let x = bounds.minX; x <= bounds.maxX; x += gridStep) {
        for (let y = bounds.minY; y <= bounds.maxY; y += gridStep) {
          const vector = computeVector(x, y);
          if (vectorLength(vector) > 0.001) {
            drawVector(ctx, x, y, vector.x, vector.y, canvas);
          }
        }
      }
    },
    [activeField, settings.showVectors, drawVector]
  );

  const drawPath = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      path: Path,
      canvas: HTMLCanvasElement,
      isActive: boolean
    ) => {
      if (path.nodes.length < 2) {
        path.nodes.forEach((node) => {
          const pos = worldToScreen(
            node.position.x,
            node.position.y,
            canvas
          );
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = path.color;
          ctx.fill();
        });
        return;
      }

      ctx.strokeStyle = path.color;
      ctx.lineWidth = isActive ? 3 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const startPos = worldToScreen(
        path.nodes[0].position.x,
        path.nodes[0].position.y,
        canvas
      );
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);

      for (let i = 1; i < path.nodes.length; i++) {
        const pos = worldToScreen(
          path.nodes[i].position.x,
          path.nodes[i].position.y,
          canvas
        );
        ctx.lineTo(pos.x, pos.y);
      }
      ctx.stroke();

      if (path.nodes.length >= 2) {
        const midIdx = Math.floor(path.nodes.length / 2);
        const p1 = path.nodes[midIdx - 1].position;
        const p2 = path.nodes[midIdx].position;
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const midPos = worldToScreen(midX, midY, canvas);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angle = Math.atan2(-dy, dx);

        ctx.save();
        ctx.translate(midPos.x, midPos.y);
        ctx.rotate(angle);

        ctx.fillStyle = path.color;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      path.nodes.forEach((node, index) => {
        const pos = worldToScreen(
          node.position.x,
          node.position.y,
          canvas
        );
        const isSelected =
          selectedNode?.pathId === path.id &&
          selectedNode?.nodeId === node.id;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isSelected ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = path.color;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : 'transparent';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isActive) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(index.toString(), pos.x, pos.y + 3);
        }
      });
    },
    [worldToScreen, selectedNode]
  );

  const drawSingularities = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      if (!activeField?.singularityPoints) return;

      activeField.singularityPoints.forEach((point) => {
        const pos = worldToScreen(point.x, point.y, canvas);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 63, 63, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#f53f3f';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f53f3f';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', pos.x, pos.y + 4);
      });
    },
    [activeField, worldToScreen]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, canvas);
    drawVectorField(ctx, canvas);
    drawSingularities(ctx, canvas);

    paths.forEach((path, index) => {
      const isActive =
        (selectedPathForDrawing === 'A' && index === 0) ||
        (selectedPathForDrawing === 'B' && index === 1);
      drawPath(ctx, path, canvas, isActive);
    });

    if (hoveredPoint) {
      const pos = worldToScreen(hoveredPoint.x, hoveredPoint.y, canvas);
      ctx.strokeStyle = '#165DFF';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    drawGrid,
    drawVectorField,
    drawSingularities,
    drawPath,
    paths,
    selectedPathForDrawing,
    hoveredPoint,
    worldToScreen,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  useEffect(() => {
    render();
  }, [render]);

  const findNodeAtPosition = (
    screenX: number,
    screenY: number,
    canvas: HTMLCanvasElement
  ): { pathId: string; nodeId: string; distance: number } | null => {
    let closest: {
      pathId: string;
      nodeId: string;
      distance: number;
    } | null = null;

    paths.forEach((path) => {
      path.nodes.forEach((node) => {
        const nodeScreen = worldToScreen(
          node.position.x,
          node.position.y,
          canvas
        );
        const dx = screenX - nodeScreen.x;
        const dy = screenY - nodeScreen.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 15 && (!closest || dist < closest.distance)) {
          closest = { pathId: path.id, nodeId: node.id, distance: dist };
        }
      });
    });

    return closest;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodeAtPos = findNodeAtPosition(x, y, canvas);

    if (nodeAtPos && !isDrawing) {
      setSelectedNode(nodeAtPos);
      setIsDragging(true);
      setDragStart({ x, y });
      return;
    }

    if (selectedPathForDrawing && isDrawing) {
      const worldPos = screenToWorld(x, y, canvas);
      const pathId =
        selectedPathForDrawing === 'A' ? paths[0]?.id : paths[1]?.id;

      if (pathId) {
        storeActions.addNodeToPath(pathId, worldPos.x, worldPos.y);
      }
    } else {
      setIsDragging(true);
      setDragStart({ x: x - canvasState.offsetX, y: y - canvasState.offsetY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && selectedNode) {
      const worldPos = screenToWorld(x, y, canvas);
      storeActions.updatePathNode(
        selectedNode.pathId,
        selectedNode.nodeId,
        worldPos.x,
        worldPos.y
      );
      return;
    }

    if (isDragging && !selectedNode) {
      setCanvasState((prev) => ({
        ...prev,
        offsetX: x - dragStart.x,
        offsetY: y - dragStart.y,
      }));
      return;
    }

    const worldPos = screenToWorld(x, y, canvas);
    setHoveredPoint(worldPos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectedNode(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCanvasState((prev) => ({
      ...prev,
      zoom: Math.max(20, Math.min(150, prev.zoom * delta)),
    }));
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nodeAtPos = findNodeAtPosition(x, y, canvas);
    if (nodeAtPos) {
      storeActions.removeNodeFromPath(nodeAtPos.pathId, nodeAtPos.nodeId);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      {hoveredPoint && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md text-sm font-mono border border-gray-200">
          <div>
            x: <span className="text-blue-600">{hoveredPoint.x.toFixed(2)}</span>,
            y: <span className="text-purple-600">{hoveredPoint.y.toFixed(2)}</span>
          </div>
          {activeField && (
            <div className="text-gray-500 text-xs mt-1">
              F = ({activeField.computeVector(hoveredPoint.x, hoveredPoint.y).x.toFixed(2)},{' '}
              {activeField.computeVector(hoveredPoint.x, hoveredPoint.y).y.toFixed(2)})
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md text-xs border border-gray-200">
        <div>缩放: {(canvasState.zoom / 50 * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
};

export default VectorFieldCanvas;
