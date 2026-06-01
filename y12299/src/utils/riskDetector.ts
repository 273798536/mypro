import { StreamLine, RiskPoint, WindParams, Severity } from '../types';

function vec3Dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function vec3Distance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

function getSeverity(value: number, thresholds: [number, number, number]): Severity {
  if (value >= thresholds[2]) return 'high';
  if (value >= thresholds[1]) return 'medium';
  return 'low';
}

export function detectAngleViolations(
  streamLines: StreamLine[],
  windParams: WindParams
): RiskPoint[] {
  const risks: RiskPoint[] = [];
  const angleThreshold = 150;
  const severityThresholds: [number, number, number] = [150, 165, 175];

  const yawRad = (windParams.yawAngle * Math.PI) / 180;
  const pitchRad = (windParams.pitchAngle * Math.PI) / 180;
  const incomingDirection: [number, number, number] = [
    -Math.sin(yawRad),
    Math.sin(pitchRad),
    -Math.cos(yawRad) * Math.cos(pitchRad),
  ];

  const normalizedIncoming = incomingDirection.map(v => 
    v / Math.sqrt(incomingDirection.reduce((s, c) => s + c * c, 0))
  ) as [number, number, number];

  let riskId = 0;

  for (const line of streamLines) {
    for (let i = 0; i < line.points.length; i++) {
      const point = line.points[i];
      const dot = vec3Dot(point.direction, normalizedIncoming);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

      if (angle > angleThreshold) {
        const severity = getSeverity(angle, severityThresholds);
        risks.push({
          id: `angle-${riskId++}`,
          type: 'angle_violation',
          position: [point.x, point.y, point.z],
          severity,
          value: Math.round(angle * 10) / 10,
          description: `流线方向与来流夹角 ${Math.round(angle * 10) / 10}°，超过阈值 ${angleThreshold}°`,
        });
        break;
      }
    }
  }

  return risks.slice(0, 10);
}

export function detectOversampling(
  streamLines: StreamLine[],
  threshold: number = 0.3
): RiskPoint[] {
  const risks: RiskPoint[] = [];
  const severityThresholds: [number, number, number] = [0.3, 0.2, 0.1];
  let riskId = 0;

  for (let i = 0; i < streamLines.length; i++) {
    const lineA = streamLines[i];
    
    for (let j = i + 1; j < streamLines.length; j++) {
      const lineB = streamLines[j];
      
      let minDistance = Infinity;
      let closestPoint: [number, number, number] = [0, 0, 0];
      
      for (const pointA of lineA.points) {
        for (const pointB of lineB.points) {
          const dist = vec3Distance(
            [pointA.x, pointA.y, pointA.z],
            [pointB.x, pointB.y, pointB.z]
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestPoint = [
              (pointA.x + pointB.x) / 2,
              (pointA.y + pointB.y) / 2,
              (pointA.z + pointB.z) / 2,
            ];
          }
        }
      }
      
      if (minDistance < threshold) {
        const severity = getSeverity(threshold - minDistance, [0.05, 0.1, 0.2]);
        risks.push({
          id: `dense-${riskId++}`,
          type: 'oversampling',
          position: closestPoint,
          severity,
          value: Math.round(minDistance * 1000) / 1000,
          description: `流线间距 ${Math.round(minDistance * 1000) / 1000}m，低于推荐间距 ${threshold}m，可能导致过密采样`,
        });
        break;
      }
    }
    
    if (riskId >= 10) break;
  }

  return risks;
}

export function detectReverseFlow(
  streamLines: StreamLine[],
  windParams: WindParams
): RiskPoint[] {
  const risks: RiskPoint[] = [];
  const severityThresholds: [number, number, number] = [0.3, 0.5, 0.7];
  let riskId = 0;

  const yawRad = (windParams.yawAngle * Math.PI) / 180;
  const pitchRad = (windParams.pitchAngle * Math.PI) / 180;
  const incomingDirection: [number, number, number] = [
    -Math.sin(yawRad),
    Math.sin(pitchRad),
    -Math.cos(yawRad) * Math.cos(pitchRad),
  ];

  const normalizedIncoming = incomingDirection.map(v => 
    v / Math.sqrt(incomingDirection.reduce((s, c) => s + c * c, 0))
  ) as [number, number, number];

  for (const line of streamLines) {
    const tailPoints = line.points.filter(p => p.z < -2);
    
    for (const point of tailPoints) {
      const dot = vec3Dot(point.direction, normalizedIncoming);
      
      if (dot < 0) {
        const reverseStrength = Math.abs(dot);
        const severity = getSeverity(reverseStrength, severityThresholds);
        
        risks.push({
          id: `reverse-${riskId++}`,
          type: 'reverse_flow',
          position: [point.x, point.y, point.z],
          severity,
          value: Math.round(reverseStrength * 100) / 100,
          description: `尾流区域存在反向流动，反向强度 ${Math.round(reverseStrength * 100)}%，可能导致气动阻力增加`,
        });
        break;
      }
    }
    
    if (riskId >= 10) break;
  }

  return risks;
}

export function detectAllRisks(
  streamLines: StreamLine[],
  windParams: WindParams
): RiskPoint[] {
  const angleViolations = detectAngleViolations(streamLines, windParams);
  const oversampling = detectOversampling(streamLines);
  const reverseFlow = detectReverseFlow(streamLines, windParams);

  return [...angleViolations, ...oversampling, ...reverseFlow];
}
