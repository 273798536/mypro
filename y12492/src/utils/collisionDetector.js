export function detectAllCollisions({ lightingFixtures, riggingPoints, actorRoutes, stageProps, stageConfig }) {
  const issues = []

  issues.push(...detectLightObstructions(lightingFixtures, riggingPoints, stageProps, actorRoutes))
  issues.push(...detectRouteCrossings(actorRoutes))
  issues.push(...detectRiggingHeightIssues(riggingPoints, stageConfig))
  issues.push(...detectBoundaryWarnings(lightingFixtures, riggingPoints, stageConfig))

  return issues
}

function detectLightObstructions(lights, riggings, props, routes) {
  const issues = []

  lights.forEach(light => {
    const beamPath = calculateBeamPath(light)

    riggings.forEach(rig => {
      if (doesBeamIntersectRigging(beamPath, rig)) {
        issues.push({
          id: `obs_${light.id}_${rig.id}`,
          type: 'light_obstruction',
          severity: 'high',
          title: '灯具遮挡',
          message: `${light.name} 的光束被 ${rig.name} 遮挡`,
          source: light.id,
          target: rig.id,
          sourceType: 'light',
          targetType: 'rigging',
          location: { ...light.position }
        })
      }
    })

    props.forEach(prop => {
      if (doesBeamIntersectProp(beamPath, prop)) {
        issues.push({
          id: `obs_${light.id}_${prop.id}`,
          type: 'light_obstruction',
          severity: 'medium',
          title: '道具遮挡',
          message: `${light.name} 的光束被 ${prop.name} 遮挡`,
          source: light.id,
          target: prop.id,
          sourceType: 'light',
          targetType: 'prop',
          location: { ...light.position }
        })
      }
    })
  })

  return issues
}

function detectRouteCrossings(routes) {
  const issues = []

  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const crossings = findRouteCrossings(routes[i], routes[j])
      crossings.forEach((crossing, idx) => {
        issues.push({
          id: `cross_${routes[i].id}_${routes[j].id}_${idx}`,
          type: 'route_crossing',
          severity: crossing.simultaneous ? 'high' : 'low',
          title: '路线交叉',
          message: `${routes[i].actor} 与 ${routes[j].actor} 的路线${crossing.simultaneous ? '同时' : ''}经过同一点`,
          source: routes[i].id,
          target: routes[j].id,
          sourceType: 'route',
          targetType: 'route',
          location: crossing.point,
          time: crossing.time
        })
      })
    }
  }

  return issues
}

function detectRiggingHeightIssues(riggings, stageConfig) {
  const issues = []
  const maxHeight = stageConfig.boundaryWarnings.maxHeight

  riggings.forEach(rig => {
    if (rig.height >= maxHeight * 0.95) {
      const ratio = (rig.height / maxHeight * 100).toFixed(1)
      issues.push({
        id: `height_${rig.id}`,
        type: 'rigging_height',
        severity: rig.height >= maxHeight ? 'critical' : 'warning',
        title: '吊点超高',
        message: `${rig.name} 高度 ${rig.height}m (上限 ${maxHeight}m)，已达 ${ratio}%`,
        source: rig.id,
        sourceType: 'rigging',
        location: { ...rig.position },
        currentValue: rig.height,
        maxValue: maxHeight
      })
    }
  })

  return issues
}

function detectBoundaryWarnings(lights, riggings, stageConfig) {
  const issues = []
  const { width, depth, height } = stageConfig.dimensions

  lights.forEach(light => {
    const pos = light.position
    if (Math.abs(pos.x) > width / 2 - 0.5 ||
        Math.abs(pos.z) > depth / 2 - 0.5 ||
        pos.y > height - 0.5) {
      issues.push({
        id: `boundary_${light.id}`,
        type: 'boundary_warning',
        severity: 'warning',
        title: '边界值提醒',
        message: `${light.name} 位置接近舞台边界，渲染结果可能与实际有偏差`,
        source: light.id,
        sourceType: 'light',
        location: { ...pos }
      })
    }
  })

  return issues
}

function calculateBeamPath(light) {
  const start = { ...light.position }
  const angleRad = light.rotation.x * Math.PI / 180
  const beamLength = 15

  return {
    start,
    end: {
      x: start.x,
      y: start.y - Math.sin(angleRad) * beamLength,
      z: start.z - Math.cos(angleRad) * beamLength
    },
    angle: light.beamAngle
  }
}

function doesBeamIntersectRigging(beam, rig) {
  const rigMinX = rig.position.x - rig.length / 2
  const rigMaxX = rig.position.x + rig.length / 2
  const rigY = rig.position.y
  const rigZ = rig.position.z

  const t = (rigY - beam.start.y) / (beam.end.y - beam.start.y)
  if (t < 0 || t > 1) return false

  const intersectX = beam.start.x + t * (beam.end.x - beam.start.x)
  const intersectZ = beam.start.z + t * (beam.end.z - beam.start.z)

  return intersectX >= rigMinX && intersectX <= rigMaxX &&
         Math.abs(intersectZ - rigZ) < 0.5
}

function doesBeamIntersectProp(beam, prop) {
  const halfSize = {
    x: prop.size.x / 2,
    y: prop.size.y / 2,
    z: prop.size.z / 2
  }

  for (let t = 0; t <= 1; t += 0.1) {
    const point = {
      x: beam.start.x + t * (beam.end.x - beam.start.x),
      y: beam.start.y + t * (beam.end.y - beam.start.y),
      z: beam.start.z + t * (beam.end.z - beam.start.z)
    }

    if (point.x >= prop.position.x - halfSize.x &&
        point.x <= prop.position.x + halfSize.x &&
        point.y >= prop.position.y &&
        point.y <= prop.position.y + prop.size.y &&
        point.z >= prop.position.z - halfSize.z &&
        point.z <= prop.position.z + halfSize.z) {
      return true
    }
  }
  return false
}

function findRouteCrossings(route1, route2) {
  const crossings = []
  const threshold = 1.0

  for (let t = 0; t <= 8; t += 0.5) {
    const pos1 = getPositionAtTime(route1, t)
    const pos2 = getPositionAtTime(route2, t)

    if (pos1 && pos2) {
      const dist = Math.sqrt(
        Math.pow(pos1.x - pos2.x, 2) +
        Math.pow(pos1.z - pos2.z, 2)
      )

      if (dist < threshold) {
        crossings.push({
          point: {
            x: (pos1.x + pos2.x) / 2,
            y: 0,
            z: (pos1.z + pos2.z) / 2
          },
          time: t,
          simultaneous: true
        })
      }
    }
  }

  return crossings
}

function getPositionAtTime(route, time) {
  const waypoints = route.waypoints
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (time >= waypoints[i].time && time <= waypoints[i + 1].time) {
      const t = (time - waypoints[i].time) / (waypoints[i + 1].time - waypoints[i].time)
      return {
        x: waypoints[i].x + t * (waypoints[i + 1].x - waypoints[i].x),
        y: waypoints[i].y + t * (waypoints[i + 1].y - waypoints[i].y),
        z: waypoints[i].z + t * (waypoints[i + 1].z - waypoints[i].z)
      }
    }
  }
  return null
}
