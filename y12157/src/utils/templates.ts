import type { ExperimentTemplate } from '@/store/useStore'

export const presetUnits = [
  { id: "u_m", name: "米", symbol: "m", dimension: "L" },
  { id: "u_s", name: "秒", symbol: "s", dimension: "T" },
  { id: "u_m_s2", name: "米每二次方秒", symbol: "m/s²", dimension: "L*T^-2" },
  { id: "u_N", name: "牛顿", symbol: "N", dimension: "M*L*T^-2" },
  { id: "u_m2", name: "平方米", symbol: "m²", dimension: "L^2" },
  { id: "u_Pa", name: "帕斯卡", symbol: "Pa", dimension: "M*L^-1*T^-2" },
  { id: "u_dimensionless", name: "无量纲", symbol: "-", dimension: "dimensionless" },
]

export const presetTemplates: ExperimentTemplate[] = [
  {
    id: "pendulum",
    name: "单摆测重力加速度",
    description: "通过测量单摆周期和摆长，计算重力加速度g。公式：g = 4π²L/T²",
    variables: [
      { id: "v_L", symbol: "L", name: "摆长", unitId: "u_m", defaultValue: 1.0, currentValue: 1.0, uncertainty: 0.001 },
      { id: "v_T", symbol: "T", name: "周期", unitId: "u_s", defaultValue: 2.006, currentValue: 2.006, uncertainty: 0.01 },
      { id: "v_g", symbol: "g", name: "重力加速度", unitId: "u_m_s2", defaultValue: 0, currentValue: 0, uncertainty: 0 },
    ],
    formulas: [
      { id: "f_pendulum", expression: "4*pi^2*L/T^2", resultVariableId: "v_g" },
    ],
    instruments: [
      { id: "i_ruler", name: "米尺", unitId: "u_m", precision: 0.001, precisionType: "absolute" },
      { id: "i_stopwatch", name: "秒表", unitId: "u_s", precision: 0.01, precisionType: "absolute" },
    ],
  },
  {
    id: "youngs_modulus",
    name: "杨氏模量测量",
    description: "通过拉伸法测量金属丝的杨氏模量。公式：E = F*L/(A*dL)",
    variables: [
      { id: "v_F", symbol: "F", name: "拉力", unitId: "u_N", defaultValue: 9.8, currentValue: 9.8, uncertainty: 0.05 },
      { id: "v_L2", symbol: "L", name: "金属丝原长", unitId: "u_m", defaultValue: 0.8, currentValue: 0.8, uncertainty: 0.001 },
      { id: "v_A", symbol: "A", name: "截面积", unitId: "u_m2", defaultValue: 7.854e-7, currentValue: 7.854e-7, uncertainty: 1e-8 },
      { id: "v_dL", symbol: "dL", name: "伸长量", unitId: "u_m", defaultValue: 0.002, currentValue: 0.002, uncertainty: 0.0001 },
      { id: "v_E", symbol: "E", name: "杨氏模量", unitId: "u_Pa", defaultValue: 0, currentValue: 0, uncertainty: 0 },
    ],
    formulas: [
      { id: "f_youngs", expression: "F*L/(A*dL)", resultVariableId: "v_E" },
    ],
    instruments: [
      { id: "i_weight", name: "砝码", unitId: "u_N", precision: 0.05, precisionType: "absolute" },
      { id: "i_ruler2", name: "米尺", unitId: "u_m", precision: 0.001, precisionType: "absolute" },
      { id: "i_micrometer", name: "螺旋测微器", unitId: "u_m", precision: 0.00001, precisionType: "absolute" },
    ],
  },
  {
    id: "newton_rings",
    name: "牛顿环测曲率半径",
    description: "利用等厚干涉测量透镜曲率半径。公式：R = D^2/(4*m*lambda)",
    variables: [
      { id: "v_D", symbol: "D", name: "暗环直径", unitId: "u_m", defaultValue: 0.005, currentValue: 0.005, uncertainty: 0.0001 },
      { id: "v_m", symbol: "m", name: "环序数", unitId: "u_dimensionless", defaultValue: 10, currentValue: 10, uncertainty: 0 },
      { id: "v_lambda", symbol: "lambda", name: "波长", unitId: "u_m", defaultValue: 5.893e-7, currentValue: 5.893e-7, uncertainty: 0 },
      { id: "v_R", symbol: "R", name: "曲率半径", unitId: "u_m", defaultValue: 0, currentValue: 0, uncertainty: 0 },
    ],
    formulas: [
      { id: "f_newton", expression: "D^2/(4*m*lambda)", resultVariableId: "v_R" },
    ],
    instruments: [
      { id: "i_microscope", name: "读数显微镜", unitId: "u_m", precision: 0.00001, precisionType: "absolute" },
    ],
  },
]
