import type { ParamGroup } from '@/types';

export const DEFAULT_PARAM_GROUP_A: ParamGroup = {
  id: 'A',
  name: 'A组 · 现场干净记录',
  params: {
    Hs_raw: { value: 230, unit: 'cm', label: '原始有义波高读数' },
    T_raw: { value: 8200, unit: 'ms', label: '零交叉周期读数' },
    a_raw: { value: 42, unit: 'cm/s^2', label: '垂向加速度峰值' },
    water_depth: { value: 38, unit: 'm', label: '测站水深' },
    rho: { value: 1025, unit: 'kg/m^3', label: '海水密度' },
  },
};

export const DEFAULT_PARAM_GROUP_B: ParamGroup = {
  id: 'B',
  name: 'B组 · 含单位混写缺口',
  params: {
    Hs_raw: { value: 2300, unit: 'mm', label: '原始有义波高读数' },
    T_raw: { value: 8.2, unit: 's', label: '零交叉周期读数' },
    a_raw: { value: 0.42, unit: 'm/s^2', label: '垂向加速度峰值' },
    water_depth: { value: 0.038, unit: 'km', label: '测站水深' },
    rho: { value: 1025, unit: 'kg/m^3', label: '海水密度' },
  },
};
