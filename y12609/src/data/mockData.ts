import type { ReproducibleSample, ColorRule, HotzoneAnnotation, WarehouseShelf } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const createShelves = (): WarehouseShelf[] => [
  { id: 's1', x: 50, y: 50, width: 120, height: 40, label: 'A-01', pickFrequency: 120 },
  { id: 's2', x: 50, y: 110, width: 120, height: 40, label: 'A-02', pickFrequency: 85 },
  { id: 's3', x: 50, y: 170, width: 120, height: 40, label: 'A-03', pickFrequency: 45 },
  { id: 's4', x: 200, y: 50, width: 120, height: 40, label: 'B-01', pickFrequency: 210 },
  { id: 's5', x: 200, y: 110, width: 120, height: 40, label: 'B-02', pickFrequency: 180 },
  { id: 's6', x: 200, y: 170, width: 120, height: 40, label: 'B-03', pickFrequency: 95 },
  { id: 's7', x: 350, y: 50, width: 120, height: 40, label: 'C-01', pickFrequency: 310 },
  { id: 's8', x: 350, y: 110, width: 120, height: 40, label: 'C-02', pickFrequency: 280 },
  { id: 's9', x: 350, y: 170, width: 120, height: 40, label: 'C-03', pickFrequency: 220 },
  { id: 's10', x: 500, y: 50, width: 120, height: 40, label: 'D-01', pickFrequency: 60 },
  { id: 's11', x: 500, y: 110, width: 120, height: 40, label: 'D-02', pickFrequency: 30 },
  { id: 's12', x: 500, y: 170, width: 120, height: 40, label: 'D-03', pickFrequency: 15 },
  { id: 's13', x: 50, y: 250, width: 120, height: 40, label: 'E-01', pickFrequency: 380 },
  { id: 's14', x: 200, y: 250, width: 120, height: 40, label: 'E-02', pickFrequency: 350 },
  { id: 's15', x: 350, y: 250, width: 120, height: 40, label: 'E-03', pickFrequency: 420 },
  { id: 's16', x: 500, y: 250, width: 120, height: 40, label: 'E-04', pickFrequency: 90 },
];

const createSample1Annotations = (sampleId: string): HotzoneAnnotation[] => {
  const now = Date.now();
  return [
    {
      id: generateId(),
      sampleId,
      points: [
        { x: 180, y: 30 }, { x: 500, y: 30 },
        { x: 500, y: 230 }, { x: 180, y: 230 }
      ],
      color: '#F59E0B',
      level: 3,
      createdAt: now - 10000,
      updatedAt: now - 10000,
      manualNote: '这个区域拣货频次中等偏上，注意和C区的边界不要重了',
      isDuplicate: false,
      isValid: true
    },
    {
      id: generateId(),
      sampleId,
      points: [
        { x: 330, y: 30 }, { x: 500, y: 30 },
        { x: 500, y: 230 }, { x: 330, y: 230 }
      ],
      color: '#DC2626',
      level: 5,
      createdAt: now - 5000,
      updatedAt: now - 5000,
      isDuplicate: true,
      duplicateWith: [],
      blockReason: '与前一个B/C区域标注重叠率达到68%，属于重复标注',
      isValid: false
    },
    {
      id: generateId(),
      sampleId,
      points: [
        { x: 30, y: 230 }, { x: 640, y: 230 },
        { x: 640, y: 310 }, { x: 30, y: 310 }
      ],
      color: '#DC2626',
      level: 5,
      createdAt: now - 2000,
      updatedAt: now - 2000,
      manualNote: 'E区整排都是爆单区，上次比赛这里漏标了',
      isDuplicate: false,
      isValid: true
    }
  ];
};

