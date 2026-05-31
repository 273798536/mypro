interface Musician {
  id: string
  name: string
  section: 'strings' | 'woodwinds' | 'brass' | 'percussion'
  position: { x: number; y: number; z: number }
  soundPressure: number
  instrument: string
  radiationAngle: number
  reportNote: string
}

interface AbsorptionMaterial {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  absorptionCoefficients: Record<string, number>
  missingFrequencies: string[]
}

interface OcclusionEvent {
  id: string
  sourceId: string
  targetId: string
  type: 'musician_block' | 'material_block' | 'position_offset'
  reason: string
  suggestion: string
  timestamp: number
}

const INSTRUMENT_ZH: Record<string, string> = {
  Violin: '小提琴',
  Viola: '中提琴',
  Cello: '大提琴',
  'Double Bass': '低音提琴',
  Contrabass: '低音提琴',
  Flute: '长笛',
  Oboe: '双簧管',
  Clarinet: '单簧管',
  Bassoon: '大管',
  Trumpet: '小号',
  Trombone: '长号',
  'French Horn': '圆号',
  Horn: '圆号',
  Tuba: '大号',
  Timpani: '定音鼓',
  'Snare Drum': '小军鼓',
  'Bass Drum': '大鼓',
  Cymbals: '钹',
  Xylophone: '木琴',
  Marimba: '马林巴',
  Harp: '竖琴',
  Piano: '钢琴',
  Piccolo: '短笛',
  'English Horn': '英国管',
  Contrabassoon: '低音大管',
  Cornet: '短号',
  Glockenspiel: '钟琴',
  Vibraphone: '颤音琴',
  Tambourine: '铃鼓',
  Triangle: '三角铁',
  Celesta: '钢片琴',
}

const SECTION_ZH: Record<string, string> = {
  strings: '弦乐',
  woodwinds: '木管',
  brass: '铜管',
  percussion: '打击乐',
}

function toZh(name: string): string {
  return INSTRUMENT_ZH[name] ?? name
}

