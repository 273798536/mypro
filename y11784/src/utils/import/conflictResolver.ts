import type {
  VectorField,
  Path,
  ConflictStrategy,
  ImportResult,
  ImportConflict,
} from '@/types';

export function resolveConflicts(
  importResult: ImportResult,
  existingVectorFields: VectorField[],
  existingPaths: Path[],
  strategy: ConflictStrategy
): {
  vectorFields: VectorField[];
  paths: Path[];
  appliedStrategies: Map<string, ConflictStrategy>;
} {
  const appliedStrategies = new Map<string, ConflictStrategy>();
  const conflictMap = new Map(
    importResult.conflicts.map((c) => [c.newId, c])
  );

  const resolvedVfs: VectorField[] = importResult.vectorFields.map((vf) => {
    const conflict = conflictMap.get(vf.id);
    if (!conflict) return vf;

    appliedStrategies.set(vf.id, strategy);

    switch (strategy) {
      case 'ignore':
        return null;
      case 'overwrite':
        return { ...vf, updatedAt: new Date().toISOString() };
      case 'append': {
        const existingVf = existingVectorFields.find(
          (e) => e.id === vf.id || e.name === vf.name
        );
        if (existingVf) {
          return {
            ...vf,
            id: `${vf.id}-copy-${Date.now()}`,
            name: `${vf.name} (副本)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return vf;
      }
      default:
        return vf;
    }
  }).filter(Boolean) as VectorField[];

  const resolvedPaths: Path[] = importResult.paths.map((path) => {
    const conflict = conflictMap.get(path.id);
    if (!conflict) return path;

    appliedStrategies.set(path.id, strategy);

    switch (strategy) {
      case 'ignore':
        return null;
      case 'overwrite':
        return { ...path, updatedAt: new Date().toISOString() };
      case 'append': {
        const existingPath = existingPaths.find(
          (e) => e.id === path.id || e.name === path.name
        );
        if (existingPath) {
          return {
            ...path,
            id: `${path.id}-copy-${Date.now()}`,
            name: `${path.name} (副本)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return path;
      }
      default:
        return path;
    }
  }).filter(Boolean) as Path[];

  return {
    vectorFields: resolvedVfs,
    paths: resolvedPaths,
    appliedStrategies,
  };
}

export function mergeData(
  existingVfs: VectorField[],
  existingPaths: Path[],
  newVfs: VectorField[],
  newPaths: Path[],
  strategy: ConflictStrategy
): {
  vectorFields: VectorField[];
  paths: Path[];
} {
  const vfIdMap = new Map(existingVfs.map((vf) => [vf.id, vf]));
  const pathIdMap = new Map(existingPaths.map((p) => [p.id, p]));

  newVfs.forEach((vf) => {
    const existing = vfIdMap.get(vf.id);
    if (!existing) {
      vfIdMap.set(vf.id, vf);
    } else if (strategy === 'overwrite') {
      vfIdMap.set(vf.id, vf);
    }
  });

  newPaths.forEach((path) => {
    const existing = pathIdMap.get(path.id);
    if (!existing) {
      pathIdMap.set(path.id, path);
    } else if (strategy === 'overwrite') {
      pathIdMap.set(path.id, path);
    }
  });

  return {
    vectorFields: Array.from(vfIdMap.values()),
    paths: Array.from(pathIdMap.values()),
  };
}

export function getConflictDescription(conflict: ImportConflict): string {
  const typeLabel = conflict.type === 'vectorField' ? '向量场' : '路径';
  return `${typeLabel} "${conflict.newName}" 已存在 (ID: ${conflict.existingId})`;
}

export function getStrategyLabel(strategy: ConflictStrategy): string {
  const labels: Record<ConflictStrategy, string> = {
    ignore: '忽略',
    overwrite: '覆盖',
    append: '追加',
  };
  return labels[strategy];
}

export function getStrategyDescription(
  strategy: ConflictStrategy
): string {
  const descriptions: Record<ConflictStrategy, string> = {
    ignore: '保留现有数据，跳过冲突项',
    overwrite: '用新数据替换现有数据',
    append: '重命名新数据并同时保留',
  };
  return descriptions[strategy];
}
