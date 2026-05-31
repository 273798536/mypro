import type { Card } from '../types/card';
import type { CityStatus } from '../types/city';
import {
  CATCHMENT_AREA,
  RUNOFF_COEFFICIENT,
  MAX_PUMP_CAPACITY,
  MAX_GARDEN_CAPACITY,
  LOW_AREA,
} from '../types/city';
import { clamp, roundTo } from '../utils/common';

export function calculateStorage(
  currentStatus: CityStatus,
  activeRainfall: number,
  playedCards: Card[],
): CityStatus {
  const inflow = activeRainfall * (CATCHMENT_AREA / 1000) * RUNOFF_COEFFICIENT;

  let pipelineCapacity = 0;
  let disposalCapacity = 0;
  let gardenCapacity = 0;

  playedCards.forEach(card => {
    if (card.type === 'pipeline') pipelineCapacity += card.value;
    if (card.type === 'disposal') disposalCapacity += card.value;
    if (card.type === 'garden') gardenCapacity += card.value;
  });

  const totalProcessed = pipelineCapacity + disposalCapacity + gardenCapacity;
  const remainingWater = Math.max(0, inflow - totalProcessed);

  const newPumpLoad = clamp(roundTo((pipelineCapacity / MAX_PUMP_CAPACITY) * 100, 1), 0, 100);
  const newLowWater = clamp(roundTo((remainingWater / LOW_AREA) * 1000, 1), 0, 1000);
  const newGreenCapacity = clamp(roundTo(100 - (gardenCapacity / MAX_GARDEN_CAPACITY) * 100, 1), 0, 100);

  return {
    pumpLoad: newPumpLoad,
    lowWater: newLowWater,
    greenCapacity: newGreenCapacity,
    totalStorage: roundTo(currentStatus.totalStorage + remainingWater, 1),
  };
}

export function calculateInflow(rainfall: number): number {
  return roundTo(rainfall * (CATCHMENT_AREA / 1000) * RUNOFF_COEFFICIENT);
}

export function calculateCapacitySummary(playedCards: Card[]): {
  pipeline: number;
  disposal: number;
  garden: number;
  total: number;
} {
  let pipeline = 0;
  let disposal = 0;
  let garden = 0;

  playedCards.forEach(card => {
    if (card.type === 'pipeline') pipeline += card.value;
    if (card.type === 'disposal') disposal += card.value;
    if (card.type === 'garden') garden += card.value;
  });

  return {
    pipeline,
    disposal,
    garden,
    total: pipeline + disposal + garden,
  };
}
