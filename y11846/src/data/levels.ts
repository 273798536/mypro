import type { Level, WindField } from '@/types/game';

const level1WindField: WindField = {
  segments: [
    { region: { x: 0, y: 0, width: 20, height: 8 }, direction: 90, speed: 2 },
    { region: { x: 0, y: 8, width: 20, height: 8 }, direction: 180, speed: 4 },
    { region: { x: 0, y: 16, width: 20, height: 4 }, direction: 270, speed: 1 },
  ],
};

const level1WindFieldV2: WindField = {
  segments: [
    { region: { x: 0, y: 0, width: 20, height: 8 }, direction: 90, speed: 2 },
    { region: { x: 0, y: 8, width: 20, height: 8 }, direction: 200, speed: 6 },
    { region: { x: 0, y: 16, width: 20, height: 4 }, direction: 315, speed: 3 },
  ],
};

export const level1: Level = {
  id: 'level-1',
  name: '城市公园巡线',
  description: '在公园上空规划航线，避开禁飞区并注意逆风耗电。适合新飞手入门。',
  gridSize: { width: 20, height: 20 },
  start: { x: 1, y: 10 },
  home: { x: 1, y: 10 },
  waypoints: [
    { id: 'wp-1', x: 5, y: 5, label: '喷泉广场', isRequired: true },
    { id: 'wp-2', x: 10, y: 3, label: '湖心亭', isRequired: true },
    { id: 'wp-3', x: 15, y: 8, label: '儿童乐园', isRequired: true },
    { id: 'wp-4', x: 18, y: 15, label: '观景台', isRequired: false },
  ],
  noFlyZones: [
    {
      id: 'nfz-1',
      vertices: [
        { x: 7, y: 8 }, { x: 9, y: 8 }, { x: 9, y: 12 }, { x: 7, y: 12 },
      ],
      label: '医院上空',
    },
    {
      id: 'nfz-2',
      vertices: [
        { x: 13, y: 10 }, { x: 16, y: 10 }, { x: 16, y: 14 }, { x: 13, y: 14 },
      ],
      label: '军用设施',
    },
  ],
  windField: level1WindField,
  choicePoints: [
    {
      id: 'cp-1',
      position: { x: 8, y: 3 },
      triggerRadius: 2,
      prompt: '湖心亭前方出现分叉：左侧短路径穿越强逆风区，右侧长路径但顺风省电。如何选择？',
      options: [
        {
          label: '左侧短径（逆风）',
          waypoints: [
            { id: 'cp1-l1', x: 9, y: 3, label: '逆风路径1', isRequired: false },
            { id: 'cp1-l2', x: 11, y: 3, label: '逆风路径2', isRequired: false },
          ],
          windMultiplier: 1.8,
          description: '距离短，但强逆风区耗电×1.8',
        },
        {
          label: '右侧绕行（顺风）',
          waypoints: [
            { id: 'cp1-r1', x: 9, y: 6, label: '顺风路径1', isRequired: false },
            { id: 'cp1-r2', x: 11, y: 6, label: '顺风路径2', isRequired: false },
          ],
          windMultiplier: 0.7,
          description: '距离长，但顺风省电30%',
        },
      ],
    },
  ],
  batteryCapacity: 100,
  minReturnBattery: 15,
  baseDrainRate: 0.8,
  headwindMultiplier: 1.8,
};

const level2WindField: WindField = {
  segments: [
    { region: { x: 0, y: 0, width: 30, height: 8 }, direction: 45, speed: 3 },
    { region: { x: 0, y: 8, width: 30, height: 8 }, direction: 180, speed: 5 },
    { region: { x: 0, y: 16, width: 30, height: 14 }, direction: 270, speed: 4 },
  ],
};

const level2WindFieldV2: WindField = {
  segments: [
    { region: { x: 0, y: 0, width: 30, height: 8 }, direction: 60, speed: 5 },
    { region: { x: 0, y: 8, width: 30, height: 8 }, direction: 200, speed: 7 },
    { region: { x: 0, y: 16, width: 30, height: 14 }, direction: 290, speed: 2 },
  ],
};

