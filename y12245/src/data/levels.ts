import { Level } from '../types';

export const levels: Level[] = [
  {
    id: 'boundary-challenge',
    name: '参数越界挑战',
    description: '学习控制函数参数范围，避免赛车冲出赛道边界。当参数超出安全范围时，赛车会偏离轨道。',
    difficulty: 'easy',
    functionType: 'polynomial',
    functionExpression: 'y = a * x² + b * x + c',
    parameterRanges: [
      { name: 'a', min: -0.05, max: 0.05, default: 0.01, description: '二次项系数（控制曲线弯曲程度）' },
      { name: 'b', min: -0.5, max: 0.5, default: 0.1, description: '一次项系数（控制曲线斜率）' },
      { name: 'c', min: 50, max: 350, default: 200, description: '常数项（控制y轴截距）' },
    ],
    obstacles: [
      { type: 'out_of_bounds', position: { x: 400, y: 50 }, radius: 80, description: '上边界危险区' },
      { type: 'out_of_bounds', position: { x: 400, y: 350 }, radius: 80, description: '下边界危险区' },
    ],
    successConditions: [
      { type: 'reach_goal', threshold: 1 },
      { type: 'no_errors', threshold: 0 },
    ],
    startPoint: { x: 50, y: 200 },
    endPoint: { x: 750, y: 200 },
    bounds: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
    hint: '提示：调整参数a控制弯曲度，参数c控制整体高度。保持曲线在赛道范围内！',
  },
  {
    id: 'curve-break-challenge',
    name: '曲线断裂挑战',
    description: '理解分段函数的连续性。当参数设置不当导致函数不连续时，赛车轨迹会出现断裂。',
    difficulty: 'medium',
    functionType: 'piecewise',
    functionExpression: 'y = { a*x + b, x < 400; c*x + d, x ≥ 400 }',
    parameterRanges: [
      { name: 'a', min: -1, max: 1, default: 0.3, description: '第一段斜率' },
      { name: 'b', min: 100, max: 300, default: 150, description: '第一段截距' },
      { name: 'c', min: -1, max: 1, default: -0.2, description: '第二段斜率' },
      { name: 'd', min: 100, max: 400, default: 350, description: '第二段截距' },
    ],
    obstacles: [
      { type: 'curve_break', position: { x: 400, y: 200 }, radius: 60, description: '分段点断裂风险区' },
    ],
    successConditions: [
      { type: 'reach_goal', threshold: 1 },
      { type: 'no_errors', threshold: 0 },
    ],
    startPoint: { x: 50, y: 200 },
    endPoint: { x: 750, y: 200 },
    bounds: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
    hint: '提示：确保两段函数在 x=400 处的值相等！计算 a*400 + b = c*400 + d',
  },
  {
    id: 'speed-mismatch-challenge',
    name: '速度误判挑战',
    description: '理解函数导数对速度的影响。曲线斜率变化过快会导致赛车速度失控。',
    difficulty: 'medium',
    functionType: 'trigonometric',
    functionExpression: 'y = a * sin(b * x) + c',
    parameterRanges: [
      { name: 'a', min: 20, max: 100, default: 50, description: '振幅（控制波动幅度）' },
      { name: 'b', min: 0.005, max: 0.02, default: 0.01, description: '频率（控制波动快慢）' },
      { name: 'c', min: 150, max: 250, default: 200, description: '中心高度' },
    ],
    obstacles: [
      { type: 'speed_mismatch', position: { x: 300, y: 200 }, radius: 50, description: '高速风险区1' },
      { type: 'speed_mismatch', position: { x: 500, y: 200 }, radius: 50, description: '高速风险区2' },
    ],
    successConditions: [
      { type: 'reach_goal', threshold: 1 },
      { type: 'no_errors', threshold: 0 },
    ],
    startPoint: { x: 50, y: 200 },
    endPoint: { x: 750, y: 200 },
    bounds: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
    hint: '提示：频率b越高，曲线越陡，速度变化越快。振幅a越大，上下波动越大！',
  },
  {
    id: 'composite-challenge',
    name: '综合挑战关卡',
    description: '综合所有问题类型的终极挑战！测试你对函数参数的全面理解。',
    difficulty: 'hard',
    functionType: 'composite',
    functionExpression: 'y = a * x² + b * sin(c * x) + d',
    parameterRanges: [
      { name: 'a', min: -0.001, max: 0.001, default: 0, description: '二次项系数' },
      { name: 'b', min: 0, max: 80, default: 40, description: '正弦振幅' },
      { name: 'c', min: 0.005, max: 0.015, default: 0.01, description: '正弦频率' },
      { name: 'd', min: 100, max: 300, default: 200, description: '垂直偏移' },
    ],
    obstacles: [
      { type: 'out_of_bounds', position: { x: 200, y: 80 }, radius: 60, description: '上边界危险区' },
      { type: 'out_of_bounds', position: { x: 600, y: 320 }, radius: 60, description: '下边界危险区' },
      { type: 'speed_mismatch', position: { x: 400, y: 200 }, radius: 50, description: '高速风险区' },
      { type: 'curve_break', position: { x: 550, y: 150 }, radius: 40, description: '不连续风险区' },
    ],
    successConditions: [
      { type: 'reach_goal', threshold: 1 },
      { type: 'no_errors', threshold: 0 },
    ],
    startPoint: { x: 50, y: 200 },
    endPoint: { x: 750, y: 200 },
    bounds: { minX: 0, maxX: 800, minY: 0, maxY: 400 },
    hint: '提示：仔细平衡所有参数！a控制整体趋势，b和c控制波动，d控制高度。',
  },
];

export const getLevelById = (id: string): Level | undefined => {
  return levels.find((level) => level.id === id);
};

export const getLevelDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy':
      return 'text-green-400 bg-green-400/20';
    case 'medium':
      return 'text-yellow-400 bg-yellow-400/20';
    case 'hard':
      return 'text-red-400 bg-red-400/20';
    default:
      return 'text-gray-400 bg-gray-400/20';
  }
};

export const getLevelDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy':
      return '简单';
    case 'medium':
      return '中等';
    case 'hard':
      return '困难';
    default:
      return '未知';
  }
};
