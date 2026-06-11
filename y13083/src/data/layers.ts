import type { CadLayer } from '@/types';

export const mockLayers: CadLayer[] = [
  {
    id: 'layer-main-2024',
    name: '主体结构-2024版',
    version: 'v2024.03',
    visible: true,
    isOldVersion: false,
  },
  {
    id: 'layer-pipe-2024',
    name: '工艺管线-2024版',
    version: 'v2024.03',
    visible: true,
    isOldVersion: false,
  },
  {
    id: 'layer-tank-2024',
    name: '储罐设备-2024版',
    version: 'v2024.03',
    visible: true,
    isOldVersion: false,
  },
  {
    id: 'layer-main-2022',
    name: '主体结构-2022旧版',
    version: 'v2022.09',
    visible: false,
    isOldVersion: true,
  },
  {
    id: 'layer-pipe-2022',
    name: '工艺管线-2022旧版',
    version: 'v2022.09',
    visible: false,
    isOldVersion: true,
  },
];
