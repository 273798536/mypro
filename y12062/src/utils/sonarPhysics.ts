export const SOUND_SPEED = 1500

export const FREQUENCY_CONFIG = {
  low: { hz: 1000, wavelength: 1.5, energyCost: 5, label: '低频 1kHz', color: '#00CC6A', resolution: 0.8 },
  mid: { hz: 5000, wavelength: 0.3, energyCost: 10, label: '中频 5kHz', color: '#00D4FF', resolution: 0.5 },
  high: { hz: 15000, wavelength: 0.1, energyCost: 20, label: '高频 15kHz', color: '#FF6B35', resolution: 0.2 },
} as const

export type FrequencyBand = keyof typeof FREQUENCY_CONFIG

export function calculateEchoDelay(distance: number, jitter: number = 0): number {
  const baseDelay = (2 * distance) / SOUND_SPEED
  const jitterMs = (Math.random() - 0.5) * 2 * jitter
  return Math.max(0, baseDelay * 1000 + jitterMs)
}

export function calculateEnergyAttenuation(distance: number, frequency: FrequencyBand): number {
  const freqFactor = frequency === 'high' ? 2.5 : frequency === 'mid' ? 1.5 : 1.0
  const attenuation = 1 / (1 + (distance * distance * freqFactor) / 100)
  return Math.max(0, Math.min(1, attenuation))
}

export function calculateFrequencyShift(baseFreq: number, dopplerShift: number): number {
  return baseFreq + dopplerShift
}

export function checkAliasing(
  obstacle1Pos: { x: number; y: number },
  obstacle2Pos: { x: number; y: number },
  frequency: FrequencyBand
): boolean {
  const dist = Math.sqrt(
    Math.pow(obstacle1Pos.x - obstacle2Pos.x, 2) + Math.pow(obstacle1Pos.y - obstacle2Pos.y, 2)
  )
  const halfWavelength = FREQUENCY_CONFIG[frequency].wavelength / 2
  return dist < halfWavelength
}

export function calculateConfidence(
  echoes: { energyRatio: number; isAliased: boolean }[],
  frequency: FrequencyBand
): number {
  if (echoes.length === 0) return 0
  const avgEnergy = echoes.reduce((sum, e) => sum + e.energyRatio, 0) / echoes.length
  const aliasPenalty = echoes.filter(e => e.isAliased).length / echoes.length
  const baseConfidence = avgEnergy * 100
  const resolutionBonus = (1 - FREQUENCY_CONFIG[frequency].resolution) * 20
  return Math.max(0, Math.min(100, baseConfidence + resolutionBonus - aliasPenalty * 40))
}

export function calculateDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
}
