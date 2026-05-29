import type { VoxelData, DetectedIssue, BuildingBlock, PedestrianZone } from '@/types'

function angleBetweenVectors(a: [number, number, number], b: [number, number, number]): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const magA = Math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2)
  const magB = Math.sqrt(b[0] ** 2 + b[1] ** 2 + b[2] ** 2)
  if (magA === 0 || magB === 0) return 0
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)))
  return Math.acos(cosAngle) * (180 / Math.PI)
}

function getNeighbors(voxel: VoxelData, voxelMap: Map<string, VoxelData>, step: number): VoxelData[] {
  const [x, y, z] = voxel.position
  const neighbors: VoxelData[] = []
  const offsets: [number, number, number][] = [
    [step, 0, 0], [-step, 0, 0],
    [0, step, 0], [0, -step, 0],
    [0, 0, step], [0, 0, -step],
  ]
  for (const [dx, dy, dz] of offsets) {
    const key = `${x + dx},${y + dy},${z + dz}`
    const neighbor = voxelMap.get(key)
    if (neighbor && neighbor.category !== 'building') {
      neighbors.push(neighbor)
    }
  }
  return neighbors
}

export function detectWindReversals(
  voxels: VoxelData[],
  voxelMap: Map<string, VoxelData>,
  step: number
): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  const seen = new Set<string>()
  let issueCounter = 0

  const windVoxels = voxels.filter(
    (v) => v.category === 'wind' && v.windSpeed > 0.5
  )

  for (const voxel of windVoxels) {
    const neighbors = getNeighbors(voxel, voxelMap, step)
    for (const neighbor of neighbors) {
      if (neighbor.windSpeed < 0.5) continue
      const pairKey = [voxel.id, neighbor.id].sort().join('-')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      const angle = angleBetweenVectors(voxel.windDirection, neighbor.windDirection)
      if (angle > 150) {
        const isPedestrian =
          voxel.category === 'pedestrian' || neighbor.category === 'pedestrian'
        const severity = isPedestrian ? 'critical' : 'warning'

        const midPos: [number, number, number] = [
          (voxel.position[0] + neighbor.position[0]) / 2,
          (voxel.position[1] + neighbor.position[1]) / 2,
          (voxel.position[2] + neighbor.position[2]) / 2,
        ]

        issues.push({
          id: `issue_wr_${issueCounter++}`,
          type: 'wind_reversal',
          severity,
          position: midPos,
          description: `体素(${voxel.position.map(Math.round).join(',')})与邻体素(${neighbor.position.map(Math.round).join(',')})风向夹角${Math.round(angle)}°，疑似风向反转${isPedestrian ? '（位于行人区）' : ''}`,
          affectedVoxelIds: [voxel.id, neighbor.id],
          confirmed: false,
        })
      }
    }
  }

  return issues
}

export function detectVoxelHoles(
  voxels: VoxelData[],
  voxelMap: Map<string, VoxelData>,
  step: number,
  pedestrianZones: PedestrianZone[]
): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  let issueCounter = 0

  const positionSet = new Set<string>()
  for (const v of voxels) {
    positionSet.add(v.position.join(','))
  }

  const windPositions = voxels
    .filter((v) => v.category !== 'building')
    .map((v) => v.position)

  for (const pos of windPositions) {
    const [x, y, z] = pos
    const offsets: [number, number, number][] = [
      [step, 0, 0], [-step, 0, 0],
      [0, step, 0], [0, -step, 0],
      [0, 0, step], [0, 0, -step],
    ]
    for (const [dx, dy, dz] of offsets) {
      const nx = x + dx
      const ny = y + dy
      const nz = z + dz
      const key = `${nx},${ny},${nz}`

      if (!positionSet.has(key) && ny >= 0 && ny < 150) {
        const isPedestrian = pedestrianZones.some((pz) => {
          const { min, max } = pz.bounds
          return nx >= min[0] && nx <= max[0] && ny >= min[1] && ny <= max[1] && nz >= min[2] && nz <= max[2]
        })

        const surrounded = offsets.every(([sdx, sdy, sdz]) => {
          const sk = `${nx + sdx},${ny + sdy},${nz + sdz}`
          return positionSet.has(sk)
        })

        if (surrounded || isPedestrian) {
          const severity = isPedestrian ? 'critical' : 'warning'
          const holeKey = `hole_${nx},${ny},${nz}`
          if (issues.some((i) => i.id === holeKey)) continue

          issues.push({
            id: `issue_vh_${issueCounter++}`,
            type: 'voxel_hole',
            severity,
            position: [nx, ny, nz],
            description: `位置(${nx},${ny},${nz})存在体素数据空洞${isPedestrian ? '（位于行人区范围内）' : surrounded ? '（内部空洞）' : '（边界缺失）'}`,
            affectedVoxelIds: [],
            confirmed: false,
          })
        }
      }
    }
  }

  return issues.slice(0, 30)
}

export function detectSensorOcclusion(
  voxels: VoxelData[],
  buildings: BuildingBlock[],
  pedestrianZones: PedestrianZone[]
): DetectedIssue[] {
  const issues: DetectedIssue[] = []
  let issueCounter = 0

  for (const pz of pedestrianZones) {
    const { min, max } = pz.bounds
    const cx = (min[0] + max[0]) / 2
    const cz = (min[2] + max[2]) / 2

    for (const b of buildings) {
      const [bx, , bz] = b.position
      const [bw, , bd] = b.size
      const bcx = bx + bw / 2
      const bcz = bz + bd / 2
      const dx = cx - bcx
      const dz = cz - bcz
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist < b.height * 2) {
        const dominantWindDir: [number, number, number] = [1, 0, 0.3]
        const toSensor: [number, number, number] = [dx, 0, dz]
        const angle = angleBetweenVectors(dominantWindDir, toSensor)

        const isDownstream = angle > 90 && angle < 180
        const severity = isDownstream ? 'critical' : 'warning'

        issues.push({
          id: `issue_so_${issueCounter++}`,
          type: 'sensor_occlusion',
          severity,
          position: [cx, pz.pedestrianHeight, cz],
          description: `${pz.name}受${b.name}遮挡（距离${Math.round(dist)}m），${isDownstream ? '位于背风面涡流区' : '处于建筑近距离影响范围'}`,
          affectedVoxelIds: voxels
            .filter(
              (v) =>
                v.zoneId === pz.id ||
                (v.position[0] >= min[0] &&
                  v.position[0] <= max[0] &&
                  v.position[1] >= min[1] &&
                  v.position[1] <= max[1] &&
                  v.position[2] >= min[2] &&
                  v.position[2] <= max[2])
            )
            .map((v) => v.id),
          confirmed: false,
        })
      }
    }
  }

  return issues
}

export function runAllDetections(
  voxels: VoxelData[],
  buildings: BuildingBlock[],
  pedestrianZones: PedestrianZone[],
  step: number
): DetectedIssue[] {
  const voxelMap = new Map<string, VoxelData>()
  for (const v of voxels) {
    voxelMap.set(v.position.join(','), v)
  }

  const reversals = detectWindReversals(voxels, voxelMap, step)
  const holes = detectVoxelHoles(voxels, voxelMap, step, pedestrianZones)
  const occlusions = detectSensorOcclusion(voxels, buildings, pedestrianZones)

  return [...reversals, ...holes, ...occlusions]
}
