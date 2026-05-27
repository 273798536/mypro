import type { RatingLevel } from '../types';

export const RATING_ORDER: RatingLevel[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'];

export const getRatingIndex = (rating: RatingLevel): number => RATING_ORDER.indexOf(rating);

export const getMigrationDirection = (from: RatingLevel, to: RatingLevel): number => {
  return getRatingIndex(to) - getRatingIndex(from);
};

export const getMigrationDirectionText = (from: RatingLevel, to: RatingLevel): string => {
  const direction = getMigrationDirection(from, to);
  if (direction === 0) return '维持不变';
  if (direction > 0) return `向下迁徙 ${direction} 级`;
  return `向上迁徙 ${Math.abs(direction)} 级`;
};
