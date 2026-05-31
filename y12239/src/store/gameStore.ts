import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameSession,
  ToolType,
  OperationRecord,
  ScoreReport,
  CorrectionRecord,
  UnitType,
  Point,
  CorrectionField,
  ExportOptions,
} from '@/types';
import { getDefaultTask, getTaskById } from '@/data/tasks';
import { generateId, generateScoreReport, recalculateScoreReport } from '@/utils/scoring';
import { performExport } from '@/utils/export';

interface GameState {
  currentSession: GameSession | null;
  sessions: GameSession[];
  currentTool: ToolType;
  selectedPoint: string | null;
  pathStartPoint: string | null;
  tempPath: Point[];
  isDrawingPath: boolean;
  highlightOperationId: string | null;

  startNewGame: (playerName: string, taskId?: string) => GameSession;
  setCurrentTool: (tool: ToolType) => void;
  selectSurveyPoint: (pointId: string) => void;
  recordAngleMeasurement: (pointId: string, angle: number, referencePoint: string) => void;
  recordDistanceInput: (pointId: string, distance: number, unit: UnitType) => void;
  startPathDrawing: (fromPointId: string) => void;
  addPathPoint: (point: Point) => void;
  finishPathDrawing: (toPointId: string) => void;
  cancelPathDrawing: () => void;
  submitGame: () => ScoreReport | null;
  applyCorrection: (
    operationId: string,
    field: CorrectionField,
    newValue: number | string,
    teacherName: string,
    remark: string
  ) => ScoreReport | null;
  setHighlightOperation: (operationId: string | null) => void;
  getSessionById: (sessionId: string) => GameSession | undefined;
  loadSession: (sessionId: string) => void;
  exportReport: (sessionId: string, options: ExportOptions) => void;
  resetCurrentGame: () => void;
}

