import { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import type {
  Corridor,
  CollisionObject,
  Attachment,
  AttachmentVersion,
} from '../types';
import {
  getInitialCorridors,
  getInitialObjects,
  getInitialAttachments,
  getInitialViewStates,
} from '../data/mockData';
import type { ViewState } from '../types';

export interface AppState {
  corridors: Corridor[];
  objects: CollisionObject[];
  attachments: Attachment[];
  viewStates: ViewState[];
  selectedCorridorId: string | null;
}

export type AppAction =
  | { type: 'ADD_CORRIDOR'; payload: Corridor }
  | { type: 'UPDATE_CORRIDOR'; payload: Corridor }
  | { type: 'DELETE_CORRIDOR'; payload: string }
  | { type: 'SELECT_CORRIDOR'; payload: string | null }
  | { type: 'ADD_OBJECT'; payload: CollisionObject }
  | { type: 'UPDATE_OBJECT'; payload: CollisionObject }
  | { type: 'DELETE_OBJECT'; payload: string }
  | { type: 'ADD_ATTACHMENT'; payload: Attachment }
  | { type: 'UPDATE_ATTACHMENT'; payload: Attachment }
  | { type: 'ADD_ATTACHMENT_VERSION'; payload: { attachmentId: string; version: AttachmentVersion } }
  | { type: 'DELETE_ATTACHMENT'; payload: string }
  | { type: 'ADD_VIEW_STATE'; payload: ViewState }
  | { type: 'DELETE_VIEW_STATE'; payload: string }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }
  | { type: 'RESET_TO_DEMO' };

const STORAGE_KEY = 'low-altitude-pre-review-state';

function saveToStorage(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('保存状态到 localStorage 失败:', e);
  }
}

function loadFromStorage(): Partial<AppState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('从 localStorage 加载状态失败:', e);
  }
  return null;
}

function getInitialState(): AppState {
  const stored = loadFromStorage();
  if (stored && stored.corridors && stored.corridors.length > 0) {
    return {
      corridors: stored.corridors,
      objects: stored.objects || [],
      attachments: stored.attachments || [],
      viewStates: stored.viewStates || getInitialViewStates(),
      selectedCorridorId: stored.selectedCorridorId || (stored.corridors[0]?.id ?? null),
    };
  }

  const corridors = getInitialCorridors();
  return {
    corridors,
    objects: getInitialObjects(),
    attachments: getInitialAttachments(),
    viewStates: getInitialViewStates(),
    selectedCorridorId: corridors[0]?.id ?? null,
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  let newState: AppState;

  switch (action.type) {
    case 'ADD_CORRIDOR':
      newState = {
        ...state,
        corridors: [...state.corridors, action.payload],
        selectedCorridorId: state.selectedCorridorId || action.payload.id,
      };
      break;

    case 'UPDATE_CORRIDOR':
      newState = {
        ...state,
        corridors: state.corridors.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
      break;

    case 'DELETE_CORRIDOR':
      const remainingCorridors = state.corridors.filter(
        (c) => c.id !== action.payload
      );
      newState = {
        ...state,
        corridors: remainingCorridors,
        selectedCorridorId:
          state.selectedCorridorId === action.payload
            ? remainingCorridors[0]?.id ?? null
            : state.selectedCorridorId,
      };
      break;

    case 'SELECT_CORRIDOR':
      newState = {
        ...state,
        selectedCorridorId: action.payload,
      };
      break;

    case 'ADD_OBJECT':
      newState = {
        ...state,
        objects: [...state.objects, action.payload],
      };
      break;

    case 'UPDATE_OBJECT':
      newState = {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.payload.id ? action.payload : o
        ),
      };
      break;

    case 'DELETE_OBJECT':
      newState = {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.payload),
      };
      break;

    case 'ADD_ATTACHMENT':
      newState = {
        ...state,
        attachments: [...state.attachments, action.payload],
      };
      break;

    case 'UPDATE_ATTACHMENT':
      newState = {
        ...state,
        attachments: state.attachments.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
      break;

    case 'ADD_ATTACHMENT_VERSION': {
      const { attachmentId, version } = action.payload;
      newState = {
        ...state,
        attachments: state.attachments.map((a) => {
          if (a.id !== attachmentId) return a;
          const newVersions = [...a.versions, version];
          return {
            ...a,
            versions: newVersions,
            currentVersion: version.version,
          };
        }),
        objects: state.objects.map((o) => {
          if (version.affectedObjectIds.includes(o.id)) {
            return {
              ...o,
              isAbnormal: true,
              abnormalReason: `口径变更：${version.changeSummary}`,
            };
          }
          return o;
        }),
      };
      break;
    }

    case 'DELETE_ATTACHMENT':
      newState = {
        ...state,
        attachments: state.attachments.filter((a) => a.id !== action.payload),
        objects: state.objects.map((o) =>
          o.sourceAttachmentId === action.payload
            ? { ...o, isAbnormal: true, abnormalReason: '来源附件已被删除' }
            : o
        ),
      };
      break;

    case 'ADD_VIEW_STATE':
      newState = {
        ...state,
        viewStates: [...state.viewStates, action.payload],
      };
      break;

    case 'DELETE_VIEW_STATE':
      newState = {
        ...state,
        viewStates: state.viewStates.filter((v) => v.id !== action.payload),
      };
      break;

    case 'LOAD_STATE':
      newState = {
        ...state,
        ...action.payload,
      };
      break;

    case 'RESET_TO_DEMO':
      const demoCorridors = getInitialCorridors();
      newState = {
        corridors: demoCorridors,
        objects: getInitialObjects(),
        attachments: getInitialAttachments(),
        viewStates: getInitialViewStates(),
        selectedCorridorId: demoCorridors[0]?.id ?? null,
      };
      localStorage.removeItem(STORAGE_KEY);
      break;

    default:
      return state;
  }

  saveToStorage(newState);
  return newState;
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  generateId: (prefix: string) => string;
  getCurrentTime: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function getCurrentTime(): string {
    return new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <AppContext.Provider value={{ state, dispatch, generateId, getCurrentTime }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
