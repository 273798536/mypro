import { v4 as uuidv4 } from 'uuid'
import type { Level, TrajectoryPoint, CorrectionZone, AnomalyType } from '../types'

const FIELD_BASE_IMG =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=aerial%20satellite%20view%20of%20rectangular%20agricultural%20farm%20field%20with%20clear%20boundaries%2C%20tractor%20GPS%20trajectory%20path%20visible%2C%20overlaid%20grid%20coordinates%2C%20obstacle%20zones%20marked%2C%20realistic%20farmland%20aerial%20map&image_size=landscape_16_9'

function mkPoint(
  x: number,
  y: number,
  lineNum: number,
  imageName: string,
  note: string,
  isAnomaly = false,
  anomalyType?: TrajectoryPoint['anomalyType']
): TrajectoryPoint {
  return {
    id: uuidv4(),
    x,
    y,
    timestamp: '2024-06-03 09:15:' + String(lineNum).padStart(2, '0'),
    sourceNote: note,
    originalLineNumber: lineNum,
    rowNumber: lineNum,
    sourceImage: imageName,
    imageName,
    isAnomaly,
    anomalyType
  }
}

const level1BoundaryPts: TrajectoryPoint[] = [
  mkPoint(120, 180, 1, 'field_20240603_001.jpg', '3号田 作业起点 GPS记录#1'),
  mkPoint(170, 178, 2, 'field_20240603_001.jpg', '3号田 正常直行 GPS记录#2'),
  mkPoint(220, 182, 3, 'field_20240603_001.jpg', '3号田 正常直行 GPS记录#3'),
  mkPoint(270, 175, 4, 'field_20240603_001.jpg', '3号田 正常直行 GPS记录#4'),
  mkPoint(320, 180, 5, 'field_20240603_001.jpg', '3号田 正常直行 GPS记录#5'),
  mkPoint(360, 260, 6, 'field_20240603_001.jpg', '3号田 越界！Y坐标超出作业边界 GPS记录#6', true, 'boundary_violation'),
  mkPoint(340, 178, 7, 'field_20240603_002.jpg', '3号田 回归作业带 GPS记录#7'),
  mkPoint(290, 182, 8, 'field_20240603_002.jpg', '3号田 正常直行 GPS记录#8'),
  mkPoint(240, 176, 9, 'field_20240603_002.jpg', '3号田 正常直行 GPS记录#9'),
  mkPoint(190, 180, 10, 'field_20240603_002.jpg', '3号田 正常直行 GPS记录#10'),
  mkPoint(140, 178, 11, 'field_20240603_002.jpg', '3号田 作业终点 GPS记录#11')
]

const level1Zones: CorrectionZone[] = [
  {
    id: uuidv4(),
    points: [[300, 220], [400, 220], [400, 310], [300, 310]],
    type: 'boundary',
    status: 'pending',
    label: '边界越界区 - 需确认',
    source: '表1-3号田边界记录 第6行'
  },
  {
    id: uuidv4(),
    points: [[100, 140], [380, 140], [380, 220], [100, 220]],
    type: 'normal',
    status: 'pending',
    label: '正常作业区域',
    source: '作业范围图 3号田'
  }
]

const level1Boundaries = [
  [
    { x: 100, y: 140 },
    { x: 380, y: 140 },
    { x: 380, y: 220 },
    { x: 100, y: 220 }
  ]
]

const level1Expected = [
  {
    pointId: '',
    type: 'boundary_violation' as const,
    reason: '该点 Y=260 超出田块边界上限 Y=220，属于边界违规'
  }
]

const level2TrajPts: TrajectoryPoint[] = [
  mkPoint(90, 150, 1, 'collision_20240605_003.jpg', '5号田 作业起点 碰撞记录表第1行'),
  mkPoint(140, 155, 2, 'collision_20240605_003.jpg', '5号田 正常行驶 碰撞记录表第2行'),
  mkPoint(190, 148, 3, 'collision_20240605_003.jpg', '5号田 正常行驶 碰撞记录表第3行'),
  mkPoint(235, 175, 4, 'collision_20240605_003.jpg', '5号田 老系统误判为碰撞 实为田埂阴影 碰撞记录表第4行', true, 'boundary_violation'),
  mkPoint(280, 152, 5, 'collision_20240605_004.jpg', '5号田 继续作业 碰撞记录表第5行'),
  mkPoint(330, 148, 6, 'collision_20240605_004.jpg', '5号田 正常行驶 碰撞记录表第6行'),
  mkPoint(375, 290, 7, 'collision_20240605_004.jpg', '5号田 真越界！进入防护林带 碰撞记录表第7行', true, 'boundary_violation'),
  mkPoint(355, 155, 8, 'collision_20240605_004.jpg', '5号田 回归作业带 碰撞记录表第8行'),
  mkPoint(305, 150, 9, 'collision_20240605_005.jpg', '5号田 正常行驶 碰撞记录表第9行'),
  mkPoint(255, 153, 10, 'collision_20240605_005.jpg', '5号田 正常行驶 碰撞记录表第10行'),
  mkPoint(205, 149, 11, 'collision_20240605_005.jpg', '5号田 疑似GPS漂移 碰撞记录表第11行', true, 'gps_drift'),
  mkPoint(155, 151, 12, 'collision_20240605_005.jpg', '5号田 作业终点 碰撞记录表第12行')
]

