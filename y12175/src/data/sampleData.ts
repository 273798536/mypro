import type { Track, RuleSet } from '@/types';

export const sampleTracks: Track[] = [
  {
    id: 't1',
    name: '开场序曲',
    order: 1,
    selectedVersionId: 't1-v1',
    transitionTime: 30,
    isEncore: false,
    versions: [
      { id: 't1-v1', name: '标准版', duration: 240, isDefault: true },
      { id: 't1-v2', name: '加长版', duration: 320, isDefault: false, note: '含前奏solo' }
    ]
  },
  {
    id: 't2',
    name: '夜空中最亮的星',
    order: 2,
    selectedVersionId: 't2-v2',
    transitionTime: null,
    isEncore: false,
    versions: [
      { id: 't2-v1', name: '录音室版', duration: 270, isDefault: true },
      { id: 't2-v2', name: '现场改编版', duration: 420, isDefault: false, note: '含观众大合唱' }
    ]
  },
  {
    id: 't3',
    name: '追梦人',
    order: 3,
    selectedVersionId: 't3-v1',
    transitionTime: 25,
    isEncore: false,
    versions: [
      { id: 't3-v1', name: '标准版', duration: 225, isDefault: true },
      { id: 't3-v2', name: '不插电版', duration: 200, isDefault: false }
    ]
  },
  {
    id: 't4',
    name: '海阔天空',
    order: 4,
    selectedVersionId: 't4-v1',
    transitionTime: null,
    isEncore: false,
    versions: [
      { id: 't4-v1', name: '标准版', duration: 300, isDefault: true },
      { id: 't4-v2', name: '精简版', duration: 210, isDefault: false }
    ]
  },
  {
    id: 't5',
    name: '光辉岁月',
    order: 5,
    selectedVersionId: 't5-v1',
    transitionTime: null,
    isEncore: false,
    versions: [
      { id: 't5-v1', name: '标准版', duration: 285, isDefault: true }
    ]
  },
  {
    id: 't6',
    name: '不再犹豫',
    order: 6,
    selectedVersionId: 't6-v1',
    transitionTime: 45,
    isEncore: false,
    versions: [
      { id: 't6-v1', name: '标准版', duration: 260, isDefault: true }
    ]
  },
  {
    id: 't7',
    name: '真的爱你',
    order: 7,
    selectedVersionId: 't7-v1',
    transitionTime: null,
    isEncore: true,
    versions: [
      { id: 't7-v1', name: '标准版', duration: 290, isDefault: true }
    ]
  },
  {
    id: 't8',
    name: '喜欢你',
    order: 8,
    selectedVersionId: 't8-v1',
    transitionTime: null,
    isEncore: true,
    versions: [
      { id: 't8-v1', name: '标准版', duration: 275, isDefault: true }
    ]
  },
  {
    id: 't9',
    name: '大地',
    order: 9,
    selectedVersionId: 't9-v1',
    transitionTime: 60,
    isEncore: true,
    versions: [
      { id: 't9-v1', name: '标准版', duration: 310, isDefault: true }
    ]
  }
];

export const defaultRuleSet: RuleSet = {
  id: 'rules-default',
  name: '默认规则',
  encore: {
    maxEncoreTracks: 2,
    maxEncoreDuration: 480,
    requiredTransitionTime: 30,
    allowExtraEncore: false
  },
  defaultTransitionTime: 30,
  versionErrorThreshold: 0.1
};

export const phase1RuleSet: RuleSet = {
  id: 'rules-phase1',
  name: '第一阶段（无返场规则',
  encore: {
    maxEncoreTracks: 99,
    maxEncoreDuration: 99999,
    requiredTransitionTime: 30,
    allowExtraEncore: true
  },
  defaultTransitionTime: 30,
  versionErrorThreshold: 0.1
};
