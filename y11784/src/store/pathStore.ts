import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VectorField, Path, PathNode, Point2D } from '@/types';
import { PATH_COLORS, PRESET_VECTOR_FIELDS } from '@/shared/constants';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const initialVectorField: VectorField = {
  id: generateId('vf'),
  name: PRESET_VECTOR_FIELDS[0].name,
  expressionX: PRESET_VECTOR_FIELDS[0].expressionX,
  expressionY: PRESET_VECTOR_FIELDS[0].expressionY,
  source: '预设模板',
  range: { ...PRESET_VECTOR_FIELDS[0].range },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const initialPaths: Path[] = [
  {
    id: generateId('path'),
    vectorFieldId: initialVectorField.id,
    name: '直线路径',
    color: PATH_COLORS[0],
    studentRemark: '',
    source: '默认示例',
    nodes: [
      { id: generateId('node'), x: 0, y: 0, order: 0 },
      { id: generateId('node'), x: 2, y: 2, order: 1 },
      { id: generateId('node'), x: 4, y: 0, order: 2 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId('path'),
    vectorFieldId: initialVectorField.id,
    name: '折线路径',
    color: PATH_COLORS[1],
    studentRemark: '',
    source: '默认示例',
    nodes: [
      { id: generateId('node'), x: 0, y: 0, order: 0 },
      { id: generateId('node'), x: 0, y: 3, order: 1 },
      { id: generateId('node'), x: 4, y: 3, order: 2 },
      { id: generateId('node'), x: 4, y: 0, order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId('path'),
    vectorFieldId: initialVectorField.id,
    name: '曲线路径',
    color: PATH_COLORS[2],
    studentRemark: '',
    source: '默认示例',
    nodes: [
      { id: generateId('node'), x: 0, y: 0, order: 0 },
      { id: generateId('node'), x: 1, y: 2, order: 1 },
      { id: generateId('node'), x: 2, y: 3, order: 2 },
      { id: generateId('node'), x: 3, y: 2, order: 3 },
      { id: generateId('node'), x: 4, y: 0, order: 4 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface PathState {
  vectorFields: VectorField[];
  paths: Path[];
  activeVectorFieldId: string | null;
  activePathId: string | null;
  setVectorFields: (vectorFields: VectorField[]) => void;
  setPaths: (paths: Path[]) => void;
  addVectorField: (vf: Omit<VectorField, 'id' | 'createdAt' | 'updatedAt'>) => VectorField;
  updateVectorField: (id: string, updates: Partial<VectorField>) => void;
  deleteVectorField: (id: string) => void;
  setActiveVectorField: (id: string | null) => void;
  addPath: (path: Omit<Path, 'id' | 'createdAt' | 'updatedAt'>) => Path;
  updatePath: (id: string, updates: Partial<Path>) => void;
  deletePath: (id: string) => void;
  setActivePath: (id: string | null) => void;
  addNode: (pathId: string, point: Point2D, position?: number) => void;
  updateNode: (pathId: string, nodeId: string, updates: Partial<PathNode>) => void;
  deleteNode: (pathId: string, nodeId: string) => void;
  mergeImportedData: (vfs: VectorField[], paths: Path[]) => void;
  resetToDefaults: () => void;
}

export const usePathStore = create<PathState>()(
  persist(
    (set, get) => ({
      vectorFields: [initialVectorField],
      paths: initialPaths,
      activeVectorFieldId: initialVectorField.id,
      activePathId: initialPaths[0]?.id || null,

      setVectorFields: (vectorFields) => set({ vectorFields }),
      setPaths: (paths) => set({ paths }),

      addVectorField: (vf) => {
        const newVf: VectorField = {
          ...vf,
          id: generateId('vf'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          vectorFields: [...state.vectorFields, newVf],
        }));
        return newVf;
      },

      updateVectorField: (id, updates) =>
        set((state) => ({
          vectorFields: state.vectorFields.map((vf) =>
            vf.id === id
              ? { ...vf, ...updates, updatedAt: new Date().toISOString() }
              : vf
          ),
        })),

      deleteVectorField: (id) =>
        set((state) => ({
          vectorFields: state.vectorFields.filter((vf) => vf.id !== id),
          paths: state.paths.filter((p) => p.vectorFieldId !== id),
          activeVectorFieldId:
            state.activeVectorFieldId === id
              ? state.vectorFields.filter((vf) => vf.id !== id)[0]?.id || null
              : state.activeVectorFieldId,
        })),

      setActiveVectorField: (id) => set({ activeVectorFieldId: id }),

      addPath: (path) => {
        const usedColors = get().paths.map((p) => p.color);
        const availableColor = PATH_COLORS.find((c) => !usedColors.includes(c)) || PATH_COLORS[0];
        const newPath: Path = {
          ...path,
          id: generateId('path'),
          color: path.color || availableColor,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          paths: [...state.paths, newPath],
        }));
        return newPath;
      },

      updatePath: (id, updates) =>
        set((state) => ({
          paths: state.paths.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      deletePath: (id) =>
        set((state) => ({
          paths: state.paths.filter((p) => p.id !== id),
          activePathId:
            state.activePathId === id
              ? state.paths.filter((p) => p.id !== id)[0]?.id || null
              : state.activePathId,
        })),

      setActivePath: (id) => set({ activePathId: id }),

      addNode: (pathId, point, position) =>
        set((state) => ({
          paths: state.paths.map((p) => {
            if (p.id !== pathId) return p;
            const insertPos =
              position !== undefined ? position : p.nodes.length;
            const newNode: PathNode = {
              id: generateId('node'),
              x: point.x,
              y: point.y,
              order: insertPos,
            };
            const newNodes = [...p.nodes];
            newNodes.forEach((n) => {
              if (n.order >= insertPos) n.order += 1;
            });
            newNodes.push(newNode);
            return {
              ...p,
              nodes: newNodes.sort((a, b) => a.order - b.order),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      updateNode: (pathId, nodeId, updates) =>
        set((state) => ({
          paths: state.paths.map((p) => {
            if (p.id !== pathId) return p;
            return {
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === nodeId ? { ...n, ...updates } : n
              ),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      deleteNode: (pathId, nodeId) =>
        set((state) => ({
          paths: state.paths.map((p) => {
            if (p.id !== pathId) return p;
            const node = p.nodes.find((n) => n.id === nodeId);
            if (!node) return p;
            const newNodes = p.nodes
              .filter((n) => n.id !== nodeId)
              .map((n) => (n.order > node.order ? { ...n, order: n.order - 1 } : n));
            return {
              ...p,
              nodes: newNodes,
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      mergeImportedData: (vfs, paths) =>
        set((state) => {
          const existingVfIds = new Set(state.vectorFields.map((vf) => vf.id));
          const existingPathIds = new Set(state.paths.map((p) => p.id));

          const newVfs = vfs.filter((vf) => !existingVfIds.has(vf.id));
          const newPaths = paths.filter((p) => !existingPathIds.has(p.id));

          const updatedVfs = vfs.filter((vf) => existingVfIds.has(vf.id));
          const updatedPaths = paths.filter((p) => existingPathIds.has(p.id));

          const mergedVfs = state.vectorFields.map((vf) => {
            const updated = updatedVfs.find((u) => u.id === vf.id);
            return updated || vf;
          });
          const mergedPaths = state.paths.map((p) => {
            const updated = updatedPaths.find((u) => u.id === p.id);
            return updated || p;
          });

          return {
            vectorFields: [...mergedVfs, ...newVfs],
            paths: [...mergedPaths, ...newPaths],
          };
        }),

      resetToDefaults: () =>
        set({
          vectorFields: [initialVectorField],
          paths: initialPaths,
          activeVectorFieldId: initialVectorField.id,
          activePathId: initialPaths[0]?.id || null,
        }),
    }),
    {
      name: 'path-store',
    }
  )
);
