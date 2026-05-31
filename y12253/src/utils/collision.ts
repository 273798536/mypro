import { Submarine, Reef } from '../types/game';

export const checkSubmarineReefCollision = (
  submarine: Submarine,
  reef: Reef,
  submarineRadius: number = 20
): boolean => {
  const closestX = Math.max(reef.x, Math.min(submarine.x, reef.x + reef.width));
  const closestY = Math.max(reef.y, Math.min(submarine.y, reef.y + reef.height));
  const distanceX = submarine.x - closestX;
  const distanceY = submarine.y - closestY;
  return (distanceX * distanceX + distanceY * distanceY) < (submarineRadius * submarineRadius);
};

export const checkAnyCollision = (
  submarine: Submarine,
  reefs: Reef[],
  submarineRadius: number = 20
): Reef | null => {
  for (const reef of reefs) {
    if (checkSubmarineReefCollision(submarine, reef, submarineRadius)) {
      return reef;
    }
  }
  return null;
};

export const checkNearMiss = (
  submarine: Submarine,
  reef: Reef,
  nearDistance: number = 40
): boolean => {
  const closestX = Math.max(reef.x, Math.min(submarine.x, reef.x + reef.width));
  const closestY = Math.max(reef.y, Math.min(submarine.y, reef.y + reef.height));
  const distanceX = submarine.x - closestX;
  const distanceY = submarine.y - closestY;
  const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  return distance < nearDistance && distance >= 20;
};

export const checkTargetReached = (
  submarine: Submarine,
  target: { x: number; y: number },
  threshold: number = 30
): boolean => {
  const distance = Math.sqrt(
    (submarine.x - target.x) ** 2 + (submarine.y - target.y) ** 2
  );
  return distance < threshold;
};

export const isInBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
  margin: number = 20
): boolean => {
  return x >= margin && x <= width - margin && y >= margin && y <= height - margin;
};
