import type { SlopePoint, DetectionEvent, ThresholdConfig } from '@/types';

export const THRESHOLD_CONFIG: ThresholdConfig = {
  safeDistance: 2.0,
  warningDistance: 1.0,
  dangerDistance: 1.0,
  consecutiveFrames: 3,
};

export const TOTAL_DURATION = 30;
export const PLANE_START = -15;
export const PLANE_END = 15;
export const PLANE_SPEED = (PLANE_END - PLANE_START) / TOTAL_DURATION;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateSlopePoints(): SlopePoint[] {
  const points: SlopePoint[] = [];
  const rand = seededRandom(42);
  const count = 8000;

  const dangerZones = [
    { xCenter: -5, zCenter: 0, radius: 3 },
    { xCenter: 3, zCenter: 2, radius: 2.5 },
    { xCenter: 8, zCenter: -1, radius: 2 },
  ];

  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * 30;
    const z = (rand() - 0.5) * 20;
    
    const slopeFactor = (x + 15) / 30;
    const noise = (rand() - 0.5) * 2;
    let y = slopeFactor * 12 + noise;
    
    let riskLevel: SlopePoint['riskLevel'] = 'safe';
    
    for (const zone of dangerZones) {
      const dist = Math.sqrt(Math.pow(x - zone.xCenter, 2) + Math.pow(z - zone.zCenter, 2));
      if (dist < zone.radius) {
        const ratio = dist / zone.radius;
        if (ratio < 0.4) {
          riskLevel = 'danger';
          y += 1 + rand() * 1.5;
        } else if (ratio < 0.7) {
          riskLevel = 'warning';
          y += 0.5 + rand();
        }
        break;
      }
    }

    const sensorId = rand() > 0.85 ? `S-${String(Math.floor(rand() * 200)).padStart(3, '0')}` : undefined;

    points.push({
      id: `P-${String(i).padStart(5, '0')}`,
      x: parseFloat(x.toFixed(3)),
      y: parseFloat(y.toFixed(3)),
      z: parseFloat(z.toFixed(3)),
      height: parseFloat(y.toFixed(3)),
      riskLevel,
      sensorId,
    });
  }

  return points;
}

export const slopePoints = generateSlopePoints();

export function generatePresetEvents(): DetectionEvent[] {
  const events: DetectionEvent[] = [];
  let eventIndex = 0;

  const warningTimestamps = [4, 9, 14, 17, 22, 25, 27, 29];
  warningTimestamps.forEach((t) => {
    events.push({
      id: `EVT-${String(eventIndex++).padStart(4, '0')}`,
      timestamp: t,
      frameIndex: Math.floor(t * 60),
      type: 'warning',
      planePosition: PLANE_START + PLANE_SPEED * t,
      minDistance: 1.2 + Math.random() * 0.7,
      threshold: THRESHOLD_CONFIG.warningDistance,
      involvedPoints: [`P-${String(Math.floor(Math.random() * 8000)).padStart(5, '0')}`],
      description: `剖切面接近预警区域，最小距离约 ${(1.2 + Math.random() * 0.7).toFixed(2)}m`,
      isRecordUsable: true,
      riskLevel: 'warning',
    });
  });

  const outOfBoundsTimestamps = [6.5, 12.5, 18.5, 21, 26];
  outOfBoundsTimestamps.forEach((t, idx) => {
    events.push({
      id: `EVT-${String(eventIndex++).padStart(4, '0')}`,
      timestamp: t,
      frameIndex: Math.floor(t * 60),
      type: 'out-of-bounds',
      planePosition: PLANE_START + PLANE_SPEED * t,
      minDistance: 0.3 + Math.random() * 0.5,
      threshold: THRESHOLD_CONFIG.dangerDistance,
      involvedPoints: [
        `P-${String(Math.floor(Math.random() * 8000)).padStart(5, '0')}`,
        `P-${String(Math.floor(Math.random() * 8000)).padStart(5, '0')}`,
      ],
      description: `第${idx + 1}次越界：剖切面穿透安全边界，连续3帧距离 < ${THRESHOLD_CONFIG.dangerDistance}m，触发自动拦截`,
      isRecordUsable: true,
      riskLevel: 'danger',
    });
  });

  const dataMissingEvents = [
    { t: 7.5, reason: '传感器 S-042 离线，持续 1.2s，数据点缺失 12 个' },
    { t: 15, reason: '点云数据采集异常，帧同步失败，该时间段数据不可用' },
    { t: 23.5, reason: '传感器 S-117 参数未校准，偏差超过 ±5cm，记录标记为不可用' },
  ];
  dataMissingEvents.forEach(({ t, reason }) => {
    events.push({
      id: `EVT-${String(eventIndex++).padStart(4, '0')}`,
      timestamp: t,
      frameIndex: Math.floor(t * 60),
      type: 'data-missing',
      planePosition: PLANE_START + PLANE_SPEED * t,
      minDistance: NaN,
      threshold: THRESHOLD_CONFIG.dangerDistance,
      involvedPoints: [],
      description: reason,
      isRecordUsable: false,
      unusableReason: reason,
      riskLevel: 'warning',
    });
  });

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

export const presetEvents = generatePresetEvents();
