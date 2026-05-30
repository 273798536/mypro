export interface BlindZone {
  x: number;
  z: number;
  radius: number;
}

export interface Shelf {
  id: string;
  name: string;
  height: number;
  width: number;
  depth: number;
  aisleWidth: number;
  position: { x: number; z: number };
  blindZones: BlindZone[];
  maintainer: string;
}

export interface ShelfCollisionBox {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}
