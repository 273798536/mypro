import type { SpeedRecord, MassTable, Collision } from '@/types'
import { formatTimestamp } from '@/utils/calculationEngine'

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export const sampleSpeedRecords: SpeedRecord[] = [
  { id: 'sr1', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.0, velocityX: 2.0, velocityY: 0.0, remarks: '初始状态' },
  { id: 'sr2', sourceFile: '速度记录_2024.csv', ballId: 2, timestamp: 0.0, velocityX: 0.0, velocityY: 0.0, remarks: '静止' },
  { id: 'sr3', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.1, velocityX: 2.0, velocityY: 0.0, remarks: '' },
  { id: 'sr4', sourceFile: '速度记录_2024.csv', ballId: 2, timestamp: 0.1, velocityX: 0.0, velocityY: 0.0, remarks: '' },
  { id: 'sr5', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.2, velocityX: 1.8, velocityY: 0.1, remarks: '碰撞前' },
  { id: 'sr6', sourceFile: '速度记录_2024.csv', ballId: 2, timestamp: 0.2, velocityX: 0.0, velocityY: 0.0, remarks: '' },
  { id: 'sr7', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.21, velocityX: 0.3, velocityY: 0.2, remarks: '碰撞时刻' },
  { id: 'sr8', sourceFile: '速度记录_2024.csv', ballId: 2, timestamp: 0.21, velocityX: 1.5, velocityY: -0.1, remarks: '' },
  { id: 'sr9', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.3, velocityX: 0.3, velocityY: 0.2, remarks: '碰撞后' },
  { id: 'sr10', sourceFile: '速度记录_2024.csv', ballId: 2, timestamp: 0.3, velocityX: 1.5, velocityY: -0.1, remarks: '' },
  { id: 'sr11', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.4, velocityX: 0.28, velocityY: 0.19, remarks: '' },
  { id: 'sr12', sourceFile: '速度记录_2024.csv', ballId: 2, timestamp: 0.4, velocityX: 1.45, velocityY: -0.08, remarks: '' },
  { id: 'sr13', sourceFile: '速度记录_2024.csv', ballId: 3, timestamp: 0.5, velocityX: -1.5, velocityY: 0.0, remarks: '第二次碰撞' },
  { id: 'sr14', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.5, velocityX: 0.25, velocityY: 0.18, remarks: '' },
  { id: 'sr15', sourceFile: '速度记录_2024.csv', ballId: 3, timestamp: 0.6, velocityX: -1.4, velocityY: 0.0, remarks: '' },
  { id: 'sr16', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.6, velocityX: 0.22, velocityY: 0.16, remarks: '' },
  { id: 'sr17', sourceFile: '速度记录_2024.csv', ballId: 3, timestamp: 0.61, velocityX: -0.2, velocityY: 0.1, remarks: '第二次碰撞' },
  { id: 'sr18', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.61, velocityX: -0.8, velocityY: 0.05, remarks: '' },
  { id: 'sr19', sourceFile: '速度记录_2024.csv', ballId: 3, timestamp: 0.7, velocityX: -0.18, velocityY: 0.09, remarks: '' },
  { id: 'sr20', sourceFile: '速度记录_2024.csv', ballId: 1, timestamp: 0.7, velocityX: -0.75, velocityY: 0.04, remarks: '' },
]

export const sampleMassTable: MassTable[] = [
  { id: 'mt1', sourceFile: '质量表_实验A.xlsx', ballId: 1, mass: 0.5, remarks: '钢球' },
  { id: 'mt2', sourceFile: '质量表_实验A.xlsx', ballId: 2, mass: 0.5, remarks: '钢球，同规格' },
  { id: 'mt3', sourceFile: '质量表_实验A.xlsx', ballId: 3, mass: 1.0, remarks: '大钢球' },
]

