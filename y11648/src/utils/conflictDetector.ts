import type {
  Tug,
  Ship,
  Berth,
  TideWindow,
  Task,
  Conflict,
  Position,
} from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const calculateDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const detectTugCollision = (
  tug1: Tug,
  tug2: Tug,
  currentTime: number,
  minDistance: number = 50
): Conflict | null => {
  if (tug1.id === tug2.id) return null;
  if (tug1.status === 'idle' && tug2.status === 'idle') return null;

  const distance = calculateDistance(tug1.position, tug2.position);

  if (distance < minDistance) {
    return {
      id: generateId(),
      type: 'tug_collision',
      severity: 'critical',
      description: `${tug1.name} 与 ${tug2.name} 距离过近，存在碰撞风险`,
      time: currentTime,
      resolved: false,
      tugIds: [tug1.id, tug2.id],
    };
  }

  return null;
};

export const detectAllTugCollisions = (
  tugs: Tug[],
  currentTime: number
): Conflict[] => {
  const conflicts: Conflict[] = [];
  const activeTugs = tugs.filter((t) => t.status !== 'idle');

  for (let i = 0; i < activeTugs.length; i++) {
    for (let j = i + 1; j < activeTugs.length; j++) {
      const conflict = detectTugCollision(activeTugs[i], activeTugs[j], currentTime);
      if (conflict) {
        conflicts.push(conflict);
      }
    }
  }

  return conflicts;
};

export const detectTideMiss = (
  ship: Ship,
  berth: Berth,
  tideWindows: TideWindow[],
  task: Task,
  currentTime: number
): Conflict | null => {
  const taskEndTime = task.scheduledTime + task.estimatedDuration;

  const coveringWindow = tideWindows.find(
    (window) =>
      window.affectedBerths.includes(berth.id) &&
      window.startTime <= task.scheduledTime &&
      window.endTime >= taskEndTime &&
      window.waterLevel >= ship.draft
  );

  if (!coveringWindow) {
    const currentWindow = tideWindows.find(
      (w) => w.startTime <= currentTime && w.endTime >= currentTime
    );

    return {
      id: generateId(),
      type: 'tide_missed',
      severity: 'critical',
      description: `${ship.name} 无法在潮汐窗口内完成靠泊 ${berth.name}，当前水深${currentWindow?.waterLevel || '未知'}m，需要 ${ship.draft}m`,
      time: currentTime,
      resolved: false,
      taskId: task.id,
    };
  }

  const timeUntilEnd = coveringWindow.endTime - taskEndTime;
  if (timeUntilEnd < 10 * 60 * 1000) {
    return {
      id: generateId(),
      type: 'tide_missed',
      severity: 'warning',
      description: `${ship.name} 靠泊时间紧迫，潮汐窗口仅剩 ${Math.round(timeUntilEnd / 60000)} 分钟`,
      time: currentTime,
      resolved: false,
      taskId: task.id,
    };
  }

  return null;
};

export const detectFuelShortage = (
  tug: Tug,
  task: Task,
  distance: number,
  currentTime: number
): Conflict | null => {
  const baseConsumption = tug.fuelConsumption;
  const distanceFactor = distance / 1000;
  const estimatedFuel = baseConsumption * distanceFactor * 1.5;

  const fuelRatio = tug.currentFuel / tug.fuelCapacity;

  if (tug.currentFuel < estimatedFuel) {
    return {
      id: generateId(),
      type: 'fuel_shortage',
      severity: 'critical',
      description: `${tug.name} 燃油不足，预计需要 ${Math.round(estimatedFuel)} 单位，当前只有 ${Math.round(tug.currentFuel)} 单位`,
      time: currentTime,
      resolved: false,
      taskId: task.id,
      tugIds: [tug.id],
    };
  }

  if (fuelRatio < 0.2) {
    return {
      id: generateId(),
      type: 'fuel_shortage',
      severity: 'warning',
      description: `${tug.name} 燃油低于 20%，建议尽快加油`,
      time: currentTime,
      resolved: false,
      tugIds: [tug.id],
    };
  }

  return null;
};

export const detectBerthOccupied = (
  berth: Berth,
  task: Task,
  currentTime: number
): Conflict | null => {
  if (berth.status === 'occupied' && berth.availableFrom > task.scheduledTime) {
    return {
      id: generateId(),
      type: 'berth_occupied',
      severity: 'critical',
      description: `${berth.name} 已被占用，预计 ${new Date(berth.availableFrom).toLocaleTimeString()} 后可用`,
      time: currentTime,
      resolved: false,
      taskId: task.id,
    };
  }

  if (berth.status === 'reserved') {
    return {
      id: generateId(),
      type: 'berth_occupied',
      severity: 'warning',
      description: `${berth.name} 已被预留`,
      time: currentTime,
      resolved: false,
      taskId: task.id,
    };
  }

  return null;
};

export const checkAllConflicts = (
  tugs: Tug[],
  ships: Ship[],
  berths: Berth[],
  tideWindows: TideWindow[],
  tasks: Task[],
  currentTime: number
): Conflict[] => {
  const conflicts: Conflict[] = [];

  conflicts.push(...detectAllTugCollisions(tugs, currentTime));

  tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .forEach((task) => {
      const ship = ships.find((s) => s.id === task.shipId);
      const berth = berths.find((b) => b.id === task.berthId);

      if (ship && berth) {
        const tideConflict = detectTideMiss(ship, berth, tideWindows, task, currentTime);
        if (tideConflict) conflicts.push(tideConflict);

        const berthConflict = detectBerthOccupied(berth, task, currentTime);
        if (berthConflict) conflicts.push(berthConflict);

        task.tugIds.forEach((tugId) => {
          const tug = tugs.find((t) => t.id === tugId);
          if (tug) {
            const distance = calculateDistance(tug.position, ship.position);
            const fuelConflict = detectFuelShortage(tug, task, distance, currentTime);
            if (fuelConflict) conflicts.push(fuelConflict);
          }
        });
      }
    });

  return conflicts;
};

export const getConflictTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    tug_collision: '拖轮冲突',
    tide_missed: '潮汐错过',
    fuel_shortage: '燃油不足',
    berth_occupied: '泊位占用',
  };
  return labels[type] || type;
};

export const getConflictIcon = (type: string): string => {
  const icons: Record<string, string> = {
    tug_collision: '🚢💥',
    tide_missed: '🌊⚠️',
    fuel_shortage: '⛽🔻',
    berth_occupied: '⚓🔒',
  };
  return icons[type] || '⚠️';
};
