import type { LevelConfig, Passenger, GateConfig, ExitConfig, AreaConfig } from '@/types/game';

const PASSENGER_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

let passengerIdCounter = 0;

export const generatePassenger = (
  gates: GateConfig[],
  exits: ExitConfig[],
  mapWidth: number,
  mapHeight: number
): Passenger => {
  const openGates = gates.filter(g => g.status === 'open');
  if (openGates.length === 0) return null as unknown as Passenger;

  const gate = openGates[Math.floor(Math.random() * openGates.length)];
  const exit = exits[Math.floor(Math.random() * exits.length)];

  passengerIdCounter++;
  return {
    id: `P${passengerIdCounter}`,
    x: gate.x + Math.random() * 10 - 5,
    y: gate.y + gate.height / 2,
    targetExit: exit.id,
    waitTime: 0,
    status: 'moving',
    speed: 0.5 + Math.random() * 0.3,
    path: [],
    color: PASSENGER_COLORS[Math.floor(Math.random() * PASSENGER_COLORS.length)],
  };
};

export const calculatePath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  blockedAreas: AreaConfig[]
): { x: number; y: number }[] => {
  const path: { x: number; y: number }[] = [];

  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x = startX + (endX - startX) * t;
    let y = startY + (endY - startY) * t;

    for (const area of blockedAreas) {
      if (area.blocked) {
        const isInBlockedArea =
          x >= area.x &&
          x <= area.x + area.width &&
          y >= area.y &&
          y <= area.y + area.height;

        if (isInBlockedArea) {
          const offsetX = (x - (area.x + area.width / 2)) * 0.3;
          x += offsetX;
        }
      }
    }

    path.push({ x, y });
  }

  return path;
};

export const checkCongestion = (passengers: Passenger[]): { x: number; y: number; radius: number }[] => {
  const congestionZones: { x: number; y: number; radius: number }[] = [];
  const gridSize = 50;
  const passengerGrid: Record<string, Passenger[]> = {};

  for (const passenger of passengers) {
    if (passenger.status === 'exited') continue;
    const gridX = Math.floor(passenger.x / gridSize);
    const gridY = Math.floor(passenger.y / gridSize);
    const key = `${gridX},${gridY}`;

    if (!passengerGrid[key]) {
      passengerGrid[key] = [];
    }
    passengerGrid[key].push(passenger);
  }

  for (const [key, group] of Object.entries(passengerGrid)) {
    if (group.length >= 5) {
      const avgX = group.reduce((sum, p) => sum + p.x, 0) / group.length;
      const avgY = group.reduce((sum, p) => sum + p.y, 0) / group.length;
      congestionZones.push({ x: avgX, y: avgY, radius: 60 + group.length * 2 });
    }
  }

  return congestionZones;
};

export const updatePassengerPosition = (
  passenger: Passenger,
  exits: ExitConfig[],
  blockedAreas: AreaConfig[],
  congestionZones: { x: number; y: number; radius: number }[]
): Passenger => {
  if (passenger.status === 'exited') return passenger;

  const exit = exits.find(e => e.id === passenger.targetExit);
  if (!exit) return { ...passenger, status: 'stuck' };

  let inCongestion = false;
  for (const zone of congestionZones) {
    const dist = Math.sqrt(
      Math.pow(passenger.x - zone.x, 2) + Math.pow(passenger.y - zone.y, 2)
    );
    if (dist < zone.radius) {
      inCongestion = true;
      break;
    }
  }

  if (inCongestion) {
    return {
      ...passenger,
      waitTime: passenger.waitTime + 1,
      status: passenger.waitTime > 30 ? 'stuck' : 'waiting',
    };
  }

  const dx = exit.x - passenger.x;
  const dy = exit.y - passenger.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 10) {
    return { ...passenger, status: 'exited', x: exit.x, y: exit.y };
  }

  let offsetX = 0;
  let offsetY = 0;

  for (const area of blockedAreas) {
    if (area.blocked) {
      const isNearBlocked =
        passenger.x >= area.x - 20 &&
        passenger.x <= area.x + area.width + 20 &&
        passenger.y >= area.y - 20 &&
        passenger.y <= area.y + area.height + 20;

      if (isNearBlocked) {
        const centerX = area.x + area.width / 2;
        const centerY = area.y + area.height / 2;
        const avoidDist = Math.sqrt(
          Math.pow(passenger.x - centerX, 2) + Math.pow(passenger.y - centerY, 2)
        );
        if (avoidDist < 100) {
          offsetX = ((passenger.x - centerX) / avoidDist) * 2;
          offsetY = ((passenger.y - centerY) / avoidDist) * 2;
        }
      }
    }
  }

  const speed = passenger.speed * (0.5 + Math.random() * 0.5);
  const newX = passenger.x + (dx / distance) * speed + offsetX;
  const newY = passenger.y + (dy / distance) * speed + offsetY;

  return {
    ...passenger,
    x: Math.max(10, Math.min(790, newX)),
    y: Math.max(10, Math.min(490, newY)),
    waitTime: Math.max(0, passenger.waitTime - 1),
    status: 'moving',
  };
};