function buildSampleCalculation(
  collisionId: string,
  balls: { id: number; mass: number; vxBefore: number; vyBefore: number; vxAfter: number; vyAfter: number }[]
) {
  const ballsBefore = balls.map((b) => {
    const v = Math.sqrt(b.vxBefore * b.vxBefore + b.vyBefore * b.vyBefore)
    return {
      ballId: b.id,
      velocityX: b.vxBefore,
      velocityY: b.vyBefore,
      mass: b.mass,
      momentumX: b.mass * b.vxBefore,
      momentumY: b.mass * b.vyBefore,
      kineticEnergy: 0.5 * b.mass * v * v,
    }
  })

  const ballsAfter = balls.map((b) => {
    const v = Math.sqrt(b.vxAfter * b.vxAfter + b.vyAfter * b.vyAfter)
    return {
      ballId: b.id,
      velocityX: b.vxAfter,
      velocityY: b.vyAfter,
      mass: b.mass,
      momentumX: b.mass * b.vxAfter,
      momentumY: b.mass * b.vyAfter,
      kineticEnergy: 0.5 * b.mass * v * v,
    }
  })

  const totalMomentumXBefore = ballsBefore.reduce((s, b) => s + b.momentumX, 0)
  const totalMomentumYBefore = ballsBefore.reduce((s, b) => s + b.momentumY, 0)
  const totalMomentumBefore = Math.sqrt(
    totalMomentumXBefore * totalMomentumXBefore + totalMomentumYBefore * totalMomentumYBefore
  )

  const totalMomentumXAfter = ballsAfter.reduce((s, b) => s + b.momentumX, 0)
  const totalMomentumYAfter = ballsAfter.reduce((s, b) => s + b.momentumY, 0)
  const totalMomentumAfter = Math.sqrt(
    totalMomentumXAfter * totalMomentumXAfter + totalMomentumYAfter * totalMomentumYAfter
  )

  const momentumDifference = Math.abs(totalMomentumBefore - totalMomentumAfter)
  const momentumDifferencePercent = totalMomentumBefore > 0
    ? momentumDifference / totalMomentumBefore
    : 0

  const totalKineticEnergyBefore = ballsBefore.reduce((s, b) => s + b.kineticEnergy, 0)
  const totalKineticEnergyAfter = ballsAfter.reduce((s, b) => s + b.kineticEnergy, 0)
  const energyLoss = Math.max(0, totalKineticEnergyBefore - totalKineticEnergyAfter)
  const energyLossPercent = totalKineticEnergyBefore > 0
    ? energyLoss / totalKineticEnergyBefore
    : 0

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
    calculationSteps: [
      {
        step: 1,
        description: '计算各小球碰撞前的动量和动能',
        formula: 'p = m × v, KE = 0.5 × m × v²',
        result: ballsBefore.map((b) => `球${b.ballId}: p=${b.momentumX.toFixed(3)}, KE=${b.kineticEnergy.toFixed(3)}`).join(', '),
        sourceData: `质量: ${ballsBefore.map((b) => b.mass).join(', ')} kg`,
      },
      {
        step: 2,
        description: '计算碰撞前系统总动量和总动能',
        formula: 'p_total = Σ(p_i), KE_total = Σ(KE_i)',
        result: `总动量: ${totalMomentumBefore.toFixed(4)} kg·m/s, 总动能: ${totalKineticEnergyBefore.toFixed(4)} J`,
        sourceData: `各小球动量已求和`,
      },
      {
        step: 3,
        description: '计算各小球碰撞后的动量和动能',
        formula: "p' = m × v', KE' = 0.5 × m × v'²",
        result: ballsAfter.map((b) => `球${b.ballId}: p=${b.momentumX.toFixed(3)}, KE=${b.kineticEnergy.toFixed(3)}`).join(', '),
        sourceData: '碰撞后速度数据',
      },
      {
        step: 4,
        description: '计算碰撞后系统总动量和能量损失',
        formula: "Δp = |p_before - p_after|, ΔKE = KE_before - KE_after",
        result: `动量差: ${momentumDifference.toFixed(4)} (${(momentumDifferencePercent * 100).toFixed(2)}%), 能量损失: ${energyLoss.toFixed(4)} J (${(energyLossPercent * 100).toFixed(2)}%)`,
        sourceData: `动量守恒验证: ${momentumDifferencePercent <= 0.05 ? '通过' : '不通过'}`,
      },
    ],
    isValid: momentumDifferencePercent <= 0.05,
  }
}

