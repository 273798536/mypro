/**
 * 重复结论检测服务
 * 功能：基于物种+批号+采样地点+时间窗口的重复检测、重复合并
 */

// ============= 类型定义 =============

/** 待去重的检测记录 */
export interface DeduplicateRecord {
  /** 记录唯一ID */
  id: string;
  /** 原始行号（导入时的行号） */
  originalRowNumber?: number;
  /** 物种编码（标准化后） */
  speciesCode: string;
  /** 物种名称（原始） */
  speciesName: string;
  /** 批号 */
  batchNumber: string;
  /** 采样地点 */
  samplingLocation: string;
  /** 采样时间（ISO字符串） */
  samplingTime: string;
  /** 检测结论 */
  conclusion: string;
  /** 检测结果明细 */
  testResults?: Record<string, unknown>;
  /** 数据来源 */
  dataSource?: string;
  /** 导入批次ID */
  importBatchId?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 其他扩展字段 */
  [key: string]: unknown;
}

/** 时间窗口配置 */
export interface TimeWindowConfig {
  /** 时间窗口单位 */
  unit: 'minute' | 'hour' | 'day' | 'week' | 'month';
  /** 窗口大小 */
  value: number;
}

/** 匹配权重配置 */
export interface MatchWeights {
  /** 物种权重 */
  species: number;
  /** 批号权重 */
  batchNumber: number;
  /** 采样地点权重 */
  samplingLocation: number;
  /** 采样时间权重 */
  samplingTime: number;
  /** 检测结论权重 */
  conclusion: number;
}

/** 去重检测配置 */
export interface DeduplicateConfig {
  /** 匹配权重 */
  weights: MatchWeights;
  /** 时间窗口（采样时间在此窗口内视为可能重复） */
  timeWindow: TimeWindowConfig;
  /** 判定为重复的相似度阈值（0-100） */
  duplicateThreshold: number;
  /** 判定为疑似重复的相似度阈值（0-100），低于此值不纳入候选 */
  suspectThreshold: number;
  /** 是否启用模糊匹配（批号、地点等字段） */
  enableFuzzyMatch: boolean;
  /** 模糊匹配相似度阈值（0-1） */
  fuzzyMatchThreshold: number;
}

/** 重复组 */
export interface DuplicateGroup {
  /** 重复组ID */
  groupId: string;
  /** 组内记录数 */
  count: number;
  /** 重复相似度（组内两两最小相似度） */
  minSimilarity: number;
  /** 重复相似度（组内两两最大相似度） */
  maxSimilarity: number;
  /** 组内记录列表（按推荐保留顺序，第一条是建议保留的主记录） */
  records: DuplicateRecordItem[];
  /** 重复类型 */
  duplicateType: DuplicateType;
  /** 检测到重复的匹配字段 */
  matchedFields: string[];
}

/** 重复类型 */
export type DuplicateType =
  | 'exact'        // 完全重复：所有关键字段完全一致
  | 'near_duplicate' // 近重复：关键字段高度相似
  | 'temporal'     // 时间重复：同一批次在短时间内多次检测
  | 'cross_source'; // 跨源重复：来自不同数据源的相同记录

/** 重复记录项 */
export interface DuplicateRecordItem {
  /** 记录数据 */
  record: DeduplicateRecord;
  /** 在组内的相似度（与主记录的相似度） */
  similarity: number;
  /** 是否推荐保留 */
  recommendedToKeep: boolean;
  /** 保留/删除理由 */
  reason?: string;
  /** 与其他记录的匹配字段详情 */
  matchDetails: FieldMatchDetail[];
  /** 数据完整度评分（0-100） */
  completenessScore: number;
}

/** 字段匹配详情 */
export interface FieldMatchDetail {
  /** 字段名 */
  field: string;
  /** 是否匹配 */
  matched: boolean;
  /** 相似度 0-1 */
  similarity: number;
  /** 记录1的值 */
  value1: unknown;
  /** 记录2的值 */
  value2: unknown;
}

