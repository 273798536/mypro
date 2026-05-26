export interface ColorStop {
  value: number
  r: number
  g: number
  b: number
  a: number
}

export const temperatureColorScale: ColorStop[] = [
  { value: 18, r: 0, g: 100, b: 255, a: 0.1 },
  { value: 22, r: 0, g: 200, b: 255, a: 0.2 },
  { value: 25, r: 0, g: 255, b: 150, a: 0.3 },
  { value: 28, r: 200, g: 255, b: 0, a: 0.4 },
  { value: 32, r: 255, g: 200, b: 0, a: 0.5 },
  { value: 35, r: 255, g: 100, b: 0, a: 0.7 },
  { value: 40, r: 255, g: 0, b: 0, a: 0.9 },
]

export function getTemperatureColor(temp: number): { r: number; g: number; b: number; a: number } {
  const scale = temperatureColorScale
  
  if (temp <= scale[0].value) {
    return { r: scale[0].r / 255, g: scale[0].g / 255, b: scale[0].b / 255, a: scale[0].a }
  }
  if (temp >= scale[scale.length - 1].value) {
    const last = scale[scale.length - 1]
    return { r: last.r / 255, g: last.g / 255, b: last.b / 255, a: last.a }
  }
  
  for (let i = 0; i < scale.length - 1; i++) {
    if (temp >= scale[i].value && temp <= scale[i + 1].value) {
      const t = (temp - scale[i].value) / (scale[i + 1].value - scale[i].value)
      return {
        r: (scale[i].r + t * (scale[i + 1].r - scale[i].r)) / 255,
        g: (scale[i].g + t * (scale[i + 1].g - scale[i].g)) / 255,
        b: (scale[i].b + t * (scale[i + 1].b - scale[i].b)) / 255,
        a: scale[i].a + t * (scale[i + 1].a - scale[i].a),
      }
    }
  }
  
  return { r: 0.5, g: 0.5, b: 0.5, a: 0.5 }
}

export function getTemperatureHex(temp: number): string {
  const color = getTemperatureColor(temp)
  const r = Math.round(color.r * 255).toString(16).padStart(2, '0')
  const g = Math.round(color.g * 255).toString(16).padStart(2, '0')
  const b = Math.round(color.b * 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'normal':
      return '#4CAF50'
    case 'warning':
      return '#FF9800'
    case 'critical':
      return '#F44336'
    case 'offline':
      return '#9E9E9E'
    default:
      return '#9E9E9E'
  }
}

export function getAlertLevelColor(level: string): string {
  switch (level) {
    case 'info':
      return '#2196F3'
    case 'warning':
      return '#FF9800'
    case 'critical':
      return '#F44336'
    default:
      return '#9E9E9E'
  }
}
