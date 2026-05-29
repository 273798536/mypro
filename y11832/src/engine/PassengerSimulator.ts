import {
  Passenger,
  Gate,
  Exit,
  LockdownArea,
  DiversionRoute,
  Position,
} from '../types';
import {
  calculateDistance,
  calculateCongestionLevel,
  findNearestExit,
  isInLockdownArea,
  isPointInRect,
  getOptimalPath,
} from '../utils/locationUtils';

const PASSENGER_COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#F06292', '#9575CD', '#4DB6AC'];

const getRandomColor = (): string => {
  return PASSENGER_COLORS[Math.floor(Math.random() * PASSENGER_COLORS.length)];
};

const getNormalGatePosition = (gates: Gate[]): Position | null => {
  const normalGates = gates.filter((g) => g.status === 'normal');
  if (normalGates.length === 0) return null;
  const gate = normalGates[Math.floor(Math.random() * normalGates.length)];
  return {
    x: gate.position.x + gate.width / 2,
    y: gate.position.y + gate.height / 2,
  };
};

export const createPassenger = (
  id: string,
  spawnPosition: Position,
  targetExit: string,
  currentTime: number,
  gates: Gate[],
  exits: Exit[],
  lockdownAreas: LockdownArea[]
): Passenger => {
  const targetExitObj = exits.find((e) => e.id === targetExit);
  const endPosition = targetExitObj
    ? {
        x: targetExitObj.position.x + targetExitObj.width / 2,
        y: targetExitObj.position.y + targetExitObj.height / 2,
      }
    : spawnPosition;

  const obstacles = [
    ...gates.filter((g) => g.status === 'faulty' || g.status === 'closed').map((g) => ({
      x: g.position.x,
      y: g.position.y,
      width: g.width,
      height: g.height,
    })),
    ...lockdownAreas,
  ];

  const path = getOptimalPath(spawnPosition, endPosition, obstacles);

  return {
    id,
    position: { ...spawnPosition },
    targetExit,
    speed: 0.8 + Math.random() * 0.4,
    status: 'entering',
    path,
    color: getRandomColor(),
    enteredAt: currentTime,
  };
};

