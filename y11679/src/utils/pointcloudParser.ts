import { Point, PointCloudData } from '../types';
import { calculateBounds, generateId, normalizePoints } from './coordinateUtils';

export function parsePLY(content: string): Point[] {
  const lines = content.split('\n');
  const points: Point[] = [];
  let inHeader = true;
  let format = 'ascii';
  let vertexCount = 0;
  let properties: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'end_header') {
      inHeader = false;
      continue;
    }

    if (inHeader) {
      if (line.startsWith('format')) {
        format = line.split(' ')[1];
      } else if (line.startsWith('element vertex')) {
        vertexCount = parseInt(line.split(' ')[2], 10);
      } else if (line.startsWith('property')) {
        properties.push(line.split(' ').pop() || '');
      }
      continue;
    }

    if (points.length >= vertexCount) break;

    if (format === 'ascii') {
      const values = line.split(/\s+/).map(parseFloat);
      const point: Point = {
        x: values[0] || 0,
        y: values[1] || 0,
        z: values[2] || 0,
        r: values[3] !== undefined ? values[3] / 255 : 0.8,
        g: values[4] !== undefined ? values[4] / 255 : 0.8,
        b: values[5] !== undefined ? values[5] / 255 : 0.8,
        intensity: values[6],
      };
      points.push(point);
    }
  }

  return points;
}

export function parseLAS(content: ArrayBuffer): Point[] {
  const view = new DataView(content);
  const points: Point[] = [];

  if (view.getUint8(0) !== 0x4C || view.getUint8(1) !== 0x41 || view.getUint8(2) !== 0x53) {
    throw new Error('Invalid LAS file format');
  }

  const pointDataRecordFormat = view.getUint8(104);
  const pointDataRecordLength = view.getUint16(105);
  const numberOfPoints = view.getUint32(107);
  const scaleFactorX = view.getFloat64(131);
  const scaleFactorY = view.getFloat64(139);
  const scaleFactorZ = view.getFloat64(147);
  const offsetX = view.getFloat64(155);
  const offsetY = view.getFloat64(163);
  const offsetZ = view.getFloat64(171);
  const maxX = view.getFloat64(179);
  const minX = view.getFloat64(187);
  const maxY = view.getFloat64(195);
  const minY = view.getFloat64(203);
  const maxZ = view.getFloat64(211);
  const minZ = view.getFloat64(219);

  const pointDataOffset = view.getUint32(96);

  for (let i = 0; i < numberOfPoints && i < 1000000; i++) {
    const offset = pointDataOffset + i * pointDataRecordLength;

    const x = view.getInt32(offset) * scaleFactorX + offsetX;
    const y = view.getInt32(offset + 4) * scaleFactorY + offsetY;
    const z = view.getInt32(offset + 8) * scaleFactorZ + offsetZ;
    const intensity = view.getUint16(offset + 12);

    let r = 0.8, g = 0.8, b = 0.8;

    if (pointDataRecordFormat >= 2) {
      const colorOffset = offset + 20;
      r = view.getUint16(colorOffset) / 65535;
      g = view.getUint16(colorOffset + 2) / 65535;
      b = view.getUint16(colorOffset + 4) / 65535;
    }

    points.push({
      x,
      y,
      z,
      r,
      g,
      b,
      intensity,
    });
  }

  return points;
}

export function parseJSONPoints(content: string): Point[] {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data.map((p: any) => ({
        x: p.x || 0,
        y: p.y || 0,
        z: p.z || 0,
        r: p.r !== undefined ? p.r : 0.8,
        g: p.g !== undefined ? p.g : 0.8,
        b: p.b !== undefined ? p.b : 0.8,
        intensity: p.intensity,
      }));
    }
    if (data.points && Array.isArray(data.points)) {
      return data.points.map((p: any) => ({
        x: p.x || 0,
        y: p.y || 0,
        z: p.z || 0,
        r: p.r !== undefined ? p.r : 0.8,
        g: p.g !== undefined ? p.g : 0.8,
        b: p.b !== undefined ? p.b : 0.8,
        intensity: p.intensity,
      }));
    }
    throw new Error('Invalid JSON format');
  } catch (error) {
    throw new Error(`JSON parse error: ${error}`);
  }
}