/** 去重检测结果 */
export interface DeduplicateResult {
  /** 总记录数 */
  totalRecords: number;
  /** 检测到的重复组数 */
  duplicateGroupCount: number;
  /** 涉及的重复记录数 */
  duplicateRecordCount: number;
  /** 完全重复组数 */
  exactDuplicateGroups: number;
  /** 近重复组数 */
  nearDuplicateGroups: number;
  /** 重复组列表 */
  groups: DuplicateGroup[];
  /** 两两重复匹配对（用于详情展示） */
  pairs: DuplicatePair[];
  /** 统计信息 */
  statistics: DeduplicateStatistics;
}

/** 两两重复对 */
export interface DuplicatePair {
  /** 配对ID */
  pairId: string;
  /** 记录1 ID */
  recordId1: string;
  /** 记录2 ID */
  recordId2: string;
  /** 总体相似度 0-100 */
  similarity: number;
  /** 重复类型 */
  duplicateType: DuplicateType;
  /** 字段级匹配详情 */
  fieldMatches: FieldMatchDetail[];
  /** 是否在同一时间窗口内 */
  withinTimeWindow: boolean;
  /** 时间差（毫秒） */
  timeDiffMs: number;
}

/** 去重统计信息 */
export interface DeduplicateStatistics {
  /** 按重复类型分布 */
  byType: Record<DuplicateType, number>;
  /** 按相似度区间分布 */
  bySimilarityRange: Array<{ range: string; count: number }>;
  /** 节省存储空间（估算，基于平均记录大小） */
  estimatedSavingRecords: number;
  /** 预估节省比例 */
  estimatedSavingRatio: number;
}

/** 合并操作配置 */
export interface MergeConfig {
  /** 合并策略 */
  strategy: 'keep_most_complete' | 'keep_newest' | 'keep_oldest' | 'manual';
  /** 对于非空字段，是否采用补充合并 */
  mergeMissingFields: boolean;
  /** 冲突字段的处理方式 */
  conflictResolution: 'use_primary' | 'use_newest' | 'keep_both' | 'manual';
  /** 标记被合并记录的状态 */
  markMergedStatus: boolean;
}

/** 合并结果 */
export interface MergeResult {
  /** 是否成功 */
  success: boolean;
  /** 合并后的主记录 */
  mergedRecord: DeduplicateRecord;
  /** 被合并的记录ID列表 */
  mergedRecordIds: string[];
  /** 合并操作详情 */
  mergeDetails: Array<{
    field: string;
    /** 最终采用的值来源：primary表示主记录，merged表示从被合并记录补充，merged_* 表示具体来源ID */
    valueSource: 'primary' | `merged_${string}` | 'combined';
    oldValue: unknown;
    newValue: unknown;
    isConflict: boolean;
  }>;
  /** 操作时间 */
  mergeTime: string;
  /** 错误信息 */
  errorMessage?: string;
}

// ============= Mock 数据 =============

/** 默认去重配置 */
const DEFAULT_CONFIG: DeduplicateConfig = {
  weights: {
    species: 30,
    batchNumber: 30,
    samplingLocation: 20,
    samplingTime: 10,
    conclusion: 10
  },
  timeWindow: { unit: 'day', value: 7 },
  duplicateThreshold: 85,
  suspectThreshold: 60,
  enableFuzzyMatch: true,
  fuzzyMatchThreshold: 0.8
};

