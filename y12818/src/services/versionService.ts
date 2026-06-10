/**
 * 版本管理服务
 * 功能：版本号生成、版本对比、版本回滚
 */

// ============= 类型定义 =============

/** 版本号格式类型 */
export type VersionFormat = 'semantic' | 'sequential' | 'timestamp' | 'custom';

/** 语义化版本号 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  preRelease?: string;
  build?: string;
}

/** 版本记录 */
export interface VersionRecord {
  /** 版本唯一ID */
  id: string;
  /** 版本号（字符串形式） */
  version: string;
  /** 语义化版本信息（如果是semantic格式） */
  semanticInfo?: SemanticVersion;
  /** 版本格式 */
  format: VersionFormat;
  /** 版本说明 */
  description: string;
  /** 创建时间 */
  createdAt: string;
  /** 创建人 */
  createdBy: string;
  /** 关联的数据快照ID */
  snapshotId: string;
  /** 变更类型 */
  changeType: 'create' | 'update' | 'delete' | 'merge' | 'import' | 'rollback';
  /** 变更详情摘要 */
  changeSummary: {
    added: number;
    modified: number;
    deleted: number;
    merged: number;
  };
  /** 父版本ID（用于形成版本链） */
  parentVersionId?: string;
  /** 标签 */
  tags: string[];
  /** 是否为稳定版本 */
  isStable: boolean;
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/** 版本差异对比结果 */
export interface VersionDiffResult {
  /** 版本A（较早版本） */
  versionA: VersionRecord;
  /** 版本B（较晚版本） */
  versionB: VersionRecord;
  /** 是否有差异 */
  hasDifferences: boolean;
  /** 差异类型统计 */
  stats: {
    totalAdded: number;
    totalModified: number;
    totalDeleted: number;
    totalUnchanged: number;
  };
  /** 分类差异详情 */
  differences: {
    added: DiffItem[];
    modified: ModifiedDiffItem[];
    deleted: DiffItem[];
  };
  /** 字段级别变更统计 */
  fieldChanges: Record<string, number>;
  /** 冲突列表（如果存在） */
  conflicts?: VersionConflict[];
}

/** 差异项 */
export interface DiffItem {
  /** 记录ID */
  recordId: string;
  /** 记录类型（如：检测记录、物种信息等） */
  recordType: string;
  /** 显示名称 */
  displayName: string;
  /** 当前值 */
  value?: unknown;
}

/** 修改型差异项 */
export interface ModifiedDiffItem extends DiffItem {
  /** 原值 */
  oldValue: unknown;
  /** 新值 */
  newValue: unknown;
  /** 变更的字段列表 */
  changedFields: string[];
}

/** 版本冲突 */
export interface VersionConflict {
  /** 冲突ID */
  conflictId: string;
  /** 冲突类型 */
  conflictType: 'data_conflict' | 'metadata_conflict' | 'merge_conflict';
  /** 冲突记录ID */
  recordId: string;
  /** 冲突描述 */
  description: string;
  /** 版本A的值 */
  valueInA: unknown;
  /** 版本B的值 */
  valueInB: unknown;
  /** 建议解决方案 */
  suggestedResolution?: 'use_a' | 'use_b' | 'manual';
}

/** 回滚操作结果 */
export interface RollbackResult {
  /** 是否成功 */
  success: boolean;
  /** 回滚目标版本 */
  targetVersion: VersionRecord;
  /** 回滚前版本 */
  previousVersion: VersionRecord;
  /** 新生成的回滚版本 */
  newVersion: VersionRecord;
  /** 受影响的记录数 */
  affectedRecords: number;
  /** 操作时间 */
  rollbackTime: string;
  /** 错误信息（如果失败） */
  errorMessage?: string;
}

/** 版本创建配置 */
export interface VersionCreateConfig {
  /** 版本格式 */
  format: VersionFormat;
  /** 起始版本号（用于sequential或custom格式） */
  initialVersion?: string;
  /** 是否自动递增 */
  autoIncrement: boolean;
  /** 自定义前缀 */
  prefix?: string;
}

// ============= Mock 数据 =============

/** Mock版本历史 */
const MOCK_VERSION_HISTORY: VersionRecord[] = [
  {
    id: 'VER-000001',
    version: '1.0.0',
    semanticInfo: { major: 1, minor: 0, patch: 0 },
    format: 'semantic',
    description: '初始版本：导入第一批培养基检测数据',
    createdAt: '2026-01-15T09:30:00.000Z',
    createdBy: 'admin',
    snapshotId: 'SNAP-000001',
    changeType: 'create',
    changeSummary: { added: 150, modified: 0, deleted: 0, merged: 0 },
    tags: ['初始化', '数据导入'],
    isStable: true
  },
  {
    id: 'VER-000002',
    version: '1.1.0',
    semanticInfo: { major: 1, minor: 1, patch: 0 },
    format: 'semantic',
    description: '新增2月份检测数据，修正3条物种名称',
    createdAt: '2026-02-20T14:15:00.000Z',
    createdBy: 'operator01',
    snapshotId: 'SNAP-000002',
    changeType: 'update',
    changeSummary: { added: 80, modified: 3, deleted: 0, merged: 0 },
    parentVersionId: 'VER-000001',
    tags: ['月度更新'],
    isStable: true
  },
  {
    id: 'VER-000003',
    version: '1.2.0',
    semanticInfo: { major: 1, minor: 2, patch: 0 },
    format: 'semantic',
    description: '导入3月份数据，执行去重合并操作',
    createdAt: '2026-03-25T10:45:00.000Z',
    createdBy: 'operator02',
    snapshotId: 'SNAP-000003',
    changeType: 'merge',
    changeSummary: { added: 120, modified: 5, deleted: 0, merged: 12 },
    parentVersionId: 'VER-000002',
    tags: ['月度更新', '去重合并'],
    isStable: true
  },
  {
    id: 'VER-000004',
    version: '1.2.1',
    semanticInfo: { major: 1, minor: 2, patch: 1 },
    format: 'semantic',
    description: '修复异常值，补充缺失字段',
    createdAt: '2026-04-02T16:20:00.000Z',
    createdBy: 'operator01',
    snapshotId: 'SNAP-000004',
    changeType: 'update',
    changeSummary: { added: 0, modified: 18, deleted: 0, merged: 0 },
    parentVersionId: 'VER-000003',
    tags: ['修复'],
    isStable: true
  },
  {
    id: 'VER-000005',
    version: '1.3.0-beta',
    semanticInfo: { major: 1, minor: 3, patch: 0, preRelease: 'beta' },
    format: 'semantic',
    description: '导入4月份数据（测试中，待审核）',
    createdAt: '2026-04-28T11:00:00.000Z',
    createdBy: 'operator03',
    snapshotId: 'SNAP-000005',
    changeType: 'import',
    changeSummary: { added: 95, modified: 2, deleted: 0, merged: 0 },
    parentVersionId: 'VER-000004',
    tags: ['月度更新', '待审核'],
    isStable: false
  },
  {
    id: 'VER-000006',
    version: '2.0.0',
    semanticInfo: { major: 2, minor: 0, patch: 0 },
    format: 'semantic',
    description: '重大更新：采用新的物种标准库，重新匹配所有物种名称',
    createdAt: '2026-05-10T09:00:00.000Z',
    createdBy: 'admin',
    snapshotId: 'SNAP-000006',
    changeType: 'update',
    changeSummary: { added: 0, modified: 450, deleted: 0, merged: 0 },
    parentVersionId: 'VER-000004',
    tags: ['重大更新', '标准库升级'],
    isStable: true
  }
];

/** Mock数据记录（用于差异对比） */
const MOCK_DATA_RECORDS: Array<{
  id: string;
  recordType: string;
  displayName: string;
  data: Record<string, unknown>;
}> = [
  {
    id: 'REC-001',
    recordType: '检测记录',
    displayName: '大肠杆菌-A批次-北京',
    data: { species: '大肠埃希氏菌', batch: 'B2026-001', location: '北京', result: '合格' }
  },
  {
    id: 'REC-002',
    recordType: '检测记录',
    displayName: '金葡菌-B批次-上海',
    data: { species: '金黄色葡萄球菌', batch: 'B2026-002', location: '上海', result: '合格' }
  },
  {
    id: 'REC-003',
    recordType: '检测记录',
    displayName: '枯草杆菌-C批次-广州',
    data: { species: '枯草芽孢杆菌', batch: 'B2026-003', location: '广州', result: '不合格' }
  },
  {
    id: 'REC-004',
    recordType: '检测记录',
    displayName: '铜绿假单胞-D批次-深圳',
    data: { species: '铜绿假单胞菌', batch: 'B2026-004', location: '深圳', result: '合格' }
  },
  {
    id: 'REC-005',
    recordType: '检测记录',
    displayName: '白色念珠菌-E批次-杭州',
    data: { species: '白色念珠菌', batch: 'B2026-005', location: '杭州', result: '合格' }
  }
];

// ============= 核心服务 =============

/**
 * 版本管理服务类
 */
export class VersionService {
  private versionHistory: VersionRecord[];
  private createConfig: VersionCreateConfig;

