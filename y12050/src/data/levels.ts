import type { Level } from '@/types';

export const levels: Level[] = [
  {
    id: 'brain-t1',
    name: 'T1 加权脑部成像',
    targetPart: '脑部',
    difficulty: 'easy',
    timeBudget: 300,
    description: '调整参数获得清晰的T1加权脑部图像，重点关注灰白质对比度。',
    optimalParams: {
      TR: 500,
      TE: 15,
      sliceThickness: 5,
      FOV: 24,
      matrix: 256,
      NEX: 2,
    },
    paramRanges: {
      TR: { min: 200, max: 2000, step: 50 },
      TE: { min: 5, max: 80, step: 1 },
      sliceThickness: { min: 1, max: 10, step: 0.5 },
      FOV: { min: 12, max: 36, step: 1 },
      matrix: { min: 128, max: 512, step: 16 },
      NEX: { min: 1, max: 8, step: 1 },
    },
    rawTemplate: `# T1 加权脑部 MRI 扫描参数
# 目标: 灰白质对比度最大化
TR=500
TE=15

备注: 标准T1序列参数
sliceThickness=5
FOV=24

matrix=256
NEX=2
---
DICOM(0010,0010)=ANONYMOUS
GARBAGE_LINE_%%##
时间预算=300s`,
  },
  {
    id: 'brain-t2',
    name: 'T2 加权脑部成像',
    targetPart: '脑部',
    difficulty: 'medium',
    timeBudget: 420,
    description: '获取高质量T2加权图像，需平衡长TE带来的对比度与信号衰减。注意时间预算限制。',
    optimalParams: {
      TR: 3000,
      TE: 90,
      sliceThickness: 5,
      FOV: 24,
      matrix: 256,
      NEX: 2,
    },
    paramRanges: {
      TR: { min: 1500, max: 6000, step: 100 },
      TE: { min: 20, max: 150, step: 5 },
      sliceThickness: { min: 1, max: 10, step: 0.5 },
      FOV: { min: 12, max: 36, step: 1 },
      matrix: { min: 128, max: 512, step: 16 },
      NEX: { min: 1, max: 8, step: 1 },
    },
    rawTemplate: `# T2 加权脑部 MRI 扫描参数
# 警告: 长TE需配合足够TR
TR=3000
TE=90
sliceThickness=5

# 以下行数据缺失

FOV
matrix=256

NEX=2
@@@CORRUPT_DATA_0x3F
时间预算=420s
// 备注行: 注意信号衰减`,
  },
  {
    id: 'spine-t2',
    name: 'T2 加权脊柱成像',
    targetPart: '脊柱',
    difficulty: 'hard',
    timeBudget: 480,
    description: '脊柱T2成像对空间分辨率要求更高，同时需抑制脑脊液流动伪影。时间预算紧张，需精细调参。',
    optimalParams: {
      TR: 3500,
      TE: 100,
      sliceThickness: 3,
      FOV: 20,
      matrix: 320,
      NEX: 3,
    },
    paramRanges: {
      TR: { min: 1500, max: 6000, step: 100 },
      TE: { min: 20, max: 150, step: 5 },
      sliceThickness: { min: 1, max: 8, step: 0.5 },
      FOV: { min: 10, max: 30, step: 1 },
      matrix: { min: 128, max: 512, step: 16 },
      NEX: { min: 1, max: 8, step: 1 },
    },
    rawTemplate: `# T2 加权脊柱 MRI 扫描参数
# 高难度: 需要高分辨率+伪影抑制
TR=3500
TE=100


sliceThickness=3
FOV=20
DICOM(0008,0060)=MR
!!!INVALID_ENTRY
matrix=320
NEX=3
备注: 脊柱成像需要薄层扫描
时间预算=480s
xyz=???`,
  },
];

export const PARAM_LABELS: Record<keyof import('@/types').ScanParams, string> = {
  TR: '重复时间 TR',
  TE: '回波时间 TE',
  sliceThickness: '层厚',
  FOV: '视野 FOV',
  matrix: '矩阵大小',
  NEX: '激励次数 NEX',
};

export const PARAM_UNITS: Record<keyof import('@/types').ScanParams, string> = {
  TR: 'ms',
  TE: 'ms',
  sliceThickness: 'mm',
  FOV: 'cm',
  matrix: '',
  NEX: '',
};

export const ROW_TYPE_LABELS: Record<import('@/types').RowType, string> = {
  normal: '正常参数',
  empty: '空行',
  comment: '备注行',
  missing_column: '缺列行',
  noise: '噪声条/格式错误',
  conflict: '参数冲突',
};

export const SCORE_NAMES = {
  snr: '信噪比',
  contrast: '对比度',
  resolution: '空间分辨率',
  efficiency: '扫描效率',
  artifact: '伪影抑制',
} as const;
