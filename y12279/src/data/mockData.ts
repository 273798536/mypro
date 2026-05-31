import { PracticeSession, FingerKeypoint, HandKeyframe } from '@/types';

const FINGER_NAMES = [
  'thumb_tip', 'thumb_ip', 'thumb_mcp',
  'index_tip', 'index_dip', 'index_pip', 'index_mcp',
  'middle_tip', 'middle_dip', 'middle_pip', 'middle_mcp',
  'ring_tip', 'ring_dip', 'ring_pip', 'ring_mcp',
  'pinky_tip', 'pinky_dip', 'pinky_pip', 'pinky_mcp',
  'wrist', 'palm_center'
];

function generateKeypoints(baseX: number, baseY: number, baseZ: number, seed: number): FingerKeypoint[] {
  const keypoints: FingerKeypoint[] = [];
  const spread = 0.08;
  
  FINGER_NAMES.forEach((fingerName, index) => {
    const angle = (index / FINGER_NAMES.length) * Math.PI * 2 + seed;
    const radius = spread * (0.5 + Math.random() * 0.5);
    
    keypoints.push({
      id: `kp-${seed.toFixed(2)}-${index}`,
      x: baseX + Math.cos(angle) * radius,
      y: baseY + Math.sin(angle) * radius + index * 0.01,
      z: baseZ + (index % 5) * 0.02,
      confidence: 0.7 + Math.random() * 0.3,
      fingerName,
      isMissing: false,
    });
  });
  
  return keypoints;
}

function generateKeyframes(count: number, hand: 'left' | 'right', startOffset: number): HandKeyframe[] {
  const keyframes: HandKeyframe[] = [];
  const baseX = hand === 'left' ? -0.3 : 0.3;
  
  for (let i = 0; i < count; i++) {
    const timestamp = startOffset + i * 0.1;
    const hasDataGap = (i === 15 || i === 16 || i === 17);
    
    const keypoints = generateKeypoints(
      baseX + Math.sin(timestamp * 2) * 0.1,
      0.2 + Math.cos(timestamp) * 0.05,
      0 + Math.sin(timestamp * 1.5) * 0.1,
      timestamp
    );
    
    if (i === 8 || i === 25) {
      const missingIndex = Math.floor(Math.random() * keypoints.length);
      keypoints[missingIndex].isMissing = true;
      keypoints[missingIndex].confidence = 0;
    }
    
    keyframes.push({
      id: `${hand}-kf-${i}`,
      timestamp,
      hand,
      fingerKeypoints: keypoints,
      dataGap: hasDataGap,
      dataGapReason: hasDataGap ? '信号丢失，摄像头遮挡' : undefined,
    });
  }
  
  return keyframes;
}

export const mockPracticeSession: PracticeSession = {
  id: 'session-001',
  title: '练习回放 - 肖邦夜曲Op.9 No.1',
  date: '2026-05-30 14:30',
  pieceName: '肖邦夜曲Op.9 No.1',
  totalDuration: 10,
  keyframes: [
    ...generateKeyframes(50, 'left', 0),
    ...generateKeyframes(50, 'right', 0),
  ],
  errors: [
    {
      id: 'err-001',
      timestamp: 0.8,
      type: 'missing_keypoint',
      source: 'automatic',
      description: '左手中指MCP关键点检测失败，置信度低于阈值',
      affectedKeyframeIds: ['left-kf-8'],
      measureNumber: 3,
      isRetroactivelyAdded: false,
      severity: 'high',
    },
    {
      id: 'err-002',
      timestamp: 1.5,
      type: 'measure_misalignment',
      source: 'automatic',
      description: '第5小节右手音符提前0.2秒演奏，与节拍不符',
      affectedKeyframeIds: ['right-kf-15', 'right-kf-16'],
      measureNumber: 5,
      isRetroactivelyAdded: false,
      severity: 'medium',
    },
    {
      id: 'err-003',
      timestamp: 2.5,
      type: 'hand_confusion',
      source: 'automatic',
      description: '第8小节左右手交叉时识别混淆，左手被误判为右手',
      affectedKeyframeIds: ['left-kf-25', 'right-kf-25'],
      measureNumber: 8,
      isRetroactivelyAdded: false,
      severity: 'high',
    },
    {
      id: 'err-004',
      timestamp: 1.6,
      type: 'missing_keypoint',
      source: 'manual',
      description: '第6小节拇指关键点丢失，补录标记',
      affectedKeyframeIds: ['left-kf-16', 'right-kf-16'],
      measureNumber: 6,
      isRetroactivelyAdded: true,
      addedAt: Date.now() - 3600000,
      severity: 'medium',
    },
    {
      id: 'err-005',
      timestamp: 3.2,
      type: 'measure_misalignment',
      source: 'manual',
      description: '第10小节节奏不稳，补录标记',
      affectedKeyframeIds: ['left-kf-32', 'right-kf-32'],
      measureNumber: 10,
      isRetroactivelyAdded: true,
      addedAt: Date.now() - 1800000,
      severity: 'low',
    },
  ],
  measures: [
    { measureNumber: 1, startTime: 0, endTime: 0.8, notes: ['C4', 'E4', 'G4'], hand: 'right' },
    { measureNumber: 2, startTime: 0.8, endTime: 1.6, notes: ['F4', 'A4', 'C5'], hand: 'right' },
    { measureNumber: 3, startTime: 1.6, endTime: 2.4, notes: ['G4', 'B4', 'D5'], hand: 'right' },
    { measureNumber: 4, startTime: 2.4, endTime: 3.2, notes: ['C3', 'E3', 'G3'], hand: 'left' },
    { measureNumber: 5, startTime: 3.2, endTime: 4.0, notes: ['F3', 'A3', 'C4'], hand: 'left' },
    { measureNumber: 6, startTime: 4.0, endTime: 4.8, notes: ['C4', 'E4', 'G4', 'C5'], hand: 'both' },
    { measureNumber: 7, startTime: 4.8, endTime: 5.6, notes: ['D4', 'F4', 'A4', 'D5'], hand: 'both' },
    { measureNumber: 8, startTime: 5.6, endTime: 6.4, notes: ['E4', 'G4', 'B4', 'E5'], hand: 'both' },
    { measureNumber: 9, startTime: 6.4, endTime: 7.2, notes: ['F4', 'A4', 'C5', 'F5'], hand: 'both' },
    { measureNumber: 10, startTime: 7.2, endTime: 8.0, notes: ['G4', 'B4', 'D5', 'G5'], hand: 'both' },
  ],
  screenshots: [],
};
