import { createTransformBlock } from '../utils/matrixUtils';
import type { Level } from '../types/matrix';

export const LEVELS: Level[] = [
  {
    id: 'level-1',
    name: '初识旋转',
    description: '将图形旋转 90 度，观察矩阵如何变化',
    difficulty: 'easy',
    gridSize: { rows: 1, cols: 2 },
    targetMatrix: [
      [0, -1],
      [1, 0]
    ],
    availableBlocks: [
      createTransformBlock('rotate-90', 'rotate', { angle: 90 }),
      createTransformBlock('scale-1', 'scale', { sx: 1, sy: 1 }),
      createTransformBlock('rotate-180', 'rotate', { angle: 180 })
    ],
    failurePaths: [
      {
        id: 'fp-1',
        description: '误用旋转 180 度',
        pattern: ['rotate-180'],
        explanation: '旋转了 180 度，图形上下左右都颠倒了',
        educationalNote: '90 度旋转的矩阵是 [[0,-1],[1,0]]，而 180 度是 [[-1,0],[0,-1]]，注意区分！'
      }
    ],
    hint: '想一想：只需要一个旋转块就能完成目标'
  },
  {
    id: 'level-2',
    name: '缩放与旋转',
    description: '先缩放再旋转，体会矩阵乘法的顺序',
    difficulty: 'easy',
    gridSize: { rows: 1, cols: 2 },
    targetMatrix: [
      [0, -2],
      [2, 0]
    ],
    availableBlocks: [
      createTransformBlock('rotate-90', 'rotate', { angle: 90 }),
      createTransformBlock('scale-2', 'scale', { sx: 2, sy: 2 }),
      createTransformBlock('shear-1', 'shear', { shx: 1, shy: 0 })
    ],
    failurePaths: [
      {
        id: 'fp-2',
        description: '顺序错误：先旋转后缩放',
        pattern: ['rotate-90', 'scale-2'],
        explanation: '虽然结果一样，但这个关卡的设计意图是让你体会矩阵乘法顺序的影响',
        educationalNote: '矩阵乘法 A×B 表示先做 B 变换，再做 A 变换。本题中顺序不影响结果是因为缩放均匀且只有一个轴'
      },
      {
        id: 'fp-3',
        description: '使用错切变换',
        pattern: ['shear-1'],
        explanation: '错切会让图形倾斜，无法得到旋转+缩放的效果',
        educationalNote: '错切矩阵的主对角线都是 1，而旋转矩阵的行列式为 1'
      }
    ],
    hint: '先缩放 2 倍，再旋转 90 度'
  },
  {
    id: 'level-3',
    name: '镜像变换',
    description: '将图形关于 x 轴对称',
    difficulty: 'medium',
    gridSize: { rows: 1, cols: 2 },
    targetMatrix: [
      [1, 0],
      [0, -1]
    ],
    availableBlocks: [
      createTransformBlock('scale-y-neg', 'scale', { sx: 1, sy: -1 }),
      createTransformBlock('rotate-180', 'rotate', { angle: 180 }),
      createTransformBlock('scale-x-neg', 'scale', { sx: -1, sy: 1 })
    ],
    failurePaths: [
      {
        id: 'fp-4',
        description: '使用旋转 180 度',
        pattern: ['rotate-180'],
        explanation: '旋转 180 度会同时关于 x 和 y 轴对称',
        educationalNote: '镜像只改变一个坐标的符号，旋转 180 度会改变两个坐标的符号'
      }
    ],
    hint: '关于 x 轴对称，y 坐标取反'
  },
  {
    id: 'level-4',
    name: '复合变换',
    description: '将图形先旋转 90 度，再关于 y 轴对称',
    difficulty: 'medium',
    gridSize: { rows: 2, cols: 2 },
    targetMatrix: [
      [0, 1],
      [1, 0]
    ],
    availableBlocks: [
      createTransformBlock('rotate-90', 'rotate', { angle: 90 }),
      createTransformBlock('scale-neg-x', 'scale', { sx: -1, sy: 1 }),
      createTransformBlock('shear-1', 'shear', { shx: 1, shy: 0 }),
      createTransformBlock('identity', 'identity', {})
    ],
    failurePaths: [
      {
        id: 'fp-5',
        description: '顺序错误导致无法撤销',
        pattern: ['scale-neg-x', 'rotate-90'],
        explanation: '矩阵乘法顺序很重要！先镜像再旋转会得到不同的结果',
        educationalNote: 'A×B ≠ B×A，矩阵乘法不满足交换律！'
      }
    ],
    hint: '先旋转，再关于 y 轴对称（注意矩阵乘法顺序是从右往左读'
  },
  {
    id: 'level-5',
    name: '错切挑战',
    description: '将正方形变成平行四边形',
    difficulty: 'hard',
    gridSize: { rows: 2, cols: 2 },
    targetMatrix: [
      [1, 2],
      [0, 1]
    ],
    availableBlocks: [
      createTransformBlock('shear-x-2', 'shear', { shx: 2, shy: 0 }),
      createTransformBlock('rotate-45', 'rotate', { angle: 45 }),
      createTransformBlock('scale-1', 'scale', { sx: 1, sy: 1 }),
      createTransformBlock('shear-y-1', 'shear', { shx: 0, shy: 1 })
    ],
    failurePaths: [
      {
        id: 'fp-6',
        description: '使用旋转代替错切',
        pattern: ['rotate-45'],
        explanation: '旋转会同时改变两个坐标，而错切只改变一个',
        educationalNote: '错切矩阵行列式为 1，不会改变图形面积；旋转也不会改变面积，但形状不同'
      },
      {
        id: 'fp-7',
        description: 'y 方向错切',
        pattern: ['shear-y-1'],
        explanation: '目标是 x 方向错切，不是 y 方向',
        educationalNote: '注意观察目标矩阵的非零元素位置来判断错切方向'
      }
    ],
    hint: '观察目标矩阵：右上角元素，只需要一个 x 方向的错切'
  }
];

export function getLevelById(levelId: string): Level | undefined {
  return LEVELS.find(l => l.id === levelId);
}

export function getNextLevelId(levelId: string): string | null {
  const currentIndex = LEVELS.findIndex(l => l.id === levelId);
  if (currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1].id;
  }
  return null;
}
