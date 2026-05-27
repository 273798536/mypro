import { useMemo } from 'react';
import { Card } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { detectAllAnomalies } from '@/utils/anomalyDetector';

export function useAnomalyDetection() {
  const { cards, selectedCardIds } = useGameStore();

  const detectedAnomalies = useMemo(() => {
    return detectAllAnomalies(cards, selectedCardIds);
  }, [cards, selectedCardIds]);

  const getCardStatus = (cardId: string): Card['status'] => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return 'unknown';

    const hasAnomaly = detectedAnomalies.some(a => a.cardIds.includes(cardId));
    if (hasAnomaly) return 'danger';
    if (card.isSelected) return 'warning';
    return 'unknown';
  };

  return {
    detectedAnomalies,
    getCardStatus,
  };
}
