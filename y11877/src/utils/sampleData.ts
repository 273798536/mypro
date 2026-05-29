import type { MirrorSegment, IncidentRay } from './types';

export const sampleMirrors: MirrorSegment[] = [
  { id: 'M1', startX: 2, startY: 0, endX: 2, endY: 4, normalAngle: 180 },
  { id: 'M2', startX: 0, startY: 5, endX: 5, endY: 5, normalAngle: 90 },
  { id: 'M3', startX: 6, startY: 1, endX: 9, endY: 4 },
  { id: 'M4', startX: 0, startY: 8, endX: 4, endY: 8, normalAngle: 270 },
  { id: 'M5', startX: 3, startY: 0, endX: 3, endY: 3 },
];

export const sampleRays: IncidentRay[] = [
  { id: 'R1', originX: 0, originY: 2, directionAngle: 0, angleUnit: 'deg' },
  { id: 'R2', originX: 1, originY: 1, directionAngle: 45, angleUnit: 'deg' },
  { id: 'R3', originX: 4, originY: 4, directionAngle: 90, angleUnit: 'deg' },
  { id: 'R4', originX: 0, originY: 6, directionAngle: 30, angleUnit: 'deg' },
  { id: 'R5', originX: 1, originY: 3, directionAngle: 0, angleUnit: 'deg' },
  { id: 'R6', originX: 0, originY: 9, directionAngle: 15, angleUnit: 'deg' },
  { id: 'R7', originX: 5, originY: 2, directionAngle: 0, angleUnit: 'deg' },
  { id: 'R8', originX: 0, originY: 2, directionAngle: 90, angleUnit: 'deg' },
  { id: 'R9', originX: 1, originY: 7, directionAngle: 200, angleUnit: 'rad' },
  { id: 'R10', originX: 7, originY: 0, directionAngle: 60, angleUnit: 'deg' },
];

export const sampleMirrorText = `# 镜面线段样例数据
# 格式: startX,startY,endX,endY[,normalAngle]
2,0,2,4,180
0,5,5,5,90
6,1,9,4
0,8,4,8,270
3,0,3,3`;

export const sampleRayText = `# 入射光线样例数据
# 格式: originX,originY,directionAngle[,deg|rad]
0,2,0,deg
1,1,45,deg
4,4,90,deg
0,6,30,deg
1,3,0,deg
0,9,15,deg
5,2,0,deg
0,2,90,deg
1,7,200,rad
7,0,60,deg`;
