import { create } from 'zustand';
import type {
  CadLayer,
  CollisionPoint,
  OperationRecord,
  TimeSegment,
  ViewSnapshot,
  ViewState,
  DetectionSession,
  ImportedMaterialPackage,
  CollisionSnapshot,
  MaterialImportPayload,
} from '@/types';
import {
  mockLayers,
  mockCollisions,
  mockHistory,
  mockTimeSegments,
  mockSnapshots,
  defaultSession,
  SESSION_ID,
  DEFAULT_OPERATOR,
} from '@/data/mockData';
import {
  loadPersistedState,
  savePersistedState,
  clearPersistedState,
  generateId,
  formatTimestamp,
  parseImportPayload,
  buildExportPayload,
  downloadJson,
  hashString,
} from '@/utils/storage';

interface AppState {
  layers: CadLayer[];
  collisions: CollisionPoint[];
  history: OperationRecord[];
  timeSegments: TimeSegment[];
  snapshots: ViewSnapshot[];
  session: DetectionSession;
  importPackages: ImportedMaterialPackage[];
  viewState: ViewState;
  selectedCollisionId: string | null;
  activePanel: 'collisions' | 'history' | 'snapshots' | 'report';
  isInitializedFromStorage: boolean;
  lastPersistedAt: string | null;
  lastError: string | null;

  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  selectCollision: (id: string | null) => void;
  setViewState: (state: Partial<ViewState>) => void;
  addSnapshot: (name: string) => void;
  applySnapshot: (id: string) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;

  addRevokeRecord: (
    collisionId: string,
    reason: string,
    operator: string,
  ) => { success: boolean; error?: string };

  confirmCollision: (
    collisionId: string,
    note: string,
    operator: string,
  ) => { success: boolean; error?: string };

  importMaterialFile: (
    fileContent: string,
    fileName: string,
    operator: string,
  ) => {
    success: boolean;
    error?: string;
    layersAdded?: number;
    collisionsAdded?: number;
  };

  resetAllData: (operator: string) => { success: boolean; error?: string };
  exportAllData: (operator: string) => void;
  exportCurrentReport: (operator: string) => string;
  generateMarkdownReport: () => string;
  clearLastError: () => void;
}

const PERSIST_KEYS = [
  'layers',
  'collisions',
  'history',
  'timeSegments',
  'snapshots',
  'session',
  'importPackages',
] as const;

function createHistoryRecord(params: {
  type: OperationRecord['type'];
  operator: string;
  description: string;
  details?: Record<string, unknown>;
  isRevoked?: boolean;
  sessionId?: string;
}): OperationRecord {
  return {
    id: generateId('hist'),
    type: params.type,
    operator: params.operator,
    timestamp: formatTimestamp(),
    description: params.description,
    isRevoked: params.isRevoked ?? false,
    details: params.details ?? {},
    sessionId: params.sessionId ?? SESSION_ID,
  };
}

function buildInitialState(): Pick<
  AppState,
  | 'layers'
  | 'collisions'
  | 'history'
  | 'timeSegments'
  | 'snapshots'
  | 'session'
  | 'importPackages'
  | 'viewState'
  | 'selectedCollisionId'
  | 'activePanel'
  | 'isInitializedFromStorage'
  | 'lastPersistedAt'
  | 'lastError'
> {
  const persisted = loadPersistedState();
  if (persisted) {
    return {
      layers: persisted.layers,
      collisions: persisted.collisions,
      history: persisted.history,
      timeSegments: persisted.timeSegments,
      snapshots: persisted.snapshots,
      session: persisted.session,
      importPackages: persisted.importPackages ?? [],
      viewState: { scale: 1, centerX: 550, centerY: 320 },
      selectedCollisionId: null,
      activePanel: 'collisions',
      isInitializedFromStorage: true,
      lastPersistedAt: persisted.lastPersistedAt,
      lastError: null,
    };
  }

  return {
    layers: mockLayers,
    collisions: mockCollisions,
    history: mockHistory,
    timeSegments: mockTimeSegments,
    snapshots: mockSnapshots,
    session: defaultSession,
    importPackages: [],
    viewState: { scale: 1, centerX: 550, centerY: 320 },
    selectedCollisionId: null,
    activePanel: 'collisions',
    isInitializedFromStorage: false,
    lastPersistedAt: null,
    lastError: null,
  };
}

