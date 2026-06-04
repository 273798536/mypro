
import { useState, useCallback, useRef } from 'react';
import { usePathStore } from '../store/usePathStore';
import { useHistoryStore } from '../store/useHistoryStore';

interface UseDragNodeOptions {
  pathId: string;
  nodeId: string;
  gridSize?: number;
  snapToGrid?: boolean;
}

export function useDragNode({ pathId, nodeId, gridSize = 20, snapToGrid = true }: UseDragNodeOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const updateNodePosition = usePathStore((state) => state.updateNodePosition);
  const addHistoryAction = useHistoryStore((state) => state.addAction);
  const selectedPath = usePathStore((state) => state.getSelectedPath());

  const node = selectedPath?.nodes.find((n) => n.id === nodeId);

  const snap = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [gridSize, snapToGrid]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      startPosRef.current = { x: node.x, y: node.y };
      setIsDragging(true);
    },
    [node]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !node) return;

      const svgElement = document.getElementById('chessboard-svg');
      if (!svgElement) return;

      const svgRect = svgElement.getBoundingClientRect();
      const x = snap(e.clientX - svgRect.left - dragOffset.x + 12);
      const y = snap(e.clientY - svgRect.top - dragOffset.y + 12);

      const boundedX = Math.max(20, Math.min(580, x));
      const boundedY = Math.max(20, Math.min(480, y));

      updateNodePosition(pathId, nodeId, boundedX, boundedY);
    },
    [isDragging, node, dragOffset, snap, pathId, nodeId, updateNodePosition]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && startPosRef.current && node) {
      const { x: startX, y: startY } = startPosRef.current;
      if (startX !== node.x || startY !== node.y) {
        addHistoryAction(
          'move_node',
          `移动节点 "${node.label || nodeId}"`,
          { pathId, nodeId, x: startX, y: startY },
          { pathId, nodeId, x: node.x, y: node.y }
        );
      }
    }
    setIsDragging(false);
    startPosRef.current = null;
  }, [isDragging, node, pathId, nodeId, addHistoryAction]);

  const enableDrag = useCallback(() => {
    if (isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const disableDrag = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown,
    enableDrag,
    disableDrag,
  };
}