export interface ParseResult {
  success: boolean;
  points?: Point[];
  error?: string;
}

export async function parsePointCloudFile(
  file: File,
  name: string,
  source: string
): Promise<ParseResult> {
  try {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let points: Point[] = [];

    if (extension === 'ply') {
      const content = await file.text();
      points = parsePLY(content);
    } else if (extension === 'las' || extension === 'laz') {
      const buffer = await file.arrayBuffer();
      points = parseLAS(buffer);
    } else if (extension === 'json') {
      const content = await file.text();
      points = parseJSONPoints(content);
    } else {
      return { success: false, error: `不支持的文件格式: .${extension}` };
    }

    if (points.length === 0) {
      return { success: false, error: '文件中没有有效的点数据' };
    }

    return { success: true, points };
  } catch (error) {
    return {
      success: false,
      error: `解析文件失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

export function createPointCloudData(
  name: string,
  source: string,
  points: Point[]
): PointCloudData {
  const bounds = calculateBounds(points);
  const offset = {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: bounds.min.z,
  };

  return {
    id: generateId(),
    name,
    source,
    points: normalizePoints(points, offset),
    offset,
    coordinateSystem: 'local',
    bounds: calculateBounds(normalizePoints(points, offset)),
    createdAt: new Date(),
  };
}

export function generateSamplePointCloud(
  numPoints: number = 50000,
  treeRows: number = 10,
  treesPerRow: number = 20
): Point[] {
  const points: Point[] = [];
  const treeSpacing = 3;
  const rowSpacing = 4;

  for (let row = 0; row < treeRows; row++) {
    for (let tree = 0; tree < treesPerRow; tree++) {
      const centerX = tree * treeSpacing;
      const centerY = row * rowSpacing;
      const treeHeight = 2 + Math.random() * 3;
      const crownRadius = 0.8 + Math.random() * 0.4;

      const pointsPerTree = Math.floor(numPoints / (treeRows * treesPerRow));

      for (let i = 0; i < pointsPerTree; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * crownRadius;
        const heightFactor = Math.random();
        const height = heightFactor * treeHeight;

        const r = 0.3 + Math.random() * 0.4;
        const g = 0.5 + Math.random() * 0.4;
        const b = 0.2 + Math.random() * 0.3;

        const damageChance = Math.random();
        let finalR = r, finalG = g, finalB = b;
        if (damageChance < 0.15) {
          finalR = 0.8 + Math.random() * 0.2;
          finalG = 0.2 + Math.random() * 0.3;
          finalB = 0.1 + Math.random() * 0.2;
        } else if (damageChance < 0.25) {
          finalR = 0.9;
          finalG = 0.7;
          finalB = 0.2;
        }

        points.push({
          x: centerX + Math.cos(angle) * radius * (1 - heightFactor * 0.3),
          y: centerY + Math.sin(angle) * radius * (1 - heightFactor * 0.3),
          z: height,
          r: finalR,
          g: finalG,
          b: finalB,
          intensity: 0.5 + Math.random() * 0.5,
        });
      }
    }
  }

  for (let i = 0; i < numPoints / 4; i++) {
    points.push({
      x: Math.random() * (treesPerRow * treeSpacing + 2) - 1,
      y: Math.random() * (treeRows * rowSpacing + 2) - 1,
      z: Math.random() * 0.1,
      r: 0.4 + Math.random() * 0.2,
      g: 0.35 + Math.random() * 0.15,
      b: 0.25 + Math.random() * 0.1,
      intensity: 0.3 + Math.random() * 0.3,
    });
  }

  return points;
}
