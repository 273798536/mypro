export interface DroneSpec {
  id: string;
  name: string;
  emptyWeight: number;
  maxPayload: number;
  hoverPower: number;
  cruiseSpeed: number;
  frontalArea: number;
  dragCoefficient: number;
  sourceRef: string;
}

export interface BatterySpec {
  id: string;
  name: string;
  capacityWh: number;
  voltage: number;
  weight: number;
  dischargeEfficiency: number;
  sourceRef: string;
}

export interface CalcParams {
  droneId: string;
  batteryId: string;
  payload: number;
  windSpeed: number;
  windDirection: number;
  routeDistance: number;
  altitude: number;
  returnReserveRatio: number;
  sourceRef: string;
}

export interface EnergyBreakdown {
  hoverEnergy: number;
  climbEnergy: number;
  cruiseOutEnergy: number;
  cruiseBackEnergy: number;
  windPenalty: number;
  payloadPenalty: number;
}

export interface Warning {
  id: string;
  type: 'headwind' | 'overload' | 'low_reserve' | 'low_battery';
  severity: 'error' | 'warning';
  message: string;
  sourceLine: string;
}

export interface CalcResult {
  totalEnergyNeeded: number;
  breakdown: EnergyBreakdown;
  reserveEnergy: number;
  remainingEnergy: number;
  flightTime: number;
  effectiveRange: number;
  warnings: Warning[];
}

export interface CalcRecord {
  id: string;
  timestamp: string;
  params: CalcParams;
  result: CalcResult;
  sourceRef: string;
  corrections: string;
}

export const DRONE_SPECS: DroneSpec[] = [
  {
    id: 'dji-m300',
    name: 'DJI Matrice 300 RTK',
    emptyWeight: 6.3,
    maxPayload: 2.7,
    hoverPower: 580,
    cruiseSpeed: 15,
    frontalArea: 0.12,
    dragCoefficient: 0.8,
    sourceRef: 'DJI官方规格书v2.3'
  },
  {
    id: 'dji-m350',
    name: 'DJI Matrice 350 RTK',
    emptyWeight: 6.5,
    maxPayload: 2.7,
    hoverPower: 560,
    cruiseSpeed: 16,
    frontalArea: 0.11,
    dragCoefficient: 0.75,
    sourceRef: 'DJI官方规格书v3.1'
  },
  {
    id: 'dji-mavic3e',
    name: 'DJI Mavic 3 Enterprise',
    emptyWeight: 0.92,
    maxPayload: 0,
    hoverPower: 120,
    cruiseSpeed: 12,
    frontalArea: 0.025,
    dragCoefficient: 0.6,
    sourceRef: 'DJI官方规格书v1.8'
  },
  {
    id: 'autel-evo-ii',
    name: 'Autel EVO II Pro',
    emptyWeight: 1.2,
    maxPayload: 0.5,
    hoverPower: 165,
    cruiseSpeed: 13,
    frontalArea: 0.03,
    dragCoefficient: 0.65,
    sourceRef: 'Autel技术手册v2.0'
  }
];

export const BATTERY_SPECS: BatterySpec[] = [
  {
    id: 'dji-tb60',
    name: 'DJI TB60 智能电池',
    capacityWh: 274,
    voltage: 51.8,
    weight: 1.12,
    dischargeEfficiency: 0.95,
    sourceRef: 'DJI TB60规格书'
  },
  {
    id: 'dji-tb65',
    name: 'DJI TB65 智能电池',
    capacityWh: 428,
    voltage: 51.8,
    weight: 1.62,
    dischargeEfficiency: 0.95,
    sourceRef: 'DJI TB65规格书'
  },
  {
    id: 'dji-tb30',
    name: 'DJI TB30 智能电池',
    capacityWh: 142,
    voltage: 30.4,
    weight: 0.62,
    dischargeEfficiency: 0.95,
    sourceRef: 'DJI Mavic 3E规格书'
  },
  {
    id: 'autel-evo-battery',
    name: 'Autel EVO II 智能电池',
    capacityWh: 93.5,
    voltage: 14.8,
    weight: 0.45,
    dischargeEfficiency: 0.93,
    sourceRef: 'Autel EVO II规格书'
  }
];
