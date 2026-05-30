export interface Container {
  id: string;
  position: { x: number; y: number; z: number };
  height: number;
  status: 'normal' | 'overheight' | 'warning';
}

export interface Block {
  id: string;
  name: string;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  containers: Container[];
}

export interface Yard {
  id: string;
  name: string;
  width: number;
  depth: number;
  blocks: Block[];
}

export interface BlindArea {
  id: string;
  position: { x: number; z: number };
  radius: number;
  status: 'pending' | 'confirmed' | 'resolved';
  assignee?: string;
}

export interface Crane {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
  maxHeight: number;
  blindAreas: BlindArea[];
}

export interface TruckRoute {
  id: string;
  truckId: string;
  points: { x: number; z: number; time: number }[];
  color: string;
}

export interface Conflict {
  id: string;
  type: 'crossing' | 'overheight' | 'blind';
  position: { x: number; y: number; z: number };
  description: string;
  status: 'pending' | 'confirmed' | 'resolved';
  assignee?: string;
  affectedRoutes?: string[];
}

export interface ParamChange {
  id: string;
  timestamp: number;
  paramName: string;
  oldValue: any;
  newValue: any;
  user: string;
  description: string;
}
