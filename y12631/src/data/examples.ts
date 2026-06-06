import { Example, GridCell, Layer, Maze, MaterialRecord } from '../types';

const createEmptyGrid = (rows: number, cols: number): GridCell[][] => {
  return Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      type: 'empty' as const,
      layer: 0,
      anomalyTag: 'none' as const,
    }))
  );
};

const layersWithOcclusion: Layer[] = [
  { id: 'layer1', name: '地面层', visible: true, opacity: 1, zIndex: 1 },
  { id: 'layer2', name: '障碍物层', visible: true, opacity: 1, zIndex: 2 },
  { id: 'layer3', name: '装饰层', visible: false, opacity: 0.6, zIndex: 3 },
];

const createOldHomeworkGrid = (): GridCell[][] => {
  const grid = createEmptyGrid(8, 10);

  grid[0][0] = { type: 'start', layer: 0, content: '🚶', note: '起点位置正确', anomalyTag: 'none' };
  grid[7][9] = { type: 'end', layer: 0, content: '🏁', note: '终点在右下角', anomalyTag: 'none' };

  grid[1][0] = { type: 'wall', layer: 0, content: '🧱', note: '补录：学生漏填，老师后来补上的' };
  grid[2][0] = { type: 'wall', layer: 0, content: '🧱' };
  grid[3][0] = { type: 'empty', layer: 0, content: '', note: '漏填：这里应该是墙壁但学生没画', anomalyTag: 'missing' };

  grid[0][1] = { type: 'wall', layer: 0, content: '🧱' };
  grid[0][2] = { type: 'empty', layer: 0, content: '', note: '漏填单位：学生只画了线没标格子类型', anomalyTag: 'missing' };

  grid[1][2] = { type: 'path', layer: 0, content: '✅' };
  grid[2][2] = { type: 'path', layer: 0, content: '✅' };
  grid[3][2] = { type: 'path', layer: 0, content: '✅', note: '旧表数据：从上学期模板抄的' };
  grid[4][2] = { type: 'path', layer: 0, content: '✅' };
  grid[5][2] = { type: 'path', layer: 0, content: '✅' };
  grid[6][2] = { type: 'path', layer: 0, content: '✅' };
  grid[7][2] = { type: 'path', layer: 0, content: '✅' };

  grid[7][3] = { type: 'wall', layer: 0, content: '🧱' };
  grid[7][4] = { type: 'wall', layer: 0, content: '🧱' };
  grid[7][5] = { type: 'wall', layer: 0, content: '🧱' };

  grid[6][5] = { type: 'path', layer: 0, content: '✅' };
  grid[5][5] = { type: 'path', layer: 0, content: '✅' };
  grid[4][5] = { type: 'path', layer: 0, content: '✅' };

  grid[4][4] = { type: 'wall', layer: 0, content: '🧱' };
  grid[4][6] = { type: 'wall', layer: 0, content: '🧱' };

  grid[3][5] = { type: 'obstacle', layer: 2, content: '⚠️', note: '图层遮挡：障碍物层盖住了地面路径，学生没发现', anomalyTag: 'missing' };

  grid[5][6] = { type: 'path', layer: 0, content: '✅' };
  grid[6][6] = { type: 'path', layer: 0, content: '✅' };
  grid[7][6] = { type: 'path', layer: 0, content: '✅' };
  grid[7][7] = { type: 'path', layer: 0, content: '✅' };
  grid[7][8] = { type: 'empty', layer: 0, content: '', note: '漏填：最后一格没画完，学生着急交作业', anomalyTag: 'missing' };

  grid[2][4] = { type: 'item', layer: 0, content: '⭐', note: '补录备注：老师后加的道具，学生原稿没有' };
  grid[5][3] = { type: 'empty', layer: 3, content: '🌸', note: '装饰层遮挡：花朵图标遮住了下面的格子类型', anomalyTag: 'none' };

  return grid;
};

