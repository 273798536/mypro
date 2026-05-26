export type Vec2 = { x: number; z: number };

export type RoutePoint = {
  x: number;
  z: number;
  y: number;
  idx: number;
};

export type SamplePoint = {
  id: string;
  x: number;
  z: number;
  kind: "rock" | "soil" | "ice";
  weight: number;
  collected: boolean;
};

export type CommWindow = {
  id: string;
  x: number;
  z: number;
  radius: number;
  startT: number;
  endT: number;
  used: boolean;
};

export type EnergyState = {
  battery: number;
  weight: number;
  shadowDepth: number;
  shadowCost: number;
  commMissed: number;
  commSuccess: number;
  overload: boolean;
  failed: boolean;
  failureReason: string | null;
};

export type Filters = {
  showRock: boolean;
  showSoil: boolean;
  showIce: boolean;
  showComm: boolean;
  shadowSensitivity: number;
};

export type SunState = {
  angle: number;
  intensity: number;
};

export type HistoryEntry = {
  id: string;
  time: number;
  action: string;
  route: RoutePoint[];
  energy: EnergyState;
  sun: SunState;
  samples: SamplePoint[];
  commWindows: CommWindow[];
  note: string;
};

export type ReplayState = {
  playing: boolean;
  step: number;
  speed: number;
};

export type MoonStore = {
  terrainSeed: number;
  route: RoutePoint[];
  samples: SamplePoint[];
  commWindows: CommWindow[];
  energy: EnergyState;
  sun: SunState;
  filters: Filters;
  history: HistoryEntry[];
  replay: ReplayState;
  setRoute: (r: RoutePoint[]) => void;
  appendRoutePoint: (p: RoutePoint) => void;
  popRoutePoint: () => void;
  resetRoute: () => void;
  setSun: (s: Partial<SunState>) => void;
  setFilters: (f: Partial<Filters>) => void;
  setEnergy: (e: EnergyState) => void;
  collectSample: (id: string) => void;
  useComm: (id: string, ok: boolean) => void;
  pushHistory: (note: string, action: string) => void;
  setReplay: (r: Partial<ReplayState>) => void;
  resetAll: () => void;
};
