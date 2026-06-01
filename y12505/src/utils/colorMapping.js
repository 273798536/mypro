export const getStressColor = (magnitude, min = 0, max = 500) => {
  const normalized = Math.max(0, Math.min(1, (magnitude - min) / (max - min)))
  
  const colormap = [
    { pos: 0.0, color: [0, 0, 255] },
    { pos: 0.25, color: [0, 255, 255] },
    { pos: 0.5, color: [0, 255, 0] },
    { pos: 0.75, color: [255, 255, 0] },
    { pos: 1.0, color: [255, 0, 0] }
  ]

  for (let i = 0; i < colormap.length - 1; i++) {
    if (normalized >= colormap[i].pos && normalized <= colormap[i + 1].pos) {
      const range = colormap[i + 1].pos - colormap[i].pos
      const t = (normalized - colormap[i].pos) / range
      const r = Math.round(colormap[i].color[0] + t * (colormap[i + 1].color[0] - colormap[i].color[0]))
      const g = Math.round(colormap[i].color[1] + t * (colormap[i + 1].color[1] - colormap[i].color[1]))
      const b = Math.round(colormap[i].color[2] + t * (colormap[i + 1].color[2] - colormap[i].color[2]))
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  return 'rgb(255, 0, 0)'
}

export const calculateStressMagnitude = (stress) => {
  if (!stress) return 0
  return Math.sqrt(
    stress.xx * stress.xx +
    stress.yy * stress.yy +
    stress.zz * stress.zz +
    2 * (stress.xy * stress.xy + stress.yz * stress.yz + stress.xz * stress.xz)
  )
}

export const formatNumber = (num, decimals = 2) => {
  if (num === undefined || num === null) return '-'
  return num.toFixed(decimals)
}
