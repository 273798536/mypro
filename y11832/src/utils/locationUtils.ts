import { Position, Gate, Exit, LockdownArea, Passenger } from '../types';

export const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const isPointInRect = (
  point: Position,
  rect: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

export const findNearestExit = (
  position: Position,
  exits: Exit[],
  avoidExits: string[] = []
): Exit | null => {
  const availableExits = exits.filter((e) => !avoidExits.includes(e.id));
  if (availableExits.length === 0) return null;

  return availableExits.reduce((nearest, exit) => {
    const dist = calculateDistance(position, exit.position);
    const nearestDist = calculateDistance(position, nearest.position);
    return dist < nearestDist ? exit : nearest;
  });
};

export const findGateAtPosition = (position: Position, gates: Gate[]): Gate | null => {
  for (const gate of gates) {
    if (
      isPointInRect(position, {
        x: gate.position.x,
        y: gate.position.y,
        width: gate.width,
        height: gate.height,
      })
    ) {
      return gate;
    }
  }
  return null;
};

export const findExitAtPosition = (position: Position, exits: Exit[]): Exit | null => {
  for (const exit of exits) {
    if (
      isPointInRect(position, {
        x: exit.position.x,
        y: exit.position.y,
        width: exit.width,
        height: exit.height,
      })
    ) {
      return exit;
    }
  }
  return null;
};

export const isInLockdownArea = (
  position: Position,
  lockdownAreas: LockdownArea[]
): boolean => {
  return lockdownAreas.some((area) =>
    isPointInRect(position, {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
    })
  );
};

export const getLocationName = (
  locationRef: string,
  gates: Gate[],
  exits: Exit[]
): string => {
  if (locationRef.startsWith('gate-')) {
    const gate = gates.find((g) => g.id === locationRef);
    return gate ? gate.name : '未知闸机';
  }
  if (locationRef.startsWith('exit-')) {
    const exit = exits.find((e) => e.id === locationRef);
    return exit ? exit.name : '未知出口';
  }
  return locationRef;
};

export const getLocationCenter = (
  locationRef: string,
  gates: Gate[],
  exits: Exit[]
): Position | null => {
  if (locationRef.startsWith('gate-')) {
    const gate = gates.find((g) => g.id === locationRef);
    if (gate) {
      return {
        x: gate.position.x + gate.width / 2,
        y: gate.position.y + gate.height / 2,
      };
    }
  }
  if (locationRef.startsWith('exit-')) {
    const exit = exits.find((e) => e.id === locationRef);
    if (exit) {
      return {
        x: exit.position.x + exit.width / 2,
        y: exit.position.y + exit.height / 2,
      };
    }
  }
  return null;
};

export const calculateCongestionLevel = (
  position: Position,
  passengers: Passenger[],
  radius: number = 50
): number => {
  const nearbyPassengers = passengers.filter(
    (p) => p.status !== 'exited' && calculateDistance(position, p.position) < radius
  );
  const congestion = nearbyPassengers.length / 20;
  return Math.min(1, congestion);
};

export const getOptimalPath = (
  start: Position,
  end: Position,
  obstacles: Array<{ x: number; y: number; width: number; height: number }> = []
): Position[] => {
  const path: Position[] = [];
  let current = { ...start };
  const stepSize = 10;

  while (calculateDistance(current, end) > stepSize) {
    const dx = end.x - current.x;
    const dy = end.y - current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let nextX = current.x + (dx / dist) * stepSize;
    let nextY = current.y + (dy / dist) * stepSize;

    const blockedByObstacle = obstacles.some((obs) =>
      isPointInRect({ x: nextX, y: nextY }, obs)
    );

    if (blockedByObstacle) {
      if (Math.abs(dx) > Math.abs(dy)) {
        nextY += dy > 0 ? stepSize : -stepSize;
        nextX = current.x;
      } else {
        nextX += dx > 0 ? stepSize : -stepSize;
        nextY = current.y;
      }
    }

    current = { x: nextX, y: nextY };
    path.push({ ...current });
  }

  path.push({ ...end });
  return path;
};
