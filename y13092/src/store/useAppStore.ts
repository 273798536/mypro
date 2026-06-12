import { create } from 'zustand';
import type {
  CadLayer,
  CollisionPoint,
  OperationRecord,
  TimeSegment,
  ViewSnapshot,
  ViewState,
} from '@/types';
import {
  mockLayers,
  mockCollisions,
  mockHistory,
  mockTimeSegments,
  mockSnapshots,
} from '@/data/mockData';

interface AppState {
  layers: CadLayer[];
  collisions: CollisionPoint[];
  history: OperationRecord[];
  timeSegments: TimeSegment[];
  snapshots: ViewSnapshot[];
  viewState: ViewState;
  selectedCollisionId: string | null;
  activePanel: 'collisions' | 'history' | 'snapshots' | 'report';

  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  selectCollision: (id: string | null) => void;
  setViewState: (state: Partial<ViewState>) => void;
  addSnapshot: (name: string) => void;
  applySnapshot: (id: string) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  addRevokeRecord: (collisionId: string, reason: string, operator: string) => void;
  generateMarkdownReport: () => string;
}

export const useAppStore = create<AppState>((set, get) => ({
  layers: mockLayers,
  collisions: mockCollisions,
  history: mockHistory,
  timeSegments: mockTimeSegments,
  snapshots: mockSnapshots,
  viewState: {
    scale: 1,
    centerX: 550,
    centerY: 320,
  },
  selectedCollisionId: null,
  activePanel: 'collisions',

  toggleLayer: (id: string) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      ),
    })),

  setLayerOpacity: (id: string, opacity: number) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, opacity } : l,
      ),
    })),

  selectCollision: (id: string | null) => set({ selectedCollisionId: id }),

  setViewState: (state: Partial<ViewState>) =>
    set((prev) => ({
      viewState: { ...prev.viewState, ...state },
    })),

  addSnapshot: (name: string) => {
    const { viewState, layers, snapshots } = get();
    const visibleLayers = layers.filter((l) => l.visible).map((l) => l.id);
    const newSnapshot: ViewSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      scale: viewState.scale,
      centerX: viewState.centerX,
      centerY: viewState.centerY,
      visibleLayers,
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    set({ snapshots: [...snapshots, newSnapshot] });
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

  setActivePanel: (panel: AppState['activePanel']) => set({ activePanel: panel }),

  addRevokeRecord: (collisionId: string, reason: string, operator: string) => {
    const newRecord: OperationRecord = {
      id: `hist-${Date.now()}`,
      type: 'revoke',
      operator,
      timestamp: new Date().toLocaleString('zh-CN'),
      description: `撤回碰撞记录 ${collisionId}`,
      isRevoked: false,
      details: { collisionId, reason },
    };

    set((state) => ({
      history: [...state.history, newRecord],
      collisions: state.collisions.map((c) =>
        c.id === collisionId ? { ...c, status: 'revoked', isRevoked: true } : c,
      ),
    }));
  },

  generateMarkdownReport: () => {
    const { layers, collisions, history, timeSegments } = get();

    const activeCollisions = collisions.filter((c) => !c.isRevoked);
    const revokedCollisions = collisions.filter((c) => c.isRevoked);
    const criticalCount = activeCollisions.filter(
      (c) => c.severity === 'critical',
    ).length;
    const warningCount = activeCollisions.filter(
      (c) => c.severity === 'warning',
    ).length;

    const layerCoordInfo = layers
      .map((l) => `- **${l.name}**: 坐标系 ${l.coordinateSystem} (来源: ${l.source})`)
      .join('\n');

    const collisionList = activeCollisions
      .map(
        (c) =>
          `- [${c.severity.toUpperCase()}] **${c.description}**\n  - 位置: (${c.x}, ${c.y})\n  - 计算口径: ${c.calcBasis}`,
      )
      .join('\n');

    const revokedList = revokedCollisions
      .map(
        (c) =>
          `- ~~${c.description}~~\n  - 撤回原因: ${c.calcBasis}`,
      )
      .join('\n');

    const segmentList = timeSegments
      .map(
        (s) =>
          `- **${s.startTime} ~ ${s.endTime}** [${s.status}] ${s.description} - 负责人: ${s.responsible}`,
      )
      .join('\n');

    const recentHistory = [...history]
      .reverse()
      .slice(0, 5)
      .map(
        (h) =>
          `- [${h.timestamp}] ${h.operator}: ${h.description}${h.isRevoked ? ' (已撤回)' : ''}`,
      )
      .join('\n');

    const missingSegments = timeSegments.filter((s) => s.status === 'missing');
    const hasMissing = missingSegments.length > 0;

    return `# 桥隧检修平台碰撞预审报告

## 一、基本信息

- **预审项目**: 桥隧检修平台碰撞检测
- **生成时间**: ${new Date().toLocaleString('zh-CN')}
- **图层数量**: ${layers.length} 个
- **有效碰撞**: ${activeCollisions.length} 处 (严重 ${criticalCount} / 警告 ${warningCount})
- **撤回记录**: ${revokedCollisions.length} 条
- **挂起时段**: ${hasMissing ? '有 ' + missingSegments.length + ' 个时段数据缺失，结论需谨慎' : '无'}

## 二、图层与坐标系说明

> ⚠️ **注意**: 各图层坐标系不一致，叠加结果仅供参考，需现场复核。

${layerCoordInfo}

## 三、碰撞检测结果

### 3.1 有效碰撞点

${collisionList || '无'}

### 3.2 已撤回判断

${revokedList || '无'}

## 四、检测时段

${segmentList}

${hasMissing ? `\n> ⚠️ **挂起提示**: 存在缺段数据，结论不完整，请负责人确认后再使用。\n` : ''}

## 五、最近操作记录

${recentHistory}

## 六、变更说明

本次预审较上一版本的主要变化:

1. 新增撤回记录 ${revokedCollisions.length} 条
2. 坐标系不一致风险提示
3. 时间轴缺段自动挂起机制生效
4. 操作历史完整保留，支持追溯判断过程
`;
  },
}));
