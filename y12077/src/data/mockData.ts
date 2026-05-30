import {
  Rack,
  Location,
  Sku,
  InOutRecord,
  HeatmapVersion,
  DataSource,
  Conflict,
  PathNode,
} from '../types';

export const mockRack: Rack = {
  id: 'rack-001',
  name: 'A区立体货架',
  rows: 4,
  columns: 8,
  layers: 5,
  cellWidth: 1.2,
  cellHeight: 0.8,
  cellDepth: 1.0,
};

export const generateLocations = (rack: Rack): Location[] => {
  const locations: Location[] = [];
  const occludedLocations = ['L2-C3-R0', 'L2-C4-R0', 'L3-C2-R1', 'L3-C3-R1'];

  for (let layer = 0; layer < rack.layers; layer++) {
    for (let col = 0; col < rack.columns; col++) {
      for (let row = 0; row < rack.rows; row++) {
        const code = `L${layer}-C${col}-R${row}`;
        locations.push({
          id: `loc-${code}`,
          code,
          row,
          col,
          layer,
          rackId: rack.id,
          skuId: undefined,
          isOccluded: occludedLocations.includes(code),
        });
      }
    }
  }
  return locations;
};

export const mockLocations = generateLocations(mockRack);

export const mockSkus: Sku[] = [
  { id: 'sku-001', name: '电子元器件A', category: '电子', weight: 0.5 },
  { id: 'sku-002', name: '电子元器件B', category: '电子', weight: 0.3 },
  { id: 'sku-003', name: '机械零件C', category: '机械', weight: 2.5 },
  { id: 'sku-004', name: '机械零件D', category: '机械', weight: 1.8 },
  { id: 'sku-005', name: '塑料配件E', category: '塑料', weight: 0.2 },
  { id: 'sku-006', name: '塑料配件F', category: '塑料', weight: 0.15 },
  { id: 'sku-007', name: '金属板材G', category: '金属', weight: 15.0 },
  { id: 'sku-008', name: '金属棒材H', category: '金属', weight: 8.0 },
  { id: 'sku-009', name: '包装材料I', category: '包装', weight: 0.8 },
  { id: 'sku-010', name: '包装材料J', category: '包装', weight: 1.2 },
  { id: 'sku-011', name: '化工原料K', category: '化工', weight: 25.0 },
  { id: 'sku-012', name: '化工原料L', category: '化工', weight: 20.0 },
  { id: 'sku-013', name: '纺织品M', category: '纺织', weight: 3.0 },
  { id: 'sku-014', name: '纺织品N', category: '纺织', weight: 2.5 },
  { id: 'sku-015', name: '食品O', category: '食品', weight: 5.0 },
  { id: 'sku-016', name: '食品P', category: '食品', weight: 3.5 },
  { id: 'sku-017', name: '工具Q', category: '工具', weight: 1.5 },
  { id: 'sku-018', name: '工具R', category: '工具', weight: 2.0 },
  { id: 'sku-019', name: '耗材S', category: '耗材', weight: 0.3 },
  { id: 'sku-020', name: '耗材T', category: '耗材', weight: 0.4 },
  { id: 'sku-021', name: '传感器U', category: '电子', weight: 0.1 },
  { id: 'sku-022', name: '控制器V', category: '电子', weight: 0.6 },
  { id: 'sku-023', name: '电机W', category: '机械', weight: 4.5 },
  { id: 'sku-024', name: '轴承X', category: '机械', weight: 0.8 },
  { id: 'sku-025', name: '螺丝Y', category: '五金', weight: 0.05 },
  { id: 'sku-026', name: '螺母Z', category: '五金', weight: 0.03 },
  { id: 'sku-027', name: '垫片AA', category: '五金', weight: 0.02 },
  { id: 'sku-028', name: '弹簧BB', category: '五金', weight: 0.1 },
  { id: 'sku-029', name: '密封圈CC', category: '橡胶', weight: 0.05 },
  { id: 'sku-030', name: '胶带DD', category: '包装', weight: 0.2 },
  { id: 'sku-031', name: '标签EE', category: '包装', weight: 0.01 },
  { id: 'sku-032', name: '纸箱FF', category: '包装', weight: 0.5 },
  { id: 'sku-033', name: '气泡膜GG', category: '包装', weight: 0.3 },
  { id: 'sku-034', name: '润滑油HH', category: '化工', weight: 1.0 },
  { id: 'sku-035', name: '清洁剂II', category: '化工', weight: 0.8 },
  { id: 'sku-036', name: '手套JJ', category: '劳保', weight: 0.2 },
  { id: 'sku-037', name: '安全帽KK', category: '劳保', weight: 0.5 },
  { id: 'sku-038', name: '护目镜LL', category: '劳保', weight: 0.15 },
  { id: 'sku-039', name: '工作服MM', category: '劳保', weight: 1.0 },
  { id: 'sku-040', name: '安全鞋NN', category: '劳保', weight: 1.5 },
  { id: 'sku-041', name: '电池OO', category: '电子', weight: 0.3 },
  { id: 'sku-042', name: '充电器PP', category: '电子', weight: 0.4 },
  { id: 'sku-043', name: '线缆QQ', category: '电子', weight: 0.5 },
  { id: 'sku-044', name: '接头RR', category: '电子', weight: 0.1 },
  { id: 'sku-045', name: '开关SS', category: '电子', weight: 0.05 },
  { id: 'sku-046', name: '插座TT', category: '电子', weight: 0.2 },
  { id: 'sku-047', name: '灯泡UU', category: '照明', weight: 0.1 },
  { id: 'sku-048', name: '灯管VV', category: '照明', weight: 0.3 },
  { id: 'sku-049', name: '灯具WW', category: '照明', weight: 1.0 },
  { id: 'sku-050', name: '电池盒XX', category: '电子', weight: 0.2 },
];