export const level2: Level = {
  id: 'level-2',
  name: '海岸线巡查',
  description: '沿海岸线巡查，注意海风方向变化和多个禁飞区。电量管理更关键。',
  gridSize: { width: 30, height: 30 },
  start: { x: 2, y: 15 },
  home: { x: 2, y: 15 },
  waypoints: [
    { id: 'wp-1', x: 8, y: 8, label: '灯塔', isRequired: true },
    { id: 'wp-2', x: 15, y: 5, label: '码头', isRequired: true },
    { id: 'wp-3', x: 22, y: 10, label: '礁石区', isRequired: true },
    { id: 'wp-4', x: 25, y: 20, label: '渔村', isRequired: true },
    { id: 'wp-5', x: 18, y: 25, label: '海滩', isRequired: false },
  ],
  noFlyZones: [
    {
      id: 'nfz-1',
      vertices: [
        { x: 10, y: 10 }, { x: 13, y: 10 }, { x: 13, y: 14 }, { x: 10, y: 14 },
      ],
      label: '军用雷达站',
    },
    {
      id: 'nfz-2',
      vertices: [
        { x: 18, y: 14 }, { x: 22, y: 14 }, { x: 22, y: 18 }, { x: 18, y: 18 },
      ],
      label: '直升机起降场',
    },
    {
      id: 'nfz-3',
      vertices: [
        { x: 5, y: 22 }, { x: 9, y: 22 }, { x: 9, y: 26 }, { x: 5, y: 26 },
      ],
      label: '监狱上空',
    },
  ],
  windField: level2WindField,
  choicePoints: [
    {
      id: 'cp-1',
      position: { x: 12, y: 5 },
      triggerRadius: 2,
      prompt: '码头前方航线被禁飞区分隔：上方穿越逆风窄缝省距离，下方绕行远但安全省电。',
      options: [
        {
          label: '上方窄缝（逆风）',
          waypoints: [
            { id: 'cp1-l1', x: 14, y: 3, label: '逆风窄缝', isRequired: false },
          ],
          windMultiplier: 2.0,
          description: '穿越窄缝距离短，但强逆风耗电×2.0',
        },
        {
          label: '下方绕行（顺风）',
          waypoints: [
            { id: 'cp1-r1', x: 14, y: 9, label: '顺风绕行', isRequired: false },
          ],
          windMultiplier: 0.75,
          description: '绕行距离长，但顺风省电25%',
        },
      ],
    },
    {
      id: 'cp-2',
      position: { x: 23, y: 15 },
      triggerRadius: 2,
      prompt: '渔村在禁飞区旁，直飞会擦边。选择偏东安全路线还是冒险穿越边角？',
      options: [
        {
          label: '偏东安全线',
          waypoints: [
            { id: 'cp2-l1', x: 26, y: 22, label: '安全线', isRequired: false },
          ],
          windMultiplier: 1.0,
          description: '偏东绕行，不触碰禁飞区，正常耗电',
        },
        {
          label: '穿越边角（风险）',
          waypoints: [
            { id: 'cp2-r1', x: 24, y: 19, label: '风险穿越', isRequired: false },
          ],
          windMultiplier: 1.2,
          description: '擦边穿越，距离短但有禁飞区风险和轻微逆风',
        },
      ],
    },
  ],
  batteryCapacity: 100,
  minReturnBattery: 18,
  baseDrainRate: 1.0,
  headwindMultiplier: 2.0,
};

const level3WindField: WindField = {
  segments: [
    { region: { x: 0, y: 0, width: 40, height: 10 }, direction: 135, speed: 4 },
    { region: { x: 0, y: 10, width: 40, height: 10 }, direction: 225, speed: 6 },
    { region: { x: 0, y: 20, width: 40, height: 10 }, direction: 315, speed: 3 },
    { region: { x: 0, y: 30, width: 40, height: 10 }, direction: 45, speed: 5 },
  ],
};

const level3WindFieldV2: WindField = {
  segments: [
    { region: { x: 0, y: 0, width: 40, height: 10 }, direction: 180, speed: 6 },
    { region: { x: 0, y: 10, width: 40, height: 10 }, direction: 250, speed: 8 },
    { region: { x: 0, y: 20, width: 40, height: 10 }, direction: 0, speed: 5 },
    { region: { x: 0, y: 30, width: 40, height: 10 }, direction: 90, speed: 7 },
  ],
};

