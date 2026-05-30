import type { PanelProcessed, Obstacle, Season, ShadowRecord, ShadowSeverity, ShadowCause } from '../data/types';

const SEASON_SUN_PARAMS: Record<Season, { declination: number; dayLength: number }> = {
  spring: { declination: 0, dayLength: 12 },
  summer: { declination: 23.45, dayLength: 14 },
  autumn: { declination: 0, dayLength: 12 },
  winter: { declination: -23.45, dayLength: 10 },
};

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function getSunPosition(hour: number, season: Season, roofLatitude = 35): { altitude: number; azimuth: number } {
  const params = SEASON_SUN_PARAMS[season];
  const solarNoon = 12;
  const hourAngle = (hour - solarNoon) * 15;

  const latRad = degToRad(roofLatitude);
  const decRad = degToRad(params.declination);
  const haRad = degToRad(hourAngle);

  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));

  if (altitude <= 0) {
    return { altitude: 0, azimuth: 180 };
  }

  const cosAzimuth =
    (Math.sin(decRad) - Math.sin(latRad) * Math.sin(altitude)) / (Math.cos(latRad) * Math.cos(altitude));
  const azimuthRaw = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)));
  const azimuth = hour < 12 ? (azimuthRaw * 180) / Math.PI : 360 - (azimuthRaw * 180) / Math.PI;

  return {
    altitude: (altitude * 180) / Math.PI,
    azimuth,
  };
}

function getSeverity(ratio: number): ShadowSeverity {
  if (ratio < 0.05) return 'none';
  if (ratio < 0.2) return 'low';
  if (ratio < 0.4) return 'medium';
  if (ratio < 0.7) return 'high';
  return 'critical';
}

function isPointInShadow(
  panel: PanelProcessed,
  obstacle: Obstacle,
  sunAltitude: number,
  sunAzimuth: number
): number {
  if (sunAltitude <= 0) return 0;

  const altRad = degToRad(sunAltitude);
  const azRad = degToRad(sunAzimuth);

  const shadowLength = obstacle.height / Math.tan(altRad);
  const shadowDx = -shadowLength * Math.sin(azRad);
  const shadowDy = -shadowLength * Math.cos(azRad);

  const obstacleSize = 0.8;
  const panelLeft = panel.x - panel.width / 2;
  const panelRight = panel.x + panel.width / 2;
  const panelBottom = panel.y - panel.height / 2;
  const panelTop = panel.y + panel.height / 2;

  const shadowLeft = obstacle.x - obstacleSize / 2 + Math.min(0, shadowDx);
  const shadowRight = obstacle.x + obstacleSize / 2 + Math.max(0, shadowDx);
  const shadowBottom = obstacle.y - obstacleSize / 2 + Math.min(0, shadowDy);
  const shadowTop = obstacle.y + obstacleSize / 2 + Math.max(0, shadowDy);

  const overlapLeft = Math.max(panelLeft, shadowLeft);
  const overlapRight = Math.min(panelRight, shadowRight);
  const overlapBottom = Math.max(panelBottom, shadowBottom);
  const overlapTop = Math.min(panelTop, shadowTop);

  if (overlapRight <= overlapLeft || overlapTop <= overlapBottom) {
    return 0;
  }

  const overlapArea = (overlapRight - overlapLeft) * (overlapTop - overlapBottom);
  const panelArea = panel.width * panel.height;

  return Math.min(1, overlapArea / panelArea);
}

function checkSelfShadow(
  panel: PanelProcessed,
  allPanels: PanelProcessed[],
  sunAltitude: number,
  sunAzimuth: number
): number {
  if (sunAltitude <= 0) return 0;

  const panelRow = Math.round(panel.y / 2.5);
  const azRad = degToRad(sunAzimuth);

  let maxRatio = 0;

  for (const other of allPanels) {
    if (other.id === panel.id) continue;
    const otherRow = Math.round(other.y / 2.5);

    let isInFront = false;
    if (sunAzimuth > 90 && sunAzimuth < 270) {
      isInFront = otherRow < panelRow;
    } else {
      isInFront = otherRow > panelRow;
    }

    if (!isInFront) continue;
    if (Math.abs(other.x - panel.x) > panel.width) continue;

    const altRad = degToRad(sunAltitude);
    const shadowLength = 0.35 / Math.tan(altRad);

    const overlap = Math.max(
      0,
      panel.width - Math.abs(other.x - panel.x)
    );
    const shadowCoverage = Math.min(1, shadowLength / 2.0);

    const ratio = (overlap * shadowCoverage * 0.3) / (panel.width * panel.height);
    maxRatio = Math.max(maxRatio, ratio);
  }

  return Math.min(1, maxRatio);
}

function determineCause(
  obstacleRatio: number,
  selfRatio: number,
  hasAzimuthError: boolean
): { ratio: number; cause: ShadowCause } {
  if (obstacleRatio >= selfRatio && obstacleRatio > 0.05) {
    return { ratio: obstacleRatio, cause: 'obstacle' };
  }
  if (selfRatio > 0.05) {
    return { ratio: selfRatio, cause: 'self' };
  }
  if (hasAzimuthError && (obstacleRatio + selfRatio) > 0.02) {
    return { ratio: obstacleRatio + selfRatio + 0.05, cause: 'azimuth' };
  }
  return { ratio: Math.max(obstacleRatio, selfRatio), cause: 'obstacle' };
}

export function calculateShadowRecords(
  panels: PanelProcessed[],
  obstacles: Obstacle[],
  season: Season
): ShadowRecord[] {
  const records: ShadowRecord[] = [];
  const loadedObstacles = obstacles.filter((o) => o.loaded);

  for (let hour = 5; hour <= 19; hour++) {
    const sunPos = getSunPosition(hour, season);

    for (const panel of panels) {
      let obstacleRatio = 0;
      for (const obs of loadedObstacles) {
        obstacleRatio = Math.max(obstacleRatio, isPointInShadow(panel, obs, sunPos.altitude, sunPos.azimuth));
      }

      const selfRatio = checkSelfShadow(panel, panels, sunPos.altitude, sunPos.azimuth);
      const { ratio, cause } = determineCause(obstacleRatio, selfRatio, panel.hasAzimuthError);

      records.push({
        id: `${panel.id}-${season}-${hour}`,
        panelId: panel.id,
        hour,
        season,
        shadowRatio: ratio,
        severity: getSeverity(ratio),
        cause,
      });
    }
  }

  return records;
}

export function calculateAllSeasons(
  panels: PanelProcessed[],
  obstacles: Obstacle[]
): ShadowRecord[] {
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  return seasons.flatMap((s) => calculateShadowRecords(panels, obstacles, s));
}

export function getSunPositionForUI(hour: number, season: Season): { altitude: number; azimuth: number } {
  return getSunPosition(hour, season);
}
