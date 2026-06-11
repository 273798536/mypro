import type { CalculationFormula } from '@/types';

export const CALCULATION_FORMULAS: CalculationFormula[] = [
  {
    name: '划痕面积',
    formula: 'Area = 像素面积 × 校准系数',
    latex: 'S = N_p \\times K_{calib}',
    unit: 'mm²',
    description: '通过显微镜图像的像素面积乘以校准系数，得到实际物理面积。校准系数由物镜倍数和相机像素尺寸共同决定。',
    applicableRange: '划痕宽度500-1000μm，贴壁生长细胞',
    notApplicable: ['悬浮细胞', '3D培养', '非均匀划痕']
  },
  {
    name: '细胞迁移率',
    formula: '迁移率 = [(初始面积 - t时间面积) / 初始面积] × 100%',
    latex: 'MR = \\frac{S_0 - S_t}{S_0} \\times 100\\%',
    unit: '%',
    description: '衡量细胞向划痕区域迁移的能力，值越高表示迁移能力越强。',
    applicableRange: '时间点0-48h，细胞存活率>90%',
    notApplicable: ['细胞增殖过快', '划痕区域有细胞死亡', '污染样本']
  },
  {
    name: '变异系数(CV)',
    formula: 'CV = (标准差 / 均值) × 100%',
    latex: 'CV = \\frac{\\sigma}{\\mu} \\times 100\\%',
    unit: '%',
    description: '衡量平行样本间的一致性，CV值越小重复性越好。质控要求CV < 10%。',
    applicableRange: '至少3个复孔',
    notApplicable: ['单样本检测']
  },
  {
    name: "Z'因子",
    formula: "Z' = 1 - (3×σ样本 + 3×σ对照) / |μ样本 - μ对照|",
    latex: "Z' = 1 - \\frac{3\\sigma_s + 3\\sigma_c}{|\\mu_s - \\mu_c|}",
    unit: '',
    description: '衡量实验体系的稳定性，Z\'>0.5表示实验体系优良，0<Z\'<0.5表示可用但需优化，Z\'<0表示体系失效。',
    applicableRange: '有阳性和阴性对照的实验',
    notApplicable: ['无对照实验', '小样本量']
  }
];

export const QC_THRESHOLDS = {
  cvMax: 10,
  zPrimeMin: 0.5,
  cellViabilityMin: 90,
  migrationRateCritical: 40
};

export const UNIT_CONVERSIONS = {
  'mm²_to_μm²': 1e6,
  'μm²_to_mm²': 1e-6,
  'mm_to_μm': 1000,
  'μm_to_mm': 0.001,
  'h_to_min': 60,
  'min_to_h': 1 / 60
};
