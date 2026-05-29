import type { Stage } from '../types';

export const stages: Stage[] = [
  {
    id: 'stage-main',
    name: '主舞台',
    equipment: ['重型音响', '标准音响', '灯光矩阵', '简单灯光', 'LED屏', '烟火装置'],
    changeoverTime: 20,
  },
  {
    id: 'stage-sub',
    name: '副舞台',
    equipment: ['标准音响', '舞蹈灯光', 'LED屏', '烟雾机'],
    changeoverTime: 15,
  },
  {
    id: 'stage-small',
    name: '小舞台',
    equipment: ['原声乐器', '麦克风'],
    changeoverTime: 10,
  },
];
