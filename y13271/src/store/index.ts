import { create } from 'zustand';
import type {
  BusBay,
  ResidentFeedback,
  VersionHistory,
  FilterCriteria,
  ExportStatistics,
  ExportBatch,
  ImportBatch,
  ChangedBy,
  BadDataFlag,
} from '@/types';
import { createMockData } from '@/data/mockData';
import { calculateSnapshotHash, generateChangeSummary } from '@/utils/dataUtils';
import { detectBadData } from '@/utils/badDataDetector';
import { detectDuplicates } from '@/utils/duplicateDetector';

/** localStorage 持久化存储的 Key */
const STORAGE_KEY = 'bus-bay-store';
/** 存储版本号，变更时强制重置，避免旧数据污染 */
const STORAGE_VERSION = 4;
const STORAGE_VERSION_KEY = 'bus-bay-store-version';

/** 默认筛选条件（全部空数组和 null） */
const DEFAULT_FILTERS: FilterCriteria = {
  districts: [],
  roads: [],
  statuses: [],
  hasDuplicate: null,
  hasBadData: null,
  dateFrom: null,
  dateTo: null,
  keyword: '',
};

/** 字段补充变更参数类型 */
interface SupplementFieldChanges {
  currentCapacity?: number;
  status?: BusBay['status'];
  lng?: number;
  lat?: number;
  designCapacity?: number;
}

/** 导入反馈行数据类型 */
interface FeedbackImportRow {
  [key: string]: string | number | boolean | null | undefined;
  bayName?: string;
  road?: string;
  站名?: string;
  道路?: string;
  姓名?: string;
  联系电话?: string;
  反馈内容?: string;
  residentName?: string;
  phone?: string;
  content?: string;
  reportedAt?: string;
}

/** Zustand Store 状态定义 */
interface BusBayStoreState {
  // ============ 基础状态 ============
  /** 公交港湾站点数组 */
  bays: BusBay[];
  /** 居民反馈数组 */
  feedbacks: ResidentFeedback[];
  /** 版本历史数组 */
  versions: VersionHistory[];
  /** 导出批次数组 */
  exportBatches: ExportBatch[];
  /** 导入批次数组 */
  importBatches: ImportBatch[];
  /** 筛选条件 */
  filters: FilterCriteria;
  /** 当前选中的站点 ID */
  selectedBayId: string | null;
  /** 加载状态 */
  loading: boolean;

  // ============ 派生状态（Computed Selectors） ============
  /** 根据筛选条件过滤后的站点列表 */
  getFilteredBays: () => BusBay[];
  /** 对过滤后站点计算统计数据（duplicates/badData 为站点数） */
  getStatistics: () => ExportStatistics;
  /** 计算当前快照哈希值 */
  getSnapshotHash: () => string;
  /** 获取指定站点的所有反馈 */
  getFeedbacksForBay: (bayId: string) => ResidentFeedback[];
  /** 获取指定站点的版本历史（按时间倒序） */
  getVersionsForBay: (bayId: string) => VersionHistory[];
  /** 从所有站点中去重提取行政区列表 */
  getAllDistricts: () => string[];
  /** 从所有站点中去重提取道路列表 */
  getAllRoads: () => string[];

  // ============ Actions ============
  /** 初始化 Mock 数据（会覆盖现有数据） */
  initMockData: () => void;
  /** 部分更新筛选条件 */
  setFilters: (partial: Partial<FilterCriteria>) => void;
  /** 重置筛选条件为默认值 */
  resetFilters: () => void;
  /** 选中/取消选中站点 */
  selectBay: (id: string | null) => void;
  /** 创建导出批次，保存当前筛选条件、统计、站点ID快照和哈希 */
  createExportBatch: (remark: string, generatedBy: string) => ExportBatch;
  /** 补充站点字段数据，自动生成版本历史记录 */
  supplementFieldData: (
    bayId: string,
    changes: SupplementFieldChanges,
    remark: string,
    attachments: string[],
    changedBy: ChangedBy
  ) => void;
  /** 人工标记一组反馈为重复投诉 */
  markDuplicateGroup: (feedbackIds: string[]) => void;
  /** 导入居民反馈批次，运行坏数据和重复检测 */
  addFeedbackImportBatch: (
    rows: FeedbackImportRow[],
    fileName: string,
    importedBy: string
  ) => { batch: ImportBatch; feedbacks: ResidentFeedback[] };
  /** 从历史导出批次恢复筛选条件，返回该批次 */
  reExportFromBatch: (batchId: string) => ExportBatch | null;
}