  constructor() {
    this.versionHistory = [...MOCK_VERSION_HISTORY].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    this.createConfig = {
      format: 'semantic',
      autoIncrement: true
    };
  }

  /**
   * 设置版本创建配置
   */
  setCreateConfig(config: Partial<VersionCreateConfig>): void {
    this.createConfig = { ...this.createConfig, ...config };
  }

  /**
   * 生成新版本号
   * @param baseVersion 基础版本号（可选，不填则使用最新版本）
   * @param incrementType 递增类型（semantic格式使用）
   */
  generateVersionNumber(
    baseVersion?: string,
    incrementType: 'major' | 'minor' | 'patch' = 'patch'
  ): string {
    const format = this.createConfig.format;
    const prefix = this.createConfig.prefix || '';
    const base = baseVersion || this.getLatestVersion()?.version;

    switch (format) {
      case 'semantic':
        return this.incrementSemanticVersion(base || '0.0.0', incrementType);

      case 'sequential': {
        const initial = this.createConfig.initialVersion || '1';
        const seq = base ? parseInt(base.replace(/\D/g, ''), 10) || 0 : parseInt(initial, 10) - 1;
        return `${prefix}${seq + 1}`;
      }

      case 'timestamp': {
        const now = new Date();
        const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` +
                   `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        return `${prefix}${ts}`;
      }

      case 'custom':
        return this.createConfig.initialVersion || `${prefix}CUSTOM-${Date.now()}`;

      default:
        return `${prefix}${Date.now()}`;
    }
  }

