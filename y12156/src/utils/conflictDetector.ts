import {
  WallConstruction,
  MaterialLibrary,
  DataConflict,
  ConstructionNode,
  Material,
} from '../types';
import { generateId } from './formatters';

const THICKNESS_TOLERANCE = 0.001;
const CONDUCTIVITY_TOLERANCE = 0.0001;

export function detectConflicts(
  construction: WallConstruction,
  materialLibrary: MaterialLibrary
): DataConflict[] {
  const conflicts: DataConflict[] = [];

  for (const node of construction.nodes) {
    const material = materialLibrary.materials.find(m => m.id === node.materialId);

    if (!material) {
      conflicts.push(createMaterialAssignmentConflict(node, material, construction, materialLibrary));
      continue;
    }

    const thicknessConflict = detectThicknessConflict(node, material, construction, materialLibrary);
    if (thicknessConflict) {
      conflicts.push(thicknessConflict);
    }

    const conductivityConflict = detectConductivityConflict(node, material, construction, materialLibrary);
    if (conductivityConflict) {
      conflicts.push(conductivityConflict);
    }
  }

  return conflicts;
}

function detectThicknessConflict(
  node: ConstructionNode,
  material: Material,
  construction: WallConstruction,
  materialLibrary: MaterialLibrary
): DataConflict | null {
  if (node.thickness === undefined || node.thickness === null) {
    return null;
  }

  if (material.thickness === undefined || material.thickness === null) {
    return null;
  }

  const diff = Math.abs(node.thickness - material.thickness);

  if (diff > THICKNESS_TOLERANCE) {
    return {
      id: generateId(),
      type: 'material_thickness',
      fieldName: '材料厚度',
      nodeId: node.id,
      materialId: material.id,
      constructionValue: node.thickness,
      materialValue: material.thickness,
      constructionSource: node.sourceRecord,
      materialSource: material.sourceRecord,
      constructionMaintainer: node.maintainedBy,
      materialMaintainer: material.maintainedBy,
      resolved: false,
    };
  }

  return null;
}

function detectConductivityConflict(
  node: ConstructionNode,
  material: Material,
  construction: WallConstruction,
  materialLibrary: MaterialLibrary
): DataConflict | null {
  if (material.thermalConductivity === undefined || material.thermalConductivity === null) {
    return null;
  }

  return null;
}

function createMaterialAssignmentConflict(
  node: ConstructionNode,
  material: Material | undefined,
  construction: WallConstruction,
  materialLibrary: MaterialLibrary
): DataConflict {
  return {
    id: generateId(),
    type: 'material_assignment',
    fieldName: '材料分配',
    nodeId: node.id,
    materialId: node.materialId,
    constructionValue: node.materialId,
    materialValue: '未找到',
    constructionSource: node.sourceRecord,
    materialSource: materialLibrary.name,
    constructionMaintainer: node.maintainedBy,
    materialMaintainer: materialLibrary.maintainedBy,
    resolved: false,
  };
}

export function resolveConflict(
  conflict: DataConflict,
  choice: 'construction' | 'material' | 'custom',
  customValue?: number | string,
  resolvedBy?: string,
  note?: string
): DataConflict {
  let resolvedValue: number | string;

  switch (choice) {
    case 'construction':
      resolvedValue = conflict.constructionValue;
      break;
    case 'material':
      resolvedValue = conflict.materialValue;
      break;
    case 'custom':
      if (customValue === undefined) {
        throw new Error('自定义值不能为空');
      }
      resolvedValue = customValue;
      break;
  }

  return {
    ...conflict,
    resolved: true,
    resolvedValue,
    resolvedBy: resolvedBy || '当前用户',
    resolvedAt: new Date(),
    resolutionNote: note,
  };
}

export function getUnresolvedConflicts(conflicts: DataConflict[]): DataConflict[] {
  return conflicts.filter(c => !c.resolved);
}

export function getConflictSummary(conflicts: DataConflict[]): {
  total: number;
  unresolved: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};

  for (const conflict of conflicts) {
    byType[conflict.type] = (byType[conflict.type] || 0) + 1;
  }

  return {
    total: conflicts.length,
    unresolved: getUnresolvedConflicts(conflicts).length,
    byType,
  };
}

export function getConflictTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    material_thickness: '材料厚度冲突',
    thermal_conductivity: '导热率冲突',
    material_assignment: '材料分配冲突',
  };
  return labels[type] || type;
}

export function getConflictDescription(conflict: DataConflict): string {
  const typeLabel = getConflictTypeLabel(conflict.type);

  if (conflict.type === 'material_assignment') {
    return `${typeLabel}: 构造节点引用的材料 [${conflict.constructionValue}] 在材料库中不存在`;
  }

  return `${typeLabel}: 构造数据为 ${formatConflictValue(conflict.constructionValue, conflict.type)}，材料数据为 ${formatConflictValue(conflict.materialValue, conflict.type)}`;
}

function formatConflictValue(value: number | string, type: string): string {
  if (typeof value === 'number') {
    const unit = type === 'material_thickness' ? 'm' : 'W/(m·K)';
    const precision = type === 'material_thickness' ? 4 : 4;
    return `${value.toFixed(precision)} ${unit}`;
  }
  return String(value);
}

export function autoResolveConflicts(
  conflicts: DataConflict[],
  strategy: 'prefer_construction' | 'prefer_material' | 'prefer_latest'
): DataConflict[] {
  return conflicts.map(conflict => {
    if (conflict.resolved) return conflict;

    let choice: 'construction' | 'material';

    switch (strategy) {
      case 'prefer_construction':
        choice = 'construction';
        break;
      case 'prefer_material':
        choice = 'material';
        break;
      case 'prefer_latest':
      default:
        choice = 'material';
        break;
    }

    return resolveConflict(
      conflict,
      choice,
      undefined,
      '系统自动裁决',
      `自动裁决策略: ${strategy === 'prefer_construction' ? '优先采用构造数据' : '优先采用材料数据'}`
    );
  });
}
