import { Point } from '@/types';

export const CAMPUS_MAP_CONFIG = {
  width: 800,
  height: 600,
  buildings: [
    { id: 'b1', name: '教学楼A', x: 100, y: 80, width: 120, height: 100, color: '#6B8E9F' },
    { id: 'b2', name: '教学楼B', x: 280, y: 80, width: 100, height: 100, color: '#6B8E9F' },
    { id: 'b3', name: '实验楼', x: 450, y: 60, width: 150, height: 120, color: '#5D7A8C' },
    { id: 'b4', name: '图书馆', x: 150, y: 250, width: 180, height: 140, color: '#4A6572' },
    { id: 'b5', name: '食堂', x: 420, y: 280, width: 140, height: 100, color: '#6B8E9F' },
    { id: 'b6', name: '宿舍楼1', x: 100, y: 450, width: 100, height: 100, color: '#7A9BAE' },
    { id: 'b7', name: '宿舍楼2', x: 260, y: 450, width: 100, height: 100, color: '#7A9BAE' },
    { id: 'b8', name: '体育馆', x: 500, y: 430, width: 160, height: 120, color: '#5D7A8C' },
  ],
  exits: [
    { id: 'e1', name: '正门', x: 400, y: 20, width: 60, height: 20 },
    { id: 'e2', name: '侧门', x: 20, y: 300, width: 20, height: 60 },
    { id: 'e3', name: '后门', x: 400, y: 580, width: 60, height: 20 },
  ],
};

export const PRESET_ROUTE: Point[] = [
  { x: 160, y: 130, timestamp: 0 },
  { x: 200, y: 200, timestamp: 0 },
  { x: 240, y: 280, timestamp: 0 },
  { x: 350, y: 320, timestamp: 0 },
  { x: 420, y: 230, timestamp: 0 },
  { x: 400, y: 120, timestamp: 0 },
  { x: 400, y: 50, timestamp: 0 },
];

export const SAFE_COLORS = [
  { r: 255, g: 0, b: 0, tolerance: 30, name: '安全红' },
  { r: 0, g: 255, b: 0, tolerance: 30, name: '安全绿' },
  { r: 255, g: 255, b: 0, tolerance: 30, name: '警示黄' },
  { r: 255, g: 255, b: 255, tolerance: 30, name: '白色' },
];

export function checkHit(point: Point, routePoints: Point[], threshold = 30): boolean {
  return routePoints.some(routePoint => {
    const distance = Math.sqrt(
      Math.pow(point.x - routePoint.x, 2) + 
      Math.pow(point.y - routePoint.y, 2)
    );
    return distance <= threshold;
  });
}

export function checkColorOutOfBounds(
  pixelColor: { r: number; g: number; b: number },
  allowedColors = SAFE_COLORS
): boolean {
  return !allowedColors.some(allowed => {
    return (
      Math.abs(pixelColor.r - allowed.r) <= allowed.tolerance &&
      Math.abs(pixelColor.g - allowed.g) <= allowed.tolerance &&
      Math.abs(pixelColor.b - allowed.b) <= allowed.tolerance
    );
  });
}
