import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Sticker,
  ActionLog,
  ColorRule,
  GameState,
  AppError,
  StickerType,
  TraceChain,
  TraceStep,
  ExportSummary,
  DuplicateInfo,
  MergeStrategy
} from '../types';

const STICKER_TYPES: { type: StickerType; label: string; color: string }[] = [
  { type: 'acid', label: '腐蚀性酸', color: '#F53F3F' },
  { type: 'flammable', label: '易燃物', color: '#FF7D00' },
  { type: 'toxic', label: '有毒物', color: '#722ED1' },
  { type: 'oxidizer', label: '氧化剂', color: '#F7BA1E' },
  { type: 'corrosive', label: '腐蚀品', color: '#165DFF' },
  { type: 'explosive', label: '爆炸物', color: '#EB2F96' },
];

const DEFAULT_COLOR_RULES: ColorRule[] = STICKER_TYPES.map((s, i) => ({
  id: `rule-${i}`,
  stickerType: s.type,
  requiredColors: [s.color],
  flipColorMap: { [s.color]: s.color }
}));

interface HistoryState {
  undoStack: ActionLog[][];
  redoStack: ActionLog[][];
}

interface AppState {
  game: GameState;
  stickers: Sticker[];
  history: HistoryState;
  errors: AppError[];
  colorRules: ColorRule[];
  traceChains: Map<string, TraceChain>;
  pendingDuplicates: DuplicateInfo[];
  
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;
  updateElapsedTime: (time: number) => void;
  
  addSticker: (type: StickerType, x: number, y: number) => void;
  moveSticker: (id: string, x: number, y: number) => void;
  flipSticker: (id: string) => void;
  deleteSticker: (id: string) => void;
  updateStickerVerification: (id: string, verified: boolean) => void;
  
