import type { ViewState } from '@/types';

export const worldToScreen = (
  wx: number,
  wy: number,
  view: ViewState,
  canvasW: number,
  canvasH: number,
) => {
  const centerScreenX = canvasW / 2;
  const centerScreenY = canvasH / 2;
  const sx = centerScreenX + (wx - view.centerX) * view.scale + view.offsetX;
  const sy = centerScreenY + (wy - view.centerY) * view.scale + view.offsetY;
  return { x: sx, y: sy };
};

export const screenToWorld = (
  sx: number,
  sy: number,
  view: ViewState,
  canvasW: number,
  canvasH: number,
) => {
  const centerScreenX = canvasW / 2;
  const centerScreenY = canvasH / 2;
  const wx = (sx - centerScreenX - view.offsetX) / view.scale + view.centerX;
  const wy = (sy - centerScreenY - view.offsetY) / view.scale + view.centerY;
  return { x: wx, y: wy };
};

export const formatViewLabel = (view: ViewState) => {
  return `缩放 ${view.scale.toFixed(1)}x · 偏移 (${view.offsetX.toFixed(0)}, ${view.offsetY.toFixed(0)})`;
};
