import type Database from 'better-sqlite3'

interface Entry {
  id: number
  name: string
  latitude: number
  longitude: number
  opinion: string
  source: string
  group_id: number | null
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function shouldCluster(a: Entry, b: Entry): boolean {
  const nameDist = levenshtein(a.name, b.name)
  const coordDist = haversine(a.latitude, a.longitude, b.latitude, b.longitude)

  if (nameDist <= 2 && coordDist <= 200) return true
  if (coordDist <= 50) return true
  if (nameDist === 0) return true

  return false
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function runMerge(db: Database.Database) {
  const clearGroups = db.prepare('UPDATE entries SET group_id = NULL')
  const deleteGroups = db.prepare('DELETE FROM merge_groups')
  const insertGroup = db.prepare(`
    INSERT INTO merge_groups (merged_name, merged_latitude, merged_longitude)
    VALUES (?, ?, ?)
  `)
  const updateEntryGroup = db.prepare('UPDATE entries SET group_id = ? WHERE id = ?')

  const transaction = db.transaction(() => {
    clearGroups.run()
    deleteGroups.run()

    const entries = db.prepare('SELECT * FROM entries').all() as Entry[]
    if (entries.length === 0) return []

    const parent: number[] = entries.map((_, i) => i)

    function find(x: number): number {
      if (parent[x] !== x) parent[x] = find(parent[x])
      return parent[x]
    }

    function union(x: number, y: number): void {
      const rx = find(x)
      const ry = find(y)
      if (rx !== ry) parent[rx] = ry
    }

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (shouldCluster(entries[i], entries[j])) {
          union(i, j)
        }
      }
    }

    const clusterMap = new Map<number, number[]>()
    for (let i = 0; i < entries.length; i++) {
      const root = find(i)
      if (!clusterMap.has(root)) clusterMap.set(root, [])
      clusterMap.get(root)!.push(i)
    }

    const groups: Array<{
      id: number
      merged_name: string
      merged_latitude: number
      merged_longitude: number
    }> = []

    for (const indices of clusterMap.values()) {
      const clusterEntries = indices.map((i) => entries[i])

      const nameCount = new Map<string, number>()
      for (const e of clusterEntries) {
        nameCount.set(e.name, (nameCount.get(e.name) || 0) + 1)
      }
      let mostFrequentName = clusterEntries[0].name
      let maxCount = 0
      for (const [name, count] of nameCount) {
        if (count > maxCount) {
          maxCount = count
          mostFrequentName = name
        }
      }

      const avgLat = median(clusterEntries.map((e) => e.latitude))
      const avgLon = median(clusterEntries.map((e) => e.longitude))

      const result = insertGroup.run(mostFrequentName, avgLat, avgLon)
      const groupId = result.lastInsertRowid as number

      for (const idx of indices) {
        updateEntryGroup.run(groupId, entries[idx].id)
      }

      groups.push({
        id: groupId,
        merged_name: mostFrequentName,
        merged_latitude: avgLat,
        merged_longitude: avgLon,
      })
    }

    return groups
  })

  return transaction()
}
