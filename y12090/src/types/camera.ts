import type { Point3D } from './seat';

export interface ViewPreset {
  id: string;
  name: string;
  position: Point3D;
  target: Point3D;
  fov: number;
  createdAt: number;
}

export interface CameraState {
  position: Point3D;
  target: Point3D;
  fov: number;
}

export const DEFAULT_CAMERA_STATE: CameraState = {
  position: { x: 25, y: 20, z: 25 },
  target: { x: 0, y: 2, z: 0 },
  fov: 50,
};

export const DEFAULT_VIEW_PRESETS: ViewPreset[] = [
  {
    id: 'overview',
    name: '整体视角',
    position: { x: 25, y: 20, z: 25 },
    target: { x: 0, y: 2, z: 0 },
    fov: 50,
    createdAt: Date.now(),
  },
  {
    id: 'front',
    name: '正面视角',
    position: { x: 0, y: 8, z: 30 },
    target: { x: 0, y: 2, z: 0 },
    fov: 50,
    createdAt: Date.now(),
  },
  {
    id: 'side',
    name: '侧面视角',
    position: { x: 30, y: 8, z: 0 },
    target: { x: 0, y: 2, z: 0 },
    fov: 50,
    createdAt: Date.now(),
  },
  {
    id: 'top',
    name: '俯视视角',
    position: { x: 0, y: 35, z: 0.1 },
    target: { x: 0, y: 0, z: 0 },
    fov: 50,
    createdAt: Date.now(),
  },
];
