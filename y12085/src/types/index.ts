export interface KeypointFrame {
  id: string
  practiceId: string
  timestamp: number
  keypoints: [number, number, number][]
  missingIndices: number[]
}

export interface Measure {
  id: string
  practiceId: string
  measureNumber: number
  startTimestamp: number
  endTimestamp: number
  isMisaligned: boolean
}

export interface ErrorLabel {
  id: string
  practiceId: string
  type: 'KEYPOINT_LOSS' | 'MEASURE_MISALIGN' | 'OTHER'
  timestamp: number
  sourceMaterial: string
  description: string
  severity: 'critical' | 'warning' | 'info'
}

export interface PracticeRecord {
  id: string
  studentName: string
  pieceTitle: string
  date: string
  duration: number
}

export interface FilterConditions {
  studentName: string
  pieceTitle: string
  errorTypes: ('KEYPOINT_LOSS' | 'MEASURE_MISALIGN')[]
}

export const FINGER_NAMES = [
  '手腕',
  '拇指CMC', '拇指MCP', '拇指IP', '拇指指尖',
  '食指MCP', '食指PIP', '食指DIP', '食指指尖',
  '中指MCP', '中指PIP', '中指DIP', '中指指尖',
  '无名指MCP', '无名指PIP', '无名指DIP', '无名指指尖',
  '小指MCP', '小指PIP', '小指DIP', '小指指尖',
]

export const BONE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
]
