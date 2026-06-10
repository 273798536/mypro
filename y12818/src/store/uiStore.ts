/**
 * UI 全局状态管理 Store
 * 管理应用级UI状态：主题、侧边栏、通知、面包屑、模态框、页面布局等
 */

import { create } from 'zustand';
import { persist as persistMiddleware } from 'zustand/middleware';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 页面布局模式 */
export type LayoutMode = 'default' | 'compact' | 'wide';

/** 通知级别 */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/** 通知项 */
export interface NotificationItem {
  /** 唯一ID */
  id: string;
  /** 通知级别 */
  level: NotificationLevel;
  /** 标题 */
  title: string;
  /** 详细内容（可选） */
  message?: string;
  /** 持续时间（毫秒），0表示不自动消失 */
  duration: number;
  /** 创建时间 */
  createdAt: number;
  /** 是否可关闭 */
  closable: boolean;
  /** 点击操作回调标识（字符串，用于路由跳转等） */
  action?: {
    label: string;
    target: string;
  };
}

/** 面包屑项 */
export interface BreadcrumbItem {
  /** 显示名称 */
  label: string;
  /** 路由路径（可选，最后一级可为空） */
  path?: string;
  /** 图标名称（可选） */
  icon?: string;
}

/** 侧边栏菜单项状态（展开/折叠） */
export interface MenuState {
  /** 展开的菜单key集合 */
  expandedKeys: Set<string>;
  /** 当前选中的菜单key */
  selectedKey: string | null;
}

/** 模态框配置 */
export interface ModalConfig {
  /** 模态框唯一标识 */
  key: string;
  /** 是否打开 */
  open: boolean;
  /** 标题 */
  title: string;
  /** 模态框大小 */
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 自定义数据 */
  data?: unknown;
  /** 打开时间 */
  openedAt?: number;
}

/** 全局加载状态类型 */
export type LoadingType =
  | 'global'      // 全局加载（页面切换等）
  | 'data'        // 数据加载
  | 'submitting'  // 表单提交
  | 'exporting'   // 导出中
  | 'importing';  // 导入中

/** UI Store 状态与操作 */
interface UiStoreState {
  // ========== 主题与外观 ==========
  /** 主题模式 */
  themeMode: ThemeMode;
  /** 实际应用的主题（light/dark，system模式计算后的结果） */
  appliedTheme: 'light' | 'dark';
  /** 页面布局模式 */
  layoutMode: LayoutMode;
  /** 主色调（十六进制颜色值） */
  primaryColor: string;
  /** 圆角等级（0-3） */
  borderRadiusLevel: number;

  // ========== 侧边栏与导航 ==========
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 侧边栏是否显示（移动端抽屉式） */
  sidebarVisible: boolean;
  /** 菜单状态 */
  menuState: MenuState;
  /** 面包屑路径 */
  breadcrumbs: BreadcrumbItem[];
  /** 当前页面标题 */
  pageTitle: string;
  /** 当前页面副标题（可选） */
  pageSubtitle?: string;

  // ========== 通知系统 ==========
  /** 通知列表 */
  notifications: NotificationItem[];
  /** 通知中心是否打开 */
  notificationCenterOpen: boolean;
  /** 未读通知数量（按级别缓存） */
  unreadCount: Record<NotificationLevel, number>;

  // ========== 加载状态 ==========
  /** 各类型加载状态计数（>0表示加载中） */
  loadingStates: Record<LoadingType, number>;
  /** 全局加载提示文案 */
  globalLoadingText: string;

  // ========== 模态框管理 ==========
  /** 已打开的模态框集合 */
  openModals: Map<string, ModalConfig>;

  // ========== 搜索与快捷操作 ==========
  /** 全局搜索框是否聚焦 */
  globalSearchFocused: boolean;
  /** 搜索关键词 */
  globalSearchKeyword: string;
  /** 命令面板是否打开 */
  commandPaletteOpen: boolean;

  // ========== 用户偏好 ==========
  /** 是否启用动画效果 */
  animationEnabled: boolean;
  /** 是否启用紧凑模式表格 */
  denseTable: boolean;
  /** 每页默认条数 */
  defaultPageSize: number;
  /** 语言 */
  language: 'zh-CN' | 'en-US';

