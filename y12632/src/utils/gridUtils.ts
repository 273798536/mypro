import type { Point, GridConfig } from "@/types";

export function snapToGrid(point: Point, gridConfig: GridConfig): Point {
  if (!gridConfig.enabled) return { ...point };

  const { size, snapThreshold } = gridConfig;
  const snappedX = Math.round(point.x / size) * size;
  const snappedY = Math.round(point.y / size) * size;

  const distX = Math.abs(point.x - snappedX);
  const distY = Math.abs(point.y - snappedY);

  return {
    x: distX <= snapThreshold ? snappedX : point.x,
    y: distY <= snapThreshold ? snappedY : point.y,
  };
}

export function snapCoordsToGrid(
  coords: Point[],
  gridConfig: GridConfig
): { coords: Point[]; wasSnapped: boolean } {
  if (!gridConfig.enabled) return { coords, wasSnapped: false };

  let wasSnapped = false;
  const snapped = coords.map((p) => {
    const sp = snapToGrid(p, gridConfig);
    if (sp.x !== p.x || sp.y !== p.y) wasSnapped = true;
    return sp;
  });

  return { coords: snapped, wasSnapped };
}

export function generateGridLines(
  width: number,
  height: number,
  gridSize: number
): { vertical: number[]; horizontal: number[] } {
  const vertical: number[] = [];
  const horizontal: number[] = [];

  for (let x = 0; x <= width; x += gridSize) {
    vertical.push(x);
  }
  for (let y = 0; y <= height; y += gridSize) {
    horizontal.push(y);
  }

  return { vertical, horizontal };
}

export function flipPointHorizontal(p: Point, imageWidth: number): Point {
  return { x: imageWidth - p.x, y: p.y };
}

export function flipPointVertical(p: Point, imageHeight: number): Point {
  return { x: p.x, y: imageHeight - p.y };
}

export function rotatePoint90(p: Point, imageWidth: number): Point {
  return { x: imageWidth - p.y, y: p.x };
}

export function rotatePoint180(p: Point, imageWidth: number, imageHeight: number): Point {
  return { x: imageWidth - p.x, y: imageHeight - p.y };
}

export function rotatePoint270(p: Point, imageHeight: number): Point {
  return { x: p.y, y: imageHeight - p.x };
}

export function transformCoords(
  coords: Point[],
  transform: "horizontal" | "vertical" | "both" | "rotation_90" | "rotation_180" | "rotation_270",
  imageWidth: number,
  imageHeight: number
): Point[] {
  switch (transform) {
    case "horizontal":
      return coords.map((p) => flipPointHorizontal(p, imageWidth));
    case "vertical":
      return coords.map((p) => flipPointVertical(p, imageHeight));
    case "both":
      return coords.map((p) => rotatePoint180(p, imageWidth, imageHeight));
    case "rotation_90":
      return coords.map((p) => rotatePoint90(p, imageWidth));
    case "rotation_180":
      return coords.map((p) => rotatePoint180(p, imageWidth, imageHeight));
    case "rotation_270":
      return coords.map((p) => rotatePoint270(p, imageHeight));
    default:
      return coords;
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