/** Mock检测记录数据 */
const MOCK_RECORDS: DeduplicateRecord[] = [
  {
    id: 'REC-001',
    originalRowNumber: 1,
    speciesCode: 'SP-001',
    speciesName: '大肠埃希氏菌',
    batchNumber: 'B2026-001',
    samplingLocation: '北京-实验室A',
    samplingTime: '2026-03-01T10:00:00Z',
    conclusion: '合格',
    testResults: { colonyCount: 120, pH: 7.2 },
    dataSource: '进口数据1',
    importBatchId: 'IMP-2026-03',
    createdAt: '2026-03-01T14:00:00Z'
  },
  {
    id: 'REC-002',
    originalRowNumber: 2,
    speciesCode: 'SP-001',
    speciesName: '大肠杆菌',
    batchNumber: 'B2026-001',
    samplingLocation: '北京-实验室A',
    samplingTime: '2026-03-01T10:05:00Z',
    conclusion: '合格',
    testResults: { colonyCount: 125 },
    dataSource: '进口数据1',
    importBatchId: 'IMP-2026-03',
    createdAt: '2026-03-01T14:05:00Z'
  },
  {
    id: 'REC-003',
    originalRowNumber: 3,
    speciesCode: 'SP-001',
    speciesName: 'E. coli',
    batchNumber: 'B2026-001',
    samplingLocation: '北京实验室A',
    samplingTime: '2026-03-02T09:30:00Z',
    conclusion: '合格',
    dataSource: '进口数据2',
    importBatchId: 'IMP-2026-03-v2',
    createdAt: '2026-03-05T11:00:00Z'
  },
  {
    id: 'REC-004',
    originalRowNumber: 4,
    speciesCode: 'SP-002',
    speciesName: '金黄色葡萄球菌',
    batchNumber: 'B2026-002',
    samplingLocation: '上海-实验室B',
    samplingTime: '2026-03-05T14:00:00Z',
    conclusion: '合格',
    testResults: { colonyCount: 80, temperature: 36.5 },
    dataSource: '进口数据1',
    importBatchId: 'IMP-2026-03',
    createdAt: '2026-03-05T18:00:00Z'
  },
  {
    id: 'REC-005',
    originalRowNumber: 5,
    speciesCode: 'SP-002',
    speciesName: '金葡菌',
    batchNumber: 'B2026-002',
    samplingLocation: '上海实验室B',
    samplingTime: '2026-03-05T14:10:00Z',
    conclusion: '合格',
    testResults: { colonyCount: 78 },
    dataSource: '进口数据3',
    importBatchId: 'IMP-2026-03-v3',
    createdAt: '2026-03-06T09:00:00Z'
  },
  {
    id: 'REC-006',
    originalRowNumber: 6,
    speciesCode: 'SP-003',
    speciesName: '枯草芽孢杆菌',
    batchNumber: 'B2026-003',
    samplingLocation: '广州-实验室C',
    samplingTime: '2026-03-10T08:00:00Z',
    conclusion: '不合格',
    testResults: { colonyCount: 1500, contamination: 'heavy' },
    dataSource: '进口数据1',
    importBatchId: 'IMP-2026-03',
    createdAt: '2026-03-10T12:00:00Z'
  },
  {
    id: 'REC-007',
    originalRowNumber: 7,
    speciesCode: 'SP-004',
    speciesName: '铜绿假单胞菌',
    batchNumber: 'B2026-004',
    samplingLocation: '深圳-实验室D',
    samplingTime: '2026-03-12T15:30:00Z',
    conclusion: '合格',
    dataSource: '进口数据1',
    importBatchId: 'IMP-2026-03',
    createdAt: '2026-03-12T19:00:00Z'
  },
  {
    id: 'REC-008',
    originalRowNumber: 8,
    speciesCode: 'SP-003',
    speciesName: '枯草杆菌',
    batchNumber: 'B2026-003',
    samplingLocation: '广州实验室C',
    samplingTime: '2026-03-11T16:00:00Z',
    conclusion: '不合格',
    dataSource: '进口数据4',
    importBatchId: 'IMP-2026-03-v4',
    createdAt: '2026-03-15T10:00:00Z'
  },
  {
    id: 'REC-009',
    originalRowNumber: 9,
    speciesCode: 'SP-005',
    speciesName: '白色念珠菌',
    batchNumber: 'B2026-005',
    samplingLocation: '杭州-实验室E',
    samplingTime: '2026-03-18T11:00:00Z',
    conclusion: '合格',
    testResults: { colonyCount: 200, humidity: 55 },
    dataSource: '进口数据1',
    importBatchId: 'IMP-2026-03',
    createdAt: '2026-03-18T15:00:00Z'
  },
  {
    id: 'REC-010',
    originalRowNumber: 10,
    speciesCode: 'SP-005',
    speciesName: '白假丝酵母菌',
    batchNumber: 'B2026-005',
    samplingLocation: '杭州实验室E',
    samplingTime: '2026-03-18T11:30:00Z',
    conclusion: '合格',
    testResults: { colonyCount: 195, humidity: 54, temperature: 25 },
    dataSource: '进口数据5',
    importBatchId: 'IMP-2026-03-v5',
    createdAt: '2026-03-20T08:00:00Z'
  }
];

