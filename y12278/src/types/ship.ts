export interface ShipModel {
  id: string;
  name: string;
  length: number;
  width: number;
  depth: number;
  draft: number;
  displacement: number;
  lightShipWeight: number;
  lightShipCG: {
    x: number;
    y: number;
    z: number;
  };
  modelConfig: {
    hullColor: string;
    deckColor: string;
  };
  remark: string;
  createdAt: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}
