import { Track, Annotation, Point } from '../types';
import { generateId } from '../utils/coordinate';

function generateTrackPoints(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  points: number = 50
): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const noiseX = (Math.random() - 0.5) * 0.05;
    const noiseY = (Math.random() - 0.5) * 0.05;
    result.push({
      x: startX + (endX - startX) * t + noiseX,
      y: startY + (endY - startY) * t + noiseY,
      timestamp: i * 100
    });
  }
  return result;
}

function generateCurvedTrack(
  controlPoints: Point[],
  points: number = 50
): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const p = bezierInterpolate(controlPoints, t);
    result.push({
      ...p,
      timestamp: i * 100
    });
  }
  return result;
}

function bezierInterpolate(points: Point[], t: number): Point {
  if (points.length === 1) return points[0];
  const newPoints: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    newPoints.push({
      x: points[i].x + (points[i + 1].x - points[i].x) * t,
      y: points[i].y + (points[i + 1].y - points[i].y) * t
    });
  }
  return bezierInterpolate(newPoints, t);
}

export const sampleTracks: Track[] = [
  {
    id: generateId(),
    name: '进攻路线 A',
    points: generateCurvedTrack([
      { x: 0.1, y: 0.8 },
      { x: 0.3, y: 0.6 },
      { x: 0.5, y: 0.7 },
      { x: 0.7, y: 0.4 },
      { x: 0.9, y: 0.3 }
    ]),
    color: '#165DFF',
    visible: true,
    batchId: 'batch_001',
    isFlipped: false,
    createdAt: new Date()
  },
  {
    id: generateId(),
    name: '防守路线 B',
    points: generateCurvedTrack([
      { x: 0.9, y: 0.2 },
      { x: 0.7, y: 0.3 },
      { x: 0.6, y: 0.5 },
      { x: 0.4, y: 0.4 },
      { x: 0.2, y: 0.6 }
    ]),
    color: '#00B42A',
    visible: true,
    batchId: 'batch_001',
    isFlipped: false,
    createdAt: new Date()
  },
  {
    id: generateId(),
    name: '传球路线 C',
    points: generateTrackPoints(0.3, 0.5, 0.8, 0.2, 30),
    color: '#FF7D00',
    visible: true,
    batchId: 'batch_001',
    isFlipped: false,
    createdAt: new Date()
  },
  {
    id: generateId(),
    name: '跑位路线 D',
    points: generateCurvedTrack([
      { x: 0.2, y: 0.3 },
      { x: 0.4, y: 0.2 },
      { x: 0.6, y: 0.35 },
      { x: 0.8, y: 0.25 }
    ]),
    color: '#722ED1',
    visible: true,
    batchId: 'batch_002',
    isFlipped: false,
    createdAt: new Date()
  }
];

export const sampleAnnotations: Annotation[] = [
  {
    id: generateId(),
    trackId: sampleTracks[0].id,
    x: 0.5,
    y: 0.65,
    type: 'abnormal',
    status: 'draft',
    note: '此处速度异常下降，可能受到干扰',
    createdAt: new Date()
  },
  {
    id: generateId(),
    trackId: sampleTracks[1].id,
    x: 0.65,
    y: 0.38,
    type: 'normal',
    status: 'confirmed',
    note: '正常防守位置',
    createdAt: new Date()
  },
  {
    id: generateId(),
    trackId: sampleTracks[2].id,
    x: 0.55,
    y: 0.35,
    type: 'pending',
    status: 'draft',
    note: '需要确认传球时机',
    createdAt: new Date()
  }
];

export const flippedTrackExample: Track = {
  id: generateId(),
  name: '翻转示例轨迹',
  points: [
    { x: 1.1, y: 1.2, timestamp: 0 },
    { x: 0.9, y: 1.1, timestamp: 100 },
    { x: 0.7, y: 0.9, timestamp: 200 },
    { x: 0.5, y: 0.8, timestamp: 300 },
    { x: 0.3, y: 0.7, timestamp: 400 }
  ],
  color: '#F53F3F',
  visible: true,
  batchId: 'batch_flipped',
  isFlipped: true,
  createdAt: new Date()
};
