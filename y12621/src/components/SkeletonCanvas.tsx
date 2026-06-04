import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SkeletonRenderer } from '@/utils/skeletonRenderer';
import type { SkeletonNode, BoneConnection, CollisionPoint, LayerMode } from '@/types';
import { ZoomIn, ZoomOut, Maximize2, Grid3X3, Tag, AlertTriangle } from 'lucide-react';

interface SkeletonCanvasProps {
  nodes: SkeletonNode[];
  beforeNodes?: SkeletonNode[];
  bones: BoneConnection[];
  collisions: CollisionPoint[];
  scale: number;
  offsetX: number;
  offsetY: number;
  layerMode: LayerMode;
  selectedNodeId: string | null;
  onViewChange: (state: { scale?: number; offsetX?: number; offsetY?: number }) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
}

export const SkeletonCanvas: React.FC<SkeletonCanvasProps> = ({
  nodes,
  beforeNodes,
  bones,
  collisions,
  scale,
  offsetX,
  offsetY,
  layerMode,
  selectedNodeId,
  onViewChange,
  onNodeSelect,
  onNodeMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SkeletonRenderer | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragNode, setDragNode] = useState<SkeletonNode | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showCollisions, setShowCollisions] = useState(true);

  const renderOptions = {
    scale,
    offsetX,
    offsetY,
    showGrid,
    showLabels,
    highlightCollisions: showCollisions,
    opacity: 1,
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const renderer = new SkeletonRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const resize = () => {
      if (containerRef.current) {
        renderer.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.render(
          nodes,
          bones,
          collisions,
          renderOptions,
          selectedNodeId,
          layerMode,
          beforeNodes
        );
      }
    };

    resize();
    window.addEventListener('resize', resize);
    renderer.startAnimation();

    const animate = () => {
      if (rendererRef.current) {
        rendererRef.current.render(
          nodes,
          bones,
          collisions,
          renderOptions,
          selectedNodeId,
          layerMode,
          beforeNodes
        );
      }
      requestAnimationFrame(animate);
    };
    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      renderer.stopAnimation();
      cancelAnimationFrame(animId);
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(
        nodes,
        bones,
        collisions,
        renderOptions,
        selectedNodeId,
        layerMode,
        beforeNodes
      );
    }
  }, [nodes, beforeNodes, bones, collisions, scale, offsetX, offsetY, layerMode, selectedNodeId, showGrid, showLabels, showCollisions]);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    lastPosRef.current = coords;

    const hit = rendererRef.current?.hitTest(coords.x, coords.y, nodes, renderOptions);

    if (e.button === 0 && hit) {
      setIsDragging(true);
      setDragNode(hit.node);
      onNodeSelect(hit.node.id);
    } else if (e.button === 1 || e.button === 2 || e.altKey) {
      setIsPanning(true);
      onNodeSelect(null);
    } else {
      onNodeSelect(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    const dx = coords.x - lastPosRef.current.x;
    const dy = coords.y - lastPosRef.current.y;

    if (isDragging && dragNode && rendererRef.current) {
      const worldCoords = rendererRef.current.screenToWorld(coords.x, coords.y, renderOptions);
      onNodeMove(dragNode.id, Math.round(worldCoords.x), Math.round(worldCoords.y));
    } else if (isPanning) {
      onViewChange({
        offsetX: offsetX + dx,
        offsetY: offsetY + dy,
      });
    }

    lastPosRef.current = coords;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsPanning(false);
    setDragNode(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scale * factor));

    if (rendererRef.current) {
      const worldPos = rendererRef.current.screenToWorld(coords.x, coords.y, renderOptions);
      const newScreenPos = {
        x: worldPos.x * newScale + offsetX,
        y: worldPos.y * newScale + offsetY,
      };

      onViewChange({
        scale: newScale,
        offsetX: offsetX + (coords.x - newScreenPos.x),
        offsetY: offsetY + (coords.y - newScreenPos.y),
      });
    }
  };

  const handleZoomIn = () => {
    onViewChange({ scale: Math.min(3, scale * 1.2) });
  };

  const handleZoomOut = () => {
    onViewChange({ scale: Math.max(0.3, scale * 0.8) });
  };

  const handleReset = () => {
    onViewChange({ scale: 1, offsetX: 100, offsetY: 50 });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      />

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-sm shadow-lg p-1 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-neutral-100 rounded-sm transition-colors"
            title="放大"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-neutral-100 rounded-sm transition-colors"
            title="缩小"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-neutral-100 rounded-sm transition-colors"
            title="重置视图"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-sm shadow-lg px-3 py-2">
          <span className="text-xs font-mono text-neutral-600">
            {Math.round(scale * 100)}%
          </span>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
            showGrid ? 'bg-primary-500 text-white' : 'bg-white/95 text-neutral-600 hover:bg-neutral-100'
          } shadow-lg`}
        >
          <Grid3X3 size={14} className="inline mr-1" />
          网格
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
            showLabels ? 'bg-primary-500 text-white' : 'bg-white/95 text-neutral-600 hover:bg-neutral-100'
          } shadow-lg`}
        >
          <Tag size={14} className="inline mr-1" />
          标签
        </button>
        <button
          onClick={() => setShowCollisions(!showCollisions)}
          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
            showCollisions ? 'bg-danger-500 text-white' : 'bg-white/95 text-neutral-600 hover:bg-neutral-100'
          } shadow-lg`}
        >
          <AlertTriangle size={14} className="inline mr-1" />
          碰撞
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-sm shadow-lg px-3 py-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#FF4D4F]" />
            头部
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#165DFF]" />
            躯干
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#00B42A]" />
            手臂
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#722ED1]" />
            腿部
          </span>
        </div>
      </div>
    </div>
  );
};
