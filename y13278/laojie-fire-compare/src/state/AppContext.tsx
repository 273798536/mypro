import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { PlanService } from '../services/planService';
import type {
  FirePlan,
  UnifiedPlanView,
  UpdateContext,
  SceneAnnotation,
  ResidentFeedback,
  SitePhoto,
} from '../types';

interface AppState {
  currentUser: string;
  plans: FirePlan[];
  currentView: UnifiedPlanView | null;
  loading: boolean;
  error: string | null;
  notifications: Array<{ id: string; type: 'info' | 'warning' | 'error' | 'success'; message: string }>;
}

interface AppActions {
  setCurrentUser: (name: string) => void;
  loadPlans: () => Promise<void>;
  selectPlan: (planId: string | null) => Promise<void>;
  createPlan: (name: string, location: { lat: number; lng: number; address: string }) => Promise<void>;
  updatePlanField: (field: 'sceneSummary' | 'sideNote' | 'name', value: string) => Promise<void>;
  addAnnotation: (annotation: Omit<SceneAnnotation, 'id' | 'planId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addFeedback: (feedback: Omit<ResidentFeedback, 'id' | 'planId' | 'createdAt' | 'round'>) => Promise<void>;
  addPhoto: (photo: Omit<SitePhoto, 'id' | 'planId' | 'uploadedAt'>) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'accept_new' | 'keep_old' | 'merge_manual', snapshotId?: string) => Promise<void>;
  confirmPlan: () => Promise<void>;
  dismissError: () => void;
  dismissNotification: (id: string) => void;
}

type AppContextType = AppState & AppActions;

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState('周姐');
  const [plans, setPlans] = useState<FirePlan[]>([]);
  const [currentView, setCurrentView] = useState<UnifiedPlanView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppState['notifications']>([]);

  const ctx: () => UpdateContext = useCallback(
    () => ({ operator: currentUser, message: '' }),
    [currentUser],
  );

  const pushNotify = useCallback((type: AppState['notifications'][number]['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const list = await PlanService.listPlans();
      setPlans(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      pushNotify('error', '加载方案列表失败');
    } finally {
      setLoading(false);
    }
  }, [pushNotify]);

  const selectPlan = useCallback(async (planId: string | null) => {
    if (!planId) {
      setCurrentView(null);
      return;
    }
    try {
      setLoading(true);
      const view = await PlanService.getPlanView(planId);
      setCurrentView(view);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      pushNotify('error', '加载方案详情失败');
    } finally {
      setLoading(false);
    }
  }, [pushNotify]);

  const wrapMutation = useCallback(
    async <T,>(fn: () => Promise<T>, successMsg?: string): Promise<T | null> => {
      try {
        setLoading(true);
        setError(null);
        const result = await fn();
        if (successMsg) pushNotify('success', successMsg);
        await loadPlans();
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        pushNotify('error', msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [loadPlans, pushNotify],
  );

  const createPlan = useCallback(
    async (name: string, location: { lat: number; lng: number; address: string }) => {
      const view = await wrapMutation(
        () => PlanService.createPlan(name, location, ctx()),
        '方案创建成功',
      );
      if (view) {
        setCurrentView(view);
      }
    },
    [ctx, wrapMutation],
  );

  const updatePlanField = useCallback(
    async (field: 'sceneSummary' | 'sideNote' | 'name', value: string) => {
      if (!currentView) return;
      const view = await wrapMutation(
        () => PlanService.updatePlanDescription(currentView.plan.id, field, value, ctx()),
      );
      if (view) {
        setCurrentView(view);
        if (view.plan.conflicts.some(c => !c.resolved)) {
          pushNotify('warning', '检测到数据冲突，方案已挂起待复核');
        }
      }
    },
    [currentView, ctx, wrapMutation, pushNotify],
  );

  const addAnnotation = useCallback(
    async (annotation: Omit<SceneAnnotation, 'id' | 'planId' | 'createdAt' | 'updatedAt'>) => {
      if (!currentView) return;
      const view = await wrapMutation(
        () => PlanService.addAnnotation(currentView.plan.id, annotation, ctx()),
        '标注已添加',
      );
      if (view) {
        setCurrentView(view);
        if (view.plan.conflicts.some(c => !c.resolved)) {
          pushNotify('warning', '检测到地点命名冲突，请复核');
        }
      }
    },
    [currentView, ctx, wrapMutation, pushNotify],
  );

  const addFeedback = useCallback(
    async (feedback: Omit<ResidentFeedback, 'id' | 'planId' | 'createdAt' | 'round'>) => {
      if (!currentView) return;
      const view = await wrapMutation(
        () => PlanService.addFeedback(currentView.plan.id, feedback, ctx()),
        '居民反馈已记录',
      );
      if (view) setCurrentView(view);
    },
    [currentView, ctx, wrapMutation],
  );

  const addPhoto = useCallback(
    async (photo: Omit<SitePhoto, 'id' | 'planId' | 'uploadedAt'>) => {
      if (!currentView) return;
      const view = await wrapMutation(
        () => PlanService.addPhoto(currentView.plan.id, photo, ctx()),
        '现场照片已补录',
      );
      if (view) setCurrentView(view);
    },
    [currentView, ctx, wrapMutation],
  );

  const resolveConflict = useCallback(
    async (
      conflictId: string,
      resolution: 'accept_new' | 'keep_old' | 'merge_manual',
      snapshotId?: string,
    ) => {
      if (!currentView) return;
      const view = await wrapMutation(
        () => PlanService.resolveConflict(currentView.plan.id, conflictId, resolution, ctx(), snapshotId),
        '冲突已处理',
      );
      if (view) setCurrentView(view);
    },
    [currentView, ctx, wrapMutation],
  );

  const confirmPlan = useCallback(async () => {
    if (!currentView) return;
    const view = await wrapMutation(
      () => PlanService.confirmPlan(currentView.plan.id, ctx()),
      '方案已确认归档',
    );
    if (view) setCurrentView(view);
  }, [currentView, ctx, wrapMutation]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const value: AppContextType = {
    currentUser,
    plans,
    currentView,
    loading,
    error,
    notifications,
    setCurrentUser,
    loadPlans,
    selectPlan,
    createPlan,
    updatePlanField,
    addAnnotation,
    addFeedback,
    addPhoto,
    resolveConflict,
    confirmPlan,
    dismissError,
    dismissNotification,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
