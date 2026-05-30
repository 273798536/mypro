import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

interface UseDragDropOptions {
  id: string;
  data?: Record<string, unknown>;
  disabled?: boolean;
}

interface UseDragDropResult {
  draggableProps: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  droppableProps: (node: HTMLElement | null) => void;
  isDragging: boolean;
  isOver: boolean;
  transform: string | null;
}

export function useDragDrop(options: UseDragDropOptions): UseDragDropResult {
  const { id, data, disabled = false } = options;

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging, transform } =
    useDraggable({
      id,
      data,
      disabled,
    });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    data,
    disabled,
  });

  const combinedTransform = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : null;

  return {
    draggableProps: {
      attributes,
      listeners,
    },
    droppableProps: (node: HTMLElement | null) => {
      setDraggableRef(node);
      setDroppableRef(node);
    },
    isDragging,
    isOver,
    transform: combinedTransform,
  };
}
