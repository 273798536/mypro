import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ShotSession, ShotPoint, SolutionType, ChangeRecord, PointStatus } from '../types';
import { mockShotSessions } from '../mockData';

interface AppContextType {
  sessions: ShotSession[];
  currentSession: ShotSession | null;
  setCurrentSession: (session: ShotSession | null) => void;
  importSession: (session: ShotSession) => void;
  updateSession: (id: string, updates: Partial<ShotSession>) => void;
  updatePoint: (sessionId: string, pointId: string, updates: Partial<ShotPoint>) => void;
  applySolution: (sessionId: string, type: SolutionType) => void;
  addChangeRecord: (
    sessionId: string, pointId: string, record: Omit<ChangeRecord, 'timestamp'>
  ) => void;
  getProcessedPoints: (session: ShotSession) => ShotPoint[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function applyReRunPoints(points: ShotPoint[]): { points: ShotPoint[]; affected: string[] } {
  const affected: string[] = [];
  const newPoints = points.map(p => {
    if (p.isOutlier && (p.outlierType === 'drift' || p.outlierType === 'noise')) {
      affected.push(p.id);
      return {
        ...p,
        x: p.originalX,
        y: p.originalY,
        z: p.originalZ,
        isOutlier: false,
        status: 're-run' as PointStatus,
        confidence: Math.min(0.95, p.confidence + 0.6),
      };
    }
    return p;
  });
  return { points: newPoints, affected };
}

function applyReRecordPoints(points: ShotPoint[]): { points: ShotPoint[]; affected: string[] } {
  const affected: string[] = [];
  const newPoints = points.map(p => {
    if (p.isOutlier && p.outlierType === 'camera-loss') {
      affected.push(p.id);
      return {
        ...p,
        x: p.originalX,
        y: p.originalY,
        z: p.originalZ,
        isOutlier: false,
        status: 're-recorded' as PointStatus,
        confidence: 0.88,
        source: '补录数据-传感器融合',
      };
    }
    return p;
  });
  return { points: newPoints, affected };
}

function applyManualPoints(points: ShotPoint[]): { points: ShotPoint[]; affected: string[] } {
  const affected: string[] = [];
  const newPoints = points.map(p => {
    if (p.isOutlier) {
      affected.push(p.id);
      if (p.outlierType === 'interference' || p.outlierType === 'unknown') {
        return {
          ...p,
          x: p.originalX,
          y: p.originalY,
          z: p.originalZ,
          isOutlier: false,
          status: 'manually-verified' as PointStatus,
          confidence: 0.92,
          notes: '人工确认：恢复原始值',
        };
      }
    }
    return p;
  });
  return { points: newPoints, affected };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ShotSession[]>(mockShotSessions);
  const [currentSession, setCurrentSession] = useState<ShotSession | null>(
    mockShotSessions[0] || null
  );

  const importSession = useCallback((session: ShotSession) => {
    setSessions(prev => [...prev, session]);
    setCurrentSession(session);
  }, []);

  const updateSession = useCallback((id: string, updates: Partial<ShotSession>) => {
    setSessions(prev => {
      const next = prev.map(s => (s.id === id ? { ...s, ...updates } : s));
      setCurrentSession(cur => (cur?.id === id ? { ...cur, ...updates } : cur));
      return next;
    });
  }, []);

  const updatePoint = useCallback(
    (sessionId: string, pointId: string, updates: Partial<ShotPoint>) => {
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? { ...s, points: s.points.map(p => (p.id === pointId ? { ...p, ...updates } : p)) }
            : s
        )
      );
      setCurrentSession(cur =>
        cur?.id === sessionId
          ? {
              ...cur,
              points: cur.points.map(p => (p.id === pointId ? { ...p, ...updates } : p)),
            }
          : cur
      );
    },
    []
  );

  const addChangeRecord = useCallback(
    (sessionId: string, pointId: string, record: Omit<ChangeRecord, 'timestamp'>) => {
      const full: ChangeRecord = { ...record, timestamp: Date.now() };
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId
            ? {
                ...s,
                points: s.points.map(p =>
                  p.id === pointId ? { ...p, changeHistory: [...p.changeHistory, full] } : p
                ),
              }
            : s
        )
      );
      setCurrentSession(cur =>
        cur?.id === sessionId
          ? {
              ...cur,
              points: cur.points.map(p =>
                p.id === pointId ? { ...p, changeHistory: [...p.changeHistory, full] } : p
              ),
            }
          : cur
      );
    },
    []
  );

  const applySolution = useCallback((sessionId: string, type: SolutionType) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== sessionId) return s;
        let result;
        if (type === 're-run') result = applyReRunPoints(s.points);
        else if (type === 're-record') result = applyReRecordPoints(s.points);
        else result = applyManualPoints(s.points);

        const sol = s.solutions[type];
        const allApplied =
          (type === 're-run' || s.solutions['re-run'].applied) &&
          (type === 're-record' || s.solutions['re-record'].applied) &&
          (type === 'manual' || s.solutions['manual'].applied);

        const newSolutions = {
          ...s.solutions,
          [type]: {
            ...sol,
            applied: true,
            appliedAt: Date.now(),
            operator: '规划设计师',
            affectedPointIds: [...sol.affectedPointIds, ...result.affected],
          },
        };

        const outlierAfter = result.points.filter(p => p.isOutlier).length;
        const processedConclusion =
          outlierAfter === 0
            ? `经过三步处理，所有异常点已恢复。原始${s.points.filter(p => p.isOutlier).length}个异常点已修正。`
            : `处理后仍有${outlierAfter}个异常点需要关注。`;

        return {
          ...s,
          points: result.points,
          solutions: newSolutions,
          processed: allApplied,
          conclusions: { ...s.conclusions, processed: processedConclusion },
        };
      })
    );
    setCurrentSession(cur => {
      if (cur?.id !== sessionId) return cur;
      let result;
      if (type === 're-run') result = applyReRunPoints(cur.points);
      else if (type === 're-record') result = applyReRecordPoints(cur.points);
      else result = applyManualPoints(cur.points);

      const sol = cur.solutions[type];
      const allApplied =
        (type === 're-run' || cur.solutions['re-run'].applied) &&
        (type === 're-record' || cur.solutions['re-record'].applied) &&
        (type === 'manual' || cur.solutions['manual'].applied);

      const newSolutions = {
        ...cur.solutions,
        [type]: {
          ...sol,
          applied: true,
          appliedAt: Date.now(),
          operator: '规划设计师',
          affectedPointIds: [...sol.affectedPointIds, ...result.affected],
        },
      };

      const outlierAfter = result.points.filter(p => p.isOutlier).length;
      const processedConclusion =
        outlierAfter === 0
          ? `经过三步处理，所有异常点已恢复。原始${cur.points.filter(p => p.isOutlier).length}个异常点已修正。`
          : `处理后仍有${outlierAfter}个异常点需要关注。`;

      return {
        ...cur,
        points: result.points,
        solutions: newSolutions,
        processed: allApplied,
        conclusions: { ...cur.conclusions, processed: processedConclusion },
      };
    });
  }, []);

  const getProcessedPoints = useCallback((session: ShotSession): ShotPoint[] => {
    return session.points;
  }, []);

  return (
    <AppContext.Provider
      value={{
        sessions,
        currentSession,
        setCurrentSession,
        importSession,
        updateSession,
        updatePoint,
        applySolution,
        addChangeRecord,
        getProcessedPoints,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
