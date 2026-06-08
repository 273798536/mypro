export function knotsToMs(knots: number): number {
  return knots * 0.514444;
}

export function msToKnots(ms: number): number {
  return ms / 0.514444;
}

export function nauticalMileToKm(nm: number): number {
  return nm * 1.852;
}

export function kmToNauticalMile(km: number): number {
  return km / 1.852;
}

export function spacingToMeters(
  spacingMultiple: number,
  unit: 'D' | 'km' | 'nautical_mile',
  rotorDiameter: number,
  applyWrongConversion = false
): number {
  switch (unit) {
    case 'D':
      return spacingMultiple * rotorDiameter;
    case 'km':
      return spacingMultiple * 1000;
    case 'nautical_mile':
      if (applyWrongConversion) {
        return spacingMultiple * 1000;
      }
      return nauticalMileToKm(spacingMultiple) * 1000;
    default:
      return spacingMultiple * rotorDiameter;
  }
}

export function normalizeWindSpeed(
  speed: number,
  unit: 'm/s' | 'knots',
  applyWrongConversion = false
): number {
  if (unit === 'knots') {
    if (applyWrongConversion) {
      return speed;
    }
    return knotsToMs(speed);
  }
  return speed;
}

export function formatSpeed(speedMs: number, unit: 'm/s' | 'knots'): string {
  if (unit === 'knots') {
    return `${msToKnots(speedMs).toFixed(2)} kn`;
  }
  return `${speedMs.toFixed(2)} m/s`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(0)} m`;
}
