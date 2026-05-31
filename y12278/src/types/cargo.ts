export interface CargoGrid {
  id: string;
  shipModelId: string;
  rows: number;
  cols: number;
  layers: number;
  cellWidth: number;
  cellLength: number;
  cellHeight: number;
  gridConfig: {
    origin: {
      x: number;
      y: number;
      z: number;
    };
  };
  createdAt: string;
}

export interface CargoCell {
  id: string;
  gridId: string;
  row: number;
  col: number;
  layer: number;
  maxCapacity: number;
  currentLoad: number;
  cargoName: string;
  status: 'empty' | 'loaded' | 'overload' | 'warning';
  centerOfGravity: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CargoItem {
  id: string;
  name: string;
  weight: number;
  category: string;
  color: string;
}