function sub(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function dot(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function len(v: { x: number; y: number; z: number }) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

function pointInCone(
  point: { x: number; y: number; z: number },
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  halfAngleDeg: number,
  reach: number,
): boolean {
  const v = sub(point, origin)
  const d = len(v)
  if (d < 1e-6 || d > reach) return false
  const cosA = dot(v, dir) / d
  return cosA >= Math.cos((halfAngleDeg * Math.PI) / 180)
}

function aabbCorners(
  pos: { x: number; y: number; z: number },
  size: { width: number; height: number; depth: number },
) {
  const hw = size.width / 2
  const hh = size.height / 2
  const hd = size.depth / 2
  const out: { x: number; y: number; z: number }[] = []
  for (const dx of [-hw, hw]) {
    for (const dy of [-hh, hh]) {
      for (const dz of [-hd, hd]) {
        out.push({ x: pos.x + dx, y: pos.y + dy, z: pos.z + dz })
      }
    }
  }
  return out
}

function coneHitsAABB(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  halfAngleDeg: number,
  reach: number,
  boxPos: { x: number; y: number; z: number },
  boxSize: { width: number; height: number; depth: number },
): boolean {
  const corners = aabbCorners(boxPos, boxSize)
  for (const c of corners) {
    if (pointInCone(c, origin, dir, halfAngleDeg, reach)) return true
  }
  if (pointInCone(boxPos, origin, dir, halfAngleDeg, reach)) return true

  const hw = boxSize.width / 2
  const hh = boxSize.height / 2
  const hd = boxSize.depth / 2
  const minX = boxPos.x - hw
  const maxX = boxPos.x + hw
  const minY = boxPos.y - hh
  const maxY = boxPos.y + hh
  const minZ = boxPos.z - hd
  const maxZ = boxPos.z + hd

  if (Math.abs(dir.z) < 1e-9) return false
  const t1 = (minZ - origin.z) / dir.z
  const t2 = (maxZ - origin.z) / dir.z
  const tLo = Math.max(0, Math.min(t1, t2))
  const tHi = Math.min(reach, Math.max(t1, t2))
  if (tLo > tHi) return false

  const halfRad = (halfAngleDeg * Math.PI) / 180
  const tanA = Math.tan(halfRad)

  const samples = [tLo, tHi]
  if (tHi - tLo > 1) {
    samples.push((tLo + tHi) / 2)
  }

  for (const t of samples) {
    if (t < 0 || t > reach) continue
    const px = origin.x + t * dir.x
    const py = origin.y + t * dir.y
    const cr = t * tanA
    if (
      px + cr >= minX &&
      px - cr <= maxX &&
      py + cr >= minY &&
      py - cr <= maxY
    ) {
      return true
    }
  }

  return false
}

function expectedSection(pos: { x: number; z: number }): string | null {
  if (pos.x > 3 && pos.z > 5) return 'percussion'
  if (pos.x > 0 && pos.z > 3) return 'brass'
  if (Math.abs(pos.x) < 2 && pos.z >= 2 && pos.z <= 5) return 'woodwinds'
  if (pos.x < 0 && pos.z < 2) return 'strings'
  return null
}

function inSectionZone(section: string, pos: { x: number; z: number }): boolean {
  switch (section) {
    case 'strings':
      return pos.x < 0 && pos.z < 2
    case 'woodwinds':
      return Math.abs(pos.x) < 2 && pos.z >= 2 && pos.z <= 5
    case 'brass':
      return pos.x > 0 && pos.z > 3
    case 'percussion':
      return pos.x > 3 && pos.z > 5
    default:
      return true
  }
}

export function detectOcclusions(
  musicians: Musician[],
  materials: AbsorptionMaterial[],
): OcclusionEvent[] {
  const events: OcclusionEvent[] = []
  let idx = 0
  const now = Date.now()
  const fwd = { x: 0, y: 0, z: 1 }

  for (const src of musicians) {
    const reach = src.soundPressure / 20
    const angle = src.radiationAngle
    const srcName = toZh(src.instrument)

    for (const other of musicians) {
      if (other.id === src.id) continue
      if (!pointInCone(other.position, src.position, fwd, angle, reach)) continue

      const otherName = toZh(other.instrument)
      const dist = len(sub(other.position, src.position)).toFixed(1)
      events.push({
        id: `occ_${idx++}`,
        sourceId: src.id,
        targetId: other.id,
        type: 'musician_block',
        reason: `${srcName}辐射锥在${dist}米处被${otherName}乐手阻挡`,
        suggestion: `建议将${otherName}向侧方移动0.5米，或调整${srcName}辐射角度至${Math.max(Math.round(angle - 10), 15)}°`,
        timestamp: now,
      })
    }

    for (const mat of materials) {
      if (!coneHitsAABB(src.position, fwd, angle, reach, mat.position, mat.size)) continue

      let reason = `${srcName}辐射锥被吸音材料「${mat.name}」阻挡`
      if (mat.missingFrequencies.length > 0) {
        reason += `，缺失频段：${mat.missingFrequencies.join('、')}`
      }

      const coeffs = Object.values(mat.absorptionCoefficients)
      const avgAbs =
        coeffs.length > 0
          ? coeffs.reduce((a, b) => a + b, 0) / coeffs.length
          : 0

      const suggestion =
        avgAbs > 0.5
          ? `建议移除或替换「${mat.name}」为低吸收率材料，或调整${srcName}位置以避开遮挡`
          : `建议调整${srcName}位置或辐射角度以避开「${mat.name}」遮挡`

      events.push({
        id: `occ_${idx++}`,
        sourceId: src.id,
        targetId: mat.id,
        type: 'material_block',
        reason,
        suggestion,
        timestamp: now,
      })
    }

    if (!inSectionZone(src.section, src.position)) {
      const zone = expectedSection(src.position)
      const zoneLabel = zone ? SECTION_ZH[zone] : '未分配'
      events.push({
        id: `occ_${idx++}`,
        sourceId: src.id,
        targetId: zone ? `zone_${zone}` : 'zone_unassigned',
        type: 'position_offset',
        reason: `${srcName}乐手属于${SECTION_ZH[src.section]}声部但处于${zoneLabel}区域`,
        suggestion: `建议将${srcName}移至${SECTION_ZH[src.section]}声部的标准区域`,
        timestamp: now,
      })
    }
  }

  return events
}
