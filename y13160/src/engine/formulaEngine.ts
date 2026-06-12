import type { ChainStep, ParamGroup, UnitConvert } from '@/types';
import { convert, magnitudeDelta } from './unitConverter';
import { injectBoundaries } from './boundaryChecker';
import { markGapStep } from './gapDetector';

function makeId(prefix: string, i: number) {
  return `${prefix}-step-${i}-${Math.random().toString(36).slice(2, 7)}`;
}

function convertWrap(v: number, from: string, to: string): UnitConvert & { ok: boolean; reason?: string } {
  const r = convert(v, from, to);
  if (!r.ok) return { from, to, factor: 1, intermediate: v, ok: false, reason: r.reason };
  return { from, to, factor: r.factor, intermediate: r.result, ok: true };
}

export interface EngineOptions {
  injectGap?: { stepIndex: number; reason: string; modify?: (step: ChainStep) => ChainStep } | null;
}

export function buildChain(group: ParamGroup, opts: EngineOptions = {}): ChainStep[] {
  const P = group.params;
  const prefix = group.id;
  const steps: ChainStep[] = [];
  let i = 0;

  const Hs_raw = P.Hs_raw;
  const cv_Hs = convertWrap(Hs_raw.value, Hs_raw.unit, 'm');
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '有义波高 Hs 换算',
    formula: 'Hs_m = Hs_raw × k(length→m)',
    inputValues: [{ label: 'Hs_raw', value: Hs_raw.value, unit: Hs_raw.unit }],
    unitConverts: [cv_Hs],
    result: { value: cv_Hs.intermediate, unit: 'm' },
    hasGap: false,
    relatedPhotoIds: ['photo-1'],
  });

  const T_raw = P.T_raw;
  const cv_T = convertWrap(T_raw.value, T_raw.unit, 's');
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '零交叉波周期 Tz',
    formula: 'Tz_s = T_raw × k(time→s)',
    inputValues: [{ label: 'T_raw', value: T_raw.value, unit: T_raw.unit }],
    unitConverts: [cv_T],
    result: { value: cv_T.intermediate, unit: 's' },
    hasGap: false,
    relatedPhotoIds: ['photo-1', 'photo-2'],
  });

  const fp_val = 1 / Math.max(cv_T.intermediate, 1e-6);
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '谱峰频率 fp 提取',
    formula: 'fp = 1 / Tz',
    inputValues: [
      { label: 'Tz', value: cv_T.intermediate, unit: 's' },
    ],
    unitConverts: [],
    result: { value: fp_val, unit: 'hz' },
    hasGap: false,
    relatedPhotoIds: ['photo-2'],
  });

  const a_raw = P.a_raw;
  const cv_a = convertWrap(a_raw.value, a_raw.unit, 'm/s^2');
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '浮标垂向加速度峰值',
    formula: 'a_max = a_raw × k(accel→m/s²)',
    inputValues: [{ label: 'a_raw', value: a_raw.value, unit: a_raw.unit }],
    unitConverts: [cv_a],
    result: { value: cv_a.intermediate, unit: 'm/s^2' },
    hasGap: false,
    relatedPhotoIds: ['photo-3'],
  });

  const depth = P.water_depth;
  const cv_d = convertWrap(depth.value, depth.unit, 'm');
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '水深 d 标准化',
    formula: 'd_m = d_raw × k(length→m)',
    inputValues: [{ label: 'd_raw', value: depth.value, unit: depth.unit }],
    unitConverts: [cv_d],
    result: { value: cv_d.intermediate, unit: 'm' },
    hasGap: false,
    relatedPhotoIds: ['photo-4'],
  });

  const g = 9.80665;
  const lambda = (g * cv_T.intermediate * cv_T.intermediate) / (2 * Math.PI);
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '深水波长 λ 估算',
    formula: 'λ = g·Tz² / (2π)',
    inputValues: [
      { label: 'g', value: g, unit: 'm/s^2' },
      { label: 'Tz', value: cv_T.intermediate, unit: 's' },
    ],
    unitConverts: [],
    result: { value: lambda, unit: 'm' },
    hasGap: false,
    relatedPhotoIds: ['photo-2'],
  });

  const rho_val = P.rho;
  const cv_rho = rho_val.value;
  const k_energy = 0.125 * rho_val.value * g * cv_Hs.intermediate * cv_Hs.intermediate * cv_T.intermediate;
  const cv_e = convertWrap(k_energy, 'kg*m^2/s^3', 'kg*m^2/s^3');
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '有效波功率 P_wave',
    formula: 'P = ⅛ · ρ · g · Hs² · Tz',
    inputValues: [
      { label: 'ρ', value: cv_rho, unit: rho_val.unit },
      { label: 'g', value: g, unit: 'm/s^2' },
      { label: 'Hs', value: cv_Hs.intermediate, unit: 'm' },
      { label: 'Tz', value: cv_T.intermediate, unit: 's' },
    ],
    unitConverts: [cv_e],
    result: { value: k_energy, unit: 'kg*m^2/s^3' },
    hasGap: false,
    relatedPhotoIds: ['photo-1', 'photo-2', 'photo-4'],
  });

  const depth_ratio = cv_d.intermediate / Math.max(lambda, 1e-6);
  steps.push({
    id: makeId(prefix, ++i),
    index: i,
    title: '水深/波长比 d/λ（边界判定辅助）',
    formula: 'ratio = d_m / λ',
    inputValues: [
      { label: 'd_m', value: cv_d.intermediate, unit: 'm' },
      { label: 'λ', value: lambda, unit: 'm' },
    ],
    unitConverts: [],
    result: { value: depth_ratio, unit: 'rad' },
    hasGap: false,
    relatedPhotoIds: ['photo-2', 'photo-4'],
  });

  let finalSteps = steps.map((s, idx) => {
    const prev = idx > 0 ? steps[idx - 1] : null;
    if (!prev) return s;
    const md = magnitudeDelta(prev.result.value, s.result.value);
    return { ...s, magnitudeDelta: md };
  });

  if (opts.injectGap) {
    finalSteps = markGapStep(finalSteps, opts.injectGap.stepIndex, opts.injectGap.reason);
    if (opts.injectGap.modify) {
      finalSteps[opts.injectGap.stepIndex] = opts.injectGap.modify(
        finalSteps[opts.injectGap.stepIndex]
      );
    }
  }

  return injectBoundaries(finalSteps, (v, from, to) => {
    const r = convert(v, from, to);
    if (!r.ok) return { ok: false, reason: r.reason };
    return { ok: true, factor: r.factor, result: r.result };
  });
}

export function buildChainsForGroups(groups: ParamGroup[], gapGroupId: 'A' | 'B' | null) {
  return groups.map((g) => {
    if (gapGroupId === g.id) {
      return buildChain(g, {
        injectGap: {
          stepIndex: 0,
          reason:
            '现场照片 photo-1 读数单位混写：Hs_raw 登记为 cm 但实际读数为 mm，数量级偏移 +2（×100），缺口来源：老唐现场记录涂改痕迹。',
          modify: (s) => ({
            ...s,
            inputValues: s.inputValues.map((iv) =>
              iv.label === 'Hs_raw' ? { ...iv, value: iv.value, unit: 'mm' } : iv
            ),
            unitConverts: s.unitConverts.map((uc) => ({
              ...uc,
              factor: uc.factor,
            })),
          }),
        },
      });
    }
    return buildChain(g);
  });
}
