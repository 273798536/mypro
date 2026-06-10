/**
 * 报告导出中心状态管理 Store
 * 管理报告模板选择、筛选条件、预览内容、导出状态等
 */

import { create } from 'zustand';
import type {
  ReportType,
  ExportFormat,
} from '@/types';
import type {
  ReportFormat,
} from '@/services/reportService';

/** 报告模板卡片信息 */
export interface ReportTemplateCard {
  /** 模板类型标识 */
  type: ReportType;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 图标名称（lucide-react） */
  iconName: string;
  /** 背景渐变色 */
  gradient: string;
  /** 上次使用时间 */
  lastUsedAt: string | null;
  /** 使用次数 */
  usageCount: number;
  /** 是否为推荐模板 */
  isRecommended: boolean;
}

/** 筛选条件状态 */
export interface ReportFilterState {
  /** 批号范围起始 */
  batchNumberStart: string;
  /** 批号范围结束 */
  batchNumberEnd: string;
  /** 日期范围起始 */
  dateStart: string;
  /** 日期范围结束 */
  dateEnd: string;
  /** 选中的物种ID列表 */
  selectedSpeciesIds: string[];
  /** 关键词搜索 */
  keyword: string;
}

/** 物种下拉选项 */
export interface SpeciesOption {
  /** 物种ID */
  id: string;
  /** 标准名称 */
  name: string;
  /** 别名列表 */
  aliases: string[];
  /** 关联样本数 */
  sampleCount: number;
}

/** 报告预览页 */
export interface ReportPreviewPage {
  /** 页码 */
  pageNumber: number;
  /** 页面HTML内容 */
  htmlContent: string;
  /** 页脚文本 */
  footerText: string;
}

/** 报告中心 Store 状态接口 */
interface ReportCenterStoreState {
  // ========== 模板选择 ==========
  /** 报告模板列表 */
  templateList: ReportTemplateCard[];
  /** 当前选中的模板类型 */
  selectedTemplate: ReportType | null;
  /** 模板悬停状态（用于动效） */
  hoveredTemplate: ReportType | null;

  // ========== 筛选条件 ==========
  /** 筛选条件 */
  filters: ReportFilterState;
  /** 可用物种选项列表 */
  speciesOptions: SpeciesOption[];
  /** 是否展开高级筛选 */
  showAdvancedFilters: boolean;

  // ========== 报告预览 ==========
  /** 报告标题 */
  reportTitle: string;
  /** 报告预览内容分页 */
  previewPages: ReportPreviewPage[];
  /** 当前预览页码 */
  currentPreviewPage: number;
  /** 总页数 */
  totalPages: number;
  /** 是否正在生成预览 */
  isGeneratingPreview: boolean;
  /** 预览缩放比例 */
  previewZoom: number;

  // ========== 导出操作 ==========
  /** 是否正在导出PDF */
  isExportingPdf: boolean;
  /** 是否正在导出Excel */
  isExportingExcel: boolean;
  /** 导出进度百分比 */
  exportProgress: number;
  /** 最近导出的文件URL */
  lastExportUrl: string | null;
  /** 最近导出的文件类型 */
  lastExportFormat: ExportFormat | null;

  // ========== 操作方法：模板选择 ==========
  /**
   * 选择报告模板
   */
  selectTemplate: (type: ReportType) => void;
  /**
   * 取消选择模板
   */
  clearSelectedTemplate: () => void;
  /**
   * 设置悬停模板
   */
  setHoveredTemplate: (type: ReportType | null) => void;
  /**
   * 刷新模板使用统计
   */
  refreshTemplateUsage: (type: ReportType) => void;

  // ========== 操作方法：筛选条件 ==========
  /**
   * 更新筛选条件
   */
  updateFilters: (patch: Partial<ReportFilterState>) => void;
  /**
   * 切换物种选中状态
   */
  toggleSpeciesSelection: (speciesId: string) => void;
  /**
   * 清空所有物种选中
   */
  clearSpeciesSelection: () => void;
  /**
   * 设置物种选项列表
   */
  setSpeciesOptions: (options: SpeciesOption[]) => void;
  /**
   * 切换高级筛选展开状态
   */
  toggleAdvancedFilters: () => void;
  /**
   * 重置所有筛选条件
   */
  resetFilters: () => void;

