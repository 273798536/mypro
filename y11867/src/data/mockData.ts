import type { VoxelData, BuildingBlock, PedestrianZone } from '@/types'
import { HEIGHT_MAX } from '@/types'

const GRID_SIZE = 40
const GRID_STEP = 5
const DOMAIN = GRID_SIZE * GRID_STEP

function hashCoord(x: number, y: number, z: number): number {
  let h = x * 374761393 + y * 668265263 + z * 1274126177
  h = (h ^ (h >> 13)) * 1274126177
  h = h ^ (h >> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

const buildings: BuildingBlock[] = [
  { id: 'b1', name: '塔楼A', position: [30, 0, 30], size: [20, 120, 20], height: 120 },
  { id: 'b2', name: '塔楼B', position: [80, 0, 25], size: [18, 90, 18], height: 90 },
  { id: 'b3', name: '商业裙房', position: [55, 0, 60], size: [40, 25, 30], height: 25 },
  { id: 'b4', name: '住宅楼', position: [130, 0, 50], size: [15, 60, 15], height: 60 },
  { id: 'b5', name: '办公楼', position: [50, 0, 120], size: [25, 80, 20], height: 80 },
  { id: 'b6', name: '低层配套', position: [110, 0, 100], size: [30, 12, 25], height: 12 },
]

const pedestrianZones: PedestrianZone[] = [
  { id: 'pz1', name: '主入口广场', bounds: { min: [0, 0, 0], max: [100, 2, 25] }, pedestrianHeight: 2 },
  { id: 'pz2', name: '内部步行街', bounds: { min: [45, 0, 25], max: [65, 2, 55] }, pedestrianHeight: 2 },
  { id: 'pz3', name: '滨河步道', bounds: { min: [0, 0, 140], max: [200, 2, 160] }, pedestrianHeight: 2 },
  { id: 'pz4', name: '裙房连廊', bounds: { min: [55, 0, 85], max: [95, 2, 110] }, pedestrianHeight: 2 },
]

function isInsideBuilding(x: number, z: number): BuildingBlock | null {
  for (const b of buildings) {
    const [bx, , bz] = b.position
    const [bw, , bd] = b.size
    if (x >= bx && x <= bx + bw && z >= bz && z <= bz + bd) {
      return b
    }
  }
  return null
}

function getBaseWindDirection(x: number, z: number): [number, number, number] {
  const b = isInsideBuilding(x, z)
  if (!b) return [1, 0, 0.3]

  const [bx, , bz] = b.position
  const [bw, , bd] = b.size
  const cx = bx + bw / 2
  const cz = bz + bd / 2
  const dx = x - cx
  const dz = z - cz

  if (Math.abs(dx) / (bw / 2) > Math.abs(dz) / (bd / 2)) {
    return dx > 0 ? [1, 0.3, 0.1] : [-1, 0.3, 0.1]
  }
  return dz > 0 ? [0.1, 0.3, 1] : [0.1, 0.3, -1]
}

function getWindSpeed(x: number, y: number, z: number): number {
  const b = isInsideBuilding(x, z)
  if (b && y < b.height) return 0

  let speed = 3 + hashCoord(x, y, z) * 4

  if (b && y < b.height + 15) {
    const dist = y - b.height
    speed = 1 + Math.max(0, dist) * 0.5
  }

  if (y < 10) {
    speed *= 0.6 + hashCoord(x * 3, y, z * 7) * 0.4
  }

  if (hashCoord(x + 100, y + 200, z + 300) > 0.85) {
    speed = 8 + hashCoord(x * 2, y * 3, z) * 7
  }

  return Math.round(speed * 10) / 10
}

export function generateMockData(): {
  voxels: VoxelData[]
  buildings: BuildingBlock[]
  pedestrianZones: PedestrianZone[]
} {
  const voxels: VoxelData[] = []
  let voxelCounter = 0

  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      const x = gx * GRID_STEP
      const z = gz * GRID_STEP

      const b = isInsideBuilding(x, z)

      if (b) {
        for (let gy = 0; gy < Math.ceil(b.height / GRID_STEP); gy++) {
          const y = gy * GRID_STEP
          if (y >= b.height) break
          voxels.push({
            id: `v${voxelCounter++}`,
            position: [x, y, z],
            windSpeed: 0,
            windDirection: [0, 0, 0],
            category: 'building',
            buildingId: b.id,
          })
        }
      }

      for (let gy = 0; gy < Math.ceil(HEIGHT_MAX / GRID_STEP); gy++) {
        const y = gy * GRID_STEP

        if (b && y < b.height) continue

        if (hashCoord(gx * 997, gy * 131, gz * 523) > 0.7 && y > 5 && y < 80) {
          if (!b || y >= b.height + GRID_STEP) {
            continue
          }
        }

        const windSpeed = getWindSpeed(x, y, z)
        let windDir = getBaseWindDirection(x, z)

        if (b && y >= b.height - 5 && y <= b.height + 20 && x >= b.position[0] && x <= b.position[0] + b.size[0]) {
          if (hashCoord(x * 17, y * 31, z * 41) > 0.5) {
            windDir = [-windDir[0], windDir[1], -windDir[2]]
          }
        }

        let category: VoxelData['category'] = 'wind'
        let zoneId: string | undefined

        for (const pz of pedestrianZones) {
          const { min, max } = pz.bounds
          if (x >= min[0] && x <= max[0] && y >= min[1] && y <= max[1] && z >= min[2] && z <= max[2]) {
            category = 'pedestrian'
            zoneId = pz.id
            break
          }
        }

        const isBuilding = b && y < b.height
        if (!isBuilding && windSpeed === 0) continue

        if (isBuilding) {
          voxels.push({
            id: `v${voxelCounter++}`,
            position: [x, y, z],
            windSpeed: 0,
            windDirection: [0, 0, 0],
            category: 'building',
            buildingId: b.id,
          })
        } else {
          voxels.push({
            id: `v${voxelCounter++}`,
            position: [x, y, z],
            windSpeed,
            windDirection: windDir,
            category,
            zoneId,
          })
        }
      }
    }
  }

  return { voxels, buildings, pedestrianZones }
}