// ============= 核心服务 =============

/**
 * 重复结论检测服务类
 */
export class DeduplicateService {
  private config: DeduplicateConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * 更新去重配置
   */
  updateConfig(config: Partial<DeduplicateConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      weights: { ...this.config.weights, ...config.weights },
      timeWindow: { ...this.config.timeWindow, ...config.timeWindow }
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): DeduplicateConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 执行重复检测
   */
  detectDuplicates(records: DeduplicateRecord[], config?: Partial<DeduplicateConfig>): DeduplicateResult {
    const effectiveConfig = {
      ...this.config,
      ...config,
      weights: { ...this.config.weights, ...config?.weights },
      timeWindow: { ...this.config.timeWindow, ...config?.timeWindow }
    };

    const pairs: DuplicatePair[] = [];
    const n = records.length;

    // 两两比较
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const pair = this.comparePair(records[i], records[j], effectiveConfig);
        if (pair && pair.similarity >= effectiveConfig.suspectThreshold) {
          pairs.push(pair);
        }
      }
    }

    // 构建重复组
    const groups = this.buildDuplicateGroups(records, pairs, effectiveConfig);

    // 生成统计信息
    const statistics = this.calculateStatistics(records, pairs, groups);

    return {
      totalRecords: records.length,
      duplicateGroupCount: groups.length,
      duplicateRecordCount: groups.reduce((sum, g) => sum + g.records.length, 0),
      exactDuplicateGroups: groups.filter(g => g.duplicateType === 'exact').length,
      nearDuplicateGroups: groups.filter(g => g.duplicateType === 'near_duplicate').length,
      groups,
      pairs: pairs.filter(p => p.similarity >= effectiveConfig.duplicateThreshold),
      statistics
    };
  }

  /**
   * 使用Mock数据执行去重检测（便于演示）
   */
  detectDuplicatesWithMockData(): DeduplicateResult {
    return this.detectDuplicates(MOCK_RECORDS);
  }

  /**
   * 比较两条记录
   */
  private comparePair(
    r1: DeduplicateRecord,
    r2: DeduplicateRecord,
    config: DeduplicateConfig
  ): DuplicatePair | null {
    const fieldMatches: FieldMatchDetail[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // 物种比较（基于物种编码精确匹配）
    const speciesMatch = r1.speciesCode === r2.speciesCode;
    const speciesSim = speciesMatch ? 1 : this.fuzzyCompare(r1.speciesName, r2.speciesName);
    fieldMatches.push({
      field: 'species',
      matched: speciesSim >= config.fuzzyMatchThreshold,
      similarity: speciesSim,
      value1: r1.speciesName,
      value2: r2.speciesName
    });
    totalWeight += config.weights.species;
    weightedScore += speciesSim * config.weights.species;

    // 批号比较
    const batchSim = this.fuzzyCompare(r1.batchNumber, r2.batchNumber);
    fieldMatches.push({
      field: 'batchNumber',
      matched: batchSim >= config.fuzzyMatchThreshold,
      similarity: batchSim,
      value1: r1.batchNumber,
      value2: r2.batchNumber
    });
    totalWeight += config.weights.batchNumber;
    weightedScore += batchSim * config.weights.batchNumber;

    // 采样地点比较
    const locationSim = this.fuzzyCompare(
      this.normalizeLocation(r1.samplingLocation),
      this.normalizeLocation(r2.samplingLocation)
    );
    fieldMatches.push({
      field: 'samplingLocation',
      matched: locationSim >= config.fuzzyMatchThreshold,
      similarity: locationSim,
      value1: r1.samplingLocation,
      value2: r2.samplingLocation
    });
    totalWeight += config.weights.samplingLocation;
    weightedScore += locationSim * config.weights.samplingLocation;

    // 时间比较
    const t1 = new Date(r1.samplingTime).getTime();
    const t2 = new Date(r2.samplingTime).getTime();
    const timeDiffMs = Math.abs(t1 - t2);
    const windowMs = this.timeWindowToMs(config.timeWindow);
    const withinTimeWindow = timeDiffMs <= windowMs;
    const timeSim = withinTimeWindow ? Math.max(0, 1 - timeDiffMs / windowMs) : 0;
    fieldMatches.push({
      field: 'samplingTime',
      matched: withinTimeWindow,
      similarity: timeSim,
      value1: r1.samplingTime,
      value2: r2.samplingTime
    });
    totalWeight += config.weights.samplingTime;
    weightedScore += timeSim * config.weights.samplingTime;

    // 结论比较
    const conclusionSim = this.fuzzyCompare(r1.conclusion, r2.conclusion);
    fieldMatches.push({
      field: 'conclusion',
      matched: conclusionSim >= config.fuzzyMatchThreshold,
      similarity: conclusionSim,
      value1: r1.conclusion,
      value2: r2.conclusion
    });
    totalWeight += config.weights.conclusion;
    weightedScore += conclusionSim * config.weights.conclusion;

    // 计算综合相似度（百分制）
    const similarity = Math.round((weightedScore / Math.max(1, totalWeight)) * 100);

    // 判断重复类型
    let duplicateType: DuplicateType;
    const exactMatchedFields = fieldMatches.filter(f => f.similarity === 1).length;
    if (exactMatchedFields === fieldMatches.length) {
      duplicateType = 'exact';
    } else if (r1.dataSource !== r2.dataSource && r1.importBatchId !== r2.importBatchId) {
      duplicateType = 'cross_source';
    } else if (withinTimeWindow && batchSim >= 0.9 && speciesSim >= 0.9) {
      duplicateType = 'temporal';
    } else {
      duplicateType = 'near_duplicate';
    }

    return {
      pairId: `PAIR-${r1.id}-${r2.id}`,
      recordId1: r1.id,
      recordId2: r2.id,
      similarity,
      duplicateType,
      fieldMatches,
      withinTimeWindow,
      timeDiffMs
    };
  }

  /**
   * 构建重复组
   */
  private buildDuplicateGroups(
    records: DeduplicateRecord[],
    pairs: DuplicatePair[],
    config: DeduplicateConfig
  ): DuplicateGroup[] {
    const duplicatePairs = pairs.filter(p => p.similarity >= config.duplicateThreshold);
    if (duplicatePairs.length === 0) return [];

    // 使用并查集构建组
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
      return parent.get(x)!;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(rb, ra);
    };

    // 初始化
    records.forEach(r => find(r.id));

    // 合并
    for (const pair of duplicatePairs) {
      union(pair.recordId1, pair.recordId2);
    }

    // 收集组
    const groupMap = new Map<string, string[]>();
    for (const record of records) {
      const root = find(record.id);
      if (!groupMap.has(root)) groupMap.set(root, []);
      groupMap.get(root)!.push(record.id);
    }

    // 转换为DuplicateGroup
    const groups: DuplicateGroup[] = [];
    let groupIndex = 0;
    for (const [, memberIds] of groupMap) {
      if (memberIds.length < 2) continue;

      const memberRecords = memberIds
        .map(id => records.find(r => r.id === id)!)
        .filter(Boolean);

      // 计算组内两两相似度
      const sims: number[] = [];
      const matchedFieldsSet = new Set<string>();
      let groupType: DuplicateType = 'near_duplicate';
      let hasExact = true;

      for (let i = 0; i < memberRecords.length; i++) {
        for (let j = i + 1; j < memberRecords.length; j++) {
          const pair = duplicatePairs.find(
            p =>
              (p.recordId1 === memberRecords[i].id && p.recordId2 === memberRecords[j].id) ||
              (p.recordId1 === memberRecords[j].id && p.recordId2 === memberRecords[i].id)
          );
          if (pair) {
            sims.push(pair.similarity);
            pair.fieldMatches.filter(f => f.matched).forEach(f => matchedFieldsSet.add(f.field));
            if (pair.duplicateType === 'exact') {
              // 保持exact
            } else if (pair.duplicateType === 'cross_source') {
              groupType = 'cross_source';
              hasExact = false;
            } else if (pair.duplicateType === 'temporal' && hasExact) {
              groupType = 'temporal';
              hasExact = false;
            } else if (hasExact) {
              groupType = 'near_duplicate';
              hasExact = false;
            }
          }
        }
      }

      if (hasExact && sims.every(s => s === 100)) {
        groupType = 'exact';
      }

      // 计算完整度评分，排序确定主记录
      const items = memberRecords.map(r => {
        const score = this.calculateCompletenessScore(r);
        // 找与组内相似度最高的平均作为相似度
        const relatedSims = sims; // 简化处理
        return {
          record: r,
          similarity: relatedSims.length > 0 ? Math.min(...relatedSims) : 100,
          completenessScore: score,
          matchDetails: [] as FieldMatchDetail[]
        };
      }).sort((a, b) => {
        // 完整度优先，其次是创建时间更新者优先
        if (b.completenessScore !== a.completenessScore) {
          return b.completenessScore - a.completenessScore;
        }
        return new Date(b.record.createdAt || b.record.samplingTime).getTime() -
               new Date(a.record.createdAt || a.record.samplingTime).getTime();
      });

      // 标记推荐保留
      const duplicateItems: DuplicateRecordItem[] = items.map((item, idx) => ({
        ...item,
        recommendedToKeep: idx === 0,
        reason: idx === 0
          ? '数据完整度最高，作为主记录保留'
          : `与主记录相似度${item.similarity}%，建议合并或删除`
      }));

      groups.push({
        groupId: `DUP-GROUP-${String(groupIndex++).padStart(4, '0')}`,
        count: duplicateItems.length,
        minSimilarity: sims.length > 0 ? Math.min(...sims) : 100,
        maxSimilarity: sims.length > 0 ? Math.max(...sims) : 100,
        records: duplicateItems,
        duplicateType: groupType,
        matchedFields: Array.from(matchedFieldsSet)
      });
    }

    // 按组大小降序
    return groups.sort((a, b) => b.count - a.count);
  }

  /**
   * 合并重复组
   */
  mergeDuplicateGroup(
    group: DuplicateGroup,
    config: Partial<MergeConfig> = {}
  ): MergeResult {
    const defaultMergeConfig: MergeConfig = {
      strategy: 'keep_most_complete',
      mergeMissingFields: true,
      conflictResolution: 'use_primary',
      markMergedStatus: true
    };
    const effectiveConfig = { ...defaultMergeConfig, ...config };

    if (group.records.length < 2) {
      return {
        success: false,
        mergedRecord: group.records[0]?.record || {} as DeduplicateRecord,
        mergedRecordIds: [],
        mergeDetails: [],
        mergeTime: new Date().toISOString(),
        errorMessage: '组内记录数不足2条，无需合并'
      };
    }

    // 确定主记录
    let primaryIndex = 0;
    switch (effectiveConfig.strategy) {
      case 'keep_newest':
        primaryIndex = group.records
          .map((item, idx) => ({
            idx,
            time: new Date(item.record.createdAt || item.record.samplingTime).getTime()
          }))
          .sort((a, b) => b.time - a.time)[0].idx;
        break;
      case 'keep_oldest':
        primaryIndex = group.records
          .map((item, idx) => ({
            idx,
            time: new Date(item.record.createdAt || item.record.samplingTime).getTime()
          }))
          .sort((a, b) => a.time - b.time)[0].idx;
        break;
      case 'keep_most_complete':
      default:
        primaryIndex = 0; // 已经按完整度排过序
        break;
    }

    const primaryRecord = { ...group.records[primaryIndex].record };
    const toMerge = group.records.filter((_, i) => i !== primaryIndex);
    const mergeDetails: MergeResult['mergeDetails'] = [];
    const mergedRecordIds = toMerge.map(i => i.record.id);

    // 要检查的字段列表
    const fieldsToCheck: (keyof DeduplicateRecord)[] = [
      'speciesName', 'batchNumber', 'samplingLocation', 'samplingTime',
      'conclusion', 'testResults', 'dataSource', 'importBatchId'
    ];

    // 合并逻辑
    for (const field of fieldsToCheck) {
      const primaryValue = primaryRecord[field];
      const isEmpty = (v: unknown) =>
        v === undefined || v === null || v === '' ||
        (typeof v === 'object' && Object.keys(v).length === 0);

      if (effectiveConfig.mergeMissingFields && isEmpty(primaryValue)) {
        // 从被合并记录中找第一个非空值
        for (const item of toMerge) {
          const mergeValue = item.record[field];
          if (!isEmpty(mergeValue)) {
            const oldVal = primaryValue;
            (primaryRecord as Record<string, unknown>)[field] = mergeValue;
            mergeDetails.push({
              field: field as string,
              valueSource: `merged_${item.record.id}`,
              oldValue: oldVal,
              newValue: mergeValue,
              isConflict: false
            });
            break;
          }
        }
      } else if (!isEmpty(primaryValue) && effectiveConfig.conflictResolution !== 'use_primary') {
        // 处理冲突字段
        for (const item of toMerge) {
          const mergeValue = item.record[field];
          if (!isEmpty(mergeValue) && JSON.stringify(mergeValue) !== JSON.stringify(primaryValue)) {
            if (effectiveConfig.conflictResolution === 'use_newest') {
              const primaryTime = new Date(primaryRecord.createdAt || primaryRecord.samplingTime).getTime();
              const mergeTime = new Date(item.record.createdAt || item.record.samplingTime).getTime();
              if (mergeTime > primaryTime) {
                const oldVal = primaryValue;
                (primaryRecord as Record<string, unknown>)[field] = mergeValue;
                mergeDetails.push({
                  field: field as string,
                  valueSource: `merged_${item.record.id}`,
                  oldValue: oldVal,
                  newValue: mergeValue,
                  isConflict: true
                });
              }
            } else if (effectiveConfig.conflictResolution === 'keep_both') {
              // 合并到数组或对象
              const combined = this.combineValues(primaryValue, mergeValue);
              if (combined) {
                const oldVal = primaryValue;
                (primaryRecord as Record<string, unknown>)[field] = combined;
                mergeDetails.push({
                  field: field as string,
                  valueSource: 'combined',
                  oldValue: oldVal,
                  newValue: combined,
                  isConflict: true
                });
              }
            }
            break;
          }
        }
      }
    }

    // 合并testResults详情
    const combinedTestResults: Record<string, unknown> = {
      ...(primaryRecord.testResults || {})
    };
    let testResultsUpdated = false;
    for (const item of toMerge) {
      if (item.record.testResults) {
        for (const [key, value] of Object.entries(item.record.testResults)) {
          if (!(key in combinedTestResults) && value !== undefined && value !== null) {
            combinedTestResults[key] = value;
            testResultsUpdated = true;
            mergeDetails.push({
              field: `testResults.${key}`,
              valueSource: `merged_${item.record.id}`,
              oldValue: undefined,
              newValue: value,
              isConflict: false
            });
          }
        }
      }
    }
    if (testResultsUpdated) {
      primaryRecord.testResults = combinedTestResults;
    }

    return {
      success: true,
      mergedRecord: primaryRecord,
      mergedRecordIds,
      mergeDetails,
      mergeTime: new Date().toISOString()
    };
  }

  /**
   * 批量合并所有重复组
   */
  mergeAllDuplicateGroups(
    result: DeduplicateResult,
    config?: Partial<MergeConfig>
  ): {
    successCount: number;
    failedCount: number;
    results: Array<{ groupId: string; result: MergeResult }>;
    finalRecords: DeduplicateRecord[];
  } {
    const mergedIds = new Set<string>();
    const finalRecords: DeduplicateRecord[] = [];
    const results: Array<{ groupId: string; result: MergeResult }> = [];
    let successCount = 0;
    let failedCount = 0;

    // 先处理重复组
    for (const group of result.groups) {
      const mergeResult = this.mergeDuplicateGroup(group, config);
      results.push({ groupId: group.groupId, result: mergeResult });
      if (mergeResult.success) {
        successCount++;
        finalRecords.push(mergeResult.mergedRecord);
        mergeResult.mergedRecordIds.forEach(id => mergedIds.add(id));
        mergedIds.add(mergeResult.mergedRecord.id);
      } else {
        failedCount++;
        // 失败则保留组内第一条
        if (group.records[0]) {
          finalRecords.push(group.records[0].record);
          group.records.forEach(r => mergedIds.add(r.record.id));
        }
      }
    }

    // 最后添加未被合并的记录
    // (此处简化：实际需要传入原始records)

    return { successCount, failedCount, results, finalRecords };
  }

  // ========= 工具方法 =========

  /**
   * 计算字符串模糊相似度（Levenshtein-based）
   */
  private fuzzyCompare(str1: string, str2: string): number {
    if (!str1 && !str2) return 1;
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        matrix[i][j] = s2[i - 1] === s1[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
      }
    }
    const distance = matrix[s2.length][s1.length];
    return 1 - distance / Math.max(s1.length, s2.length);
  }

  /**
   * 标准化地点名称（去除分隔符差异）
   */
  private normalizeLocation(location: string): string {
    return location
      .replace(/[-_\s]+/g, '')
      .replace(/实验室/g, 'Lab')
      .toLowerCase();
  }

  /**
   * 时间窗口转换为毫秒
   */
  private timeWindowToMs(window: TimeWindowConfig): number {
    const { unit, value } = window;
    const msPerMinute = 60 * 1000;
    switch (unit) {
      case 'minute': return value * msPerMinute;
      case 'hour': return value * 60 * msPerMinute;
      case 'day': return value * 24 * 60 * msPerMinute;
      case 'week': return value * 7 * 24 * 60 * msPerMinute;
      case 'month': return value * 30 * 24 * 60 * msPerMinute;
      default: return value * msPerMinute;
    }
  }

  /**
   * 计算数据完整度评分（0-100）
   */
  private calculateCompletenessScore(record: DeduplicateRecord): number {
    const fields: Array<{ key: keyof DeduplicateRecord; weight: number }> = [
      { key: 'speciesName', weight: 15 },
      { key: 'speciesCode', weight: 10 },
      { key: 'batchNumber', weight: 20 },
      { key: 'samplingLocation', weight: 15 },
      { key: 'samplingTime', weight: 15 },
      { key: 'conclusion', weight: 15 },
      { key: 'testResults', weight: 10 }
    ];

    let totalWeight = 0;
    let score = 0;
    for (const { key, weight } of fields) {
      totalWeight += weight;
      const value = record[key];
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'testResults' && typeof value === 'object') {
          const filled = Object.keys(value).length;
          score += weight * Math.min(1, filled / 3);
        } else {
          score += weight;
        }
      }
    }
    return Math.round((score / Math.max(1, totalWeight)) * 100);
  }

  /**
   * 合并两个值（用于冲突解决）
   */
  private combineValues(v1: unknown, v2: unknown): unknown {
    if (typeof v1 === 'object' && v1 !== null && typeof v2 === 'object' && v2 !== null) {
      if (Array.isArray(v1) && Array.isArray(v2)) {
        return Array.from(new Set([...v1, ...v2]));
      }
      if (!Array.isArray(v1) && !Array.isArray(v2)) {
        return { ...(v1 as Record<string, unknown>), ...(v2 as Record<string, unknown>) };
      }
    }
    if (typeof v1 === 'number' && typeof v2 === 'number') {
      return { values: [v1, v2], avg: (v1 + v2) / 2 };
    }
    return null;
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(
    records: DeduplicateRecord[],
    pairs: DuplicatePair[],
    groups: DuplicateGroup[]
  ): DeduplicateStatistics {
    const byType: Record<DuplicateType, number> = {
      exact: 0, near_duplicate: 0, temporal: 0, cross_source: 0
    };
    groups.forEach(g => byType[g.duplicateType]++);

    const ranges = [
      { range: '90-100%', min: 90, max: 100, count: 0 },
      { range: '80-89%', min: 80, max: 89, count: 0 },
      { range: '70-79%', min: 70, max: 79, count: 0 },
      { range: '60-69%', min: 60, max: 69, count: 0 }
    ];
    pairs.forEach(p => {
      const range = ranges.find(r => p.similarity >= r.min && p.similarity <= r.max);
      if (range) range.count++;
    });

    const duplicateRecordCount = groups.reduce((sum, g) => sum + g.count, 0);
    const savingRecords = Math.max(0, duplicateRecordCount - groups.length);

    return {
      byType,
      bySimilarityRange: ranges.map(r => ({ range: r.range, count: r.count })),
      estimatedSavingRecords: savingRecords,
      estimatedSavingRatio: records.length > 0 ? savingRecords / records.length : 0
    };
  }
}

/** 单例导出 */
export const deduplicateService = new DeduplicateService();
