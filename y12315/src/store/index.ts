import { create } from 'zustand';
import {
  Supplier,
  Criterion,
  ComparisonMatrix,
  Score,
  WeightModification,
  VersionHistory,
  FilterCriteria,
  RankingResult
} from '../types';
import {
  calculateRanking,
  createComparisonMatrix,
  updateMatrixValue
} from '../utils/ahp';

interface AppState {
  suppliers: Supplier[];
  criteria: Criterion[];
  criteriaMatrix: ComparisonMatrix | null;
  subMatrices: Map<string, ComparisonMatrix>;
  scores: Score[];
  weightModifications: WeightModification[];
  versionHistory: VersionHistory[];
  currentVersion: number;
  filterCriteria: FilterCriteria;
  rankings: RankingResult[];
  activeTab: 'suppliers' | 'criteria' | 'scoring' | 'ranking' | 'report';
  selectedSupplier: Supplier | null;
  showHistory: boolean;

  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  setSelectedSupplier: (supplier: Supplier | null) => void;

  setCriteria: (criteria: Criterion[]) => void;
  addCriterion: (criterion: Omit<Criterion, 'id'>) => void;
  updateCriterion: (id: string, criterion: Partial<Criterion>) => void;
  deleteCriterion: (id: string) => void;

  setCriteriaMatrix: (matrix: ComparisonMatrix) => void;
  updateCriteriaMatrix: (row: number, col: number, value: number) => void;
  setSubMatrix: (criterionId: string, matrix: ComparisonMatrix) => void;
  updateSubMatrix: (criterionId: string, row: number, col: number, value: number) => void;

  setScores: (scores: Score[]) => void;
  updateScore: (supplierId: string, criterionId: string, value: number, note?: string) => void;

  addWeightModification: (modification: Omit<WeightModification, 'id'>) => void;

  setFilterCriteria: (filter: FilterCriteria) => void;

  calculateRankings: () => void;
  saveVersion: (modifiedBy: string, changes: string[]) => void;
  setActiveTab: (tab: 'suppliers' | 'criteria' | 'scoring' | 'ranking' | 'report') => void;
  setShowHistory: (show: boolean) => void;

  loadSampleData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  suppliers: [],
  criteria: [],
  criteriaMatrix: null,
  subMatrices: new Map(),
  scores: [],
  weightModifications: [],
  versionHistory: [],
  currentVersion: 0,
  filterCriteria: {},
  rankings: [],
  activeTab: 'suppliers',
  selectedSupplier: null,
  showHistory: false,

