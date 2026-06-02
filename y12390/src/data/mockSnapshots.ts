import type { Snapshot } from '../types';

export const mockSnapshots: Snapshot[] = [
  {
    id: 'snap-001',
    name: '学生A - 贝斯音色修改尝试',
    presetVersionId: 'pv-serum-bass-100',
    presetName: 'Serum贝斯预设',
    parameters: [
      { parameterId: 'param-osc1-wt', name: 'Osc 1 Wavetable Position', path: 'Oscillators/Osc1/WavetablePosition', value: 0.35, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc1-detune', name: 'Osc 1 Detune', path: 'Oscillators/Osc1/Detune', value: 15, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc1-level', name: 'Osc 1 Level', path: 'Oscillators/Osc1/Level', value: -6, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc2-oct', name: 'Osc 2 Octave', path: 'Oscillators/Osc2/Octave', value: 0, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-filt1-cutoff', name: 'Filter 1 Cutoff', path: 'Filters/Filter1/Cutoff', value: 1800, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-filt1-res', name: 'Filter 1 Resonance', path: 'Filters/Filter1/Resonance', value: 0.4, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env1-attack', name: 'Env 1 Attack', path: 'Envelopes/Env1/Attack', value: 0.01, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env1-release', name: 'Env 1 Release', path: 'Envelopes/Env1/Release', value: 0.8, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-lfo1-rate', name: 'LFO 1 Rate', path: 'LFOs/LFO1/Rate', value: 4.5, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-lfo1-depth', name: 'LFO 1 Depth', path: 'LFOs/LFO1/Depth', value: 0.25, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
    ],
    createdAt: Date.now() - 86400000 * 10,
    createdBy: 'student-001',
    creatorName: '学生A',
    assignmentId: 'assign-001',
    notes: '尝试调整detune参数使音色更厚实',
    comparisonResult: {
      totalParameters: 10,
      modifiedCount: 1,
      outOfBoundsCount: 0,
      anomalies: [],
      comparedAt: Date.now() - 86400000 * 10,
    },
  },
  {
    id: 'snap-002',
    name: '学生B - 主音音色过度调整',
    presetVersionId: 'pv-massive-lead-100',
    presetName: 'Massive主音预设',
    parameters: [
      { parameterId: 'param-osc1-saw', name: 'Osc 1 Saw Mix', path: 'Oscillators/Osc1/SawMix', value: 0.9, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc1-detune', name: 'Osc 1 Detune', path: 'Oscillators/Osc1/Detune', value: 120, isModified: true, isOutOfBounds: true, boundsStatus: 'above_max' },
      { parameterId: 'param-osc2-pitch', name: 'Osc 2 Pitch', path: 'Oscillators/Osc2/Pitch', value: 7, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc3-level', name: 'Osc 3 Level', path: 'Oscillators/Osc3/Level', value: -12, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-filt-cutoff', name: 'Filter Cutoff', path: 'Filters/Main/Cutoff', value: 25000, isModified: true, isOutOfBounds: true, boundsStatus: 'above_max' },
      { parameterId: 'param-filt-envamt', name: 'Filter Env Amount', path: 'Filters/Main/EnvAmount', value: 0.6, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env-attack', name: 'Amp Env Attack', path: 'Envelopes/Amp/Attack', value: 0.05, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env-decay', name: 'Amp Env Decay', path: 'Envelopes/Amp/Decay', value: 0.3, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env-sustain', name: 'Amp Env Sustain', path: 'Envelopes/Amp/Sustain', value: 0.7, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env-release', name: 'Amp Env Release', path: 'Envelopes/Amp/Release', value: 1.5, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-lfo-rate', name: 'LFO Rate', path: 'LFOs/Main/Rate', value: -1, isModified: true, isOutOfBounds: true, boundsStatus: 'below_min' },
    ],
    createdAt: Date.now() - 86400000 * 8,
    createdBy: 'student-002',
    creatorName: '学生B',
    assignmentId: 'assign-002',
    notes: '尝试让音色更亮更有冲击力，但可能参数设置有问题',
    comparisonResult: {
      totalParameters: 11,
      modifiedCount: 4,
      outOfBoundsCount: 3,
      anomalies: [],
      comparedAt: Date.now() - 86400000 * 8,
    },
  },
  {
    id: 'snap-003',
    name: '学生C - 鼓组基础练习',
    presetVersionId: 'pv-serum-drums-110',
    presetName: 'Serum鼓组预设',
    parameters: [
      { parameterId: 'param-kick-tune', name: 'Kick Tuning', path: 'Drums/Kick/Tuning', value: 50, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-kick-attack', name: 'Kick Attack', path: 'Drums/Kick/Attack', value: 0.001, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-kick-decay', name: 'Kick Decay', path: 'Drums/Kick/Decay', value: 0.6, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-snare-tune', name: 'Snare Tuning', path: 'Drums/Snare/Tuning', value: 60, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-snare-noise', name: 'Snare Noise Level', path: 'Drums/Snare/NoiseLevel', value: 0.6, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-hat-tune', name: 'HiHat Tuning', path: 'Drums/HiHat/Tuning', value: 72, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-hat-decay', name: 'HiHat Decay', path: 'Drums/HiHat/Decay', value: 0.12, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-clap-level', name: 'Clap Level', path: 'Drums/Clap/Level', value: -8, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-fx-comp-thresh', name: 'Compressor Threshold', path: 'Effects/Compressor/Threshold', value: -18, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-fx-comp-ratio', name: 'Compressor Ratio', path: 'Effects/Compressor/Ratio', value: 4, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-fx-reverb-mix', name: 'Reverb Mix', path: 'Effects/Reverb/Mix', value: 0.15, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
    ],
    createdAt: Date.now() - 86400000 * 3,
    createdBy: 'student-003',
    creatorName: '学生C',
    assignmentId: 'assign-003',
    notes: '按照课程要求调整了底鼓的音高和衰减',
    comparisonResult: {
      totalParameters: 11,
      modifiedCount: 2,
      outOfBoundsCount: 0,
      anomalies: [],
      comparedAt: Date.now() - 86400000 * 3,
    },
  },
  {
    id: 'snap-004',
    name: '学生A - 贝斯音色二次修改（版本覆盖后）',
    presetVersionId: 'pv-serum-bass-200',
    presetName: 'Serum贝斯预设',
    parameters: [
      { parameterId: 'param-osc1-wt', name: 'Osc 1 Wavetable Position', path: 'Oscillators/Osc1/WavetablePosition', value: 0.85, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc1-detune', name: 'Osc 1 Detune', path: 'Oscillators/Osc1/Detune', value: 18, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc1-level', name: 'Osc 1 Level', path: 'Oscillators/Osc1/Level', value: -3, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-osc2-oct', name: 'Osc 2 Octave', path: 'Oscillators/Osc2/Octave', value: -2, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-filt1-cutoff', name: 'Filter 1 Cutoff', path: 'Filters/Filter1/Cutoff', value: 1000, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-filt1-res', name: 'Filter 1 Resonance', path: 'Filters/Filter1/Resonance', value: 0.7, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env1-attack', name: 'Env 1 Attack', path: 'Envelopes/Env1/Attack', value: 0.002, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-env1-release', name: 'Env 1 Release', path: 'Envelopes/Env1/Release', value: 0.6, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-lfo1-rate', name: 'LFO 1 Rate', path: 'LFOs/LFO1/Rate', value: 8.0, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-lfo1-depth', name: 'LFO 1 Depth', path: 'LFOs/LFO1/Depth', value: 0.5, isModified: false, isOutOfBounds: false, boundsStatus: 'normal' },
      { parameterId: 'param-fx1-drive', name: 'FX 1 Distortion Drive', path: 'Effects/FX1/Distortion/Drive', value: 0.75, isModified: true, isOutOfBounds: false, boundsStatus: 'normal' },
    ],
    createdAt: Date.now() - 86400000 * 2,
    createdBy: 'student-001',
    creatorName: '学生A',
    notes: '版本更新后，调整了波表位置和失真度，使音色更符合现代Riddim风格',
    comparisonResult: {
      totalParameters: 11,
      modifiedCount: 3,
      outOfBoundsCount: 0,
      anomalies: [],
      comparedAt: Date.now() - 86400000 * 2,
    },
  },
];

export const getSnapshotById = (id: string): Snapshot | undefined => {
  return mockSnapshots.find(s => s.id === id);
};

export const getSnapshotsByPresetVersionId = (presetVersionId: string): Snapshot[] => {
  return mockSnapshots.filter(s => s.presetVersionId === presetVersionId);
};

export const getSnapshotsByAssignmentId = (assignmentId: string): Snapshot[] => {
  return mockSnapshots.filter(s => s.assignmentId === assignmentId);
};