const createCollectStarsGrid = (): GridCell[][] => {
  const grid = createEmptyGrid(6, 8);

  grid[0][0] = { type: 'start', layer: 0, content: '🚶' };
  grid[5][7] = { type: 'end', layer: 0, content: '🏁' };

  grid[1][0] = { type: 'wall', layer: 0, content: '🧱' };
  grid[2][0] = { type: 'empty', layer: 0, content: '', note: '旧表遗留：上学期的墙被学生擦掉了但没改类型', anomalyTag: 'missing' };

  grid[0][1] = { type: 'wall', layer: 0, content: '🧱' };

  grid[2][1] = { type: 'item', layer: 0, content: '⭐', note: '道具位置正确' };
  grid[3][1] = { type: 'path', layer: 0, content: '✅' };
  grid[4][1] = { type: 'path', layer: 0, content: '✅' };
  grid[5][1] = { type: 'path', layer: 0, content: '✅' };

  grid[5][2] = { type: 'wall', layer: 0, content: '🧱' };
  grid[5][3] = { type: 'wall', layer: 0, content: '🧱' };

  grid[4][3] = { type: 'path', layer: 0, content: '✅' };
  grid[3][3] = { type: 'path', layer: 0, content: '✅' };
  grid[2][3] = { type: 'empty', layer: 0, content: '', note: '漏填单位：应该是路径但没标类型', anomalyTag: 'missing' };
  grid[1][3] = { type: 'path', layer: 0, content: '✅' };

  grid[1][4] = { type: 'wall', layer: 0, content: '🧱' };
  grid[2][4] = { type: 'wall', layer: 0, content: '🧱', note: '补录：老师发现学生少画一堵墙' };
  grid[3][4] = { type: 'wall', layer: 0, content: '🧱' };

  grid[1][5] = { type: 'path', layer: 0, content: '✅' };
  grid[1][6] = { type: 'path', layer: 0, content: '✅' };
  grid[1][7] = { type: 'path', layer: 0, content: '✅' };
  grid[2][7] = { type: 'path', layer: 0, content: '✅' };
  grid[3][7] = { type: 'path', layer: 0, content: '✅' };
  grid[4][7] = { type: 'path', layer: 0, content: '✅' };

  grid[3][6] = { type: 'item', layer: 2, content: '⭐', note: '图层遮挡：星星在障碍物层，实际上取不到', anomalyTag: 'missing' };
  grid[4][5] = { type: 'obstacle', layer: 0, content: '💣', note: '危险区域标注正确' };
  grid[3][5] = { type: 'empty', layer: 3, content: '🌳', note: '装饰层遮挡：树挡住了路径格子', anomalyTag: 'none' };

  return grid;
};

