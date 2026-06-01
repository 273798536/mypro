export function generateReport({ stageConfig, lightingFixtures, riggingPoints, actorRoutes, stageProps, issues }) {
  const lightObstructions = issues.filter(i => i.type === 'light_obstruction')
  const routeCrossings = issues.filter(i => i.type === 'route_crossing')
  const riggingHeight = issues.filter(i => i.type === 'rigging_height')
  const boundaryWarnings = issues.filter(i => i.type === 'boundary_warning')

  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const highCount = issues.filter(i => i.severity === 'high').length
  const mediumCount = issues.filter(i => i.severity === 'medium').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  return {
    summary: {
      title: `${stageConfig.name} - 灯光遮挡分析报告`,
      version: stageConfig.version,
      generatedAt: new Date().toLocaleString('zh-CN'),
      totalIssues: issues.length,
      criticalCount,
      highCount,
      mediumCount,
      warningCount,
      keyFindings: [
        ...lightObstructions.slice(0, 3).map(i => ({
          type: '灯具遮挡',
          message: i.message,
          severity: i.severity
        })),
        ...riggingHeight.slice(0, 2).map(i => ({
          type: '吊点超高',
          message: i.message,
          severity: i.severity
        })),
        ...routeCrossings.slice(0, 2).map(i => ({
          type: '路线交叉',
          message: i.message,
          severity: i.severity
        }))
      ].slice(0, 5)
    },
    stageOverview: {
      name: stageConfig.name,
      dimensions: stageConfig.dimensions,
      fixtureCount: lightingFixtures.length,
      riggingCount: riggingPoints.length,
      routeCount: actorRoutes.length,
      propCount: stageProps.length
    },
    lightingReport: {
      fixtures: lightingFixtures.map(l => ({
        id: l.id,
        name: l.name,
        type: l.type,
        position: l.position,
        power: l.power,
        status: l.status
      })),
      obstructions: lightObstructions
    },
    riggingReport: {
      points: riggingPoints.map(r => ({
        id: r.id,
        name: r.name,
        height: r.height,
        load: r.load,
        status: r.status
      })),
      heightIssues: riggingHeight
    },
    routeReport: {
      routes: actorRoutes.map(r => ({
        id: r.id,
        name: r.name,
        actor: r.actor,
        waypointCount: r.waypoints.length
      })),
      crossings: routeCrossings
    },
    boundaryReport: {
      warnings: boundaryWarnings
    },
    recommendations: generateRecommendations(issues)
  }
}

function generateRecommendations(issues) {
  const recommendations = []

  const lightIssues = issues.filter(i => i.type === 'light_obstruction')
  if (lightIssues.length > 0) {
    recommendations.push({
      priority: 'high',
      category: '灯光调整',
      title: '调整灯具位置或角度',
      description: `发现 ${lightIssues.length} 处灯具遮挡，建议调整被遮挡灯具的位置或照射角度，避免吊杆和道具阻挡光束。`,
      affectedItems: lightIssues.map(i => i.source)
    })
  }

  const heightIssues = issues.filter(i => i.type === 'rigging_height')
  if (heightIssues.length > 0) {
    recommendations.push({
      priority: heightIssues.some(i => i.severity === 'critical') ? 'critical' : 'high',
      category: '吊杆调整',
      title: '降低超高吊杆高度',
      description: '部分吊点高度接近或超过上限，存在安全隐患。请降低吊杆高度至安全范围内。',
      affectedItems: heightIssues.map(i => i.source)
    })
  }

  const crossingIssues = issues.filter(i => i.type === 'route_crossing')
  if (crossingIssues.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: '路线调整',
      title: '优化演员走位路线',
      description: `发现 ${crossingIssues.length} 处路线交叉，建议错开时间或调整路线，避免演员碰撞。`,
      affectedItems: crossingIssues.map(i => i.source)
    })
  }

  const boundaryIssues = issues.filter(i => i.type === 'boundary_warning')
  if (boundaryIssues.length > 0) {
    recommendations.push({
      priority: 'low',
      category: '边界提醒',
      title: '注意边界设备位置',
      description: '部分灯具位置接近舞台边界，实际装台时请注意预留安全距离，3D渲染效果仅供参考。',
      affectedItems: boundaryIssues.map(i => i.source)
    })
  }

  return recommendations
}