  // ========== 操作方法：报告预览 ==========
  /**
   * 设置报告标题
   */
  setReportTitle: (title: string) => void;
  /**
   * 设置预览页面内容
   */
  setPreviewPages: (pages: ReportPreviewPage[]) => void;
  /**
   * 跳转到指定预览页
   */
  goToPreviewPage: (pageNumber: number) => void;
  /**
   * 上一页
   */
  prevPreviewPage: () => void;
  /**
   * 下一页
   */
  nextPreviewPage: () => void;
  /**
   * 设置预览生成状态
   */
  setGeneratingPreview: (generating: boolean) => void;
  /**
   * 调整预览缩放比例
   */
  setPreviewZoom: (zoom: number) => void;
  /**
   * 重置预览
   */
  resetPreview: () => void;

  // ========== 操作方法：导出操作 ==========
  /**
   * 开始导出PDF
   */
  startExportPdf: () => void;
  /**
   * 开始导出Excel
   */
  startExportExcel: () => void;
  /**
   * 更新导出进度
   */
  updateExportProgress: (progress: number) => void;
  /**
   * 完成导出
   */
  finishExport: (url: string, format: ExportFormat) => void;
  /**
   * 取消/重置导出状态
   */
  resetExport: () => void;
}

/** 默认报告模板列表 */
const DEFAULT_TEMPLATES: ReportTemplateCard[] = [
  {
    type: 'batch_trace',
    name: '批号追溯报告',
    description: '按培养基批号追溯生产、检验、使用全流程记录，含质量检测与风险评估',
    iconName: 'PackageSearch',
    gradient: 'from-blue-500 to-indigo-600',
    lastUsedAt: '2026-06-05T10:30:00.000Z',
    usageCount: 42,
    isRecommended: true,
  },
  {
    type: 'species_consistency',
    name: '物种一致性报告',
    description: '分析物种名称录入规范性，比对同义词匹配结果，评估数据一致性',
    iconName: 'GitCompare',
    gradient: 'from-emerald-500 to-teal-600',
    lastUsedAt: '2026-06-08T14:15:00.000Z',
    usageCount: 28,
    isRecommended: true,
  },
  {
    type: 'full_audit',
    name: '全链路审计报告',
    description: '完整审计数据生命周期：导入、修改、版本、去重、修正、结论全链路追踪',
    iconName: 'ShieldCheck',
    gradient: 'from-purple-500 to-fuchsia-600',
    lastUsedAt: '2026-06-01T09:00:00.000Z',
    usageCount: 15,
    isRecommended: false,
  },
];

/** 默认物种选项列表 */
const DEFAULT_SPECIES_OPTIONS: SpeciesOption[] = [
  { id: 'SP-001', name: '大肠埃希氏菌', aliases: ['大肠杆菌', 'E. coli', 'Escherichia coli'], sampleCount: 150 },
  { id: 'SP-002', name: '金黄色葡萄球菌', aliases: ['金葡菌', 'S. aureus', 'Staphylococcus aureus'], sampleCount: 120 },
  { id: 'SP-003', name: '枯草芽孢杆菌', aliases: ['枯草杆菌', 'B. subtilis'], sampleCount: 85 },
  { id: 'SP-004', name: '铜绿假单胞菌', aliases: ['绿脓杆菌', 'P. aeruginosa'], sampleCount: 60 },
  { id: 'SP-005', name: '白色念珠菌', aliases: ['白假丝酵母菌', 'C. albicans', 'Candida albicans'], sampleCount: 55 },
  { id: 'SP-006', name: '鼠伤寒沙门氏菌', aliases: ['鼠伤寒沙门菌', 'Salmonella Typhimurium'], sampleCount: 42 },
  { id: 'SP-007', name: '黑曲霉', aliases: ['A. niger', 'Aspergillus niger'], sampleCount: 30 },
  { id: 'SP-008', name: '酿酒酵母', aliases: ['S. cerevisiae', 'Saccharomyces cerevisiae'], sampleCount: 25 },
];

/** 默认筛选条件 */
const DEFAULT_FILTERS: ReportFilterState = {
  batchNumberStart: '',
  batchNumberEnd: '',
  dateStart: '',
  dateEnd: '',
  selectedSpeciesIds: [],
  keyword: '',
};