/** 生成唯一 ID */
const genId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** 从 localStorage 读取持久化数据 */
function loadFromStorage(): Partial<BusBayStoreState> | null {
  try {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== String(STORAGE_VERSION)) {
      console.warn(`存储版本不匹配（期望 ${STORAGE_VERSION}，实际 ${storedVersion}），将清除旧数据并使用 Mock 数据初始化`);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (!parsed.bays || parsed.bays.length === 0) {
      console.warn('bays 数组为空，视为无效数据，将使用 Mock 数据初始化');
      return null;
    }

    if (parsed.feedbacks === null || parsed.feedbacks === undefined) {
      console.warn('feedbacks 为 null/undefined，视为无效数据，将使用 Mock 数据初始化');
      return null;
    }

    return parsed;
  } catch {
    console.warn('读取本地存储失败，将清除旧数据并使用 Mock 数据初始化');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
    return null;
  }
}

/** 将 Store 状态持久化到 localStorage */
function saveToStorage(state: BusBayStoreState) {
  try {
    const { bays, feedbacks, versions, exportBatches, importBatches, filters, selectedBayId } =
      state;
    const data = {
      bays,
      feedbacks,
      versions,
      exportBatches,
      importBatches,
      filters,
      selectedBayId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('保存本地存储失败');
  }
}

/** 从导入行提取字段值，兼容中英文 key */
function extractRowValue<T>(
  row: FeedbackImportRow,
  keys: string[],
  defaultValue: T
): T {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
      return row[k] as T;
    }
  }
  return defaultValue;
}

/** 根据关键词匹配站点 */
function matchBayByKeywords(
  row: FeedbackImportRow,
  bays: BusBay[]
): BusBay | null {
  const bayName = extractRowValue<string>(row, ['bayName', '站名', '站点', 'stationName'], '');
  const road = extractRowValue<string>(row, ['road', '道路', 'roadName'], '');
  const content = extractRowValue<string>(row, ['content', '反馈内容'], '');

  const keywords = [bayName, road, content].filter(Boolean);
  if (keywords.length === 0) return null;

  for (const keyword of keywords) {
    for (const bay of bays) {
      if (
        bay.name.includes(keyword) ||
        keyword.includes(bay.name) ||
        bay.road.includes(keyword) ||
        keyword.includes(bay.road)
      ) {
        return bay;
      }
    }
  }
  return null;
}

/**
 * 创建 Zustand Store
 * 统一数据源：bays/feedbacks/versions/exportBatches/importBatches
 * 支持 localStorage 持久化，init 时先读 localStorage，没有则生成 Mock
 */
