import type { KeypointFrame, Measure, ErrorLabel, PracticeRecord } from '@/types'

function generateHandKeypoints(time: number, missingIndices: number[]): [number, number, number][] {
  const baseHand: [number, number, number][] = [
    [0.0, 0.0, 0.0],
    [-0.08, 0.02, 0.01],
    [-0.10, 0.06, 0.02],
    [-0.11, 0.09, 0.015],
    [-0.11, 0.12, 0.01],
    [-0.04, 0.07, 0.0],
    [-0.04, 0.11, 0.0],
    [-0.04, 0.14, 0.0],
    [-0.04, 0.16, 0.0],
    [0.0, 0.08, 0.0],
    [0.0, 0.12, 0.0],
    [0.0, 0.15, 0.0],
    [0.0, 0.17, 0.0],
    [0.04, 0.07, 0.0],
    [0.04, 0.11, 0.0],
    [0.04, 0.14, 0.0],
    [0.04, 0.16, 0.0],
    [0.07, 0.05, 0.0],
    [0.08, 0.09, 0.0],
    [0.08, 0.11, 0.0],
    [0.08, 0.13, 0.0],
  ]

  const t = time * 0.5
  const fingerWaves = [
    0, 0, 0, 0, Math.sin(t * 2) * 0.01,
    0, Math.sin(t * 1.5) * 0.008, Math.sin(t * 1.5) * 0.012, Math.sin(t * 1.5) * 0.015,
    0, Math.sin(t * 1.2) * 0.006, Math.sin(t * 1.2) * 0.01, Math.sin(t * 1.2) * 0.013,
    0, Math.sin(t * 1.0) * 0.007, Math.sin(t * 1.0) * 0.011, Math.sin(t * 1.0) * 0.014,
    0, Math.sin(t * 0.8) * 0.008, Math.sin(t * 0.8) * 0.012, Math.sin(t * 0.8) * 0.016,
  ]

  return baseHand.map((p, i) => {
    if (missingIndices.includes(i)) return p
    return [
      p[0] + Math.sin(t + i * 0.3) * 0.003,
      p[1] + (fingerWaves[i] || 0),
      p[2] + Math.cos(t + i * 0.5) * 0.002,
    ] as [number, number, number]
  })
}

export const practiceRecords: PracticeRecord[] = [
  { id: 'p1', studentName: '张小明', pieceTitle: '拜厄练习曲No.12', date: '2026-05-28', duration: 45 },
  { id: 'p2', studentName: '李思雨', pieceTitle: '车尔尼599 No.23', date: '2026-05-27', duration: 60 },
  { id: 'p3', studentName: '张小明', pieceTitle: '小奏鸣曲', date: '2026-05-26', duration: 90 },
  { id: 'p4', studentName: '王艺涵', pieceTitle: '拜厄练习曲No.12', date: '2026-05-25', duration: 50 },
  { id: 'p5', studentName: '李思雨', pieceTitle: '小奏鸣曲', date: '2026-05-24', duration: 75 },
]

export const keypointFrames: KeypointFrame[] = (() => {
  const frames: KeypointFrame[] = []
  const missingPatterns: Record<string, number[][]> = {
    p1: [[6, 7], [], [14], [], [18, 19], [], [3], [], [10, 11], [], [22], []],
    p2: [[], [5, 6], [], [13], [], [], [2, 3, 4], [], [9], [], [20], [15, 16]],
    p3: [[], [7, 8], [], [], [11, 12], [], [], [19, 20], [], [4], [], [6]],
    p4: [[17], [], [3, 4], [], [8], [], [12, 13], [], [], [19], [], [2]],
    p5: [[], [6], [], [15, 16], [], [3, 4], [], [10], [], [20], [], [7, 8]],
  }

  for (const practice of practiceRecords) {
    const interval = 2
    const numFrames = Math.floor(practice.duration / interval)
    const pattern = missingPatterns[practice.id]
    for (let i = 0; i < numFrames; i++) {
      const missingIdx = pattern[i % pattern.length]
      frames.push({
        id: `${practice.id}-f${i}`,
        practiceId: practice.id,
        timestamp: i * interval,
        keypoints: generateHandKeypoints(i * interval, missingIdx),
        missingIndices: missingIdx,
      })
    }
  }
  return frames
})()

export const measures: Measure[] = (() => {
  const result: Measure[] = []
  const misalignPatterns: Record<string, number[]> = {
    p1: [3, 7],
    p2: [2, 5, 9],
    p3: [4, 8],
    p4: [1, 6, 10],
    p5: [3, 7, 11],
  }

  for (const practice of practiceRecords) {
    const measureDuration = 4
    const numMeasures = Math.ceil(practice.duration / measureDuration)
    const misalignSet = new Set(misalignPatterns[practice.id] || [])
    for (let i = 1; i <= numMeasures; i++) {
      result.push({
        id: `${practice.id}-m${i}`,
        practiceId: practice.id,
        measureNumber: i,
        startTimestamp: (i - 1) * measureDuration,
        endTimestamp: i * measureDuration,
        isMisaligned: misalignSet.has(i),
      })
    }
  }
  return result
})()