const createDragonGuardGrid = (): GridCell[][] => {
  const grid = createEmptyGrid(7, 7);

  grid[0][0] = { type: 'start', layer: 0, content: '🚶' };
  grid[6][6] = { type: 'empty', layer: 0, content: '', note: '漏填终点：学生忘了画终点格子', anomalyTag: 'missing' };

  grid[0][1] = { type: 'path', layer: 0, content: '✅' };
  grid[0][2] = { type: 'wall', layer: 0, content: '🧱' };
  grid[0][3] = { type: 'path', layer: 0, content: '✅' };
  grid[0][4] = { type: 'path', layer: 0, content: '✅' };
  grid[0][5] = { type: 'path', layer: 0, content: '✅' };
  grid[0][6] = { type: 'wall', layer: 0, content: '🧱' };

  grid[1][0] = { type: 'wall', layer: 0, content: '🧱' };
  grid[1][1] = { type: 'wall', layer: 0, content: '🧱', note: '旧表数据：从网上找的模板抄的' };
  grid[1][2] = { type: 'path', layer: 0, content: '✅' };
  grid[1][3] = { type: 'wall', layer: 0, content: '🧱' };
  grid[1][4] = { type: 'path', layer: 0, content: '✅' };
  grid[1][5] = { type: 'wall', layer: 0, content: '🧱' };
  grid[1][6] = { type: 'path', layer: 0, content: '✅' };

  grid[2][0] = { type: 'path', layer: 0, content: '✅' };
  grid[2][1] = { type: 'path', layer: 0, content: '✅' };
  grid[2][2] = { type: 'wall', layer: 0, content: '🧱' };
  grid[2][3] = { type: 'path', layer: 0, content: '✅' };
  grid[2][4] = { type: 'wall', layer: 0, content: '🧱' };
  grid[2][5] = { type: 'path', layer: 0, content: '✅' };
  grid[2][6] = { type: 'wall', layer: 0, content: '🧱' };

  grid[3][0] = { type: 'wall', layer: 0, content: '🧱' };
  grid[3][1] = { type: 'obstacle', layer: 2, content: '🐉', note: '图层遮挡：巨龙在障碍物层，下面其实有路径', anomalyTag: 'missing' };
  grid[3][2] = { type: 'path', layer: 0, content: '✅' };
  grid[3][3] = { type: 'wall', layer: 0, content: '🧱' };
  grid[3][4] = { type: 'path', layer: 0, content: '✅' };
  grid[3][5] = { type: 'wall', layer: 0, content: '🧱' };
  grid[3][6] = { type: 'path', layer: 0, content: '✅' };

  grid[4][0] = { type: 'path', layer: 0, content: '✅' };
  grid[4][1] = { type: 'wall', layer: 0, content: '🧱' };
  grid[4][2] = { type: 'wall', layer: 0, content: '🧱' };
  grid[4][3] = { type: 'path', layer: 0, content: '✅' };
  grid[4][4] = { type: 'wall', layer: 0, content: '🧱' };
  grid[4][5] = { type: 'path', layer: 0, content: '✅' };
  grid[4][6] = { type: 'wall', layer: 0, content: '🧱' };

  grid[5][0] = { type: 'wall', layer: 0, content: '🧱' };
  grid[5][1] = { type: 'path', layer: 0, content: '✅' };
  grid[5][2] = { type: 'path', layer: 0, content: '✅' };
  grid[5][3] = { type: 'wall', layer: 0, content: '🧱' };
  grid[5][4] = { type: 'path', layer: 0, content: '✅' };
  grid[5][5] = { type: 'wall', layer: 0, content: '🧱' };
  grid[5][6] = { type: 'path', layer: 0, content: '✅' };

  grid[6][0] = { type: 'wall', layer: 0, content: '🧱' };
  grid[6][1] = { type: 'wall', layer: 0, content: '🧱' };
  grid[6][2] = { type: 'path', layer: 0, content: '✅' };
  grid[6][3] = { type: 'path', layer: 0, content: '✅' };
  grid[6][4] = { type: 'path', layer: 0, content: '✅' };
  grid[6][5] = { type: 'path', layer: 0, content: '✅' };

  grid[2][1] = { type: 'item', layer: 0, content: '⭐', note: '补录备注：老师奖励加的星星' };
  grid[4][3] = { type: 'item', layer: 3, content: '💎', note: '图层遮挡：宝石在装饰层，被上面的障碍物遮住了', anomalyTag: 'missing' };
  grid[1][4] = { type: 'empty', layer: 3, content: '☁️', note: '装饰层遮挡：云挡住了路径判断' };

  return grid;
};

