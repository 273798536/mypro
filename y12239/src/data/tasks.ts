import { Task } from '@/types';

export const TASKS: Task[] = [
  {
    id: 'task-001',
    name: '校园地形测绘任务',
    description: '测量校园内三个标志性建筑之间的角度和距离，使用三角函数计算相对位置。注意避开操场和停车场区域。',
    angleMin: 15,
    angleMax: 165,
    requiredUnit: 'm',
    targetPoints: 3,
    scale: 0.5,
    surveyPoints: [
      { x: 120, y: 150, name: '教学楼A', isTarget: true, order: 1 },
      { x: 380, y: 120, name: '图书馆', isTarget: true, order: 2 },
      { x: 520, y: 350, name: '实验楼', isTarget: true, order: 3 },
      { x: 250, y: 280, name: '食堂', isTarget: false, order: 4 },
      { x: 450, y: 480, name: '体育馆', isTarget: false, order: 5 },
    ],
    obstacles: [
      {
        name: '操场',
        type: 'restricted',
        polygonPoints: [
          { x: 180, y: 200 },
          { x: 320, y: 200 },
          { x: 320, y: 320 },
          { x: 180, y: 320 },
        ],
      },
      {
        name: '停车场',
        type: 'water',
        polygonPoints: [
          { x: 400, y: 180 },
          { x: 550, y: 180 },
          { x: 550, y: 280 },
          { x: 400, y: 280 },
        ],
      },
      {
        name: '行政楼',
        type: 'building',
        polygonPoints: [
          { x: 50, y: 350 },
          { x: 150, y: 350 },
          { x: 150, y: 500 },
          { x: 50, y: 500 },
        ],
      },
    ],
  },
];

export const getTaskById = (id: string): Task | undefined => {
  return TASKS.find((t) => t.id === id);
};

export const getDefaultTask = (): Task => {
  return TASKS[0];
};
