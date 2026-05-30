export interface Forklift {
  id: string;
  name: string;
  turnRadius: number;
  maxHeight: number;
  maxLoad: number;
  length: number;
  width: number;
  maintainer: string;
}

export interface ForkliftState {
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  forkHeight: number;
  isMoving: boolean;
  steeringAngle: number;
}