export const level3: Level = {
  id: 'level-3',
  name: '山区搜救',
  description: '山区搜救任务，风场复杂多变，多个禁飞区和选择压力。返航电量是生死线。',
  gridSize: { width: 40, height: 40 },
  start: { x: 2, y: 20 },
  home: { x: 2, y: 20 },
  waypoints: [
    { id: 'wp-1', x: 8, y: 8, label: '山顶哨所', isRequired: true },
    { id: 'wp-2', x: 18, y: 5, label: '北坡营地', isRequired: true },
    { id: 'wp-3', x: 28, y: 12, label: '东岭观测站', isRequired: true },
    { id: 'wp-4', x: 35, y: 25, label: '深谷入口', isRequired: true },
    { id: 'wp-5', x: 25, y: 35, label: '南坡补给点', isRequired: true },
    { id: 'wp-6', x: 12, y: 30, label: '西隘口', isRequired: false },
  ],
  noFlyZones: [
    {
      id: 'nfz-1',
      vertices: [
        { x: 12, y: 8 }, { x: 16, y: 8 }, { x: 16, y: 14 }, { x: 12, y: 14 },
      ],
      label: '军事禁区A',
    },
    {
      id: 'nfz-2',
      vertices: [
        { x: 22, y: 18 }, { x: 28, y: 18 }, { x: 28, y: 24 }, { x: 22, y: 24 },
      ],
      label: '军事禁区B',
    },
    {
      id: 'nfz-3',
      vertices: [
        { x: 5, y: 26 }, { x: 10, y: 26 }, { x: 10, y: 32 }, { x: 5, y: 32 },
      ],
      label: '高压线走廊',
    },
    {
      id: 'nfz-4',
      vertices: [
        { x: 30, y: 30 }, { x: 36, y: 30 }, { x: 36, y: 36 }, { x: 30, y: 36 },
      ],
      label: '雷达阵地',
    },
  ],
  windField: level3WindField,
  choicePoints: [
    {
      id: 'cp-1',
      position: { x: 14, y: 6 },
      triggerRadius: 3,
      prompt: '北坡营地被军事禁区挡住：翻越山脊逆风但近，绕行山谷顺风但远。电量已经消耗了不少……',
      options: [
        {
          label: '翻越山脊（逆风近路）',
          waypoints: [
            { id: 'cp1-l1', x: 16, y: 4, label: '山脊', isRequired: false },
          ],
          windMultiplier: 2.2,
          description: '翻越山脊距离短，但强逆风耗电×2.2，风险高',
        },
        {
          label: '绕行山谷（顺风远路）',
          waypoints: [
            { id: 'cp1-r1', x: 10, y: 3, label: '山谷', isRequired: false },
            { id: 'cp1-r2', x: 16, y: 2, label: '谷口', isRequired: false },
          ],
          windMultiplier: 0.65,
          description: '绕行山谷距离长，但顺风省电35%',
        },
      ],
    },
    {
      id: 'cp-2',
      position: { x: 26, y: 20 },
      triggerRadius: 3,
      prompt: '东岭到深谷被两个禁区夹击：穿窄缝省距离但逆风+禁区风险，大绕行安全但电量够返航吗？',
      options: [
        {
          label: '穿窄缝（高风险）',
          waypoints: [
            { id: 'cp2-l1', x: 29, y: 18, label: '窄缝', isRequired: false },
          ],
          windMultiplier: 1.9,
          description: '窄缝距离短，但逆风+禁区边缘风险大',
        },
        {
          label: '大绕行（求稳）',
          waypoints: [
            { id: 'cp2-r1', x: 30, y: 14, label: '绕行1', isRequired: false },
            { id: 'cp2-r2', x: 36, y: 20, label: '绕行2', isRequired: false },
          ],
          windMultiplier: 0.8,
          description: '大绕行安全，但距离远，需确认电量足够',
        },
      ],
    },
    {
      id: 'cp-3',
      position: { x: 18, y: 33 },
      triggerRadius: 3,
      prompt: '南坡到返航点：直飞逆风但有高压线禁区，南线绕行顺风但额外3格。电量告急！',
      options: [
        {
          label: '直飞逆风（赌电量）',
          waypoints: [
            { id: 'cp3-l1', x: 10, y: 28, label: '直飞', isRequired: false },
          ],
          windMultiplier: 2.0,
          description: '直飞距离短但逆风耗电×2.0，且靠近高压线禁区',
        },
        {
          label: '南线绕行（求安全）',
          waypoints: [
            { id: 'cp3-r1', x: 20, y: 38, label: '南线1', isRequired: false },
            { id: 'cp3-r2', x: 10, y: 35, label: '南线2', isRequired: false },
          ],
          windMultiplier: 0.7,
          description: '绕行顺风省电30%，但多走3格',
        },
      ],
    },
  ],
  batteryCapacity: 100,
  minReturnBattery: 20,
  baseDrainRate: 1.2,
  headwindMultiplier: 2.2,
};

export const levels = [level1, level2, level3];

export const windFieldV2Map: Record<string, WindField> = {
  'level-1': level1WindFieldV2,
  'level-2': level2WindFieldV2,
  'level-3': level3WindFieldV2,
};