export const examples: Example[] = [
  {
    id: 'homework-old',
    title: '小明的周末作业（旧表混补录）',
    description: '一份学生交上来的迷宫作业，里面混着上学期旧模板、老师补录的备注、还有几处漏填的格子。很像日常收作业时会碰到的样子。',
    source: '三年级编程班·周末作业',
    tag: '日常作业',
    mazeData: {
      id: 'maze-homework',
      name: '小明的周末迷宫作业',
      grid: createOldHomeworkGrid(),
      layers: layersWithOcclusion,
      score: 42,
      status: 'review',
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now() - 3600000,
      remark: '学生作业，有漏填和旧表数据，需要老师批改',
    },
    demoSteps: [
      {
        id: 'hw-1',
        description: '导入这份学生作业',
        action: 'import',
        expectedResult: '迷宫加载，注意看有几个格子颜色不对（灰色表示漏填）',
        scoreChange: { before: 0, after: 42 },
        hint: '旧表混着新作业，有些格子类型没填，有些是上学期遗留的数据',
      },
      {
        id: 'hw-2',
        description: '发现错误：第3行第0列是空格子（漏填墙），而且第3行第5列障碍物挡住了路径',
        action: 'error',
        expectedResult: '评分里"路径分布"和"墙壁数量"都扣分，评分面板显示黄色警告',
        scoreChange: { before: 42, after: 42 },
        hint: '这是日常最常见的错误：学生漏填格子、图层遮挡没看见',
      },
      {
        id: 'hw-3',
        description: '修正：把第3行第0列补上墙，把第3行第5列障碍物移开',
        action: 'correct',
        expectedResult: '路径畅通，评分回升',
        scoreChange: { before: 42, after: 68 },
        hint: '修正漏填后，墙壁数量达标了；移开障碍物后路径可以连通',
      },
      {
        id: 'hw-4',
        description: '给修正的格子加批注"老师已批改"，然后恢复到批改前再对比',
        action: 'restore',
        expectedResult: '操作历史里有两条记录，可以来回切换看分数变化',
        scoreChange: { before: 68, after: 42 },
        hint: '恢复功能可以对比批改前后的评分差别，方便给学生讲解',
      },
    ],
    difficulty: 'easy',
  },
  {
    id: 'stars-missing',
    title: '收集星星（漏填单位+装饰遮挡）',
    description: '学生设计的收集星星迷宫，有几个格子只画了图标没填类型（漏填单位），还有装饰层的树把路径遮住了。',
    source: '四年级·课堂练习',
    tag: '课堂练习',
    mazeData: {
      id: 'maze-stars',
      name: '收集星星的冒险',
      grid: createCollectStarsGrid(),
      layers: layersWithOcclusion,
      score: 38,
      status: 'draft',
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 7200000,
      remark: '课堂练习，有漏填单位问题',
    },
    demoSteps: [
      {
        id: 'stars-1',
        description: '导入课堂练习迷宫',
        action: 'import',
        expectedResult: '看起来还行，但仔细看有几个格子是空的',
        scoreChange: { before: 0, after: 38 },
        hint: '"漏填单位"就是学生画了格子但没选类型，系统不知道是墙还是路',
      },
      {
        id: 'stars-2',
        description: '错误操作：把第2行第3列的空格子当成路径走过去，其实没填类型是不能走的',
        action: 'error',
        expectedResult: '发现第2行第3列和第2行第0列都是漏填，评分里"起点设置"还因为漏填终点扣分',
        scoreChange: { before: 38, after: 38 },
        hint: '这就是日常混进来的小麻烦：看起来画了，其实没填完整',
      },
      {
        id: 'stars-3',
        description: '修正：补上漏填的格子类型，把装饰层的树移开不挡路',
        action: 'correct',
        expectedResult: '路径连通，星星能被收集到',
        scoreChange: { before: 38, after: 72 },
        hint: '把第3行第6列的星星从障碍物层移到地面层，就能被玩家取到了',
      },
      {
        id: 'stars-4',
        description: '标注已修格子并恢复对比',
        action: 'restore',
        expectedResult: '历史记录可以切换，导出报告里能看到评分从38变72',
        scoreChange: { before: 72, after: 38 },
        hint: '恢复功能在给学生讲题时特别有用，能直观看到改了什么、分数涨了多少',
      },
    ],
    difficulty: 'medium',
  },
  {
    id: 'dragon-layers',
    title: '巨龙守护（多层遮挡+漏填终点）',
    description: '复杂的多层迷宫，巨龙、宝石、云分别在不同图层，互相遮挡导致路径判定出错，而且学生漏填了终点格子。',
    source: '五年级·期末作品',
    tag: '期末作品',
    mazeData: {
      id: 'maze-dragon',
      name: '巨龙守护的宝藏',
      grid: createDragonGuardGrid(),
      layers: layersWithOcclusion,
      score: 28,
      status: 'draft',
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000,
      remark: '期末作品，图层遮挡问题比较典型',
    },
    demoSteps: [
      {
        id: 'dragon-1',
        description: '导入期末作品迷宫',
        action: 'import',
        expectedResult: '看起来很酷炫，巨龙、宝石、云都有，但分数只有28',
        scoreChange: { before: 0, after: 28 },
        hint: '图层多了之后，很容易出现"上面盖住下面"的情况，肉眼看以为没路其实有路',
      },
      {
        id: 'dragon-2',
        description: '错误操作：以为巨龙挡住就不能走，直接把巨龙删掉了（破坏了设计）',
        action: 'error',
        expectedResult: '虽然路径通了，但删掉巨龙等于破坏了学生的创意，评分里"障碍物"项反而扣分',
        scoreChange: { before: 28, after: 22 },
        hint: '这是一个常见的"过度修正"——不要直接删素材，应该调整图层顺序',
      },
      {
        id: 'dragon-3',
        description: '正确修正：把巨龙所在图层透明度调低，补上漏填的终点格子，调整宝石到可收集层',
        action: 'correct',
        expectedResult: '保留了巨龙的设计，同时路径可见、终点存在、宝石可收集',
        scoreChange: { before: 22, after: 78 },
        hint: '正确做法是调图层透明度而不是直接删，这样既保留设计又解决遮挡',
      },
      {
        id: 'dragon-4',
        description: '恢复对比：在批改前和批改后之间切换，看分数跳变',
        action: 'restore',
        expectedResult: '28分 → 22分 → 78分的变化历史都能看到',
        scoreChange: { before: 78, after: 28 },
        hint: '期末作品批改时，保留这条评分变化线很重要，可以给家长看进步过程',
      },
    ],
    difficulty: 'hard',
  },
];