  setSuppliers: (suppliers) => set({ suppliers }),
  addSupplier: (supplier) => set((state) => ({
    suppliers: [...state.suppliers, {
      ...supplier,
      id: `supplier-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]
  })),
  updateSupplier: (id, supplier) => set((state) => ({
    suppliers: state.suppliers.map(s =>
      s.id === id ? { ...s, ...supplier, updatedAt: new Date().toISOString() } : s
    )
  })),
  deleteSupplier: (id) => set((state) => ({
    suppliers: state.suppliers.filter(s => s.id !== id)
  })),
  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }),

  setCriteria: (criteria) => set({ criteria }),
  addCriterion: (criterion) => set((state) => ({
    criteria: [...state.criteria, { ...criterion, id: `criterion-${Date.now()}` }]
  })),
  updateCriterion: (id, criterion) => set((state) => ({
    criteria: state.criteria.map(c =>
      c.id === id ? { ...c, ...criterion } : c
    )
  })),
  deleteCriterion: (id) => set((state) => ({
    criteria: state.criteria.filter(c => c.id !== id)
  })),

  setCriteriaMatrix: (matrix) => set({ criteriaMatrix: matrix }),
  updateCriteriaMatrix: (row, col, value) => set((state) => {
    if (!state.criteriaMatrix) return state;
    return {
      criteriaMatrix: updateMatrixValue(state.criteriaMatrix, row, col, value)
    };
  }),
  setSubMatrix: (criterionId, matrix) => set((state) => {
    const newSubMatrices = new Map(state.subMatrices);
    newSubMatrices.set(criterionId, matrix);
    return { subMatrices: newSubMatrices };
  }),
  updateSubMatrix: (criterionId, row, col, value) => set((state) => {
    const subMatrix = state.subMatrices.get(criterionId);
    if (!subMatrix) return state;
    const newSubMatrices = new Map(state.subMatrices);
    newSubMatrices.set(criterionId, updateMatrixValue(subMatrix, row, col, value));
    return { subMatrices: newSubMatrices };
  }),

  setScores: (scores) => set({ scores }),
  updateScore: (supplierId, criterionId, value, note) => set((state) => {
    const existingIndex = state.scores.findIndex(
      s => s.supplierId === supplierId && s.criterionId === criterionId
    );
    if (existingIndex >= 0) {
      const newScores = [...state.scores];
      newScores[existingIndex] = {
        ...newScores[existingIndex],
        value,
        note: note ?? newScores[existingIndex].note
      };
      return { scores: newScores };
    }
    return {
      scores: [...state.scores, { supplierId, criterionId, value, note }]
    };
  }),

  addWeightModification: (modification) => set((state) => ({
    weightModifications: [...state.weightModifications, {
      ...modification,
      id: `mod-${Date.now()}`
    }]
  })),

  setFilterCriteria: (filter) => set({ filterCriteria: filter }),

  calculateRankings: () => set((state) => {
    if (!state.criteriaMatrix) return { rankings: [] };
    
    const { rankings } = calculateRanking(
      state.suppliers,
      state.criteria,
      state.scores,
      state.criteriaMatrix,
      state.subMatrices
    );
    
    return { rankings };
  }),

  saveVersion: (modifiedBy, changes) => set((state) => {
    const newVersion: VersionHistory = {
      id: `version-${Date.now()}`,
      version: state.currentVersion + 1,
      timestamp: new Date().toISOString(),
      modifiedBy,
      changes,
      rankings: [...state.rankings],
      matrices: [state.criteriaMatrix!, ...Array.from(state.subMatrices.values())]
    };
    return {
      versionHistory: [...state.versionHistory, newVersion],
      currentVersion: state.currentVersion + 1
    };
  }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowHistory: (show) => set({ showHistory: show }),

  loadSampleData: () => {
    const sampleSuppliers: Supplier[] = [
      {
        id: 'supplier-1',
        name: '华信科技有限公司',
        contact: '张经理',
        phone: '13800138001',
        email: 'zhang@huaxin.com',
        address: '北京市海淀区中关村大街1号',
        registeredCapital: '5000万',
        establishmentDate: '2015-03-15',
        businessScope: '电子设备、软件开发',
        qualificationLevel: '一级',
        riskNotes: '近期有诉讼记录，需关注履约能力',
        quotation: 1250000,
        quotationStatus: 'complete',
        sourceReference: '供应商资料库-编号SUP-001',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'supplier-2',
        name: '恒远实业集团',
        contact: '李总监',
        phone: '13900139002',
        email: 'li@hengyuan.com',
        address: '上海市浦东新区陆家嘴金融中心',
        registeredCapital: '2亿',
        establishmentDate: '2008-08-08',
        businessScope: '机械设备、工程安装',
        qualificationLevel: '特级',
        riskNotes: '资质良好，合作历史长',
        quotation: 980000,
        quotationStatus: 'complete',
        sourceReference: '供应商资料库-编号SUP-002',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-16T14:20:00Z'
      },
      {
        id: 'supplier-3',
        name: '盛达电子科技',
        contact: '王总',
        phone: '13700137003',
        email: 'wang@shengda.com',
        address: '深圳市南山区科技园',
        registeredCapital: '8000万',
        establishmentDate: '2012-06-20',
        businessScope: '电子元器件、智能制造',
        qualificationLevel: '二级',
        riskNotes: '报价缺失，需补充完整报价单',
        quotation: undefined,
        quotationStatus: 'missing',
        sourceReference: '供应商资料库-编号SUP-003',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-17T09:15:00Z'
      },
      {
        id: 'supplier-4',
        name: '鑫源制造有限公司',
        contact: '赵经理',
        phone: '13600136004',
        email: 'zhao@xinyuan.com',
        address: '广州市白云区工业园区',
        registeredCapital: '3000万',
        establishmentDate: '2018-11-30',
        businessScope: '精密制造、模具加工',
        qualificationLevel: '三级',
        riskNotes: '成立时间较短，业绩记录有限',
        quotation: 1150000,
        quotationStatus: 'partial',
        sourceReference: '供应商资料库-编号SUP-004',
        createdAt: '2024-01-04T00:00:00Z',
        updatedAt: '2024-01-18T16:45:00Z'
      }
    ];

    const sampleCriteria: Criterion[] = [
      { id: 'criterion-1', name: '价格成本', description: '报价合理性、性价比', weight: 0.35, isManuallyModified: true, modifiedBy: '评审组', modifiedAt: '2024-01-20T10:00:00Z', modificationReason: '根据项目预算调整', originalWeight: 0.30 },
      { id: 'criterion-2', name: '技术能力', description: '技术水平、研发能力' },
      { id: 'criterion-3', name: '质量管控', description: '质量管理体系、产品合格率' },
      { id: 'criterion-4', name: '交付能力', description: '交货周期、履约记录' },
      { id: 'criterion-5', name: '企业资质', description: '资质等级、注册资本' },
      { id: 'criterion-2-1', name: '技术团队', description: '技术人员占比、核心团队经验', parentId: 'criterion-2' },
      { id: 'criterion-2-2', name: '研发投入', description: '研发费用占比、专利数量', parentId: 'criterion-2' },
      { id: 'criterion-3-1', name: '质量体系', description: 'ISO认证、质量管理制度', parentId: 'criterion-3' },
      { id: 'criterion-3-2', name: '产品合格率', description: '历史交付产品合格率', parentId: 'criterion-3' }
    ];

    const rootCriteriaIds = ['criterion-1', 'criterion-2', 'criterion-3', 'criterion-4', 'criterion-5'];
    const criteriaMatrixData = createComparisonMatrix(rootCriteriaIds, '一级指标对比矩阵');
    criteriaMatrixData.matrix = [
      [1, 2, 1/2, 3, 4],
      [1/2, 1, 1/3, 2, 3],
      [2, 3, 1, 4, 5],
      [1/3, 1/2, 1/4, 1, 2],
      [1/4, 1/3, 1/5, 1/2, 1]
    ];
    criteriaMatrixData.consistencyRatio = 0.085;
    criteriaMatrixData.isConsistent = true;
    criteriaMatrixData.weights = [0.32, 0.18, 0.35, 0.10, 0.05];

    const techSubIds = ['criterion-2-1', 'criterion-2-2'];
    const techMatrix = createComparisonMatrix(techSubIds, '技术能力子矩阵', 'criterion-2');
    techMatrix.matrix = [
      [1, 3],
      [1/3, 1]
    ];
    techMatrix.weights = [0.75, 0.25];
    techMatrix.consistencyRatio = 0;
    techMatrix.isConsistent = true;

    const qualitySubIds = ['criterion-3-1', 'criterion-3-2'];
    const qualityMatrix = createComparisonMatrix(qualitySubIds, '质量管控子矩阵', 'criterion-3');
    qualityMatrix.matrix = [
      [1, 1/2],
      [2, 1]
    ];
    qualityMatrix.weights = [0.333, 0.667];
    qualityMatrix.consistencyRatio = 0;
    qualityMatrix.isConsistent = true;

    const subMatricesMap = new Map<string, ComparisonMatrix>();
    subMatricesMap.set('criterion-2', techMatrix);
    subMatricesMap.set('criterion-3', qualityMatrix);

    const sampleScores: Score[] = [
      { supplierId: 'supplier-1', criterionId: 'criterion-1', value: 0.85, note: '报价偏高但包含增值服务', sourceReference: '报价单-编号QUO-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-1', value: 0.95, note: '价格优势明显', sourceReference: '报价单-编号QUO-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-1', value: 0, note: '报价缺失', sourceReference: '' },
      { supplierId: 'supplier-4', criterionId: 'criterion-1', value: 0.88, note: '报价合理', sourceReference: '报价单-编号QUO-004' },
      
      { supplierId: 'supplier-1', criterionId: 'criterion-2-1', value: 0.90, sourceReference: '技术评估报告-T-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-2-1', value: 0.85, sourceReference: '技术评估报告-T-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-2-1', value: 0.92, sourceReference: '技术评估报告-T-003' },
      { supplierId: 'supplier-4', criterionId: 'criterion-2-1', value: 0.78, sourceReference: '技术评估报告-T-004' },
      
      { supplierId: 'supplier-1', criterionId: 'criterion-2-2', value: 0.80, sourceReference: '技术评估报告-T-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-2-2', value: 0.88, sourceReference: '技术评估报告-T-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-2-2', value: 0.85, sourceReference: '技术评估报告-T-003' },
      { supplierId: 'supplier-4', criterionId: 'criterion-2-2', value: 0.70, sourceReference: '技术评估报告-T-004' },
      
      { supplierId: 'supplier-1', criterionId: 'criterion-3-1', value: 0.95, sourceReference: '质量认证-Q-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-3-1', value: 1.0, sourceReference: '质量认证-Q-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-3-1', value: 0.88, sourceReference: '质量认证-Q-003' },
      { supplierId: 'supplier-4', criterionId: 'criterion-3-1', value: 0.82, sourceReference: '质量认证-Q-004' },
      
      { supplierId: 'supplier-1', criterionId: 'criterion-3-2', value: 0.92, sourceReference: '质量报告-QR-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-3-2', value: 0.96, sourceReference: '质量报告-QR-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-3-2', value: 0.90, sourceReference: '质量报告-QR-003' },
      { supplierId: 'supplier-4', criterionId: 'criterion-3-2', value: 0.85, sourceReference: '质量报告-QR-004' },
      
      { supplierId: 'supplier-1', criterionId: 'criterion-4', value: 0.88, sourceReference: '交付记录-D-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-4', value: 0.94, sourceReference: '交付记录-D-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-4', value: 0.82, sourceReference: '交付记录-D-003' },
      { supplierId: 'supplier-4', criterionId: 'criterion-4', value: 0.75, sourceReference: '交付记录-D-004' },
      
      { supplierId: 'supplier-1', criterionId: 'criterion-5', value: 0.75, sourceReference: '资质文件-Z-001' },
      { supplierId: 'supplier-2', criterionId: 'criterion-5', value: 1.0, sourceReference: '资质文件-Z-002' },
      { supplierId: 'supplier-3', criterionId: 'criterion-5', value: 0.85, sourceReference: '资质文件-Z-003' },
      { supplierId: 'supplier-4', criterionId: 'criterion-5', value: 0.65, sourceReference: '资质文件-Z-004' }
    ];

    const weightMods: WeightModification[] = [
      {
        id: 'mod-1',
        criterionId: 'criterion-1',
        criterionName: '价格成本',
        originalWeight: 0.30,
        newWeight: 0.35,
        modifiedBy: '评审组',
        modifiedAt: '2024-01-20T10:00:00Z',
        reason: '根据项目预算调整，成本因素权重提升5%',
        impactOnRanking: [
          { supplierId: 'supplier-2', supplierName: '恒远实业集团', originalRank: 2, newRank: 1, scoreChange: 0.025 },
          { supplierId: 'supplier-1', supplierName: '华信科技有限公司', originalRank: 1, newRank: 2, scoreChange: -0.015 }
        ]
      }
    ];

    set({
      suppliers: sampleSuppliers,
      criteria: sampleCriteria,
      criteriaMatrix: criteriaMatrixData,
      subMatrices: subMatricesMap,
      scores: sampleScores,
      weightModifications: weightMods
    });

    setTimeout(() => {
      get().calculateRankings();
    }, 100);
  }
}));