  // ========== 主题操作 ==========
  /**
   * 设置主题模式
   * @param mode 主题模式
   */
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * 切换明暗主题（在light/dark之间切换，忽略system）
   */
  toggleTheme: () => void;
  /**
   * 应用系统主题（当mode=system时调用，监听系统变化）
   * @param isDark 系统是否为暗色模式
   */
  applySystemTheme: (isDark: boolean) => void;
  /**
   * 设置布局模式
   * @param mode 布局模式
   */
  setLayoutMode: (mode: LayoutMode) => void;
  /**
   * 设置主色调
   * @param color 十六进制颜色
   */
  setPrimaryColor: (color: string) => void;
  /**
   * 设置圆角等级
   * @param level 0-3
   */
  setBorderRadiusLevel: (level: number) => void;

  // ========== 侧边栏与导航操作 ==========
  /**
   * 切换侧边栏折叠状态
   * @param collapsed 可选：指定折叠状态，不传则取反
   */
  toggleSidebar: (collapsed?: boolean) => void;
  /**
   * 设置侧边栏显示状态（移动端）
   * @param visible 是否显示
   */
  setSidebarVisible: (visible: boolean) => void;
  /**
   * 设置菜单展开项
   * @param key 菜单key
   * @param expand 是否展开
   */
  toggleMenuExpand: (key: string, expand?: boolean) => void;
  /**
   * 设置当前选中菜单项
   * @param key 菜单key
   */
  setSelectedMenu: (key: string | null) => void;
  /**
   * 设置面包屑路径
   * @param items 面包屑项数组
   */
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  /**
   * 设置页面标题
   * @param title 主标题
   * @param subtitle 副标题
   */
  setPageTitle: (title: string, subtitle?: string) => void;

  // ========== 通知操作 ==========
  /**
   * 显示通知
   * @param notification 通知配置
   * @returns 通知ID
   */
  showNotification: (
    notification: Omit<NotificationItem, 'id' | 'createdAt'>
  ) => string;
  /**
   * 快捷方法：显示成功通知
   * @param title 标题
   * @param message 详细内容
   * @param duration 持续时间
   */
  showSuccess: (title: string, message?: string, duration?: number) => string;
  /**
   * 快捷方法：显示错误通知
   * @param title 标题
   * @param message 详细内容
   * @param duration 持续时间
   */
  showError: (title: string, message?: string, duration?: number) => string;
  /**
   * 快捷方法：显示警告通知
   * @param title 标题
   * @param message 详细内容
   * @param duration 持续时间
   */
  showWarning: (title: string, message?: string, duration?: number) => string;
  /**
   * 快捷方法：显示信息通知
   * @param title 标题
   * @param message 详细内容
   * @param duration 持续时间
   */
  showInfo: (title: string, message?: string, duration?: number) => string;
  /**
   * 手动移除通知
   * @param id 通知ID
   */
  removeNotification: (id: string) => void;
  /**
   * 清空所有通知
   */
  clearNotifications: () => void;
  /**
   * 切换通知中心开关
   * @param open 可选：指定状态
   */
  toggleNotificationCenter: (open?: boolean) => void;
  /**
   * 标记所有通知为已读
   */
  markAllAsRead: () => void;

  // ========== 加载状态操作 ==========
  /**
   * 进入加载状态（计数+1）
   * @param type 加载类型
   * @param text 加载文案（仅global类型生效）
   */
  startLoading: (type: LoadingType, text?: string) => void;
  /**
   * 结束加载状态（计数-1）
   * @param type 加载类型
   */
  stopLoading: (type: LoadingType) => void;
  /**
   * 判断某类型是否正在加载
   * @param type 加载类型
   */
  isLoading: (type: LoadingType) => boolean;
  /**
   * 是否有任何加载进行中
   */
  hasAnyLoading: () => boolean;

