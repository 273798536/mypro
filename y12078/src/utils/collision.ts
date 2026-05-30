import type { Implant, CTAnnotation } from '@/types'

export function distance3D(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function checkForbiddenZoneCollision(
  implant: Implant,
  annotation: CTAnnotation,
  safetyMarginMm: number = 5
): boolean {
  if (annotation.type !== 'forbidden_zone') return false
  const dist = distance3D(implant.position, annotation.position) * 10
  const implantReach = Math.max(implant.length_mm, implant.width_mm) / 2
  const annotationRadius = annotation.radius_mm
  return dist - implantReach - annotationRadius < safetyMarginMm
}

export function checkSideMismatch(
  implantLaterality: string,
  caseLaterality: string
): boolean {
  if (implantLaterality === 'universal') return false
  return implantLaterality !== caseLaterality
}

export function checkSizeOutOfBound(
  implant: Implant,
  maxAvailableLengthMm: number
): boolean {
  return implant.length_mm > maxAvailableLengthMm
}
