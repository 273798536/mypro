import type { Point } from '@/types';

export class CoordinateService {
  static screenToImage(
    screenPoint: Point,
    zoom: number,
    pan: Point,
    canvasOffset: Point,
    imageOffset: Point
  ): Point {
    return {
      x: (screenPoint.x - canvasOffset.x - pan.x - imageOffset.x) / zoom,
      y: (screenPoint.y - canvasOffset.y - pan.y - imageOffset.y) / zoom
    };
  }

  static imageToScreen(
    imagePoint: Point,
    zoom: number,
    pan: Point,
    canvasOffset: Point,
    imageOffset: Point
  ): Point {
    return {
      x: imagePoint.x * zoom + pan.x + imageOffset.x + canvasOffset.x,
      y: imagePoint.y * zoom + pan.y + imageOffset.y + canvasOffset.y
    };
  }

  static getImageOffset(
    canvasWidth: number,
    canvasHeight: number,
    imageWidth: number,
    imageHeight: number,
    zoom: number
  ): Point {
    const scaledWidth = imageWidth * zoom;
    const scaledHeight = imageHeight * zoom;
    return {
      x: (canvasWidth - scaledWidth) / 2,
      y: (canvasHeight - scaledHeight) / 2
    };
  }

  static isPointInBounds(
    point: Point,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  static distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}