export const useReportCenterStore = create<ReportCenterStoreState>((set, get) => ({
  // ========== 初始状态：模板选择 ==========
  templateList: [...DEFAULT_TEMPLATES],
  selectedTemplate: null,
  hoveredTemplate: null,

  // ========== 初始状态：筛选条件 ==========
  filters: { ...DEFAULT_FILTERS },
  speciesOptions: [...DEFAULT_SPECIES_OPTIONS],
  showAdvancedFilters: false,

  // ========== 初始状态：报告预览 ==========
  reportTitle: '',
  previewPages: [],
  currentPreviewPage: 1,
  totalPages: 0,
  isGeneratingPreview: false,
  previewZoom: 100,

  // ========== 初始状态：导出操作 ==========
  isExportingPdf: false,
  isExportingExcel: false,
  exportProgress: 0,
  lastExportUrl: null,
  lastExportFormat: null,

  // ========== 方法：模板选择 ==========
  selectTemplate: (type) => {
    set({ selectedTemplate: type });
  },

  clearSelectedTemplate: () => {
    set({ selectedTemplate: null });
  },

  setHoveredTemplate: (type) => {
    set({ hoveredTemplate: type });
  },

  refreshTemplateUsage: (type) => {
    set((state) => ({
      templateList: state.templateList.map((t) =>
        t.type === type
          ? { ...t, lastUsedAt: new Date().toISOString(), usageCount: t.usageCount + 1 }
          : t
      ),
    }));
  },

  // ========== 方法：筛选条件 ==========
  updateFilters: (patch) => {
    set((state) => ({
      filters: { ...state.filters, ...patch },
    }));
  },

  toggleSpeciesSelection: (speciesId) => {
    set((state) => {
      const current = state.filters.selectedSpeciesIds;
      const next = current.includes(speciesId)
        ? current.filter((id) => id !== speciesId)
        : [...current, speciesId];
      return { filters: { ...state.filters, selectedSpeciesIds: next } };
    });
  },

  clearSpeciesSelection: () => {
    set((state) => ({
      filters: { ...state.filters, selectedSpeciesIds: [] },
    }));
  },

  setSpeciesOptions: (options) => {
    set({ speciesOptions: options });
  },

  toggleAdvancedFilters: () => {
    set((state) => ({ showAdvancedFilters: !state.showAdvancedFilters }));
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  // ========== 方法：报告预览 ==========
  setReportTitle: (title) => {
    set({ reportTitle: title });
  },

  setPreviewPages: (pages) => {
    set({
      previewPages: pages,
      currentPreviewPage: 1,
      totalPages: pages.length,
    });
  },

  goToPreviewPage: (pageNumber) => {
    set((state) => ({
      currentPreviewPage: Math.max(1, Math.min(state.totalPages, pageNumber)),
    }));
  },

  prevPreviewPage: () => {
    set((state) => ({
      currentPreviewPage: Math.max(1, state.currentPreviewPage - 1),
    }));
  },

  nextPreviewPage: () => {
    set((state) => ({
      currentPreviewPage: Math.min(state.totalPages, state.currentPreviewPage + 1),
    }));
  },

  setGeneratingPreview: (generating) => {
    set({ isGeneratingPreview: generating });
  },

  setPreviewZoom: (zoom) => {
    set({ previewZoom: Math.max(50, Math.min(200, zoom)) });
  },

  resetPreview: () => {
    set({
      reportTitle: '',
      previewPages: [],
      currentPreviewPage: 1,
      totalPages: 0,
      previewZoom: 100,
    });
  },

  // ========== 方法：导出操作 ==========
  startExportPdf: () => {
    set({ isExportingPdf: true, exportProgress: 0 });
  },

  startExportExcel: () => {
    set({ isExportingExcel: true, exportProgress: 0 });
  },

  updateExportProgress: (progress) => {
    set({ exportProgress: Math.max(0, Math.min(100, progress)) });
  },

  finishExport: (url, format) => {
    set({
      isExportingPdf: false,
      isExportingExcel: false,
      exportProgress: 100,
      lastExportUrl: url,
      lastExportFormat: format,
    });
  },

  resetExport: () => {
    set({
      isExportingPdf: false,
      isExportingExcel: false,
      exportProgress: 0,
    });
  },
}));
