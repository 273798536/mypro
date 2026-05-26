import type { InjuryType, EquipmentType } from '@/types';

export interface InjuryInfo {
  type: InjuryType;
  name: string;
  severity: number;
  requiredEquipment: EquipmentType[];
  baseTime: number;
  description: string;
}

export const injuryData: InjuryInfo[] = [
  {
    type: 'abrasion',
    name: '擦伤',
    severity: 1,
    requiredEquipment: ['first-aid', 'radio'],
    baseTime: 120,
    description: '皮肤表面擦伤，需要简单处理',
  },
  {
    type: 'sprain',
    name: '扭伤',
    severity: 2,
    requiredEquipment: ['first-aid', 'stretcher', 'radio'],
    baseTime: 180,
    description: '关节扭伤，需要固定和运送',
  },
  {
    type: 'fracture',
    name: '骨折',
    severity: 3,
    requiredEquipment: ['first-aid', 'stretcher', 'oxygen', 'radio'],
    baseTime: 240,
    description: '疑似骨折，需要紧急运送',
  },
  {
    type: 'unconscious',
    name: '昏迷',
    severity: 4,
    requiredEquipment: ['first-aid', 'stretcher', 'oxygen', 'radio'],
    baseTime: 150,
    description: '意识丧失，需要立即救援',
  },
  {
    type: 'cardiac-arrest',
    name: '心脏骤停',
    severity: 5,
    requiredEquipment: ['aed', 'oxygen', 'stretcher', 'radio'],
    baseTime: 90,
    description: '心脏骤停，需要立即除颤',
  },
];

export const victimNames = [
  '张明', '李华', '王芳', '赵强', '陈静', '刘伟', '杨洋', '黄磊',
  '周杰', '吴敏', '徐峰', '孙丽', '马超', '朱婷', '胡军', '郭静',
];

export const getInjuryInfo = (type: InjuryType): InjuryInfo | undefined => {
  return injuryData.find(i => i.type === type);
};

export const getInjuryName = (type: InjuryType): string => {
  return getInjuryInfo(type)?.name || type;
};