export const useBusBayStore = create<BusBayStoreState>((set, get) => {
  // ============ 初始化逻辑：强制使用 Mock 数据（演示环境，避免脏 localStorage） ============
  const mockData = createMockData();
  // 清空旧的 localStorage 避免污染
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
  } catch {
    // ignore
  }

  console.log('[Store Init] 使用 Mock 数据初始化，共', mockData.bays.length, '个站点');

  const initialState: BusBayStoreState = {
    // 基础状态：始终使用 Mock 数据（演示环境）
    bays: mockData.bays,
    feedbacks: mockData.feedbacks,
    versions: mockData.versions,
    exportBatches: mockData.exportBatches,
    importBatches: mockData.importBatches,
    filters: { ...DEFAULT_FILTERS },
    selectedBayId: null,
    loading: false,

    // ============ 派生状态 Computed Selectors ============

    /**
     * 根据 filters（行政区/道路/状态/是否重复/是否坏数据/关键词/日期）进行筛选
     * 关键词搜索站名/道路
     */
    getFilteredBays: () => {
      const { bays, filters } = get();
      const {
        districts,
        roads,
        statuses,
        hasDuplicate,
        hasBadData,
        dateFrom,
        dateTo,
        keyword,
      } = filters;

      return bays.filter((bay) => {
        // 行政区筛选
        if (districts.length > 0 && !districts.includes(bay.district)) return false;
        // 道路筛选
        if (roads.length > 0 && !roads.includes(bay.road)) return false;
        // 状态筛选
        if (statuses.length > 0 && !statuses.includes(bay.status)) return false;
        // 是否有重复反馈
        if (hasDuplicate !== null) {
          if (hasDuplicate && bay.duplicateCount === 0) return false;
          if (!hasDuplicate && bay.duplicateCount > 0) return false;
        }
        // 是否有坏数据
        if (hasBadData !== null) {
          if (hasBadData && bay.badDataCount === 0) return false;
          if (!hasBadData && bay.badDataCount > 0) return false;
        }
        // 日期范围筛选（updatedAt）
        if (dateFrom) {
          if (new Date(bay.updatedAt) < new Date(dateFrom)) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (new Date(bay.updatedAt) > to) return false;
        }
        // 关键词搜索（站名 / 道路）
        if (keyword && keyword.trim()) {
          const kw = keyword.trim();
          if (!bay.name.includes(kw) && !bay.road.includes(kw)) return false;
        }
        return true;
      });
    },

    /**
     * 对 filteredBays 计算 ExportStatistics
     * 注意：duplicates 和 badData 是**站点数**（有重复/坏数据的 site 数量）
     */
    getStatistics: () => {
      const filtered = get().getFilteredBays();
      const stats: ExportStatistics = {
        total: filtered.length,
        abnormal: 0,
        normal: 0,
        pending: 0,
        duplicates: 0, // 有重复反馈的站点数
        badData: 0, // 有坏数据的站点数
      };

      for (const bay of filtered) {
        switch (bay.status) {
          case 'abnormal':
            stats.abnormal++;
            break;
          case 'normal':
            stats.normal++;
            break;
          case 'pending':
            stats.pending++;
            break;
        }
        if (bay.duplicateCount > 0) stats.duplicates++;
        if (bay.badDataCount > 0) stats.badData++;
      }
      return stats;
    },

    /** 使用 utils 的 calculateSnapshotHash(filteredBays, filters) */
    getSnapshotHash: () => {
      const filtered = get().getFilteredBays();
      return calculateSnapshotHash(filtered, get().filters);
    },

    /** 某站点的所有反馈 */
    getFeedbacksForBay: (bayId: string) => {
      return get().feedbacks.filter((fb) => fb.bayId === bayId);
    },

    /** 某站点的版本历史按时间倒序 */
    getVersionsForBay: (bayId: string) => {
      return get()
        .versions.filter((v) => v.bayId === bayId)
        .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
    },

    /** 从 bays 去重提取所有行政区 */
    getAllDistricts: () => {
      return Array.from(new Set(get().bays.map((b) => b.district))).sort();
    },

    /** 从 bays 去重提取所有道路 */
    getAllRoads: () => {
      return Array.from(new Set(get().bays.map((b) => b.road))).sort();
    },

    // ============ Actions ============

    /** 调用 createMockData() 初始化，覆盖现有数据 */
    initMockData: () => {
      const mock = createMockData();
      set({
        bays: mock.bays,
        feedbacks: mock.feedbacks,
        versions: mock.versions,
        exportBatches: mock.exportBatches,
        importBatches: mock.importBatches,
        filters: { ...DEFAULT_FILTERS },
        selectedBayId: null,
      });
      saveToStorage(get());
    },

    /** 部分更新筛选条件 */
    setFilters: (partial: Partial<FilterCriteria>) => {
      set({
        filters: { ...get().filters, ...partial },
      });
      saveToStorage(get());
    },

    /** 重置筛选条件为空 */
    resetFilters: () => {
      set({
        filters: { ...DEFAULT_FILTERS },
      });
      saveToStorage(get());
    },

    /** 选中/取消选中站点 */
    selectBay: (id: string | null) => {
      set({ selectedBayId: id });
      saveToStorage(get());
    },

    /**
     * 创建导出批次
     * 保存当前 filters/statistics/bayIds/hash 为 ExportBatch，推入 exportBatches
     */
    createExportBatch: (remark: string, generatedBy: string) => {
      const filters = { ...get().filters };
      const statistics = get().getStatistics();
      const snapshotHash = get().getSnapshotHash();
      const bayIdsSnapshot = get()
        .getFilteredBays()
        .map((b) => b.id)
        .sort();

      const batch: ExportBatch = {
        id: genId('exp'),
        generatedAt: new Date().toISOString(),
        filterCriteria: filters,
        statistics,
        snapshotHash,
        bayIdsSnapshot,
        generatedBy,
        remark,
      };

      set({
        exportBatches: [...get().exportBatches, batch],
      });
      saveToStorage(get());
      return batch;
    },

    /**
     * 对站点字段修改，自动生成 VersionHistory
     * 使用 generateChangeSummary 生成摘要，更新 bays 中的对应对象
     */
    supplementFieldData: (
      bayId: string,
      changes: SupplementFieldChanges,
      remark: string,
      attachments: string[],
      changedBy: ChangedBy
    ) => {
      const { bays, versions } = get();
      const bayIndex = bays.findIndex((b) => b.id === bayId);
      if (bayIndex === -1) return;

      const oldBay = bays[bayIndex];
      const newVersions: VersionHistory[] = [];
      const now = new Date().toISOString();

      // 逐字段生成版本记录
      const fieldKeys = Object.keys(changes) as (keyof SupplementFieldChanges)[];
      for (const fieldKey of fieldKeys) {
        const newValue = changes[fieldKey];
        if (newValue === undefined) continue;

        type ValueType = string | number | boolean | null | undefined | [number, number];
        let fieldName: string;
        let oldValue: ValueType;
        let actualNewValue: ValueType;
        let oldLngLat: [number, number] | undefined;
        let newLngLat: [number, number] | undefined;

        if (fieldKey === 'lng' || fieldKey === 'lat') {
          // lng/lat 合并为 lngLat 字段
          fieldName = 'lngLat';
          oldLngLat = [oldBay.lng, oldBay.lat];
          const newLng = fieldKey === 'lng' ? (newValue as number) : oldBay.lng;
          const newLat = fieldKey === 'lat' ? (newValue as number) : oldBay.lat;
          newLngLat = [newLng, newLat];
          oldValue = oldLngLat;
          actualNewValue = newLngLat;
        } else {
          fieldName = fieldKey;
          oldValue = oldBay[fieldKey as keyof BusBay];
          actualNewValue = newValue;
        }

        // 跳过未实际变化的字段
        if (fieldName !== 'lngLat' && oldValue === actualNewValue) continue;

        const changeSummary = generateChangeSummary(fieldName, oldValue, actualNewValue);

        newVersions.push({
          id: genId('ver'),
          bayId,
          fieldName,
          oldValue,
          newValue: actualNewValue,
          changedBy,
          changedAt: now,
          remark,
          attachments,
          isFieldSupplement: true,
          changeSummary,
          oldLngLat,
          newLngLat,
        });
      }

      // 无实际变更则跳过
      if (newVersions.length === 0) return;

      // 更新 bays 对象
      const newBay: BusBay = {
        ...oldBay,
        ...changes,
        updatedAt: now,
      };

      const newBays = [...bays];
      newBays[bayIndex] = newBay;

      set({
        bays: newBays,
        versions: [...versions, ...newVersions],
      });
      saveToStorage(get());
    },

    /**
     * 人工标记一组反馈为重复
     * 设置 isDuplicate/duplicateOfId/duplicateOrder
     * 更新 bays 的 duplicateCount
     */
    markDuplicateGroup: (feedbackIds: string[]) => {
      if (feedbackIds.length < 2) return;

      const { feedbacks, bays } = get();
      const sortedIds = [...feedbackIds];

      // 首条作为源反馈（非重复），其余标记为重复
      const sourceId = sortedIds[0];
      const newFeedbacks = feedbacks.map((fb) => {
        if (!sortedIds.includes(fb.id)) return fb;
        if (fb.id === sourceId) {
          return {
            ...fb,
            isDuplicate: false,
            duplicateOfId: undefined,
            duplicateOrder: undefined,
          };
        }
        const order = sortedIds.indexOf(fb.id) + 1;
        return {
          ...fb,
          isDuplicate: true,
          duplicateOfId: sourceId,
          duplicateOrder: order,
        };
      });

      // 收集涉及的 bayId 并更新 duplicateCount
      const affectedBayIds = new Set<string>();
      for (const fid of sortedIds) {
        const fb = feedbacks.find((f) => f.id === fid);
        if (fb?.bayId) affectedBayIds.add(fb.bayId);
      }

      // 对每个受影响站点重新统计 duplicateCount（重复反馈数量，源不算）
      const newBays = bays.map((bay) => {
        if (!affectedBayIds.has(bay.id)) return bay;
        const dupCount = newFeedbacks.filter(
          (fb) => fb.bayId === bay.id && fb.isDuplicate
        ).length;
        return { ...bay, duplicateCount: dupCount };
      });

      set({
        feedbacks: newFeedbacks,
        bays: newBays,
      });
      saveToStorage(get());
    },

    /**
     * 导入居民反馈
     * 运行坏数据和重复检测，生成 ImportBatch 和对应 feedbacks，更新 bays 计数
     */
    addFeedbackImportBatch: (
      rows: FeedbackImportRow[],
      fileName: string,
      importedBy: string
    ) => {
      const batchId = genId('imp');
      const now = new Date().toISOString();
      const { bays: currentBays, feedbacks: currentFeedbacks } = get();

      // Step 1: 将原始行转换为 ResidentFeedback 基础对象
      const tempFeedbacks: ResidentFeedback[] = rows.map((row, idx) => {
        const matchedBay = matchBayByKeywords(row, currentBays);
        const reportedAt =
          extractRowValue<string>(row, ['reportedAt', '反馈时间', '提交时间'], '') || now;
        const residentName = extractRowValue<string>(
          row,
          ['residentName', '姓名', '名字'],
          ''
        );
        const phone = extractRowValue<string>(row, ['phone', '联系电话', '手机号'], '');
        const content = extractRowValue<string>(row, ['content', '反馈内容', '内容'], '');

        return {
          id: genId('fb'),
          bayId: matchedBay?.id ?? null,
          sourceRow: idx + 1,
          sourceFile: fileName,
          residentName,
          phone,
          content,
          reportedAt: new Date(reportedAt).toISOString(),
          isDuplicate: false,
          badDataFlags: [],
          rawData: { ...row },
          importBatchId: batchId,
          createdAt: now,
        };
      });

      // Step 2: 坏数据检测（检测每一条新反馈）
      const afterBadData = tempFeedbacks.map((fb) => ({
        ...fb,
        badDataFlags: detectBadData(fb, currentBays) as BadDataFlag[],
      }));

      // Step 3: 重复检测（将新反馈与已有反馈合并后检测）
      const allForDupCheck = [...currentFeedbacks, ...afterBadData];
      const afterDupAll = detectDuplicates(allForDupCheck);
      // 只取新增部分
      const newFeedbacks: ResidentFeedback[] = afterDupAll.slice(currentFeedbacks.length);

      // Step 4: 统计批次信息
      let badDataRows = 0;
      let duplicateRows = 0;
      const affectedBayIds = new Set<string>();

      for (const fb of newFeedbacks) {
        if (fb.badDataFlags.length > 0) badDataRows++;
        if (fb.isDuplicate) duplicateRows++;
        if (fb.bayId) affectedBayIds.add(fb.bayId);
      }
      const validRows = rows.length - badDataRows;

      // Step 5: 创建 ImportBatch
      const batch: ImportBatch = {
        id: batchId,
        fileName,
        importedAt: now,
        totalRows: rows.length,
        validRows,
        badDataRows,
        duplicateRows,
        importedBy,
      };

      // Step 6: 更新 bays 计数（feedbackCount / duplicateCount / badDataCount）
      const updatedBays = currentBays.map((bay) => {
        if (!affectedBayIds.has(bay.id)) return bay;

        const bayFeedbacks = [...currentFeedbacks, ...newFeedbacks].filter(
          (fb) => fb.bayId === bay.id
        );
        return {
          ...bay,
          feedbackCount: bayFeedbacks.length,
          duplicateCount: bayFeedbacks.filter((fb) => fb.isDuplicate).length,
          badDataCount: bayFeedbacks.filter((fb) => fb.badDataFlags.length > 0).length,
          updatedAt: now,
        };
      });

      set({
        feedbacks: [...currentFeedbacks, ...newFeedbacks],
        bays: updatedBays,
        importBatches: [...get().importBatches, batch],
      });
      saveToStorage(get());

      return { batch, feedbacks: newFeedbacks };
    },

    /**
     * 将该批次的 filters 恢复到当前，返回批次
     */
    reExportFromBatch: (batchId: string) => {
      const batch = get().exportBatches.find((b) => b.id === batchId);
      if (!batch) return null;

      set({
        filters: { ...batch.filterCriteria },
      });
      saveToStorage(get());
      return batch;
    },
  };

  return initialState;
});

export default useBusBayStore;
