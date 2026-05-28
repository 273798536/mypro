import type { Direction, DopplerResult } from '../types';

export const SOUND_SPEED = 343;

export function calculateObservedFrequency(
  baseFrequency: number,
  velocity: number,
  direction: Direction,
  soundSpeed: number = SOUND_SPEED
): number {
  if (direction === 'approaching') {
    return baseFrequency * (soundSpeed / (soundSpeed - velocity));
  } else {
    return baseFrequency * (soundSpeed / (soundSpeed + velocity));
  }
}

export function calculateVelocity(
  baseFrequency: number,
  observedFrequency: number,
  soundSpeed: number = SOUND_SPEED
): { velocity: number; detectedDirection: Direction } {
  const frequencyShift = observedFrequency - baseFrequency;
  
  if (Math.abs(frequencyShift) < 0.001) {
    return { velocity: 0, detectedDirection: 'approaching' };
  }

  const detectedDirection: Direction = frequencyShift > 0 ? 'approaching' : 'receding';
  const velocity = soundSpeed * Math.abs(observedFrequency - baseFrequency) / baseFrequency;

  return { velocity, detectedDirection };
}

export function calculateDopplerShift(
  baseFrequency: number,
  observedFrequency: number,
  direction: Direction,
  soundSpeed: number = SOUND_SPEED
): DopplerResult {
  const { velocity, detectedDirection } = calculateVelocity(baseFrequency, observedFrequency, soundSpeed);
  const frequencyShift = observedFrequency - baseFrequency;
  const confidence = calculateConfidence(baseFrequency, observedFrequency);

  return {
    observedFrequency,
    frequencyShift,
    velocity,
    direction: detectedDirection,
    confidence
  };
}

function calculateConfidence(baseFrequency: number, observedFrequency: number): number {
  const shiftRatio = Math.abs(observedFrequency - baseFrequency) / baseFrequency;
  
  if (shiftRatio === 0) return 100;
  if (shiftRatio < 0.01) return 95;
  if (shiftRatio < 0.05) return 85;
  if (shiftRatio < 0.1) return 70;
  if (shiftRatio < 0.2) return 50;
  return 30;
}

export function checkDirectionConsistency(
  observedFrequency: number,
  baseFrequency: number,
  expectedDirection: Direction
): { isConsistent: boolean; detectedDirection: Direction } {
  const frequencyShift = observedFrequency - baseFrequency;
  const detectedDirection: Direction = frequencyShift >= 0 ? 'approaching' : 'receding';
  
  return {
    isConsistent: detectedDirection === expectedDirection,
    detectedDirection
  };
}