const level2Zones: CorrectionZone[] = [
  {
    id: uuidv4(),
    points: [[205, 130], [265, 130], [265, 200], [205, 200]],
    type: 'collision',
    status: 'pending',
    label: '误判碰撞区（需撤销，实为田埂阴影）',
    source: '碰撞误判记录表 第4行 截图collision_20240605_003.jpg'
  },
  {
    id: uuidv4(),
    points: [[345, 250], [405, 250], [405, 330], [345, 330]],
    type: 'collision',
    status: 'pending',
    label: '真碰撞-防护林带越界（需确认）',
    source: '碰撞记录表 第7行 截图collision_20240605_004.jpg'
  },
  {
    id: uuidv4(),
    points: [[70, 120], [400, 120], [400, 200], [70, 200]],
    type: 'normal',
    status: 'pending',
    label: '5号田正常作业区',
    source: '5号田坐标底图 E116.35-116.36 N39.88-39.89'
  }
]

const level2Boundaries = [
  [
    { x: 70, y: 120 },
    { x: 400, y: 120 },
    { x: 400, y: 200 },
    { x: 70, y: 200 }
  ]
]

const level2Expected = [
  {
    pointId: '',
    type: 'boundary_violation' as const,
    reason: '第7行 进入防护林带 Y=290 超出作业边界，真实越界需确认'
  },
  {
    pointId: '',
    type: 'gps_drift' as const,
    reason: '第11行 单点坐标异常偏移，疑似GPS信号漂移'
  }
]

function linkExpected(
  pts: TrajectoryPoint[],
  expecteds: { pointId: string; type: AnomalyType; reason: string }[]
): { pointId: string; type: AnomalyType; reason: string }[] {
  return expecteds.map((e, i) => {
    const anomaly = pts.filter(p => p.isAnomaly)[i]
    return { ...e, pointId: anomaly ? anomaly.id : '' }
  })
}

const lvl1ExpectedLinked = linkExpected(level1BoundaryPts, level1Expected)
const lvl2ExpectedLinked = linkExpected(level2TrajPts, level2Expected)

export const sampleLevels: Level[] = [
  {
    id: 'level-boundary-basic',
    name: '01 田块边界越界识别',
    description:
      '复核3号田2024-06-03作业轨迹：底图坐标E116.30-116.31 N39.85-39.86，截图素材 field_20240603_001~002.jpg。识别1处边界越界、体验撤销/重做、看懂结算报告。',
    difficulty: 'easy',
    isCompleted: false,
    hasBoundaryFailure: true,
    hasUndoRedo: true,
    trajectoryPoints: level1BoundaryPts,
    correctionZones: level1Zones,
    trajectoryData: level1BoundaryPts,
    boundaries: level1Boundaries,
    expectedAnnotations: lvl1ExpectedLinked,
    objectives: [
      { id: 'o1-1', description: '识别第6行越界点并标注为边界违规', completed: false },
      { id: 'o1-2', description: '确认边界越界区域、驳回正常作业区', completed: false },
      { id: 'o1-3', description: '尝试至少1次撤销或重开操作', completed: false }
    ],
    hints: [
      '先看边界坐标上限 Y=220，超出即为越界',
      '撤销按钮可以撤回刚刚的标注',
      '导出时注意：页面结论与JSON里的 summary.status 必须一致'
    ],
    baseImage: FIELD_BASE_IMG
  },
  {
    id: 'level-collision-review',
    name: '02 碰撞边界误判复核（综合）',
    description:
      '复核5号田2024-06-05作业：底图坐标E116.35-116.36 N39.88-39.89，截图 collision_20240605_003~005.jpg。本轮同时包含：老系统碰撞误判（需撤销）、真实边界越界、GPS漂移、来源表行号追溯。',
    difficulty: 'medium',
    isCompleted: false,
    hasBoundaryFailure: true,
    hasUndoRedo: true,
    trajectoryPoints: level2TrajPts,
    correctionZones: level2Zones,
    trajectoryData: level2TrajPts,
    boundaries: level2Boundaries,
    expectedAnnotations: lvl2ExpectedLinked,
    objectives: [
      { id: 'o2-1', description: '撤销第4行误判碰撞（田埂阴影，非真实碰撞）', completed: false },
      { id: 'o2-2', description: '确认第7行真实越界（防护林带）', completed: false },
      { id: 'o2-3', description: '标注第11行GPS漂移异常', completed: false },
      { id: 'o2-4', description: '重开或撤销至少1次、看懂结算页通过/复核区分', completed: false }
    ],
    hints: [
      '田埂阴影是历史误判，要撤销驳回；防护林越界是真异常，要确认',
      '每个点都有原始行号和截图文件名，结算页里会保留来源',
      '结算页会明确标出：哪些可以直接用、哪些需要安全培训师复核'
    ],
    baseImage: FIELD_BASE_IMG
  }
]

export function getLevelById(id: string): Level | undefined {
  return sampleLevels.find(level => level.id === id)
}