  /**
   * 递增语义化版本号
   */
  private incrementSemanticVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const sv = this.parseSemanticVersion(version);
    if (!sv) return '1.0.0';

    switch (type) {
      case 'major':
        sv.major++;
        sv.minor = 0;
        sv.patch = 0;
        break;
      case 'minor':
        sv.minor++;
        sv.patch = 0;
        break;
      case 'patch':
        sv.patch++;
        break;
    }
    delete sv.preRelease;
    delete sv.build;

    return this.formatSemanticVersion(sv);
  }

  /**
   * 解析语义化版本号
   */
  parseSemanticVersion(version: string): SemanticVersion | null {
    const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
    const match = version.match(regex);
    if (!match) return null;

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      preRelease: match[4],
      build: match[5]
    };
  }

  /**
   * 格式化语义化版本号
   */
  formatSemanticVersion(sv: SemanticVersion): string {
    let version = `${sv.major}.${sv.minor}.${sv.patch}`;
    if (sv.preRelease) version += `-${sv.preRelease}`;
    if (sv.build) version += `+${sv.build}`;
    return version;
  }

  /**
   * 比较两个语义化版本号
   * @returns -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
   */
  compareVersions(v1: string, v2: string): number {
    const sv1 = this.parseSemanticVersion(v1);
    const sv2 = this.parseSemanticVersion(v2);

    // 如果都是语义化版本
    if (sv1 && sv2) {
      if (sv1.major !== sv2.major) return sv1.major > sv2.major ? 1 : -1;
      if (sv1.minor !== sv2.minor) return sv1.minor > sv2.minor ? 1 : -1;
      if (sv1.patch !== sv2.patch) return sv1.patch > sv2.patch ? 1 : -1;
      // 有预发布版本的版本号小于正式版
      if (!sv1.preRelease && sv2.preRelease) return 1;
      if (sv1.preRelease && !sv2.preRelease) return -1;
      if (sv1.preRelease && sv2.preRelease) {
        return sv1.preRelease.localeCompare(sv2.preRelease);
      }
      return 0;
    }

    // 退化为字符串比较
    return v1.localeCompare(v2, undefined, { numeric: true });
  }

  /**
   * 获取最新版本
   */
  getLatestVersion(): VersionRecord | undefined {
    return this.versionHistory.length > 0 ? this.versionHistory[0] : undefined;
  }

  /**
   * 获取所有版本历史（按时间倒序）
   */
  getVersionHistory(options?: {
    limit?: number;
    offset?: number;
    stableOnly?: boolean;
    tags?: string[];
  }): VersionRecord[] {
    let result = [...this.versionHistory];

    if (options?.stableOnly) {
      result = result.filter(v => v.isStable);
    }
    if (options?.tags && options.tags.length > 0) {
      result = result.filter(v => options.tags!.some(t => v.tags.includes(t)));
    }
    if (options?.offset) {
      result = result.slice(options.offset);
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * 根据ID或版本号获取版本记录
   */
  getVersion(identifier: string): VersionRecord | undefined {
    return this.versionHistory.find(
      v => v.id === identifier || v.version === identifier
    );
  }

  /**
   * 创建新版本
   */
  createVersion(params: {
    description: string;
    createdBy: string;
    changeType: VersionRecord['changeType'];
    changeSummary: VersionRecord['changeSummary'];
    tags?: string[];
    parentVersionId?: string;
    incrementType?: 'major' | 'minor' | 'patch';
    isStable?: boolean;
    metadata?: Record<string, unknown>;
  }): VersionRecord {
    const latest = this.getLatestVersion();
    const parentId = params.parentVersionId || latest?.id;
    const parentVersion = parentId ? this.getVersion(parentId) : latest;

    // 生成版本号
    const newVersionStr = this.generateVersionNumber(
      parentVersion?.version,
      params.incrementType || 'patch'
    );
    const semanticInfo = this.parseSemanticVersion(newVersionStr);

    // 创建版本记录
    const newVersion: VersionRecord = {
      id: `VER-${String(this.versionHistory.length + 1).padStart(6, '0')}`,
      version: newVersionStr,
      semanticInfo: semanticInfo || undefined,
      format: this.createConfig.format,
      description: params.description,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
      snapshotId: `SNAP-${String(this.versionHistory.length + 1).padStart(6, '0')}`,
      changeType: params.changeType,
      changeSummary: params.changeSummary,
      parentVersionId: parentId,
      tags: params.tags || [],
      isStable: params.isStable ?? true,
      metadata: params.metadata
    };

    // 插入到历史记录（按时间倒序）
    this.versionHistory.unshift(newVersion);

    return newVersion;
  }

  /**
   * 对比两个版本的差异
   */
  compareVersionsDiff(
    versionAId: string,
    versionBId: string
  ): VersionDiffResult {
    const versionA = this.getVersion(versionAId);
    const versionB = this.getVersion(versionBId);

    if (!versionA || !versionB) {
      throw new Error('未找到指定的版本记录');
    }

    // 确保A是较早版本，B是较晚版本
    let vA = versionA;
    let vB = versionB;
    if (new Date(vA.createdAt) > new Date(vB.createdAt)) {
      [vA, vB] = [vB, vA];
    }

    // 基于版本变更摘要模拟差异数据
    const added: DiffItem[] = [];
    const modified: ModifiedDiffItem[] = [];
    const deleted: DiffItem[] = [];
    const fieldChanges: Record<string, number> = {};

    // 模拟新增记录
    const addCount = Math.min(vB.changeSummary.added, 5);
    for (let i = 0; i < addCount; i++) {
      const rec = MOCK_DATA_RECORDS[i % MOCK_DATA_RECORDS.length];
      added.push({
        recordId: `${rec.id}-ADD-${i}`,
        recordType: rec.recordType,
        displayName: `[新增] ${rec.displayName}`,
        value: rec.data
      });
    }

    // 模拟修改记录
    const modCount = Math.min(vB.changeSummary.modified, 4);
    for (let i = 0; i < modCount; i++) {
      const rec = MOCK_DATA_RECORDS[(i + 1) % MOCK_DATA_RECORDS.length];
      const changedFields = i % 2 === 0 ? ['species', 'result'] : ['location', 'batch'];
      const oldData = { ...rec.data };
      const newData = { ...rec.data };
      for (const field of changedFields) {
        if (field in newData) {
          newData[field] = `${newData[field]}(已更新)`;
          fieldChanges[field] = (fieldChanges[field] || 0) + 1;
        }
      }
      modified.push({
        recordId: `${rec.id}-MOD-${i}`,
        recordType: rec.recordType,
        displayName: `[修改] ${rec.displayName}`,
        oldValue: oldData,
        newValue: newData,
        changedFields
      });
    }

    // 模拟删除记录
    const delCount = Math.min(vB.changeSummary.deleted, 2);
    for (let i = 0; i < delCount; i++) {
      const rec = MOCK_DATA_RECORDS[(i + 2) % MOCK_DATA_RECORDS.length];
      deleted.push({
        recordId: `${rec.id}-DEL-${i}`,
        recordType: rec.recordType,
        displayName: `[删除] ${rec.displayName}`,
        value: rec.data
      });
    }

    const totalModified = vB.changeSummary.modified;
    const totalUnchanged = Math.max(
      0,
      (vA.changeSummary.added + vA.changeSummary.modified) - totalModified - vB.changeSummary.deleted
    );

    // 模拟冲突（仅在特殊场景下）
    const conflicts: VersionConflict[] = [];
    if (vA.parentVersionId && vB.parentVersionId && vA.parentVersionId !== vB.parentVersionId) {
      conflicts.push({
        conflictId: `CONF-${Date.now()}`,
        conflictType: 'merge_conflict',
        recordId: 'REC-MERGE-001',
        description: '两个版本来源于不同的父版本，存在分支合并冲突',
        valueInA: vA.changeSummary,
        valueInB: vB.changeSummary,
        suggestedResolution: 'manual'
      });
    }

    const hasDifferences = added.length > 0 || modified.length > 0 || deleted.length > 0;

    return {
      versionA: vA,
      versionB: vB,
      hasDifferences,
      stats: {
        totalAdded: vB.changeSummary.added,
        totalModified,
        totalDeleted: vB.changeSummary.deleted,
        totalUnchanged
      },
      differences: { added, modified, deleted },
      fieldChanges,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  }

  /**
   * 获取版本变更链（从指定版本回溯到最初版本）
   */
  getVersionChain(versionId: string): VersionRecord[] {
    const chain: VersionRecord[] = [];
    let current = this.getVersion(versionId);

    while (current) {
      chain.push(current);
      if (!current.parentVersionId) break;
      current = this.getVersion(current.parentVersionId);
    }

    return chain;
  }

  /**
   * 执行版本回滚
   */
  rollbackToVersion(targetVersionId: string, operator: string): RollbackResult {
    const targetVersion = this.getVersion(targetVersionId);
    const previousVersion = this.getLatestVersion();

    if (!targetVersion) {
      return {
        success: false,
        targetVersion: {} as VersionRecord,
        previousVersion: {} as VersionRecord,
        newVersion: {} as VersionRecord,
        affectedRecords: 0,
        rollbackTime: new Date().toISOString(),
        errorMessage: '未找到目标版本'
      };
    }

    if (!previousVersion) {
      return {
        success: false,
        targetVersion,
        previousVersion: {} as VersionRecord,
        newVersion: {} as VersionRecord,
        affectedRecords: 0,
        rollbackTime: new Date().toISOString(),
        errorMessage: '当前没有版本，无法回滚'
      };
    }

    // 计算受影响的记录数（版本间的总变更数）
    const affectedRecords =
      previousVersion.changeSummary.modified +
      previousVersion.changeSummary.added +
      previousVersion.changeSummary.deleted;

    // 创建回滚版本
    const newVersion = this.createVersion({
      description: `回滚到版本 ${targetVersion.version}（${targetVersion.id}）`,
      createdBy: operator,
      changeType: 'rollback',
      changeSummary: {
        added: 0,
        modified: affectedRecords,
        deleted: 0,
        merged: 0
      },
      tags: ['回滚', `回滚至${targetVersion.version}`],
      parentVersionId: previousVersion.id,
      incrementType: 'patch',
      isStable: targetVersion.isStable,
      metadata: {
        rollbackFromVersion: previousVersion.version,
        rollbackFromId: previousVersion.id,
        rollbackToVersion: targetVersion.version,
        rollbackToId: targetVersion.id
      }
    });

    return {
      success: true,
      targetVersion,
      previousVersion,
      newVersion,
      affectedRecords,
      rollbackTime: newVersion.createdAt
    };
  }

  /**
   * 搜索版本记录
   */
  searchVersions(query: {
    keyword?: string;
    createdBy?: string;
    changeType?: VersionRecord['changeType'];
    dateFrom?: string;
    dateTo?: string;
    isStable?: boolean;
  }): VersionRecord[] {
    let result = [...this.versionHistory];

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      result = result.filter(v =>
        v.version.toLowerCase().includes(kw) ||
        v.description.toLowerCase().includes(kw) ||
        v.tags.some(t => t.toLowerCase().includes(kw))
      );
    }
    if (query.createdBy) {
      result = result.filter(v => v.createdBy === query.createdBy);
    }
    if (query.changeType) {
      result = result.filter(v => v.changeType === query.changeType);
    }
    if (query.dateFrom) {
      result = result.filter(v => v.createdAt >= query.dateFrom!);
    }
    if (query.dateTo) {
      result = result.filter(v => v.createdAt <= query.dateTo!);
    }
    if (query.isStable !== undefined) {
      result = result.filter(v => v.isStable === query.isStable);
    }

    return result;
  }
}

/** 单例导出 */
export const versionService = new VersionService();
