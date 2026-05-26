import type { EquipmentType } from '@/types';

export interface EquipmentInfo {
  type: EquipmentType;
  name: string;
  icon: string;
  description: string;
}

export const equipmentData: EquipmentInfo[] = [
  {
    type: 'stretcher',
    name: '担架',
    icon: 'stretcher',
    description: '用于运送受伤人员',
  },
  {
    type: 'oxygen',
    name: '氧气瓶',
    icon: 'oxygen',
    description: '提供氧气支持',
  },
  {
    type: 'aed',
    name: 'AED除颤器',
    icon: 'heart-pulse',
    description: '心脏骤停急救设备',
  },
  {
    type: 'first-aid',
    name: '急救包',
    icon: 'briefcase-medical',
    description: '基础急救用品',
  },
  {
    type: 'rope',
    name: '救援绳索',
    icon: 'link',
    description: '用于复杂地形救援',
  },
  {
    type: 'radio',
    name: '对讲机',
    icon: 'radio',
    description: '保持通讯联系',
  },
];

export const getEquipmentInfo = (type: EquipmentType): EquipmentInfo | undefined => {
  return equipmentData.find(e => e.type === type);
};

export const getEquipmentName = (type: EquipmentType): string => {
  return getEquipmentInfo(type)?.name || type;
};
