export interface AnomalyFlags {
  nameInconsistent: boolean
  coordOffset: boolean
}

const EARTH_RADIUS = 6371000
const CLUSTER_DIST = 200
const OFFSET_DIST = 100

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function detectAnomalies<T extends { name: string; latitude: number; longitude: number }>(
  entries: T[],
): AnomalyFlags[] {
  const n = entries.length
  const flags: AnomalyFlags[] = entries.map(() => ({ nameInconsistent: false, coordOffset: false }))
  if (n === 0) return flags

  const avgLat = entries.reduce((s, e) => s + e.latitude, 0) / n
  const avgLon = entries.reduce((s, e) => s + e.longitude, 0) / n
  entries.forEach((e, i) => {
    if (haversine(e.latitude, e.longitude, avgLat, avgLon) > OFFSET_DIST) {
      flags[i].coordOffset = true
    }
  })

  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  const union = (a: number, b: number): void => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (
        haversine(entries[i].latitude, entries[i].longitude, entries[j].latitude, entries[j].longitude) <=
        CLUSTER_DIST
      ) {
        union(i, j)
      }
    }
  }

  const clusters = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    if (!clusters.has(r)) clusters.set(r, [])
    clusters.get(r)!.push(i)
  }

  clusters.forEach((indices) => {
    if (indices.length < 2) return
    const nameCount = new Map<string, number>()
    indices.forEach((idx) => {
      const nm = entries[idx].name
      nameCount.set(nm, (nameCount.get(nm) || 0) + 1)
    })
    if (nameCount.size < 2) return
    let mostFreq = entries[indices[0]].name
    let max = 0
    nameCount.forEach((count, name) => {
      if (count > max) {
        max = count
        mostFreq = name
      }
    })
    indices.forEach((idx) => {
      if (entries[idx].name !== mostFreq) flags[idx].nameInconsistent = true
    })
  })

  return flags
}
