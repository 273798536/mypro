const SPEED_OF_SOUND = 343

export function calculateDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function calculatePhaseOffset(distance1, distance2) {
  const distanceDiff = Math.abs(distance1 - distance2)
  const timeDiff = distanceDiff / SPEED_OF_SOUND
  const degreesPhaseShift = (timeDiff * 1000) * 360
  return {
    distanceDiff: distanceDiff * 100,
    timeDiffMs: timeDiff * 1000,
    phaseShift: degreesPhaseShift % 360
  }
}

export function checkPhaseIssues(microphones, drumSources) {
  const issues = []
  
  const micArray = Object.values(microphones)
  
  for (let i = 0; i < micArray.length; i++) {
    for (let j = i + 1; j < micArray.length; j++) {
      const mic1 = micArray[i]
      const mic2 = micArray[j]
      
      const commonTargets = findCommonTargets(mic1, mic2, drumSources)
      
      if (commonTargets.length > 0) {
        for (const target of commonTargets) {
          const dist1 = calculateDistance(mic1.position, target.position)
          const dist2 = calculateDistance(mic2.position, target.position)
          const phaseInfo = calculatePhaseOffset(dist1, dist2)
          
          const criticalDistance = 0.34
          const distanceDiff = Math.abs(dist1 - dist2)
          
          if (distanceDiff < criticalDistance) {
            const severity = distanceDiff < 0.17 ? 'high' : 'medium'
            issues.push({
              type: 'phase_risk',
              severity,
              mic1: mic1.config.name,
              mic2: mic2.config.name,
              target: target.name,
              distanceDiff: phaseInfo.distanceDiff.toFixed(1),
              timeDiffMs: phaseInfo.timeDiffMs.toFixed(2),
              suggestion: generatePhaseSuggestion(mic1, mic2, distanceDiff, target)
            })
          }
        }
      }
    }
  }
  
  return issues
}

function findCommonTargets(mic1, mic2, drumSources) {
  const targets1 = findAffectedSources(mic1, drumSources)
  const targets2 = findAffectedSources(mic2, drumSources)
  
  return targets1.filter(t1 => 
    targets2.some(t2 => t2.id === t1.id)
  )
}

function findAffectedSources(mic, drumSources) {
  const affected = []
  const micPos = mic.position
  
  for (const source of drumSources) {
    const dist = calculateDistance(micPos, source.position)
    if (dist < 2.0) {
      affected.push(source)
    }
  }
  
  return affected
}

function generatePhaseSuggestion(mic1, mic2, distanceDiff, target) {
  if (distanceDiff < 0.1) {
    return `⚠️ 高风险：${mic1.config.name} 和 ${mic2.config.name} 距离 ${target.name} 几乎相同，很可能产生严重相位抵消。建议将其中一支麦克风移动至少17cm以上，或在调音台反相其中一轨。`
  } else if (distanceDiff < 0.17) {
    return `⚠️ 中风险：${mic1.config.name} 和 ${mic2.config.name} 距离 ${target.name} 的差值在危险区内。建议检查相位关系，必要时移动其中一支麦克风或进行相位对齐。`
  } else {
    return `📝 注意：${mic1.config.name} 和 ${mic2.config.name} 距离 ${target.name} 的差值接近临界值。建议监听时检查相位关系。`
  }
}

export function checkBoundaryConditions(microphone) {
  const config = microphone.config
  const position = microphone.position
  const target = microphone.targetPosition
  
  const actualDistance = calculateDistance(position, target)
  const { min, max } = config.recommendedDistance
  
  const warnings = []
  
  if (actualDistance < min) {
    warnings.push({
      type: 'distance_too_close',
      message: `距离过近（${(actualDistance * 100).toFixed(1)}cm），建议最小 ${(min * 100).toFixed(1)}cm`,
      severity: 'warning'
    })
  } else if (actualDistance > max) {
    warnings.push({
      type: 'distance_too_far',
      message: `距离过远（${(actualDistance * 100).toFixed(1)}cm），建议最大 ${(max * 100).toFixed(1)}cm`,
      severity: 'info'
    })
  }
  
  const angle = calculateVerticalAngle(position, target)
  const angleMin = config.recommendedAngle.min
  const angleMax = config.recommendedAngle.max
  
  if (angle < angleMin || angle > angleMax) {
    warnings.push({
      type: 'angle_out_of_range',
      message: `角度 ${angle.toFixed(1)}° 超出推荐范围 ${angleMin}° 到 ${angleMax}°`,
      severity: 'info'
    })
  }
  
  return {
    distance: actualDistance * 100,
    angle,
    warnings,
    isInBounds: warnings.filter(w => w.severity === 'warning').length === 0
  }
}

function calculateVerticalAngle(position, target) {
  const dx = target.x - position.x
  const dy = target.y - position.y
  const dz = target.z - position.z
  
  const horizontalDist = Math.sqrt(dx * dx + dz * dz)
  return Math.atan2(dy, horizontalDist) * (180 / Math.PI)
}

export function formatPhaseReport(issues) {
  if (issues.length === 0) {
    return '✅ 未检测到明显相位问题'
  }
  
  const highIssues = issues.filter(i => i.severity === 'high').length
  const mediumIssues = issues.filter(i => i.severity === 'medium').length
  
  let report = `📊 相位检测报告\n\n`
  report += `检测到 ${issues.length} 个潜在问题\n`
  report += `🔴 高风险: ${highIssues}\n`
  report += `🟡 中风险: ${mediumIssues}\n\n`
  
  issues.forEach((issue, index) => {
    report += `【${index + 1}】${issue.target}\n`
    report += `   涉及: ${issue.mic1} ↔ ${issue.mic2}\n`
    report += `   距离差: ${issue.distanceDiff}cm\n`
    report += `   建议: ${issue.suggestion}\n\n`
  })
  
  return report
}