const createInitialSession = (playerName: string, taskId: string): GameSession => {
  const task = getTaskById(taskId) || getDefaultTask();
  return {
    id: generateId(),
    playerName,
    startTime: Date.now(),
    taskId: task.id,
    status: 'playing',
    surveyPoints: task.surveyPoints.map((p) => ({
      ...p,
      id: generateId(),
      measured: false,
    })),
    obstacles: task.obstacles.map((o) => ({
      ...o,
      id: generateId(),
    })),
    operations: [],
    corrections: [],
    currentStep: 0,
  };
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      sessions: [],
      currentTool: 'select',
      selectedPoint: null,
      pathStartPoint: null,
      tempPath: [],
      isDrawingPath: false,
      highlightOperationId: null,

      startNewGame: (playerName: string, taskId?: string) => {
        const task = taskId || getDefaultTask().id;
        const session = createInitialSession(playerName, task);
        set((state) => ({
          currentSession: session,
          sessions: [...state.sessions, session],
          currentTool: 'select',
          selectedPoint: null,
          pathStartPoint: null,
          tempPath: [],
          isDrawingPath: false,
          highlightOperationId: null,
        }));
        return session;
      },

      setCurrentTool: (tool: ToolType) => {
        set({ currentTool: tool });
        if (tool !== 'path') {
          set({ pathStartPoint: null, tempPath: [], isDrawingPath: false });
        }
      },

      selectSurveyPoint: (pointId: string) => {
        const { currentSession, currentTool, startPathDrawing } = get();
        if (!currentSession) return;

        if (currentTool === 'path') {
          if (!get().pathStartPoint) {
            startPathDrawing(pointId);
          } else {
            get().finishPathDrawing(pointId);
          }
          return;
        }

        const operation: OperationRecord = {
          id: generateId(),
          timestamp: Date.now(),
          type: 'point_select',
          surveyPointId: pointId,
          data: {},
        };

        const updatedPoints = currentSession.surveyPoints.map((p) =>
          p.id === pointId ? { ...p, measured: true } : p
        );

        set((state) => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                surveyPoints: updatedPoints,
                operations: [...state.currentSession.operations, operation],
              }
            : null,
          selectedPoint: pointId,
        }));
      },

      recordAngleMeasurement: (pointId: string, angle: number, referencePoint: string) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const operation: OperationRecord = {
          id: generateId(),
          timestamp: Date.now(),
          type: 'angle_measure',
          surveyPointId: pointId,
          data: {
            angle,
            referencePoint,
          },
        };

        set((state) => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                operations: [...state.currentSession.operations, operation],
              }
            : null,
        }));
      },

      recordDistanceInput: (pointId: string, distance: number, unit: UnitType) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const operation: OperationRecord = {
          id: generateId(),
          timestamp: Date.now(),
          type: 'distance_input',
          surveyPointId: pointId,
          data: {
            distance,
            unit,
          },
        };

        set((state) => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                operations: [...state.currentSession.operations, operation],
              }
            : null,
        }));
      },

      startPathDrawing: (fromPointId: string) => {
        const point = get().currentSession?.surveyPoints.find((p) => p.id === fromPointId);
        if (!point) return;

        set({
          pathStartPoint: fromPointId,
          tempPath: [{ x: point.x, y: point.y }],
          isDrawingPath: true,
        });
      },

      addPathPoint: (point: Point) => {
        if (!get().isDrawingPath) return;
        set((state) => ({
          tempPath: [...state.tempPath, point],
        }));
      },

      finishPathDrawing: (toPointId: string) => {
        const { currentSession, pathStartPoint, tempPath } = get();
        if (!currentSession || !pathStartPoint || tempPath.length < 2) {
          get().cancelPathDrawing();
          return;
        }

        const toPoint = currentSession.surveyPoints.find((p) => p.id === toPointId);
        if (!toPoint) {
          get().cancelPathDrawing();
          return;
        }

        const finalPath = [...tempPath, { x: toPoint.x, y: toPoint.y }];

        const operation: OperationRecord = {
          id: generateId(),
          timestamp: Date.now(),
          type: 'path_draw',
          data: {
            fromPoint: pathStartPoint,
            toPoint: toPointId,
            pathPoints: finalPath,
          },
        };

        set((state) => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                operations: [...state.currentSession.operations, operation],
              }
            : null,
          pathStartPoint: null,
          tempPath: [],
          isDrawingPath: false,
        }));
      },

      cancelPathDrawing: () => {
        set({
          pathStartPoint: null,
          tempPath: [],
          isDrawingPath: false,
        });
      },

      submitGame: () => {
        const { currentSession } = get();
        if (!currentSession) return null;

        const task = getTaskById(currentSession.taskId) || getDefaultTask();
        const report = generateScoreReport(currentSession, task);

        const updatedSession: GameSession = {
          ...currentSession,
          endTime: Date.now(),
          status: 'submitted',
          scoreReport: report,
        };

        set((state) => ({
          currentSession: updatedSession,
          sessions: state.sessions.map((s) =>
            s.id === updatedSession.id ? updatedSession : s
          ),
        }));

        return report;
      },

      applyCorrection: (
        operationId: string,
        field: CorrectionField,
        newValue: number | string,
        teacherName: string,
        remark: string
      ) => {
        const { currentSession } = get();
        if (!currentSession) return null;

        const operation = currentSession.operations.find((o) => o.id === operationId);
        if (!operation) return null;

        const rawValue = operation.data[field as keyof typeof operation.data];
        if (rawValue === undefined) return null;

        const oldValue = rawValue as number | string;

        const correction: CorrectionRecord = {
          id: generateId(),
          timestamp: Date.now(),
          teacherName,
          operationId,
          field,
          oldValue,
          newValue,
          remark,
        };

        const correctedOperations = currentSession.operations.map((op) => {
          if (op.id === operationId) {
            return {
              ...op,
              data: {
                ...op.data,
                [field]: newValue,
              },
            };
          }
          return op;
        });

        const task = getTaskById(currentSession.taskId) || getDefaultTask();
        const recalculatedReport = recalculateScoreReport(
          currentSession,
          task,
          correctedOperations
        );
        correction.recalculatedScores = recalculatedReport;

        const updatedSession: GameSession = {
          ...currentSession,
          operations: correctedOperations,
          corrections: [...currentSession.corrections, correction],
          scoreReport: recalculatedReport,
          status: 'reviewed',
        };

        set((state) => ({
          currentSession: updatedSession,
          sessions: state.sessions.map((s) =>
            s.id === updatedSession.id ? updatedSession : s
          ),
        }));

        return recalculatedReport;
      },

      setHighlightOperation: (operationId: string | null) => {
        set({ highlightOperationId: operationId });
      },

      getSessionById: (sessionId: string) => {
        return get().sessions.find((s) => s.id === sessionId);
      },

      loadSession: (sessionId: string) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (session) {
          set({ currentSession: session });
        }
      },

      exportReport: (sessionId: string, options: ExportOptions) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session || !session.scoreReport) return;

        performExport(session, options, session.scoreReport);
      },

      resetCurrentGame: () => {
        set({
          currentSession: null,
          currentTool: 'select',
          selectedPoint: null,
          pathStartPoint: null,
          tempPath: [],
          isDrawingPath: false,
          highlightOperationId: null,
        });
      },
    }),
    {
      name: 'geometry-survey-storage',
    }
  )
);