export const sampleCollisions: Collision[] = [
  {
    id: 'col1',
    collisionTime: 0.21,
    collisionTimeFormatted: formatTimestamp(0.21),
    ballIds: [1, 2],
    speedRecordSource: '速度记录_2024.csv',
    massTableSource: '质量表_实验A.xlsx',
    videoNotes: '碰撞角度约15度，小球2略有偏移',
    calculationResult: buildSampleCalculation('col1', [
      { id: 1, mass: 0.5, vxBefore: 1.8, vyBefore: 0.1, vxAfter: 0.3, vyAfter: 0.2 },
      { id: 2, mass: 0.5, vxBefore: 0.0, vyBefore: 0.0, vxAfter: 1.5, vyAfter: -0.1 },
    ]),
    anomalies: [
      {
        id: 'an1',
        collisionId: 'col1',
        type: 'ENERGY_LOSS_EXCESSIVE',
        description: '能量损失率为 12.50%，超过阈值 10%，可能存在非弹性碰撞或测量误差',
        severity: 'medium',
        affectedBalls: [],
      },
    ],
    status: 'warning',
  },
  {
    id: 'col2',
    collisionTime: 0.61,
    collisionTimeFormatted: formatTimestamp(0.61),
    ballIds: [1, 3],
    speedRecordSource: '速度记录_2024.csv',
    massTableSource: '质量表_实验A.xlsx',
    videoNotes: '对心碰撞，小球3质量较大',
    calculationResult: buildSampleCalculation('col2', [
      { id: 1, mass: 0.5, vxBefore: 0.25, vyBefore: 0.18, vxAfter: -0.8, vyAfter: 0.05 },
      { id: 3, mass: 1.0, vxBefore: -1.4, vyBefore: 0.0, vxAfter: -0.2, vyAfter: 0.1 },
    ]),
    anomalies: [
      {
        id: 'an2',
        collisionId: 'col2',
        type: 'DIRECTION_REVERSED',
        description: '小球 1 碰撞后速度方向发生显著反向，符合预期的大质量球碰撞小质量球情况',
        severity: 'low',
        affectedBalls: [1],
      },
      {
        id: 'an3',
        collisionId: 'col2',
        type: 'ENERGY_LOSS_EXCESSIVE',
        description: '能量损失率为 18.30%，超过阈值 10%',
        severity: 'medium',
        affectedBalls: [],
      },
    ],
    status: 'warning',
  },
  {
    id: 'col3',
    collisionTime: 0.85,
    collisionTimeFormatted: formatTimestamp(0.85),
    ballIds: [2, 4],
    speedRecordSource: '速度记录_2024.csv',
    massTableSource: '质量表_实验A.xlsx',
    videoNotes: '边缘碰撞，角度较大',
    calculationResult: buildSampleCalculation('col3', [
      { id: 2, mass: 0.5, vxBefore: 1.2, vyBefore: 0.3, vxAfter: 0.8, vyAfter: 0.6 },
      { id: 4, mass: null as unknown as number, vxBefore: 0.0, vyBefore: 0.0, vxAfter: 0.4, vyAfter: -0.3 },
    ]),
    anomalies: [
      {
        id: 'an4',
        collisionId: 'col3',
        type: 'MASS_MISSING',
        description: '小球 4 的质量数据缺失，计算结果可能不准确，请补充质量表',
        severity: 'high',
        affectedBalls: [4],
      },
    ],
    status: 'error',
  },
]