const createSample2Annotations = (sampleId: string): HotzoneAnnotation[] => {
  const now = Date.now();
  return [
    {
      id: generateId(),
      sampleId,
      points: [
        { x: 30, y: 30 }, { x: 190, y: 30 },
        { x: 190, y: 230 }, { x: 30, y: 230 }
      ],
      color: '#10B981',
      level: 1,
      createdAt: now - 8000,
      updatedAt: now - 8000,
      manualNote: 'A区都是慢动销，但是别小看D-01哦',
      isDuplicate: false,
      isValid: true
    },
    {
      id: generateId(),
      sampleId,
      points: [
        { x: 480, y: 30 }, { x: 640, y: 30 },
        { x: 640, y: 230 }, { x: 480, y: 230 }
      ],
      color: '#6B7280',
      level: 0,
      createdAt: now - 4000,
      updatedAt: now - 4000,
      isDuplicate: false,
      blockReason: '颜色规则中未定义等级0的热区，请选择有效等级',
      isValid: false
    }
  ];
};

const createSample3Annotations = (sampleId: string): HotzoneAnnotation[] => {
  const now = Date.now();
  return [
    {
      id: generateId(),
      sampleId,
      points: [
        { x: 30, y: 30 }, { x: 640, y: 30 },
        { x: 640, y: 310 }, { x: 30, y: 310 }
      ],
      color: '#DC2626',
      level: 5,
      createdAt: now - 15000,
      updatedAt: now - 15000,
      manualNote: '整个仓库都是热区？这不可能，肯定哪里标错了',
      isDuplicate: false,
      isValid: true
    }
  ];
};

export const defaultColorRules: ColorRule[] = [
  { id: 'cr1', level: 1, color: '#10B981', label: '冷区', minFrequency: 0, maxFrequency: 50, createdAt: Date.now() - 86400000 },
  { id: 'cr2', level: 2, color: '#3B82F6', label: '温区', minFrequency: 51, maxFrequency: 100, createdAt: Date.now() - 86400000 },
  { id: 'cr3', level: 3, color: '#F59E0B', label: '热区', minFrequency: 101, maxFrequency: 200, createdAt: Date.now() - 86400000 },
  { id: 'cr4', level: 4, color: '#EA580C', label: '高热区', minFrequency: 201, maxFrequency: 350, createdAt: Date.now() - 86400000 },
  { id: 'cr5', level: 5, color: '#DC2626', label: '爆单区', minFrequency: 351, maxFrequency: 999, createdAt: Date.now() - 86400000 },
];

export const mockSamples: ReproducibleSample[] = [
  {
    id: 'sample-001',
    name: '2024年省赛练习样例 - 日用百货仓',
    warehouseLayout: createShelves(),
    expectedAnnotations: createSample1Annotations('sample-001'),
    manualNotes: [
      '注意B-01和C-01之间的通道，去年有队标成货架了',
      'E区拣货频次是人工统计的，可能有±10的误差',
      '上次演练时C-02被标了两次，这次系统会自动拦',
      '颜色规则还在调整，以最新的为准，别问我为什么老是变'
    ],
    createdAt: Date.now() - 86400000 * 3,
    isDraft: false,
    canvasWidth: 700,
    canvasHeight: 380
  },
  {
    id: 'sample-002',
    name: '2024年国赛热身样例 - 电子配件仓',
    warehouseLayout: createShelves().map(s => ({
      ...s,
      pickFrequency: Math.floor(s.pickFrequency * 0.7)
    })),
    expectedAnnotations: createSample2Annotations('sample-002'),
    manualNotes: [
      '这个仓库都是小件，拣货路线要特别注意',
      'D-02和D-03虽然频次低，但都是高价值商品',
      '等级0是无效的，别选！别选！别选！重要的事情说三遍',
      'A区的人工备注里提到了D-01，看的时候注意关联'
    ],
    createdAt: Date.now() - 86400000 * 2,
    isDraft: true,
    canvasWidth: 700,
    canvasHeight: 380
  },
  {
    id: 'sample-003',
    name: '2025年新题 - 冷链生鲜仓（草稿）',
    warehouseLayout: createShelves().map(s => ({
      ...s,
      pickFrequency: Math.floor(s.pickFrequency * 1.3)
    })),
    expectedAnnotations: createSample3Annotations('sample-003'),
    manualNotes: [
      '这题还在出，不要外传',
      '生鲜仓的特点是频次都高，需要细分',
      '月底转交前把无效记录都清掉',
      '学生只关心哪些记录不能用，菜单再好看没用'
    ],
    createdAt: Date.now() - 86400000,
    isDraft: true,
    canvasWidth: 700,
    canvasHeight: 380
  }
];