export const createEmptyMaze = (name: string = '新迷宫'): Maze => {
  return {
    id: `maze-${Date.now()}`,
    name,
    grid: createEmptyGrid(8, 8),
    layers: [
      { id: 'layer1', name: '基础层', visible: true, opacity: 1, zIndex: 1 },
    ],
    score: 0,
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

export const materialRecords: MaterialRecord[] = [
  {
    id: 'mat-grass',
    name: '背景草地.png',
    type: 'image',
    status: 'available',
    path: '/assets/grass.png',
    importedAt: Date.now() - 86400000,
    resolution: '1920x1080',
    note: '从素材库正常导入，一切正常',
  },
  {
    id: 'mat-wall',
    name: '墙壁纹理.png',
    type: 'image',
    status: 'missing',
    path: '/assets/wall_old_version.png',
    errorMessage: 'ENOENT: file not found at /assets/wall_old_version.png',
    humanReadableError: '这张墙壁图片找不到了。上次保存时用的是旧版文件名"wall_old_version.png"，可能你后来把文件改名了或者移动了文件夹位置。',
    fixSuggestion: '在素材库里重新选一张墙壁图片，或者把文件改回原来的名字放到 /assets 文件夹里。',
    note: '上周素材库整理时改名了，学生作业还在用旧路径',
  },
  {
    id: 'mat-win',
    name: '胜利音效.wav',
    type: 'sound',
    status: 'corrupted',
    path: '/assets/win.wav',
    errorMessage: 'Invalid WAV header: unexpected byte at offset 4',
    humanReadableError: '这个音效文件损坏了，播放不了。可能是下载时没下完，或者复制文件时中途断了。',
    fixSuggestion: '重新从素材库下载这个音效文件，或者换一个胜利音效。',
    note: '从网上下载的免费音效，下载时网络断了',
  },
  {
    id: 'mat-character',
    name: '角色精灵.png',
    type: 'sprite',
    status: 'available',
    path: '/assets/character.png',
    importedAt: Date.now() - 172800000,
    resolution: '512x512',
    note: '正常可用',
  },
  {
    id: 'mat-decoration',
    name: '花朵装饰.png',
    type: 'image',
    status: 'outdated',
    path: '/assets/flower_v1.png',
    errorMessage: 'MD5 hash mismatch with current version',
    humanReadableError: '这张花朵图片是旧版本的。素材库已经更新到新版，但你这份迷宫里还在引用上个月的旧图。',
    fixSuggestion: '在素材管理器里点"更新素材"按钮，系统会自动替换成新版本。',
    note: '素材库上个月更新了一批装饰图片的配色，旧版还没同步',
  },
  {
    id: 'mat-bg-music',
    name: '背景音乐.mp3',
    type: 'sound',
    status: 'missing',
    path: '/home/student/Downloads/bgm.mp3',
    errorMessage: 'Path outside asset directory: /home/student/Downloads/bgm.mp3',
    humanReadableError: '这首背景音乐放在电脑的"下载"文件夹里了，没有导入到项目的素材文件夹。换一台电脑打开就会找不到。',
    fixSuggestion: '把音乐文件复制到项目的 /assets 文件夹里，然后重新导入一次。',
    note: '学生直接从下载文件夹引用，没有复制到项目目录',
  },
];