const generateInOutRecords = (
  locations: Location[],
  skus: Sku[],
  count: number,
  startDate: Date
): InOutRecord[] => {
  const records: InOutRecord[] = [];
  const operators = ['张三', '李四', '王五', '赵六', '钱七'];
  const sourceFiles = [
    '2024-01-入库单.xlsx',
    '2024-01-出库单.xlsx',
    '2024-02-入库单.xlsx',
    '2024-02-出库单.xlsx',
    '电商订单导出.csv',
  ];

  for (let i = 0; i < count; i++) {
    const location = locations[Math.floor(Math.random() * locations.length)];
    const sku = skus[Math.floor(Math.random() * skus.length)];
    const isIn = Math.random() > 0.4;
    const daysOffset = Math.floor(Math.random() * 30);
    const hoursOffset = Math.floor(Math.random() * 24);

    records.push({
      id: `rec-${String(i + 1).padStart(4, '0')}`,
      skuId: sku.id,
      locationId: location.id,
      type: isIn ? 'in' : 'out',
      timestamp: new Date(
        startDate.getTime() + daysOffset * 86400000 + hoursOffset * 3600000
      ),
      operator: operators[Math.floor(Math.random() * operators.length)],
      sourceFile: sourceFiles[Math.floor(Math.random() * sourceFiles.length)],
    });
  }

  return records.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const mockInOutRecords = generateInOutRecords(
  mockLocations,
  mockSkus,
  200,
  new Date('2024-01-01')
);

const assignSkusToLocations = (locations: Location[], skus: Sku[]): Location[] => {
  return locations.map((loc, index) => ({
    ...loc,
    skuId: skus[index % skus.length].id,
  }));
};

export const mockLocationsWithSkus = assignSkusToLocations(mockLocations, mockSkus);

export const calculateHeatmap = (
  locations: Location[],
  records: InOutRecord[],
  dimension: 'frequency' | 'turnover' | 'weight',
  skus: Sku[]
): Map<string, number> => {
  const heatMap = new Map<string, number>();

  locations.forEach((loc) => {
    heatMap.set(loc.id, 0);
  });

  records.forEach((record) => {
    const current = heatMap.get(record.locationId) || 0;

    if (dimension === 'frequency') {
      heatMap.set(record.locationId, current + 1);
    } else if (dimension === 'turnover') {
      heatMap.set(record.locationId, current + (record.type === 'out' ? 1 : 0.5));
    } else if (dimension === 'weight') {
      const sku = skus.find((s) => s.id === record.skuId);
      heatMap.set(record.locationId, current + (sku?.weight || 1));
    }
  });

  return heatMap;
};

const generateHeatmapVersions = (
  locations: Location[],
  records: InOutRecord[],
  skus: Sku[]
): HeatmapVersion[] => {
  const versions: HeatmapVersion[] = [];
  const dimensions: ('frequency' | 'turnover' | 'weight')[] = [
    'frequency',
    'turnover',
    'weight',
  ];

  for (let v = 0; v < 5; v++) {
    const dimension = dimensions[v % 3];
    const heatMap = calculateHeatmap(locations, records.slice(0, 100 + v * 20), dimension, skus);

    versions.push({
      id: `ver-${String(v + 1).padStart(3, '0')}`,
      name: `热图版本 v${v + 1}`,
      remark: v === 2 ? '会议最终确认版，请勿修改' : `基于${dimension === 'frequency' ? '出入库频次' : dimension === 'turnover' ? '周转率' : '重量维度'}计算`,
      createdAt: new Date(2024, 0, 5 + v * 3),
      isLocked: v === 2,
      createdBy: '仓储规划师',
      locationHeats: Array.from(heatMap.entries()).map(([locationId, heatValue]) => ({
        locationId,
        heatValue,
        heatDimension: dimension,
      })),
    });
  }

  return versions;
};

export const mockHeatmapVersions = generateHeatmapVersions(
  mockLocations,
  mockInOutRecords,
  mockSkus
);

export const mockDataSources: DataSource[] = [
  {
    id: 'ds-001',
    fileName: '货架模型定义.json',
    type: 'rack',
    importTime: new Date('2024-01-01'),
    content: '包含A区立体货架的尺寸和结构定义',
  },
  {
    id: 'ds-002',
    fileName: '货位编号表.xlsx',
    type: 'location',
    importTime: new Date('2024-01-02'),
    content: '160个货位的编号规则和初始分配',
  },
  {
    id: 'ds-003',
    fileName: 'SKU主数据.csv',
    type: 'sku',
    importTime: new Date('2024-01-03'),
    content: '50种商品的基础信息',
  },
  {
    id: 'ds-004',
    fileName: '1月入库记录.xlsx',
    type: 'record',
    importTime: new Date('2024-01-10'),
    content: '80条入库记录',
  },
  {
    id: 'ds-005',
    fileName: '1月出库记录.xlsx',
    type: 'record',
    importTime: new Date('2024-01-15'),
    content: '75条出库记录（包含重复货位分配）',
  },
  {
    id: 'ds-006',
    fileName: '电商订单补录.csv',
    type: 'record',
    importTime: new Date('2024-01-20'),
    content: '45条补录记录',
  },
];

export const mockConflicts: Conflict[] = [
  {
    id: 'conf-001',
    type: 'duplicate',
    locationId: 'loc-L0-C0-R0',
    sourceIds: ['ds-004', 'ds-005'],
    description: '货位L0-C0-R0被同时分配给sku-001和sku-005，请检查1月入库单和出库单',
    resolved: false,
  },
  {
    id: 'conf-002',
    type: 'duplicate',
    locationId: 'loc-L1-C2-R1',
    sourceIds: ['ds-004', 'ds-006'],
    description: '货位L1-C2-R0被重复分配，电商补录单与入库单冲突',
    resolved: false,
  },
  {
    id: 'conf-003',
    type: 'duplicate',
    locationId: 'loc-L2-C5-R2',
    sourceIds: ['ds-005', 'ds-006'],
    description: '货位L2-C5-R2存在重复分配，出库单与补录单不一致',
    resolved: true,
  },
  {
    id: 'conf-004',
    type: 'mismatch',
    locationId: 'loc-L0-C1-R0',
    sourceIds: ['ds-002', 'ds-004'],
    description: '货位编号L0-C1-R0在入库记录中不存在，但在货位表中有定义',
    resolved: false,
  },
  {
    id: 'conf-005',
    type: 'mismatch',
    locationId: 'loc-L3-C7-R3',
    sourceIds: ['ds-004', 'ds-003'],
    description: '记录中的SKU sku-999在SKU主数据中不存在',
    resolved: false,
  },
  {
    id: 'conf-006',
    type: 'mismatch',
    locationId: 'loc-L4-C0-R0',
    sourceIds: ['ds-002', 'ds-001'],
    description: '货位L4-C0-R0超出货架模型定义的最大层数',
    resolved: true,
  },
  {
    id: 'conf-007',
    type: 'occlusion',
    locationId: 'loc-L2-C3-R0',
    sourceIds: ['ds-001'],
    description: '货位L2-C3-R0被前排货位遮挡，建议调整为低频商品',
    resolved: false,
  },
  {
    id: 'conf-008',
    type: 'occlusion',
    locationId: 'loc-L3-C2-R1',
    sourceIds: ['ds-001'],
    description: '货位L3-C2-R1存在高度遮挡，拣货效率较低',
    resolved: false,
  },
];

const generatePathNodes = (
  records: InOutRecord[],
  locations: Location[],
  skus: Sku[],
  rack: Rack
): PathNode[] => {
  const nodes: PathNode[] = [];
  const selectedRecords = records.slice(0, 20);

  selectedRecords.forEach((record, index) => {
    const location = locations.find((l) => l.id === record.locationId);
    const sku = skus.find((s) => s.id === record.skuId);

    if (location) {
      const x = (location.col - rack.columns / 2) * rack.cellWidth;
      const y = location.layer * rack.cellHeight;
      const z = (location.row - rack.rows / 2) * rack.cellDepth;

      nodes.push({
        id: `node-${index}`,
        recordId: record.id,
        locationId: location.id,
        position: [x, y, z],
        timestamp: record.timestamp,
        info: {
          skuName: sku?.name || '未知商品',
          operator: record.operator,
          action: record.type === 'in' ? '入库' : '出库',
        },
      });
    }
  });

  return nodes;
};

export const mockPathNodes = generatePathNodes(
  mockInOutRecords,
  mockLocations,
  mockSkus,
  mockRack
);