export const simulatePassengerMovement = (
  passenger: Passenger,
  gates: Gate[],
  exits: Exit[],
  lockdownAreas: LockdownArea[],
  diversionRoutes: DiversionRoute[],
  recentDiversionBroadcasts: string[],
  currentTime: number,
  passengers: Passenger[]
): Passenger => {
  if (passenger.status === 'exited') {
    return passenger;
  }

  const targetExit = exits.find((e) => e.id === passenger.targetExit);
  if (!targetExit) {
    return { ...passenger, status: 'stuck' };
  }

  const centerOfTarget = {
    x: targetExit.position.x + targetExit.width / 2,
    y: targetExit.position.y + targetExit.height / 2,
  };

  if (calculateDistance(passenger.position, centerOfTarget) < 20) {
    return {
      ...passenger,
      status: 'exited',
      exitedAt: currentTime,
    };
  }

  if (passenger.path.length === 0) {
    const obstacles = [
      ...gates.filter((g) => g.status === 'faulty' || g.status === 'closed').map((g) => ({
        x: g.position.x,
        y: g.position.y,
        width: g.width,
        height: g.height,
      })),
      ...lockdownAreas,
    ];
    const newPath = getOptimalPath(passenger.position, centerOfTarget, obstacles);
    return { ...passenger, path: newPath };
  }

  let targetExitId = passenger.targetExit;
  let shouldRecalculatePath = false;

  if (recentDiversionBroadcasts.length > 0) {
    const diversion = diversionRoutes.find((d) => {
      const gate = gates.find((g) => g.id === d.fromGateId);
      if (!gate) return false;
      return (
        isPointInRect(passenger.position, {
          x: gate.position.x - 30,
          y: gate.position.y - 30,
          width: gate.width + 60,
          height: gate.height + 60,
        }) && d.toExitId !== passenger.targetExit
      );
    });

    if (diversion) {
      targetExitId = diversion.toExitId;
      shouldRecalculatePath = true;
    }
  }

  if (isInLockdownArea(passenger.position, lockdownAreas)) {
    const nearestExit = findNearestExit(passenger.position, exits);
    if (nearestExit && nearestExit.id !== passenger.targetExit) {
      targetExitId = nearestExit.id;
      shouldRecalculatePath = true;
    }
  }

  let path = passenger.path;
  if (shouldRecalculatePath && targetExitId !== passenger.targetExit) {
    const newTargetExit = exits.find((e) => e.id === targetExitId);
    if (newTargetExit) {
      const newCenter = {
        x: newTargetExit.position.x + newTargetExit.width / 2,
        y: newTargetExit.position.y + newTargetExit.height / 2,
      };
      const obstacles = [
        ...gates.filter((g) => g.status === 'faulty' || g.status === 'closed').map((g) => ({
          x: g.position.x,
          y: g.position.y,
          width: g.width,
          height: g.height,
        })),
        ...lockdownAreas,
      ];
      path = getOptimalPath(passenger.position, newCenter, obstacles);
    }
  }

  const congestion = calculateCongestionLevel(passenger.position, passengers);
  const congestionFactor = 1 - congestion * 0.7;
  const broadcastFactor = recentDiversionBroadcasts.length > 0 ? 1.15 : 1;
  const actualSpeed = passenger.speed * congestionFactor * broadcastFactor;

  let nextPoint = path[0];
  const distToNext = calculateDistance(passenger.position, nextPoint);

  if (distToNext < actualSpeed * 2) {
    path = path.slice(1);
    if (path.length > 0) {
      nextPoint = path[0];
    }
  }

  const dx = nextPoint.x - passenger.position.x;
  const dy = nextPoint.y - passenger.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let newX = passenger.position.x;
  let newY = passenger.position.y;

  if (dist > 0) {
    newX = passenger.position.x + (dx / dist) * actualSpeed * 2;
    newY = passenger.position.y + (dy / dist) * actualSpeed * 2;
  }

  const newPosition = { x: newX, y: newY };

  let newStatus: Passenger['status'] = 'moving';
  if (congestion > 0.8) {
    newStatus = 'waiting';
  }

  const timeInSystem = currentTime - passenger.enteredAt;
  if (newStatus === 'waiting' && timeInSystem > 60) {
    newStatus = 'stuck';
  }

  return {
    ...passenger,
    position: newPosition,
    targetExit: targetExitId,
    path,
    status: newStatus,
  };
};

export const updateExitCongestion = (exits: Exit[], passengers: Passenger[]): Exit[] => {
  return exits.map((exit) => {
    const nearbyPassengers = passengers.filter((p) => {
      if (p.status === 'exited') return false;
      const dist = calculateDistance(p.position, {
        x: exit.position.x + exit.width / 2,
        y: exit.position.y + exit.height / 2,
      });
      return dist < 80;
    });

    const congestionLevel = Math.min(1, nearbyPassengers.length / exit.capacity);
    return { ...exit, congestionLevel };
  });
};

export const spawnPassengers = (
  count: number,
  startId: number,
  currentTime: number,
  gates: Gate[],
  exits: Exit[],
  lockdownAreas: LockdownArea[],
  entrances: Array<{ id: string; x: number; y: number; name: string }>
): Passenger[] => {
  const newPassengers: Passenger[] = [];

  for (let i = 0; i < count; i++) {
    const entrance = entrances[Math.floor(Math.random() * entrances.length)];
    const spawnPos = {
      x: entrance.x + (Math.random() - 0.5) * 40,
      y: entrance.y + (Math.random() - 0.5) * 20,
    };

    const targetExit = exits[Math.floor(Math.random() * exits.length)];

    const passenger = createPassenger(
      `passenger-${startId + i}`,
      spawnPos,
      targetExit.id,
      currentTime,
      gates,
      exits,
      lockdownAreas
    );

    newPassengers.push(passenger);
  }

  return newPassengers;
};
