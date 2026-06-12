export const DIRECTIONS: { [key: string]: number } = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

export const OPPOSITE_DIRECTIONS: { [key: string]: string } = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E',
  NE: 'SW',
  SW: 'NE',
  SE: 'NW',
  NW: 'SE',
};

export function parseDirection(text: string): string | null {
  const cleanText = text.trim().toUpperCase();
  if (DIRECTIONS.hasOwnProperty(cleanText)) {
    return cleanText;
  }
  const match = cleanText.match(/([NSEW]{1,2})/);
  if (match && DIRECTIONS.hasOwnProperty(match[1])) {
    return match[1];
  }
  return null;
}

export function directionToAngle(direction: string): number | null {
  return DIRECTIONS[direction] ?? null;
}

export function angleToDirection(angle: number): string {
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const directions = Object.keys(DIRECTIONS);
  const angles = Object.values(DIRECTIONS);
  
  let closestDirection = directions[0];
  let minDiff = 360;

  for (let i = 0; i < angles.length; i++) {
    const diff = Math.abs(normalizedAngle - angles[i]);
    const normalizedDiff = diff > 180 ? 360 - diff : diff;
    if (normalizedDiff < minDiff) {
      minDiff = normalizedDiff;
      closestDirection = directions[i];
    }
  }

  return closestDirection;
}

export function isOppositeDirection(dir1: string, dir2: string): boolean {
  return OPPOSITE_DIRECTIONS[dir1] === dir2;
}

export interface DirectionPattern {
  direction: string;
  timestamp: Date;
}

export interface ReversalDetectionResult {
  isReversal: boolean;
  possibleCauses: string[];
  impactScope: {
    startTime: Date;
    endTime: Date;
    affectedCount: number;
  };
}

export function detectDirectionReversal(
  data: DirectionPattern[],
  index: number
): ReversalDetectionResult | null {
  if (index < 5 || index >= data.length - 5) return null;

  const current = data[index];
  const beforeWindow = data.slice(Math.max(0, index - 20), index);
  const afterWindow = data.slice(index + 1, Math.min(data.length, index + 20));

  if (beforeWindow.length < 5) return null;

  const directionCounts: { [key: string]: number } = {};
  beforeWindow.forEach((d) => {
    if (d.direction) {
      directionCounts[d.direction] = (directionCounts[d.direction] || 0) + 1;
    }
  });

  const sortedDirections = Object.entries(directionCounts).sort((a, b) => b[1] - a[1]);
  if (sortedDirections.length === 0) return null;

  const dominantDirection = sortedDirections[0][0];
  const dominantRatio = sortedDirections[0][1] / beforeWindow.length;

  if (dominantRatio < 0.6) return null;

  if (!isOppositeDirection(current.direction, dominantDirection)) return null;

  let affectedStart = index;
  let affectedEnd = index;
  let affectedCount = 0;

  for (let i = index; i < data.length; i++) {
    if (isOppositeDirection(data[i].direction, dominantDirection)) {
      affectedEnd = i;
      affectedCount++;
    } else {
      break;
    }
  }

  if (affectedCount < 3) return null;

  const possibleCauses: string[] = [
    `传感器方向可能接反：检测到${current.direction}方向，而历史主导方向为${dominantDirection}`,
    `连续${affectedCount}条记录方向异常，与历史模式相反`,
    `可能原因：传感器安装方向错误、数据记录时符号写反、传感器故障`,
  ];

  return {
    isReversal: true,
    possibleCauses,
    impactScope: {
      startTime: data[affectedStart].timestamp,
      endTime: data[affectedEnd].timestamp,
      affectedCount,
    },
  };
}

export function calculateDirectionDifference(dir1: string, dir2: string): number {
  const angle1 = directionToAngle(dir1);
  const angle2 = directionToAngle(dir2);
  if (angle1 === null || angle2 === null) return -1;

  let diff = Math.abs(angle1 - angle2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}
