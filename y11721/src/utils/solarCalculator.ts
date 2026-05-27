import { Location, SolarParams, SolarResults } from '../types';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const PANEL_EFFICIENCY = 0.18;
const STANDARD_IRRADIANCE = 1000;

export function calculateDayOfYear(date: string): number {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function calculateSolarPosition(
  location: Location,
  date: string,
  hour: number = 12
): { elevation: number; azimuth: number } {
  const dayOfYear = calculateDayOfYear(date);
  const lat = location.lat * DEG_TO_RAD;

  const declination = 23.45 * DEG_TO_RAD * Math.sin(
    (360 / 365) * DEG_TO_RAD * (dayOfYear - 81)
  );

  const equationOfTime = 9.87 * Math.sin(2 * (dayOfYear - 81) * DEG_TO_RAD)
    - 7.53 * Math.cos((dayOfYear - 81) * DEG_TO_RAD)
    - 1.5 * Math.sin((dayOfYear - 81) * DEG_TO_RAD);

  const timeOffset = equationOfTime + 4 * location.lng - 60 * getTimezoneOffset(location.timezone);
  const trueSolarTime = hour * 60 + timeOffset;
  const hourAngle = (trueSolarTime / 4 - 180) * DEG_TO_RAD;

  const sinElevation = Math.sin(lat) * Math.sin(declination)
    + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const elevation = Math.asin(sinElevation) * RAD_TO_DEG;

  const cosAzimuth = (Math.sin(declination) * Math.cos(lat)
    - Math.cos(declination) * Math.sin(lat) * Math.cos(hourAngle))
    / Math.cos(elevation * DEG_TO_RAD);
  const azimuth = Math.acos(Math.min(1, Math.max(-1, cosAzimuth))) * RAD_TO_DEG;

  const finalAzimuth = hourAngle > 0 ? 360 - azimuth : azimuth;

  return {
    elevation: Math.max(0, elevation),
    azimuth: finalAzimuth
  };
}

function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset'
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    if (offsetPart) {
      const match = offsetPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2]);
        const minutes = match[3] ? parseInt(match[3]) : 0;
        return sign * (hours + minutes / 60);
      }
    }
    return 8;
  } catch {
    return 8;
  }
}

export function calculateIrradiation(
  solarElevation: number,
  tiltAngle: number,
  weatherFactor: number
): number {
  if (solarElevation <= 0) return 0;

  const elevationRad = solarElevation * DEG_TO_RAD;
  const tiltRad = tiltAngle * DEG_TO_RAD;

  const angleOfIncidence = Math.abs(elevationRad - tiltRad);
  const cosIncidence = Math.cos(angleOfIncidence);

  const directIrradiance = STANDARD_IRRADIANCE * Math.sin(elevationRad) * cosIncidence;
  const diffuseIrradiance = STANDARD_IRRADIANCE * 0.1 * (1 + Math.cos(tiltRad)) / 2;

  const totalIrradiance = (directIrradiance + diffuseIrradiance) * weatherFactor;

  return Math.max(0, totalIrradiance);
}

export function calculatePowerOutput(
  irradiation: number,
  panelArea: number
): number {
  return irradiation * panelArea * PANEL_EFFICIENCY / 1000;
}

export function calculateAll(params: SolarParams): SolarResults {
  const { elevation, azimuth } = calculateSolarPosition(
    params.location,
    params.date,
    12
  );

  const irradiation = calculateIrradiation(
    elevation,
    params.tiltAngle,
    params.weatherFactor
  );

  const powerOutput = calculatePowerOutput(irradiation, params.panelArea);

  return {
    solarElevation: elevation,
    solarAzimuth: azimuth,
    irradiation,
    powerOutput
  };
}

export function generateDailyData(params: SolarParams): Array<{ hour: number; power: number }> {
  const data: Array<{ hour: number; power: number }> = [];

  for (let hour = 6; hour <= 18; hour++) {
    const { elevation } = calculateSolarPosition(params.location, params.date, hour);
    const irradiation = calculateIrradiation(elevation, params.tiltAngle, params.weatherFactor);
    const power = calculatePowerOutput(irradiation, params.panelArea);
    data.push({ hour, power: Math.round(power * 100) / 100 });
  }

  return data;
}
