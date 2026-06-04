
import { useCallback, useEffect } from 'react';
import { usePathStore } from '../store/usePathStore';
import { useHistoryStore } from '../store/useHistoryStore';

export function useUndoRedo() {
  const { undo, redo, canUndo, canRedo, past, future } = useHistoryStore();
  const updateNodePosition = usePathStore((state) => state.updateNodePosition);
  const flipNodeCoordinates = usePathStore((state) => state.flipNodeCoordinates);
  const addNodeAnnotation = usePathStore((state) => state.addNodeAnnotation);
  const fixAnomaly = usePathStore((state) => state.fixAnomaly);
  const updatePathScale = usePathStore((state) => state.updatePathScale);

  const executeUndo = useCallback(() => {
    const action = undo();
    if (!action) return;

    const { type, previousState } = action;

    switch (type) {
      case 'move_node':
        updateNodePosition(
          previousState.pathId as string,
          previousState.nodeId as string,
          previousState.x as number,
          previousState.y as number
        );
        break;
      case 'flip_coordinate':
        flipNodeCoordinates(
          previousState.pathId as string,
          previousState.nodeId as string
        );
        break;
      case 'add_annotation':
        addNodeAnnotation(
          previousState.pathId as string,
          previousState.nodeId as string,
          previousState.anomalyId as string,
          previousState.annotation as string
        );
        break;
      case 'fix_anomaly':
        break;
      case 'update_scale':
        updatePathScale(
          previousState.pathId as string,
          previousState.ratio as string,
          previousState.unit as string
        );
        break;
    }
  }, [undo, updateNodePosition, flipNodeCoordinates, addNodeAnnotation, updatePathScale]);

  const executeRedo = useCallback(() => {
    const action = redo();
    if (!action) return;

    const { type, nextState } = action;

    switch (type) {
      case 'move_node':
        updateNodePosition(
          nextState.pathId as string,
          nextState.nodeId as string,
          nextState.x as number,
          nextState.y as number
        );
        break;
      case 'flip_coordinate':
        flipNodeCoordinates(
          nextState.pathId as string,
          nextState.nodeId as string
        );
        break;
      case 'add_annotation':
        addNodeAnnotation(
          nextState.pathId as string,
          nextState.nodeId as string,
          nextState.anomalyId as string,
          nextState.annotation as string
        );
        break;
      case 'fix_anomaly':
        fixAnomaly(
          nextState.pathId as string,
          nextState.nodeId as string,
          nextState.anomalyId as string
        );
        break;
      case 'update_scale':
        updatePathScale(
          nextState.pathId as string,
          nextState.ratio as string,
          nextState.unit as string
        );
        break;
    }
  }, [redo, updateNodePosition, flipNodeCoordinates, addNodeAnnotation, fixAnomaly, updatePathScale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        executeUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        executeRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeUndo, executeRedo]);

  return {
    canUndo: canUndo(),
    canRedo: canRedo(),
    undo: executeUndo,
    redo: executeRedo,
    history: past,
    future: future,
  };
}