function persistState(
  state: Pick<AppState, (typeof PERSIST_KEYS)[number]>,
): { lastPersistedAt: string } {
  const now = formatTimestamp();
  savePersistedState({
    layers: state.layers,
    collisions: state.collisions,
    history: state.history,
    timeSegments: state.timeSegments,
    snapshots: state.snapshots,
    session: { ...state.session, updatedAt: now },
    importPackages: state.importPackages,
    lastPersistedAt: now,
  });
  return { lastPersistedAt: now };
}

export const useAppStore = create<AppState>((set, get) => {
  const initial = buildInitialState();

  return {
    ...initial,

    toggleLayer: (id: string) => {
      set((state) => {
        const layers = state.layers.map((l) =>
          l.id === id ? { ...l, visible: !l.visible } : l,
        );
        const persistResult = persistState({ ...state, layers });
        return { layers, ...persistResult };
      });
    },

    setLayerOpacity: (id: string, opacity: number) => {
      set((state) => {
        const layers = state.layers.map((l) =>
          l.id === id ? { ...l, opacity } : l,
        );
        const persistResult = persistState({ ...state, layers });
        return { layers, ...persistResult };
      });
    },

    selectCollision: (id: string | null) => set({ selectedCollisionId: id }),

    setViewState: (patch) =>
      set((prev) => ({
        viewState: { ...prev.viewState, ...patch },
      })),

    addSnapshot: (name: string) => {
      set((state) => {
        const { viewState, layers, snapshots, session } = state;
        const visibleLayers = layers.filter((l) => l.visible).map((l) => l.id);
        const newSnapshot: ViewSnapshot = {
          id: generateId('snap'),
          name,
          scale: viewState.scale,
          centerX: viewState.centerX,
          centerY: viewState.centerY,
          visibleLayers,
          createdAt: formatTimestamp(),
          createdBy: session.operator,
        };
        const nextSnapshots = [...snapshots, newSnapshot];
        const persistResult = persistState({ ...state, snapshots: nextSnapshots });
        return { snapshots: nextSnapshots, ...persistResult };
      });
    },

    applySnapshot: (id: string) => {
      const { snapshots } = get();
      const snapshot = snapshots.find((s) => s.id === id);
      if (!snapshot) return;

      set((state) => ({
        viewState: {
          scale: snapshot.scale,
          centerX: snapshot.centerX,
          centerY: snapshot.centerY,
        },
        layers: state.layers.map((l) => ({
          ...l,
          visible: snapshot.visibleLayers.includes(l.id),
        })),
      }));
    },

    setActivePanel: (panel) => set({ activePanel: panel }),

    clearLastError: () => set({ lastError: null }),

    addRevokeRecord: (collisionId, reason, operator) => {
      const { collisions, history, session, importPackages } = get();
      const target = collisions.find((c) => c.id === collisionId);

      if (!target) {
        const err = `碰撞记录 ${collisionId} 不存在，无法撤回`;
        set({ lastError: err });
        return { success: false, error: err };
      }
      if (target.isRevoked || target.status === 'revoked') {
        const err = `碰撞记录 ${collisionId} 已经是撤回状态，无需重复操作`;
        set({ lastError: err });
        return { success: false, error: err };
      }

      const snapshot: CollisionSnapshot = {
        status: target.status,
        description: target.description,
        calcBasis: target.calcBasis,
        calcBasisDetail: { ...target.calcBasisDetail },
        isRevoked: false,
        snapshottedAt: formatTimestamp(),
        snapshottedBy: operator,
      };

      const updatedCollision: CollisionPoint = {
        ...target,
        status: 'revoked',
        isRevoked: true,
        calcBasis: reason,
        description: `${target.description}（已撤回）`,
        snapshotBeforeRevoke: snapshot,
      };

      const revokeRecord = createHistoryRecord({
        type: 'revoke',
        operator,
        description: `撤回碰撞判断 ${collisionId}`,
        sessionId: session.id,
        details: {
          collisionId,
          reason,
          snapshotSaved: true,
          prevStatus: target.status,
          prevCalcBasis: target.calcBasis,
          coordinateSystems: target.calcBasisDetail.coordinateSystems,
        },
      });

      const linkedAdjustRecord = history.find(
        (h) =>
          (h.type === 'adjust' || h.type === 'confirm') &&
          (h.details?.collisionId as string | undefined) === collisionId &&
          !h.isRevoked,
      );

      let nextHistory = [...history, revokeRecord];
      if (linkedAdjustRecord) {
        nextHistory = nextHistory.map((h) =>
          h.id === linkedAdjustRecord.id ? { ...h, isRevoked: true } : h,
        );
      }

      const nextCollisions = collisions.map((c) =>
        c.id === collisionId ? updatedCollision : c,
      );

      set((state) => {
        const persistResult = persistState({
          ...state,
          collisions: nextCollisions,
          history: nextHistory,
          importPackages,
        });
        return {
          collisions: nextCollisions,
          history: nextHistory,
          selectedCollisionId: null,
          ...persistResult,
        };
      });

      return { success: true };
    },

    confirmCollision: (collisionId, note, operator) => {
      const { collisions, session, importPackages } = get();
      const target = collisions.find((c) => c.id === collisionId);
      if (!target) {
        const err = `碰撞记录 ${collisionId} 不存在`;
        set({ lastError: err });
        return { success: false, error: err };
      }
      if (target.isRevoked) {
        const err = `已撤回的碰撞记录不能再确认`;
        set({ lastError: err });
        return { success: false, error: err };
      }

      const confirmRecord = createHistoryRecord({
        type: 'confirm',
        operator,
        description: `确认碰撞记录 ${collisionId}`,
        sessionId: session.id,
        details: { collisionId, note },
      });

      const nextCollisions = collisions.map((c) =>
        c.id === collisionId ? { ...c, status: 'confirmed' as const } : c,
      );

      set((state) => {
        const nextHistory = [...state.history, confirmRecord];
        const persistResult = persistState({
          ...state,
          collisions: nextCollisions,
          history: nextHistory,
          importPackages,
        });
        return {
          collisions: nextCollisions,
          history: nextHistory,
          ...persistResult,
        };
      });

      return { success: true };
    },

    importMaterialFile: (fileContent, fileName, operator) => {
      const {
        layers,
        collisions,
        history,
        timeSegments,
        session,
        importPackages,
      } = get();

      let parsed: MaterialImportPayload & { hash: string };
      try {
        parsed = parseImportPayload(fileContent, fileName);
      } catch (e) {
        const err = e instanceof Error ? e.message : '导入文件解析失败';
        set({ lastError: err });
        return { success: false, error: err };
      }

      const duplicate = importPackages.find((p) => p.hash === parsed.hash);
      if (duplicate) {
        const err = `该材料包已在 ${duplicate.importedAt} 由 ${duplicate.importedBy} 导入，拒绝重复导入`;
        set({ lastError: err });
        return { success: false, error: err };
      }

      const existingLayerIds = new Set(layers.map((l) => l.id));
      const existingCollisionIds = new Set(collisions.map((c) => c.id));

      const newLayers = (parsed.layers ?? []).map((l) => ({
        ...l,
        id: existingLayerIds.has(l.id) ? `${l.id}-${Date.now()}` : l.id,
        importedAt: formatTimestamp(),
        importedBy: operator,
        importSessionId: session.id,
      }));

      const newCollisions = (parsed.collisions ?? []).map((c) => {
        let cid = c.id;
        if (existingCollisionIds.has(cid)) {
          cid = `${cid}-${Date.now()}`;
        }
        return {
          ...c,
          id: cid,
          createdAt: formatTimestamp(),
          createdBy: operator,
          calcBasisDetail: c.calcBasisDetail ?? {
            coordinateSystems: ['unknown'],
            checkTime: formatTimestamp(),
            checkedBy: operator,
            notes: '导入时未提供详细计算口径',
          },
          isRevoked: c.isRevoked ?? c.status === 'revoked',
        };
      });

      const newSegments = (parsed.timeSegments ?? []).filter(
        (s) => !timeSegments.some((t) => t.id === s.id),
      );

      const importRecord = createHistoryRecord({
        type: 'import',
        operator,
        description: `导入材料包：${fileName}`,
        sessionId: session.id,
        details: {
          fileName,
          layersAdded: newLayers.length,
          collisionsAdded: newCollisions.length,
          segmentsAdded: newSegments.length,
          hash: parsed.hash,
          meta: parsed.meta,
        },
      });

      const newPackage: ImportedMaterialPackage = {
        sessionId: session.id,
        importedAt: formatTimestamp(),
        importedBy: operator,
        fileName,
        layersCount: newLayers.length,
        collisionsCount: newCollisions.length,
        historyCount: 1,
        hash: parsed.hash,
      };

      set((state) => {
        const nextLayers = [...state.layers, ...newLayers];
        const nextCollisions = [...state.collisions, ...newCollisions];
        const nextHistory = [...state.history, importRecord];
        const nextTimeSegments = [...state.timeSegments, ...newSegments];
        const nextPackages = [...state.importPackages, newPackage];

        const persistResult = persistState({
          ...state,
          layers: nextLayers,
          collisions: nextCollisions,
          history: nextHistory,
          timeSegments: nextTimeSegments,
          importPackages: nextPackages,
        });

        return {
          layers: nextLayers,
          collisions: nextCollisions,
          history: nextHistory,
          timeSegments: nextTimeSegments,
          importPackages: nextPackages,
          ...persistResult,
        };
      });

      return {
        success: true,
        layersAdded: newLayers.length,
        collisionsAdded: newCollisions.length,
      };
    },

    resetAllData: (operator) => {
      clearPersistedState();

      const resetRecord = createHistoryRecord({
        type: 'reset',
        operator,
        description: '重置所有数据为初始Mock数据',
        sessionId: SESSION_ID,
        details: { clearedLocalStorage: true },
      });

      set({
        layers: mockLayers,
        collisions: mockCollisions,
        history: [...mockHistory, resetRecord],
        timeSegments: mockTimeSegments,
        snapshots: mockSnapshots,
        session: defaultSession,
        importPackages: [],
        viewState: { scale: 1, centerX: 550, centerY: 320 },
        selectedCollisionId: null,
        activePanel: 'history',
        isInitializedFromStorage: false,
        lastPersistedAt: null,
        lastError: null,
      });

      return { success: true };
    },

    exportAllData: (operator) => {
      const {
        layers,
        collisions,
        history,
        timeSegments,
        snapshots,
        session,
        importPackages,
      } = get();
      const payload = buildExportPayload(
        {
          layers,
          collisions,
          history,
          timeSegments,
          snapshots,
          session,
          importPackages,
          lastPersistedAt: formatTimestamp(),
        },
        operator,
      );
      const ts = formatTimestamp().replace(/[:\s-]/g, '');
      downloadJson(payload, `桥隧预审全量数据_${ts}`);
    },

    exportCurrentReport: (operator) => {
      const markdown = get().generateMarkdownReport();
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const ts = formatTimestamp().replace(/[:\s-]/g, '');
      const a = document.createElement('a');
      a.href = url;
      a.download = `桥隧预审报告_${operator}_${ts}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return markdown;
    },

    generateMarkdownReport: () => {
      const {
        layers,
        collisions,
        history,
        timeSegments,
        importPackages,
        session,
      } = get();

      const activeCollisions = collisions.filter((c) => !c.isRevoked);
      const revokedCollisions = collisions.filter((c) => c.isRevoked);
      const criticalCount = activeCollisions.filter(
        (c) => c.severity === 'critical',
      ).length;
      const warningCount = activeCollisions.filter(
        (c) => c.severity === 'warning',
      ).length;

      const coordSysSet = new Set(
        layers.filter((l) => l.visible).map((l) => l.coordinateSystem),
      );
      const coordMixed = coordSysSet.size > 1;

      const layerCoordInfo = layers
        .map(
          (l) =>
            `- **${l.name}**: 坐标系 ${l.coordinateSystem} (来源: ${l.source}, 导入人: ${l.importedBy ?? '未知'}, 时间: ${l.importedAt})`,
        )
        .join('\n');

      const collisionList = activeCollisions
        .map((c) => {
          const d = c.calcBasisDetail;
          return (
            `- [${c.severity.toUpperCase()}] **${c.description}**\n` +
            `  - 编号: ${c.id}\n` +
            `  - 位置: (${c.x.toFixed(1)}, ${c.y.toFixed(1)})\n` +
            `  - 关联图层: ${c.layerA} ↔ ${c.layerB}\n` +
            `  - 计算口径: ${c.calcBasis}\n` +
            `  - 坐标系: ${d.coordinateSystems.join(' / ')} | 转换方法: ${d.transformMethod ?? '未记录'}\n` +
            `  - 净空: 实测 ${d.clearanceValue ?? 'N/A'}m / 标准 ${d.clearanceStandard ?? 'N/A'}m\n` +
            `  - 复核人: ${d.checkedBy} @ ${d.checkTime}`
          );
        })
        .join('\n');

      const revokedList = revokedCollisions
        .map((c) => {
          const snap = c.snapshotBeforeRevoke;
          return (
            `- ~~${snap?.description ?? c.description}~~\n` +
            `  - 撤回口径: ${c.calcBasis}\n` +
            `  - 撤回前状态: ${snap?.status ?? '未知'} | 撤回前计算: ${snap?.calcBasis ?? 'N/A'}\n` +
            `  - 撤回操作: ${snap?.snapshottedBy ?? '未知'} @ ${snap?.snapshottedAt ?? 'N/A'}`
          );
        })
        .join('\n');

      const segmentList = timeSegments
        .map(
          (s) =>
            `- **${s.startTime} ~ ${s.endTime}** [${s.status}] ${s.description} - 负责人: ${s.responsible}`,
        )
        .join('\n');

      const recentHistory = [...history]
        .reverse()
        .slice(0, 8)
        .map(
          (h) =>
            `- [${h.timestamp}] ${h.operator} (${h.type}): ${h.description}${h.isRevoked ? ' (该操作已被撤回)' : ''}`,
        )
        .join('\n');

      const missingSegments = timeSegments.filter((s) => s.status === 'missing');
      const suspendedSegments = timeSegments.filter((s) => s.status === 'suspended');
      const hasMissingOrSuspended =
        missingSegments.length > 0 || suspendedSegments.length > 0;

      const importSection =
        importPackages.length > 0
          ? `## 导入材料链路\n\n` +
            importPackages
              .map(
                (p) =>
                  `- **${p.fileName}** | 导入人: ${p.importedBy} @ ${p.importedAt} | 图层 ${p.layersCount} / 碰撞 ${p.collisionsCount} / 哈希: ${p.hash.slice(0, 8)}`,
              )
              .join('\n') +
            `\n\n_共导入 ${importPackages.length} 个材料包，哈希去重已启用_\n`
          : `## 导入材料链路\n\n_本次会话未通过文件导入任何材料，使用预置初始数据_\n`;

      const sessionHeader = `> 会话ID: ${session.id} | 负责人: ${session.operator} | 创建: ${session.createdAt} | 最后更新: ${session.updatedAt}`;

      return `# 桥隧检修平台碰撞预审报告

${sessionHeader}

## 一、基本信息

- **预审项目**: 桥隧检修平台碰撞检测
- **生成时间**: ${formatTimestamp()}
- **图层数量**: ${layers.length} 个 (当前显示 ${layers.filter((l) => l.visible).length} 个)
- **坐标系混杂**: ${coordMixed ? `⚠️ 是（${coordSysSet.size}种坐标系同时显示，结论需谨慎）` : '否'}
- **有效碰撞**: ${activeCollisions.length} 处 (严重 ${criticalCount} / 警告 ${warningCount})
- **撤回记录**: ${revokedCollisions.length} 条 (每条均保留撤回前完整快照)
- **挂起/缺段时段**: ${hasMissingOrSuspended ? `有 缺段${missingSegments.length}/挂起${suspendedSegments.length}，结论不完整` : '无'}

## 二、图层与坐标系说明

${coordMixed ? '> ⚠️ **重要**: 各图层坐标系不一致，叠加结果仅供参考，所有碰撞结论必须现场复核。\n' : ''}

${layerCoordInfo}

## 三、碰撞检测结果

### 3.1 有效碰撞点

${collisionList || '无'}

### 3.2 已撤回判断（含撤回前快照）

${revokedList || '无'}

## 四、检测时段

${segmentList}

${
  hasMissingOrSuspended
    ? `\n> ⚠️ **挂起提示**: 存在缺段/挂起数据（缺段 ${missingSegments.length} 处，挂起 ${suspendedSegments.length} 处），本报告结论不完整。请负责人确认数据补齐后再使用。\n`
    : ''
}

${importSection}

## 五、最近操作记录（最新8条）

${recentHistory}

## 六、变更说明与可追溯性

本次预审的所有变化均可追溯：

1. **撤回操作不可逆**：已撤回碰撞点保留撤回前完整状态快照（含计算口径、坐标系、复核人）
2. **导入材料可追溯**：每个导入材料包记录文件名、导入人、时间、内容数量与哈希值
3. **数据持久化**：所有状态变更均写入 localStorage，刷新页面不会丢失
4. **坐标系透明化**：每个碰撞点记录使用的坐标系与转换方法，现场调度判断可复核

---
_报告由桥隧检修平台碰撞预审系统自动生成，所有数据保存在本地浏览器存储_
`;
    },
  };
});
