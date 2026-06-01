import type {
  SpeedRecord,
  MassTable,
  BallState,
  CalculationStep,
  CalculationResult,
  Anomaly,
  Collision,
} from '@/types'

const ENERGY_LOSS_THRESHOLD = 0.1
const MOMENTUM_DIFFERENCE_THRESHOLD = 0.05

export function calculateVelocity(velocityX: number, velocityY: number): number {
  return Math.sqrt(velocityX * velocityX + velocityY * velocityY)
}

export function calculateMomentum(mass: number | null, velocity: number): number {
  if (mass === null) return 0
  return mass * velocity
}

export function calculateKineticEnergy(mass: number | null, velocity: number): number {
  if (mass === null) return 0
  return 0.5 * mass * velocity * velocity
}

export function formatTimestamp(timestamp: number): string {
  const minutes = Math.floor(timestamp / 60)
  const seconds = (timestamp % 60).toFixed(3)
  return `${minutes}:${seconds.padStart(6, '0')}`
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function createBallState(
  ballId: number,
  velocityX: number,
  velocityY: number,
  mass: number | null
): BallState {
  const velocity = calculateVelocity(velocityX, velocityY)
  return {
    ballId,
    velocityX,
    velocityY,
    mass,
    momentumX: calculateMomentum(mass, velocityX),
    momentumY: calculateMomentum(mass, velocityY),
    kineticEnergy: calculateKineticEnergy(mass, velocity),
  }
}

function detectMassMissing(
  ballIds: number[],
  massMap: Map<number, number>
): Anomaly | null {
  const missingBalls: number[] = []
  ballIds.forEach((id) => {
    if (!massMap.has(id)) {
      missingBalls.push(id)
    }
  })

  if (missingBalls.length === 0) return null

  return {
    id: generateId(),
    collisionId: '',
    type: 'MASS_MISSING',
    description: `小球 ${missingBalls.join(', ')} 的质量数据缺失，计算结果可能不准确`,
    severity: 'high',
    affectedBalls: missingBalls,
  }
}

function detectDirectionReversed(
  ballsBefore: BallState[],
  ballsAfter: BallState[]
): Anomaly | null {
  const reversedBalls: number[] = []

  ballsBefore.forEach((before, index) => {
    const after = ballsAfter[index]
    if (!after) return

    const dotProduct = before.velocityX * after.velocityX + before.velocityY * after.velocityY
    const magnitudeBefore = calculateVelocity(before.velocityX, before.velocityY)
    const magnitudeAfter = calculateVelocity(after.velocityX, after.velocityY)

    if (magnitudeBefore > 0.01 && magnitudeAfter > 0.01) {
      const cosAngle = dotProduct / (magnitudeBefore * magnitudeAfter)
      if (cosAngle < -0.7) {
        reversedBalls.push(before.ballId)
      }
    }
  })

  if (reversedBalls.length === 0) return null

  return {
    id: generateId(),
    collisionId: '',
    type: 'DIRECTION_REVERSED',
    description: `小球 ${reversedBalls.join(', ')} 碰撞后速度方向发生显著反向`,
    severity: 'medium',
    affectedBalls: reversedBalls,
  }
}

function detectEnergyLossExcessive(energyLossPercent: number): Anomaly | null {
  if (energyLossPercent <= ENERGY_LOSS_THRESHOLD) return null

  return {
    id: generateId(),
    collisionId: '',
    type: 'ENERGY_LOSS_EXCESSIVE',
    description: `能量损失率为 ${(energyLossPercent * 100).toFixed(2)}%，超过阈值 ${(ENERGY_LOSS_THRESHOLD * 100)}%`,
    severity: energyLossPercent > 0.25 ? 'high' : 'medium',
    affectedBalls: [],
  }
}

function detectAnomalies(
  ballIds: number[],
  massMap: Map<number, number>,
  ballsBefore: BallState[],
  ballsAfter: BallState[],
  energyLossPercent: number
): Anomaly[] {
  const anomalies: Anomaly[] = []

  const massMissing = detectMassMissing(ballIds, massMap)
  if (massMissing) anomalies.push(massMissing)

  const directionReversed = detectDirectionReversed(ballsBefore, ballsAfter)
  if (directionReversed) anomalies.push(directionReversed)

  const energyLossExcessive = detectEnergyLossExcessive(energyLossPercent)
  if (energyLossExcessive) anomalies.push(energyLossExcessive)

  return anomalies
}

function buildCalculationSteps(
  ballsBefore: BallState[],
  ballsAfter: BallState[],
  totalMomentumBefore: number,
  totalMomentumAfter: number,
  momentumDifference: number,
  totalKineticEnergyBefore: number,
  totalKineticEnergyAfter: number,
  energyLoss: number,
  energyLossPercent: number
): CalculationStep[] {
  const steps: CalculationStep[] = []

  ballsBefore.forEach((ball, i) => {
    const velocity = calculateVelocity(ball.velocityX, ball.velocityY)
    steps.push({
      step: i + 1,
      description: `计算小球 ${ball.ballId} 碰撞前的动量和动能`,
      formula: `p = m × v = ${ball.mass ?? '?'} × ${velocity.toFixed(4)}`,
      result: `动量: ${ball.momentumX.toFixed(4)} i + ${ball.momentumY.toFixed(4)} j, 动能: ${ball.kineticEnergy.toFixed(4)} J`,
      sourceData: `质量: ${ball.mass ?? '缺失'}, 速度: (${ball.velocityX.toFixed(4)}, ${ball.velocityY.toFixed(4)})`,
    })
  })

  const baseStep = ballsBefore.length
  steps.push({
    step: baseStep + 1,
    description: '计算碰撞前系统总动量',
    formula: `p_total = Σ(p_i) = ${ballsBefore.map(b => b.momentumX.toFixed(2)).join(' + ')}`,
    result: `总动量: ${totalMomentumBefore.toFixed(4)} kg·m/s`,
    sourceData: `各小球动量: ${ballsBefore.map(b => `${b.momentumX.toFixed(2)}i + ${b.momentumY.toFixed(2)}j`).join(', ')}`,
  })

  steps.push({
    step: baseStep + 2,
    description: '计算碰撞前系统总动能',
    formula: `KE_total = Σ(0.5 × m × v²) = ${ballsBefore.map(b => b.kineticEnergy.toFixed(2)).join(' + ')}`,
    result: `总动能: ${totalKineticEnergyBefore.toFixed(4)} J`,
    sourceData: `各小球动能: ${ballsBefore.map(b => b.kineticEnergy.toFixed(2)).join(', ')} J`,
  })

  ballsAfter.forEach((ball, i) => {
    const velocity = calculateVelocity(ball.velocityX, ball.velocityY)
    steps.push({
      step: baseStep + 3 + i,
      description: `计算小球 ${ball.ballId} 碰撞后的动量和动能`,
      formula: `p' = m × v' = ${ball.mass ?? '?'} × ${velocity.toFixed(4)}`,
      result: `动量: ${ball.momentumX.toFixed(4)} i + ${ball.momentumY.toFixed(4)} j, 动能: ${ball.kineticEnergy.toFixed(4)} J`,
      sourceData: `质量: ${ball.mass ?? '缺失'}, 速度: (${ball.velocityX.toFixed(4)}, ${ball.velocityY.toFixed(4)})`,
    })
  })

  const secondHalfStep = baseStep + 3 + ballsAfter.length
  steps.push({
    step: secondHalfStep,
    description: '计算碰撞后系统总动量',
    formula: `p'_total = Σ(p'_i)`,
    result: `总动量: ${totalMomentumAfter.toFixed(4)} kg·m/s`,
    sourceData: `动量差: ${momentumDifference.toFixed(4)} (${((momentumDifference / totalMomentumBefore) * 100 || 0).toFixed(2)}%)`,
  })

  steps.push({
    step: secondHalfStep + 1,
    description: '计算碰撞后系统总动能和能量损失',
    formula: `KE_loss = KE_before - KE_after = ${totalKineticEnergyBefore.toFixed(4)} - ${totalKineticEnergyAfter.toFixed(4)}`,
    result: `能量损失: ${energyLoss.toFixed(4)} J (${(energyLossPercent * 100).toFixed(2)}%)`,
    sourceData: `碰撞前: ${totalKineticEnergyBefore.toFixed(4)} J, 碰撞后: ${totalKineticEnergyAfter.toFixed(4)} J`,
  })

  return steps
}

export function calculateCollisionResult(
  collisionId: string,
  ballIds: number[],
  speedsBefore: Map<number, { x: number; y: number }>,
  speedsAfter: Map<number, { x: number; y: number }>,
  massMap: Map<number, number>
): CalculationResult {
  const ballsBefore: BallState[] = ballIds.map((id) => {
    const speed = speedsBefore.get(id) || { x: 0, y: 0 }
    const mass = massMap.get(id) || null
    return createBallState(id, speed.x, speed.y, mass)
  })

  const ballsAfter: BallState[] = ballIds.map((id) => {
    const speed = speedsAfter.get(id) || { x: 0, y: 0 }
    const mass = massMap.get(id) || null
    return createBallState(id, speed.x, speed.y, mass)
  })

  const totalMomentumXBefore = ballsBefore.reduce((sum, b) => sum + b.momentumX, 0)
  const totalMomentumYBefore = ballsBefore.reduce((sum, b) => sum + b.momentumY, 0)
  const totalMomentumBefore = Math.sqrt(
    totalMomentumXBefore * totalMomentumXBefore + totalMomentumYBefore * totalMomentumYBefore
  )

  const totalMomentumXAfter = ballsAfter.reduce((sum, b) => sum + b.momentumX, 0)
  const totalMomentumYAfter = ballsAfter.reduce((sum, b) => sum + b.momentumY, 0)
  const totalMomentumAfter = Math.sqrt(
    totalMomentumXAfter * totalMomentumXAfter + totalMomentumYAfter * totalMomentumYAfter
  )

  const momentumDifference = Math.abs(totalMomentumBefore - totalMomentumAfter)
  const momentumDifferencePercent = totalMomentumBefore > 0
    ? momentumDifference / totalMomentumBefore
    : 0

  const totalKineticEnergyBefore = ballsBefore.reduce((sum, b) => sum + b.kineticEnergy, 0)
  const totalKineticEnergyAfter = ballsAfter.reduce((sum, b) => sum + b.kineticEnergy, 0)
  const energyLoss = Math.max(0, totalKineticEnergyBefore - totalKineticEnergyAfter)
  const energyLossPercent = totalKineticEnergyBefore > 0
    ? energyLoss / totalKineticEnergyBefore
    : 0

  const calculationSteps = buildCalculationSteps(
    ballsBefore,
    ballsAfter,
    totalMomentumBefore,
    totalMomentumAfter,
    momentumDifference,
    totalKineticEnergyBefore,
    totalKineticEnergyAfter,
    energyLoss,
    energyLossPercent
  )

  const isValid = momentumDifferencePercent <= MOMENTUM_DIFFERENCE_THRESHOLD

  return {
    id: generateId(),
    collisionId,
    ballsBefore,
    ballsAfter,
    totalMomentumXBefore,
    totalMomentumYBefore,
    totalMomentumBefore,
    totalMomentumXAfter,
    totalMomentumYAfter,
    totalMomentumAfter,
    momentumDifference,
    momentumDifferencePercent,
    totalKineticEnergyBefore,
    totalKineticEnergyAfter,
    energyLoss,
    energyLossPercent,
    calculationSteps,
    isValid,
  }
}

export function detectCollisions(
  speedRecords: SpeedRecord[],
  massTable: MassTable[],
  speedSourceFile: string,
  massSourceFile: string
): Collision[] {
  const collisions: Collision[] = []
  const massMap = new Map<number, number>()
  massTable.forEach((m) => massMap.set(m.ballId, m.mass))

  const recordsByBall = new Map<number, SpeedRecord[]>()
  speedRecords.forEach((r) => {
    if (!recordsByBall.has(r.ballId)) {
      recordsByBall.set(r.ballId, [])
    }
    recordsByBall.get(r.ballId)!.push(r)
  })

  recordsByBall.forEach((records) => {
    records.sort((a, b) => a.timestamp - b.timestamp)
  })

  const allTimestamps = Array.from(new Set(speedRecords.map((r) => r.timestamp))).sort(
    (a, b) => a - b
  )

  const timeWindow = 0.05
  const velocityChangeThreshold = 0.5

  for (let i = 1; i < allTimestamps.length - 1; i++) {
    const currentTime = allTimestamps[i]
    const prevTime = allTimestamps[i - 1]
    const nextTime = allTimestamps[i + 1]

    const collidingBalls: number[] = []
    const speedsBefore = new Map<number, { x: number; y: number }>()
    const speedsAfter = new Map<number, { x: number; y: number }>()

    recordsByBall.forEach((records, ballId) => {
      const prevRecord = records.find((r) => Math.abs(r.timestamp - prevTime) < timeWindow)
      const currRecord = records.find((r) => Math.abs(r.timestamp - currentTime) < timeWindow)
      const nextRecord = records.find((r) => Math.abs(r.timestamp - nextTime) < timeWindow)

      if (prevRecord && currRecord && nextRecord) {
        const vChange1 = Math.abs(currRecord.velocityX - prevRecord.velocityX) +
          Math.abs(currRecord.velocityY - prevRecord.velocityY)
        const vChange2 = Math.abs(nextRecord.velocityX - currRecord.velocityX) +
          Math.abs(nextRecord.velocityY - currRecord.velocityY)

        if (vChange1 > velocityChangeThreshold || vChange2 > velocityChangeThreshold) {
          collidingBalls.push(ballId)
          speedsBefore.set(ballId, {
            x: prevRecord.velocityX,
            y: prevRecord.velocityY,
          })
          speedsAfter.set(ballId, {
            x: nextRecord.velocityX,
            y: nextRecord.velocityY,
          })
        }
      }
    })

    if (collidingBalls.length >= 2) {
      const collisionId = generateId()
      const calculationResult = calculateCollisionResult(
        collisionId,
        collidingBalls,
        speedsBefore,
        speedsAfter,
        massMap
      )

      const anomalies = detectAnomalies(
        collidingBalls,
        massMap,
        calculationResult.ballsBefore,
        calculationResult.ballsAfter,
        calculationResult.energyLossPercent
      )

      anomalies.forEach((a) => (a.collisionId = collisionId))

      let status: 'normal' | 'warning' | 'error' = 'normal'
      if (anomalies.some((a) => a.severity === 'high')) {
        status = 'error'
      } else if (anomalies.length > 0) {
        status = 'warning'
      }

      collisions.push({
        id: collisionId,
        collisionTime: currentTime,
        collisionTimeFormatted: formatTimestamp(currentTime),
        ballIds: collidingBalls,
        speedRecordSource: speedSourceFile,
        massTableSource: massSourceFile,
        calculationResult,
        anomalies,
        status,
      })

      i += 2
    }
  }

  return collisions
}

export function getAnomalyTypeName(type: string): string {
  const names: Record<string, string> = {
    MASS_MISSING: '质量缺失',
    DIRECTION_REVERSED: '方向反号',
    ENERGY_LOSS_EXCESSIVE: '能量损失过大',
  }
  return names[type] || type
}

export function getStatusName(status: string): string {
  const names: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    error: '异常',
  }
  return names[status] || status
}
