import { Forklift } from '../types/forklift';

export const FORKLIFTS: Forklift[] = [
  {
    id: 'forklift-001',
    name: '标准平衡重式叉车',
    turnRadius: 2.2,
    maxHeight: 4.5,
    maxLoad: 2000,
    length: 3.5,
    width: 1.2,
    maintainer: '设备部 - 张工'
  },
  {
    id: 'forklift-002',
    name: '窄通道前移式叉车',
    turnRadius: 1.6,
    maxHeight: 6.0,
    maxLoad: 1500,
    length: 3.0,
    width: 1.0,
    maintainer: '设备部 - 李工'
  },
  {
    id: 'forklift-003',
    name: '重型大吨位叉车',
    turnRadius: 3.0,
    maxHeight: 3.5,
    maxLoad: 5000,
    length: 4.2,
    width: 1.8,
    maintainer: '设备部 - 王工'
  }
];

export const DEFAULT_FORKLIFT = FORKLIFTS[0];
