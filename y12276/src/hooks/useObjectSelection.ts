import { useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { useAppStore } from '@/store/useAppStore';

export function useObjectSelection() {
  const { selectedObjectId, setSelectedObjectId, setShowDetailPanel } = useAppStore();

  const handleObjectClick = useCallback(
    (event: ThreeEvent<MouseEvent>, objectId: string) => {
      event.stopPropagation();
      if (selectedObjectId === objectId) {
        setSelectedObjectId(null);
        setShowDetailPanel(false);
      } else {
        setSelectedObjectId(objectId);
        setShowDetailPanel(true);
      }
    },
    [selectedObjectId, setSelectedObjectId, setShowDetailPanel]
  );

  const handleBackgroundClick = useCallback(() => {
    setSelectedObjectId(null);
    setShowDetailPanel(false);
  }, [setSelectedObjectId, setShowDetailPanel]);

  return {
    selectedObjectId,
    handleObjectClick,
    handleBackgroundClick,
  };
}