export const getDefaultLevelConfig = (): LevelConfig => ({
  id: 'level-1',
  name: '站务培训 - 基础关',
  maxPassengers: 30,
  timeLimit: 180,
  gates: [
    { id: 'gate-a1', name: 'A1闸机', x: 80, y: 400, width: 60, height: 30, status: 'open', capacity: 30 },
    { id: 'gate-a2', name: 'A2闸机', x: 160, y: 400, width: 60, height: 30, status: 'open', capacity: 30 },
    { id: 'gate-b1', name: 'B1闸机', x: 240, y: 400, width: 60, height: 30, status: 'open', capacity: 30 },
    { id: 'gate-b2', name: 'B2闸机', x: 320, y: 400, width: 60, height: 30, status: 'open', capacity: 30 },
  ],
  exits: [
    { id: 'exit-east', name: '东出口', x: 750, y: 100, direction: '东' },
    { id: 'exit-west', name: '西出口', x: 50, y: 100, direction: '西' },
    { id: 'exit-north', name: '北出口', x: 400, y: 50, direction: '北' },
  ],
  areas: [
    { id: 'area-north', name: '站厅北侧', x: 150, y: 150, width: 500, height: 150, blocked: false },
    { id: 'area-south', name: '站厅南侧', x: 50, y: 350, width: 700, height: 100, blocked: false },
    { id: 'area-center', name: '中央通道', x: 300, y: 250, width: 200, height: 100, blocked: false },
  ],
  emergencyEvents: [
    {
      id: 'event-1',
      type: 'gate_fault',
      triggerTime: 30,
      affectedGates: ['gate-b2'],
      affectedAreas: [],
      description: 'B2闸机故障，请及时处理',
      triggered: false,
      resolved: false,
    },
    {
      id: 'event-2',
      type: 'crowd_surge',
      triggerTime: 60,
      affectedGates: [],
      affectedAreas: ['area-center'],
      description: '中央通道客流激增，请疏导',
      triggered: false,
      resolved: false,
    },
    {
      id: 'event-3',
      type: 'station_close',
      triggerTime: 120,
      affectedGates: ['gate-a1', 'gate-a2'],
      affectedAreas: ['area-south'],
      description: '设备维护，需要封站',
      triggered: false,
      resolved: false,
    },
  ],
});

export const calculateScoreDetails = (
  passengers: Passenger[],
  timeRemaining: number,
  actionLogs: { result: string }[]
) => {
  const totalPassengers = passengers.length;
  const exitedCount = passengers.filter(p => p.status === 'exited').length;
  const stuckCount = passengers.filter(p => p.status === 'stuck').length;
  const waitingCount = passengers.filter(p => p.status === 'waiting').length;

  const evacuationScore = Math.round((exitedCount / Math.max(totalPassengers, 1)) * 100);
  const orderScore = Math.max(0, 100 - stuckCount * 15 - waitingCount * 5);
  const timeBonus = Math.min(50, Math.round(timeRemaining / 4));
  const responseScore = Math.max(0, 100 - actionLogs.filter(l => l.result === 'error').length * 10);

  return [
    { category: '疏散效率', score: evacuationScore, maxScore: 100, reason: `${exitedCount}/${totalPassengers} 乘客已疏散` },
    { category: '秩序维护', score: orderScore, maxScore: 100, reason: `拥堵${stuckCount}人，等待${waitingCount}人` },
    { category: '时间管理', score: timeBonus, maxScore: 50, reason: `剩余${timeRemaining}秒` },
    { category: '响应及时', score: responseScore, maxScore: 100, reason: `错误操作${actionLogs.filter(l => l.result === 'error').length}次` },
  ];
};