import type { SliceFormulaInfo } from '@/types';

export const sliceFormulaInfo: SliceFormulaInfo = {
  formula: '|a·x_i + b·y_i + c·z_i - d| ≤ t/2',
  units: '坐标: mm, 厚度 t: mm, 法向量(a,b,c): 无量纲(归一化)',
  range: '厚度 t ∈ [0.1, 50] mm，法向量模长 = 1，切面需与点云有交',
  failureCases: [
    '① 切面完全在点云边界外 → 切片结果为空集',
    '② 厚度 < 0.1mm → 切片点不足，无法分析',
    '③ 法向量未归一化 → 切面公式失真，结果偏移',
  ],
};

export const outlierFormulaInfo: SliceFormulaInfo = {
  formula: '|d_i - μ| > σ_threshold · σ_d  →  判定离群点',
  units: '距离 d: mm，偏差倍数 σ: 无量纲',
  range: '邻域点数 k ≥ 5，阈值 σ_threshold ∈ [1.0, 3.0]，点云密度较均匀',
  failureCases: [
    '① 点云总点数 < k+1 → 无法计算邻域',
    '② 密度局部差异 > 5倍 → 统计均值失真',
    '③ σ_threshold 过小 → 正常点被误判为离群',
  ],
};

export const collisionFormulaInfo: SliceFormulaInfo = {
  formula: 'BB_arm(t_j) ∩ O ≠ ∅  →  第 j 帧碰撞',
  units: '时间 t: 秒(s)，距离: mm',
  range: '时间步长 Δt ≤ 机械臂最小运动周期/5，障碍物点云非空',
  failureCases: [
    '① 时间步长过大 → 中间帧漏检碰撞',
    '② 障碍物点云为空 → 无检测对象',
    '③ 包围盒过于宽松 → 碰撞预警率偏高',
  ],
};

export function normalizeVector(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < 1e-8) return [0, 0, 1];
  return [x / len, y / len, z / len];
}