  // ========== 模态框操作 ==========
  /**
   * 打开模态框
   * @param config 模态框配置
   */
  openModal: (config: Omit<ModalConfig, 'open' | 'openedAt'>) => void;
  /**
   * 关闭模态框
   * @param key 模态框标识
   */
  closeModal: (key: string) => void;
  /**
   * 获取模态框配置
   * @param key 模态框标识
   */
  getModal: (key: string) => ModalConfig | undefined;
  /**
   * 更新模态框数据
   * @param key 模态框标识
   * @param data 自定义数据
   */
  updateModalData: (key: string, data: unknown) => void;
  /**
   * 关闭所有模态框
   */
  closeAllModals: () => void;

  // ========== 搜索与快捷操作 ==========
  /**
   * 设置全局搜索聚焦状态
   * @param focused 是否聚焦
   */
  setGlobalSearchFocused: (focused: boolean) => void;
  /**
   * 设置全局搜索关键词
   * @param keyword 关键词
   */
  setGlobalSearchKeyword: (keyword: string) => void;
  /**
   * 切换命令面板
   * @param open 可选：指定状态
   */
  toggleCommandPalette: (open?: boolean) => void;

  // ========== 用户偏好操作 ==========
  /**
   * 设置是否启用动画
   * @param enabled 是否启用
   */
  setAnimationEnabled: (enabled: boolean) => void;
  /**
   * 设置表格紧凑模式
   * @param dense 是否紧凑
   */
  setDenseTable: (dense: boolean) => void;
  /**
   * 设置默认分页大小
   * @param size 每页条数
   */
  setDefaultPageSize: (size: number) => void;
  /**
   * 切换语言
   * @param lang 语言
   */
  setLanguage: (lang: 'zh-CN' | 'en-US') => void;

  // ========== 综合操作 ==========
  /**
   * 重置所有UI状态为默认值（保留用户偏好）
   */
  resetUiState: () => void;
  /**
   * 获取整体UI状态摘要（用于调试）
   */
  getUiSummary: () => {
    activeModals: number;
    pendingNotifications: number;
    activeLoadingTypes: string[];
    currentTheme: string;
  };
}

/** 生成通知唯一ID */
function genNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/** 默认主色调 */
const DEFAULT_PRIMARY_COLOR = '#1677ff';

/** 默认加载状态 */
const INITIAL_LOADING_STATES: Record<LoadingType, number> = {
  global: 0,
  data: 0,
  submitting: 0,
  exporting: 0,
  importing: 0
};

/** 默认未读计数 */
const INITIAL_UNREAD_COUNT: Record<NotificationLevel, number> = {
  info: 0,
  success: 0,
  warning: 0,
  error: 0
};

/**
 * 检测系统当前主题（用于初始化）
 */
function detectSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useUiStore = create<UiStoreState>()(
  persistMiddleware(
    (set, get) => ({
      // ========== 初始状态：主题与外观 ==========
      themeMode: 'system',
      appliedTheme: typeof window !== 'undefined' ? detectSystemTheme() : 'light',
      layoutMode: 'default',
      primaryColor: DEFAULT_PRIMARY_COLOR,
      borderRadiusLevel: 2,

      // ========== 初始状态：侧边栏与导航 ==========
      sidebarCollapsed: false,
      sidebarVisible: false,
      menuState: {
        expandedKeys: new Set(),
        selectedKey: null
      },
      breadcrumbs: [],
      pageTitle: '',
      pageSubtitle: undefined,

      // ========== 初始状态：通知 ==========
      notifications: [],
      notificationCenterOpen: false,
      unreadCount: { ...INITIAL_UNREAD_COUNT },

      // ========== 初始状态：加载 ==========
      loadingStates: { ...INITIAL_LOADING_STATES },
      globalLoadingText: '加载中...',

      // ========== 初始状态：模态框 ==========
      openModals: new Map(),

      // ========== 初始状态：搜索与快捷操作 ==========
      globalSearchFocused: false,
      globalSearchKeyword: '',
      commandPaletteOpen: false,

      // ========== 初始状态：用户偏好 ==========
      animationEnabled: true,
      denseTable: false,
      defaultPageSize: 20,
      language: 'zh-CN',

      // ========== 主题操作 ==========
      setThemeMode: (mode) => {
        set({ themeMode: mode });
        if (mode !== 'system') {
          set({ appliedTheme: mode });
        } else {
          get().applySystemTheme(detectSystemTheme() === 'dark');
        }
      },

      toggleTheme: () => {
        const current = get().themeMode;
        const isDark = current === 'system' ? get().appliedTheme === 'dark' : current === 'dark';
        const next: ThemeMode = isDark ? 'light' : 'dark';
        set({ themeMode: next, appliedTheme: next });
      },

      applySystemTheme: (isDark) => {
        if (get().themeMode === 'system') {
          set({ appliedTheme: isDark ? 'dark' : 'light' });
        }
      },

      setLayoutMode: (mode) => set({ layoutMode: mode }),

      setPrimaryColor: (color) => set({ primaryColor: color }),

      setBorderRadiusLevel: (level) =>
        set({ borderRadiusLevel: Math.max(0, Math.min(3, level)) }),

      // ========== 侧边栏操作 ==========
      toggleSidebar: (collapsed) => {
        const target = collapsed ?? !get().sidebarCollapsed;
        set({ sidebarCollapsed: target });
      },

      setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

      toggleMenuExpand: (key, expand) => {
        set((state) => {
          const newExpanded = new Set(state.menuState.expandedKeys);
          const shouldExpand = expand ?? !newExpanded.has(key);
          if (shouldExpand) {
            newExpanded.add(key);
          } else {
            newExpanded.delete(key);
          }
          return { menuState: { ...state.menuState, expandedKeys: newExpanded } };
        });
      },

      setSelectedMenu: (key) => {
        set((state) => ({
          menuState: { ...state.menuState, selectedKey: key }
        }));
      },

      setBreadcrumbs: (items) => set({ breadcrumbs: items }),

      setPageTitle: (title, subtitle) => set({
        pageTitle: title,
        pageSubtitle: subtitle
      }),

      // ========== 通知操作 ==========
      showNotification: (notification) => {
        const id = genNotificationId();
        const item: NotificationItem = {
          ...notification,
          id,
          createdAt: Date.now()
        };
        set((state) => {
          const newUnread = { ...state.unreadCount };
          newUnread[item.level]++;
          return {
            notifications: [...state.notifications, item],
            unreadCount: newUnread
          };
        });
        // 自动消失
        if (item.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, item.duration);
        }
        return id;
      },

      showSuccess: (title, message, duration = 3000) =>
        get().showNotification({
          level: 'success',
          title,
          message,
          duration,
          closable: true
        }),

      showError: (title, message, duration = 5000) =>
        get().showNotification({
          level: 'error',
          title,
          message,
          duration,
          closable: true
        }),

      showWarning: (title, message, duration = 4000) =>
        get().showNotification({
          level: 'warning',
          title,
          message,
          duration,
          closable: true
        }),

      showInfo: (title, message, duration = 3000) =>
        get().showNotification({
          level: 'info',
          title,
          message,
          duration,
          closable: true
        }),

      removeNotification: (id) => {
        set((state) => {
          const target = state.notifications.find((n) => n.id === id);
          if (!target) return {};
          const newUnread = { ...state.unreadCount };
          if (newUnread[target.level] > 0) {
            newUnread[target.level]--;
          }
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: newUnread
          };
        });
      },

      clearNotifications: () =>
        set({
          notifications: [],
          unreadCount: { ...INITIAL_UNREAD_COUNT }
        }),

      toggleNotificationCenter: (open) => {
        set((state) => ({
          notificationCenterOpen: open ?? !state.notificationCenterOpen
        }));
      },

      markAllAsRead: () => set({ unreadCount: { ...INITIAL_UNREAD_COUNT } }),

      // ========== 加载状态操作 ==========
      startLoading: (type, text) => {
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [type]: state.loadingStates[type] + 1
          },
          globalLoadingText: type === 'global' && text ? text : state.globalLoadingText
        }));
      },

      stopLoading: (type) => {
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [type]: Math.max(0, state.loadingStates[type] - 1)
          }
        }));
      },

      isLoading: (type) => get().loadingStates[type] > 0,

      hasAnyLoading: () =>
        Object.values(get().loadingStates).some((count) => (count as number) > 0),

      // ========== 模态框操作 ==========
      openModal: (config) => {
        set((state) => {
          const newMap = new Map(state.openModals);
          newMap.set(config.key, {
            ...config,
            open: true,
            openedAt: Date.now()
          });
          return { openModals: newMap };
        });
      },

      closeModal: (key) => {
        set((state) => {
          const newMap = new Map(state.openModals);
          newMap.delete(key);
          return { openModals: newMap };
        });
      },

      getModal: (key) => get().openModals.get(key),

      updateModalData: (key, data) => {
        set((state) => {
          const existing = state.openModals.get(key);
          if (!existing) return {};
          const newMap = new Map(state.openModals);
          newMap.set(key, { ...existing, data });
          return { openModals: newMap };
        });
      },

      closeAllModals: () => set({ openModals: new Map() }),

      // ========== 搜索操作 ==========
      setGlobalSearchFocused: (focused) => set({ globalSearchFocused: focused }),

      setGlobalSearchKeyword: (keyword) => set({ globalSearchKeyword: keyword }),

      toggleCommandPalette: (open) => {
        set((state) => ({
          commandPaletteOpen: open ?? !state.commandPaletteOpen
        }));
      },

      // ========== 用户偏好操作 ==========
      setAnimationEnabled: (enabled) => set({ animationEnabled: enabled }),

      setDenseTable: (dense) => set({ denseTable: dense }),

      setDefaultPageSize: (size) =>
        set({ defaultPageSize: Math.max(1, Math.min(100, size)) }),

      setLanguage: (lang) => set({ language: lang }),

      // ========== 综合操作 ==========
      resetUiState: () => {
        const userPrefs = {
          themeMode: get().themeMode,
          appliedTheme: get().appliedTheme,
          primaryColor: get().primaryColor,
          layoutMode: get().layoutMode,
          borderRadiusLevel: get().borderRadiusLevel,
          sidebarCollapsed: get().sidebarCollapsed,
          animationEnabled: get().animationEnabled,
          denseTable: get().denseTable,
          defaultPageSize: get().defaultPageSize,
          language: get().language
        };
        set({
          menuState: { expandedKeys: new Set(), selectedKey: null },
          breadcrumbs: [],
          pageTitle: '',
          pageSubtitle: undefined,
          notifications: [],
          notificationCenterOpen: false,
          unreadCount: { ...INITIAL_UNREAD_COUNT },
          loadingStates: { ...INITIAL_LOADING_STATES },
          globalLoadingText: '加载中...',
          openModals: new Map(),
          globalSearchFocused: false,
          globalSearchKeyword: '',
          commandPaletteOpen: false,
          sidebarVisible: false,
          ...userPrefs
        });
      },

      getUiSummary: () => {
        const state = get();
        const activeLoadingTypes = Object.entries(state.loadingStates)
          .filter(([, v]) => (v as number) > 0)
          .map(([k]) => k);
        return {
          activeModals: state.openModals.size,
          pendingNotifications: state.notifications.length,
          activeLoadingTypes,
          currentTheme: state.themeMode === 'system'
            ? `system (${state.appliedTheme})`
            : state.themeMode
        };
      }
    }),
    {
      name: 'ui-store-storage',
      partialize: (state) => ({
        // 持久化用户偏好
        themeMode: state.themeMode,
        appliedTheme: state.appliedTheme,
        layoutMode: state.layoutMode,
        primaryColor: state.primaryColor,
        borderRadiusLevel: state.borderRadiusLevel,
        sidebarCollapsed: state.sidebarCollapsed,
        animationEnabled: state.animationEnabled,
        denseTable: state.denseTable,
        defaultPageSize: state.defaultPageSize,
        language: state.language,
        menuState: {
          expandedKeys: Array.from(state.menuState.expandedKeys),
          selectedKey: state.menuState.selectedKey
        }
      }),
      onRehydrateStorage: () => (state) => {
        // 重新构建Set类型（JSON序列化后是数组）
        if (state?.menuState) {
          const keys = state.menuState.expandedKeys;
          if (Array.isArray(keys)) {
            state.menuState.expandedKeys = new Set(keys);
          }
        }
      }
    }
  )
);