  pushHistory: (actions: ActionLog[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  
  getTraceChain: (stickerId: string) => TraceChain | null;
  
  importStickers: (data: Sticker[]) => DuplicateInfo[];
  resolveDuplicate: (existingId: string, strategy: MergeStrategy, newData: Sticker) => void;
  
  getExportSummary: () => ExportSummary;
  getConsistencyCheck: () => { consistent: boolean; inconsistencies: string[] };
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const createActionLog = (
  type: ActionLog['type'],
  stickerId: string,
  before: Partial<Sticker>,
  after: Partial<Sticker>,
  description: string
): ActionLog => ({
  id: generateId(),
  type,
  stickerId,
  before,
  after,
  timestamp: Date.now(),
  operator: '车间主管',
  description
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      game: {
        status: 'idle',
        startTime: null,
        elapsedTime: 0,
        progress: 0,
        totalStickers: 10,
        placedStickers: 0
      },
      stickers: [],
      history: {
        undoStack: [],
        redoStack: []
      },
      errors: [],
      colorRules: DEFAULT_COLOR_RULES,
      traceChains: new Map(),
      pendingDuplicates: [],

      startGame: () => set((state) => ({
        game: {
          ...state.game,
          status: 'playing',
          startTime: Date.now(),
          progress: 0,
          placedStickers: 0
        }
      })),

      pauseGame: () => set((state) => ({
        game: { ...state.game, status: 'paused' }
      })),

      resumeGame: () => set((state) => ({
        game: { ...state.game, status: 'playing' }
      })),

      resetGame: () => set({
        game: {
          status: 'idle',
          startTime: null,
          elapsedTime: 0,
          progress: 0,
          totalStickers: 10,
          placedStickers: 0
        },
        stickers: [],
        history: { undoStack: [], redoStack: [] },
        errors: [],
        pendingDuplicates: []
      }),

      finishGame: () => set((state) => ({
        game: { ...state.game, status: 'finished' }
      })),

      updateElapsedTime: (time: number) => set((state) => ({
        game: { ...state.game, elapsedTime: time }
      })),

      addSticker: (type, x, y) => {
        const stickerConfig = STICKER_TYPES.find(s => s.type === type);
        if (!stickerConfig) return;

        const newSticker: Sticker = {
          id: generateId(),
          type,
          label: stickerConfig.label,
          color: stickerConfig.color,
          x,
          y,
          flipped: false,
          originalX: x,
          originalY: y,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          verified: false
        };

        const action = createActionLog(
          'create',
          newSticker.id,
          {},
          newSticker,
          `添加贴纸: ${stickerConfig.label}`
        );

        set((state) => {
          const traceChains = new Map(state.traceChains);
          const traceStep: TraceStep = {
            actionId: action.id,
            description: action.description,
            timestamp: action.timestamp,
            details: { type, x, y }
          };
          traceChains.set(newSticker.id, {
            resultId: newSticker.id,
            steps: [traceStep],
            sourceData: { imported: false, createdAt: newSticker.createdAt }
          });

          return {
            stickers: [...state.stickers, newSticker],
            traceChains,
            game: {
              ...state.game,
              placedStickers: state.game.placedStickers + 1,
              progress: Math.min(100, ((state.game.placedStickers + 1) / state.game.totalStickers) * 100)
            }
          };
        });

        get().pushHistory([action]);
      },

      moveSticker: (id, x, y) => {
        const sticker = get().stickers.find(s => s.id === id);
        if (!sticker) return;

        const action = createActionLog(
          'move',
          id,
          { x: sticker.x, y: sticker.y },
          { x, y },
          `移动贴纸: ${sticker.label} 到 (${x}, ${y})`
        );

        set((state) => {
          const traceChains = new Map(state.traceChains);
          const chain = traceChains.get(id);
          if (chain) {
            chain.steps.push({
              actionId: action.id,
              description: action.description,
              timestamp: action.timestamp,
              details: { fromX: sticker.x, fromY: sticker.y, toX: x, toY: y }
            });
          }

          return {
            stickers: state.stickers.map(s =>
              s.id === id ? { ...s, x, y, updatedAt: Date.now() } : s
            ),
            traceChains
          };
        });

        get().pushHistory([action]);
      },

      flipSticker: (id) => {
        const sticker = get().stickers.find(s => s.id === id);
        if (!sticker) return;

        const rule = get().colorRules.find(r => r.stickerType === sticker.type);
        const newFlipped = !sticker.flipped;

        let newColor = sticker.color;
        if (rule?.flipColorMap && rule.flipColorMap[sticker.color]) {
          newColor = rule.flipColorMap[sticker.color];
        }

        if (!rule?.requiredColors.includes(newColor)) {
          get().addError({
            type: 'color_missing',
            message: `贴纸「${sticker.label}」翻转时颜色规则校验失败`,
            actionable: `请在颜色规则中添加 ${sticker.type} 类型的翻转颜色映射`,
            stickerId: id
          });
          return;
        }

        const action = createActionLog(
          'flip',
          id,
          { flipped: sticker.flipped, color: sticker.color },
          { flipped: newFlipped, color: newColor },
          `翻转贴纸: ${sticker.label} (${newFlipped ? '已翻转' : '未翻转'})`
        );

        set((state) => {
          const traceChains = new Map(state.traceChains);
          const chain = traceChains.get(id);
          if (chain) {
            chain.steps.push({
              actionId: action.id,
              description: action.description,
              timestamp: action.timestamp,
              details: { wasFlipped: sticker.flipped, nowFlipped: newFlipped }
            });
          }

          return {
            stickers: state.stickers.map(s =>
              s.id === id ? { ...s, flipped: newFlipped, color: newColor, updatedAt: Date.now() } : s
            ),
            traceChains
          };
        });

        get().pushHistory([action]);
      },

      deleteSticker: (id) => {
        const sticker = get().stickers.find(s => s.id === id);
        if (!sticker) return;

        const action = createActionLog(
          'delete',
          id,
          sticker,
          {},
          `删除贴纸: ${sticker.label}`
        );

        set((state) => ({
          stickers: state.stickers.filter(s => s.id !== id),
          game: {
            ...state.game,
            placedStickers: state.game.placedStickers - 1,
            progress: Math.max(0, ((state.game.placedStickers - 1) / state.game.totalStickers) * 100)
          }
        }));

        get().pushHistory([action]);
      },

      updateStickerVerification: (id, verified) => {
        set((state) => ({
          stickers: state.stickers.map(s =>
            s.id === id ? { ...s, verified, updatedAt: Date.now() } : s
          )
        }));
      },

      pushHistory: (actions) => set((state) => ({
        history: {
          undoStack: [...state.history.undoStack, actions],
          redoStack: []
        }
      })),

      undo: () => {
        const state = get();
        if (state.history.undoStack.length === 0) return;

        const lastActions = state.history.undoStack[state.history.undoStack.length - 1];
        
        lastActions.forEach(action => {
          if (action.type === 'create') {
            set((s) => ({
              stickers: s.stickers.filter(st => st.id !== action.stickerId)
            }));
          } else if (action.type === 'delete') {
            set((s) => ({
              stickers: [...s.stickers, action.before as Sticker]
            }));
          } else {
            set((s) => ({
              stickers: s.stickers.map(st =>
                st.id === action.stickerId ? { ...st, ...action.before, updatedAt: Date.now() } : st
              )
            }));
          }
        });

        set((s) => ({
          history: {
            undoStack: s.history.undoStack.slice(0, -1),
            redoStack: [...s.history.redoStack, lastActions]
          }
        }));
      },

      redo: () => {
        const state = get();
        if (state.history.redoStack.length === 0) return;

        const nextActions = state.history.redoStack[state.history.redoStack.length - 1];
        
        nextActions.forEach(action => {
          if (action.type === 'create') {
            set((s) => ({
              stickers: [...s.stickers, action.after as Sticker]
            }));
          } else if (action.type === 'delete') {
            set((s) => ({
              stickers: s.stickers.filter(st => st.id !== action.stickerId)
            }));
          } else {
            set((s) => ({
              stickers: s.stickers.map(st =>
                st.id === action.stickerId ? { ...st, ...action.after, updatedAt: Date.now() } : st
              )
            }));
          }
        });

        set((s) => ({
          history: {
            undoStack: [...s.history.undoStack, nextActions],
            redoStack: s.history.redoStack.slice(0, -1)
          }
        }));
      },

      canUndo: () => get().history.undoStack.length > 0,
      canRedo: () => get().history.redoStack.length > 0,

      addError: (error) => set((state) => ({
        errors: [...state.errors, { ...error, id: generateId(), timestamp: Date.now() }]
      })),

      clearError: (id) => set((state) => ({
        errors: state.errors.filter(e => e.id !== id)
      })),

      clearAllErrors: () => set({ errors: [] }),

      getTraceChain: (stickerId) => {
        return get().traceChains.get(stickerId) || null;
      },

      importStickers: (data) => {
        const duplicates: DuplicateInfo[] = [];
        const state = get();

        data.forEach(newSticker => {
          const fingerprint = `${newSticker.type}-${newSticker.originalX}-${newSticker.originalY}`;
          const existing = state.stickers.find(s =>
            `${s.type}-${s.originalX}-${s.originalY}` === fingerprint
          );

          if (existing) {
            const differences: string[] = [];
            if (existing.x !== newSticker.x) differences.push(`坐标X: ${existing.x} -> ${newSticker.x}`);
            if (existing.y !== newSticker.y) differences.push(`坐标Y: ${existing.y} -> ${newSticker.y}`);
            if (existing.flipped !== newSticker.flipped) differences.push(`翻转状态: ${existing.flipped} -> ${newSticker.flipped}`);
            if (existing.verified !== newSticker.verified) differences.push(`验证状态: ${existing.verified} -> ${newSticker.verified}`);

            duplicates.push({
              existingId: existing.id,
              newData: newSticker,
              differences
            });
          } else {
            const stickerWithNewId: Sticker = {
              ...newSticker,
              id: generateId(),
              sourceId: newSticker.id,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };

            const action = createActionLog(
              'import',
              stickerWithNewId.id,
              {},
              stickerWithNewId,
              `导入贴纸: ${newSticker.label}`
            );

            set((s) => {
              const traceChains = new Map(s.traceChains);
              traceChains.set(stickerWithNewId.id, {
                resultId: stickerWithNewId.id,
                steps: [{
                  actionId: action.id,
                  description: action.description,
                  timestamp: action.timestamp,
                  details: { sourceId: newSticker.id, imported: true }
                }],
                sourceData: { imported: true, originalData: newSticker }
              });

              return {
                stickers: [...s.stickers, stickerWithNewId],
                traceChains,
                game: {
                  ...s.game,
                  placedStickers: s.game.placedStickers + 1,
                  progress: Math.min(100, ((s.game.placedStickers + 1) / s.game.totalStickers) * 100)
                }
              };
            });

            get().pushHistory([action]);
          }
        });

        if (duplicates.length > 0) {
          set({ pendingDuplicates: duplicates });
        }

        return duplicates;
      },

      resolveDuplicate: (existingId, strategy, newData) => {
        const state = get();
        const existing = state.stickers.find(s => s.id === existingId);
        if (!existing) return;

        if (strategy === 'overwrite') {
          const action = createActionLog(
            'import',
            existingId,
            existing,
            newData,
            `覆盖贴纸: ${existing.label}`
          );

          set((s) => ({
            stickers: s.stickers.map(st =>
              st.id === existingId ? { ...newData, id: existingId, updatedAt: Date.now() } : st
            ),
            pendingDuplicates: s.pendingDuplicates.filter(d => d.existingId !== existingId)
          }));

          get().pushHistory([action]);
        } else if (strategy === 'new_version') {
          const newSticker: Sticker = {
            ...newData,
            id: generateId(),
            sourceId: existingId,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          const action = createActionLog(
            'import',
            newSticker.id,
            {},
            newSticker,
            `新建版本贴纸: ${newSticker.label} (基于 ${existingId})`
          );

          set((s) => ({
            stickers: [...s.stickers, newSticker],
            pendingDuplicates: s.pendingDuplicates.filter(d => d.existingId !== existingId),
            game: {
              ...s.game,
              placedStickers: s.game.placedStickers + 1
            }
          }));

          get().pushHistory([action]);
        } else {
          set((s) => ({
            pendingDuplicates: s.pendingDuplicates.filter(d => d.existingId !== existingId)
          }));
        }
      },

      getExportSummary: () => {
        const state = get();
        const total = state.stickers.length;
        const verified = state.stickers.filter(s => s.verified).length;
        const errors = state.errors.length;
        const pending = total - verified;

        let status: ExportSummary['status'] = '待确认';
        if (errors > 0) status = '有错误';
        else if (pending === 0) status = '通过';

        return {
          totalStickers: total,
          verifiedCount: verified,
          pendingCount: pending,
          errorCount: errors,
          status,
          exportTime: Date.now()
        };
      },

      getConsistencyCheck: () => {
        const state = get();
        const inconsistencies: string[] = [];
        const summary = state.getExportSummary();

        const uiStatus = state.stickers.every(s => s.verified) && state.errors.length === 0
          ? '通过'
          : state.errors.length > 0 ? '有错误' : '待确认';

        if (uiStatus !== summary.status) {
          inconsistencies.push(`状态不一致: 页面显示「${uiStatus}」，导出显示「${summary.status}」`);
        }

        return {
          consistent: inconsistencies.length === 0,
          inconsistencies
        };
      }
    }),
    {
      name: 'lab-hazard-stickers-storage',
      partialize: (state) => ({
        stickers: state.stickers,
        game: {
          ...state.game,
          startTime: null
        },
        colorRules: state.colorRules,
        history: state.history
      })
    }
  )
);

export { STICKER_TYPES };