export const errorLabels: ErrorLabel[] = (() => {
  const result: ErrorLabel[] = []
  let eid = 0

  const errorDefs: Record<string, Partial<ErrorLabel>[]> = {
    p1: [
      { type: 'KEYPOINT_LOSS', timestamp: 12, sourceMaterial: '关键点数据', description: '食指PIP/DIP关键点丢失，无法判断指节弯曲角度', severity: 'critical' },
      { type: 'KEYPOINT_LOSS', timestamp: 14, sourceMaterial: '关键点数据', description: '无名指PIP关键点丢失', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 18, sourceMaterial: '关键点数据', description: '小指PIP/DIP关键点丢失', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 12, sourceMaterial: '乐谱数据', description: '第4小节起始时间与关键点帧偏移+1.2s', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 24, sourceMaterial: '关键点数据', description: '拇指IP关键点丢失', severity: 'warning' },
      { type: 'MEASURE_MISALIGN', timestamp: 28, sourceMaterial: '乐谱数据', description: '第8小节起始时间与关键点帧偏移-0.8s', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 30, sourceMaterial: '关键点数据', description: '中指PIP/DIP关键点丢失', severity: 'critical' },
    ],
    p2: [
      { type: 'KEYPOINT_LOSS', timestamp: 10, sourceMaterial: '关键点数据', description: '食指MCP/PIP关键点丢失', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 8, sourceMaterial: '乐谱数据', description: '第3小节起始时间偏移+1.5s', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 14, sourceMaterial: '关键点数据', description: '无名指MCP关键点丢失', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 20, sourceMaterial: '关键点数据', description: '拇指IP/TIP关键点丢失，无法确认触键状态', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 20, sourceMaterial: '乐谱数据', description: '第6小节起始时间偏移-1.0s', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 36, sourceMaterial: '乐谱数据', description: '第10小节起始时间偏移+2.0s', severity: 'critical' },
      { type: 'KEYPOINT_LOSS', timestamp: 36, sourceMaterial: '关键点数据', description: '中指MCP关键点丢失', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 40, sourceMaterial: '关键点数据', description: '无名指DIP/TIP关键点丢失', severity: 'critical' },
    ],
    p3: [
      { type: 'KEYPOINT_LOSS', timestamp: 10, sourceMaterial: '关键点数据', description: '食指DIP/TIP关键点丢失', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 20, sourceMaterial: '关键点数据', description: '中指PIP/DIP关键点丢失', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 16, sourceMaterial: '乐谱数据', description: '第5小节起始时间偏移+1.8s', severity: 'critical' },
      { type: 'KEYPOINT_LOSS', timestamp: 36, sourceMaterial: '关键点数据', description: '小指DIP/TIP关键点丢失', severity: 'warning' },
      { type: 'MEASURE_MISALIGN', timestamp: 32, sourceMaterial: '乐谱数据', description: '第9小节起始时间偏移-0.6s', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 42, sourceMaterial: '关键点数据', description: '拇指TIP关键点丢失', severity: 'warning' },
    ],
    p4: [
      { type: 'KEYPOINT_LOSS', timestamp: 2, sourceMaterial: '关键点数据', description: '小指MCP关键点丢失', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 12, sourceMaterial: '关键点数据', description: '拇指IP/TIP关键点丢失', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 4, sourceMaterial: '乐谱数据', description: '第2小节起始时间偏移+1.0s', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 20, sourceMaterial: '关键点数据', description: '食指TIP关键点丢失', severity: 'warning' },
      { type: 'MEASURE_MISALIGN', timestamp: 24, sourceMaterial: '乐谱数据', description: '第7小节起始时间偏移-1.3s', severity: 'critical' },
      { type: 'KEYPOINT_LOSS', timestamp: 32, sourceMaterial: '关键点数据', description: '中指PIP/DIP关键点丢失', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 40, sourceMaterial: '乐谱数据', description: '第11小节起始时间偏移+0.9s', severity: 'warning' },
    ],
    p5: [
      { type: 'KEYPOINT_LOSS', timestamp: 10, sourceMaterial: '关键点数据', description: '食指PIP关键点丢失', severity: 'warning' },
      { type: 'MEASURE_MISALIGN', timestamp: 12, sourceMaterial: '乐谱数据', description: '第4小节起始时间偏移+1.4s', severity: 'warning' },
      { type: 'KEYPOINT_LOSS', timestamp: 20, sourceMaterial: '关键点数据', description: '拇指IP/TIP关键点丢失', severity: 'critical' },
      { type: 'KEYPOINT_LOSS', timestamp: 24, sourceMaterial: '关键点数据', description: '中指DIP关键点丢失', severity: 'warning' },
      { type: 'MEASURE_MISALIGN', timestamp: 28, sourceMaterial: '乐谱数据', description: '第8小节起始时间偏移-1.1s', severity: 'critical' },
      { type: 'MEASURE_MISALIGN', timestamp: 44, sourceMaterial: '乐谱数据', description: '第12小节起始时间偏移+2.3s', severity: 'critical' },
      { type: 'KEYPOINT_LOSS', timestamp: 42, sourceMaterial: '关键点数据', description: '食指DIP/TIP关键点丢失', severity: 'critical' },
    ],
  }

  for (const practice of practiceRecords) {
    const defs = errorDefs[practice.id] || []
    for (const def of defs) {
      result.push({
        id: `e${++eid}`,
        practiceId: practice.id,
        type: def.type || 'OTHER',
        timestamp: def.timestamp || 0,
        sourceMaterial: def.sourceMaterial || '未知',
        description: def.description || '',
        severity: def.severity || 'info',
      })
    }
  }
  return result
})()
