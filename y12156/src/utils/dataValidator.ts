import {
  WallConstruction,
  MaterialLibrary,
  EnvironmentParams,
  ValidationIssue,
  ConstructionNode,
  Material,
} from '../types';
import { generateId } from './formatters';

export function validateAll(
  construction: WallConstruction,
  materialLibrary: MaterialLibrary,
  environment: EnvironmentParams
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...validateConstruction(construction, materialLibrary));
  issues.push(...validateMaterials(materialLibrary));
  issues.push(...validateEnvironment(environment));
  issues.push(...validateCrossReferences(construction, materialLibrary));

  return issues;
}

export function validateConstruction(
  construction: WallConstruction,
  materialLibrary: MaterialLibrary
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!construction.nodes || construction.nodes.length === 0) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: '墙体构造节点为空',
      humanReadableExplanation: '墙体构造中没有定义任何构造层，这就像要建一面墙却连一块砖都没准备。请先添加构造节点数据。',
      sourceRecordId: construction.id,
      sourceRecordType: 'node',
      fieldName: 'nodes',
    });
    return issues;
  }

  issues.push(...validateDuplicateNodes(construction.nodes));

  for (const node of construction.nodes) {
    issues.push(...validateConstructionNode(node, materialLibrary));
  }

  return issues;
}

export function validateConstructionNode(
  node: ConstructionNode,
  materialLibrary: MaterialLibrary
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (node.thickness === undefined || node.thickness === null || node.thickness <= 0) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: `节点 [${node.nodeCode}] ${node.name}: 厚度参数缺失或无效`,
      humanReadableExplanation: `构造节点"${node.name}"的厚度没有填写或者填了负数。厚度就像蛋糕的分层，每一层都得有个正的厚度值才能算出保温效果。`,
      sourceRecordId: node.id,
      sourceRecordType: 'node',
      fieldName: 'thickness',
      expectedValue: '> 0',
      actualValue: node.thickness,
    });
  }

  if (node.area === undefined || node.area === null || node.area <= 0) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: `节点 [${node.nodeCode}] ${node.name}: 面积参数缺失或无效`,
      humanReadableExplanation: `构造节点"${node.name}"的面积没有填写或者填了负数。面积是计算热量流失的基础，没有面积就像不知道墙有多大。`,
      sourceRecordId: node.id,
      sourceRecordType: 'node',
      fieldName: 'area',
      expectedValue: '> 0',
      actualValue: node.area,
    });
  }

  if (node.isThermalBridge) {
    if (node.bridgeType === 'linear') {
      if (node.psiValue === undefined || node.psiValue === null) {
        issues.push({
          id: generateId(),
          type: 'missing_parameter',
          severity: 'warning',
          message: `节点 [${node.nodeCode}] ${node.name}: 线性热桥系数(ψ)缺失`,
          humanReadableExplanation: `这个节点标记为线性热桥（比如墙角、窗边），但缺少线性热桥系数ψ值。缺少这个参数的话，热桥带来的额外热量流失就无法精确计算，这部分损耗会被忽略。`,
          sourceRecordId: node.id,
          sourceRecordType: 'node',
          fieldName: 'psiValue',
        });
      }
      if (node.bridgeLength === undefined || node.bridgeLength === null) {
        issues.push({
          id: generateId(),
          type: 'missing_parameter',
          severity: 'warning',
          message: `节点 [${node.nodeCode}] ${node.name}: 热桥长度缺失`,
          humanReadableExplanation: `线性热桥需要知道长度才能计算损耗，就像算水管漏水得知道漏缝有多长。请补充热桥长度参数。`,
          sourceRecordId: node.id,
          sourceRecordType: 'node',
          fieldName: 'bridgeLength',
        });
      }
    }
    if (node.bridgeType === 'point' && (node.chiValue === undefined || node.chiValue === null)) {
      issues.push({
        id: generateId(),
        type: 'missing_parameter',
        severity: 'warning',
        message: `节点 [${node.nodeCode}] ${node.name}: 点状热桥系数(χ)缺失`,
        humanReadableExplanation: `这个节点标记为点状热桥（比如固定螺栓、预埋件），但缺少点状热桥系数χ值。缺少这个参数，穿透墙体的"热点"损耗就无法计算。`,
        sourceRecordId: node.id,
        sourceRecordType: 'node',
        fieldName: 'chiValue',
      });
    }
  }

  return issues;
}

export function validateDuplicateNodes(nodes: ConstructionNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const codeMap = new Map<string, ConstructionNode[]>();
  const idMap = new Map<string, ConstructionNode[]>();

  for (const node of nodes) {
    if (!codeMap.has(node.nodeCode)) {
      codeMap.set(node.nodeCode, []);
    }
    codeMap.get(node.nodeCode)!.push(node);

    if (!idMap.has(node.id)) {
      idMap.set(node.id, []);
    }
    idMap.get(node.id)!.push(node);
  }

  for (const [code, duplicates] of codeMap) {
    if (duplicates.length > 1) {
      issues.push({
        id: generateId(),
        type: 'duplicate_node',
        severity: 'error',
        message: `节点编码重复: ${code}，共 ${duplicates.length} 条记录`,
        humanReadableExplanation: `有${duplicates.length}个节点使用了同一个编码"${code}"，就像两个人用同一个身份证号。编码重复会导致计算结果混乱，请修改确保每个节点编码唯一。`,
        sourceRecordId: duplicates[0].id,
        sourceRecordType: 'node',
        fieldName: 'nodeCode',
        expectedValue: '唯一值',
        actualValue: code,
      });
    }
  }

  for (const [id, duplicates] of idMap) {
    if (duplicates.length > 1) {
      issues.push({
        id: generateId(),
        type: 'duplicate_node',
        severity: 'error',
        message: `节点ID重复: ${id}，共 ${duplicates.length} 条记录`,
        humanReadableExplanation: `系统内部ID重复，这通常是数据导入时的问题。请检查数据源，确保每条记录有唯一的ID标识。`,
        sourceRecordId: id,
        sourceRecordType: 'node',
        fieldName: 'id',
        expectedValue: '唯一值',
        actualValue: id,
      });
    }
  }

  return issues;
}

export function validateMaterials(materialLibrary: MaterialLibrary): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const material of materialLibrary.materials) {
    issues.push(...validateMaterial(material));
  }

  return issues;
}

export function validateMaterial(material: Material): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (material.thermalConductivity === undefined || material.thermalConductivity === null) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: `材料 [${material.name}]: 导热率(λ)缺失`,
      humanReadableExplanation: `材料"${material.name}"的导热率λ值是空的。导热率就像材料的"导热本领"，没有这个值，我们根本不知道热量穿过它有多容易，计算肯定没法继续。`,
      sourceRecordId: material.id,
      sourceRecordType: 'material',
      fieldName: 'thermalConductivity',
    });
  } else if (material.thermalConductivity <= 0) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: `材料 [${material.name}]: 导热率(λ)无效`,
      humanReadableExplanation: `材料"${material.name}"的导热率是${material.thermalConductivity}，小于等于0。自然界中不存在导热率为负或零的材料，一定是哪里填错了。`,
      sourceRecordId: material.id,
      sourceRecordType: 'material',
      fieldName: 'thermalConductivity',
      expectedValue: '> 0',
      actualValue: material.thermalConductivity,
    });
  }

  return issues;
}

export function validateEnvironment(environment: EnvironmentParams): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (environment.indoorTemperature === undefined || environment.indoorTemperature === null) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: '室内温度参数缺失',
      humanReadableExplanation: '室内温度没有填写。温度差是热量流动的驱动力，没有室内温度就像不知道起点在哪，算不出热量要流多少。',
      sourceRecordId: 'env-001',
      sourceRecordType: 'environment',
      fieldName: 'indoorTemperature',
    });
  }

  if (environment.outdoorTemperature === undefined || environment.outdoorTemperature === null) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: '室外温度参数缺失',
      humanReadableExplanation: '室外温度没有填写。温度差是热量流动的驱动力，没有室外温度就像不知道终点在哪，算不出热量要流多少。',
      sourceRecordId: 'env-001',
      sourceRecordType: 'environment',
      fieldName: 'outdoorTemperature',
    });
  }

  if (environment.calculationPeriod === undefined || environment.calculationPeriod === null || environment.calculationPeriod <= 0) {
    issues.push({
      id: generateId(),
      type: 'missing_parameter',
      severity: 'error',
      message: '计算周期参数缺失或无效',
      humanReadableExplanation: '计算周期（天数）没有填写或者小于等于0。要算一个月损耗多少，得先告诉我们算多少天对吧？',
      sourceRecordId: 'env-001',
      sourceRecordType: 'environment',
      fieldName: 'calculationPeriod',
      expectedValue: '> 0',
      actualValue: environment.calculationPeriod,
    });
  }

  if (
    environment.indoorTemperature !== undefined &&
    environment.outdoorTemperature !== undefined &&
    !isNaN(environment.indoorTemperature) &&
    !isNaN(environment.outdoorTemperature)
  ) {
    if (environment.indoorTemperature < environment.outdoorTemperature) {
      issues.push({
        id: generateId(),
        type: 'reversed_temperature',
        severity: 'warning',
        message: `温差反向: 室内(${environment.indoorTemperature}°C) < 室外(${environment.outdoorTemperature}°C)`,
        humanReadableExplanation: `现在室内温度(${environment.indoorTemperature}°C)比室外(${environment.outdoorTemperature}°C)还低，这意味着热量实际上是从室外往室内流。这在夏天开空调时是正常的，但通常我们计算的是冬天室内供暖时向外流失的热量。如果是夏季工况请忽略此警告，如果是冬季工况请检查温度是否填反了。`,
        sourceRecordId: 'env-001',
        sourceRecordType: 'environment',
        fieldName: 'temperature',
        expectedValue: '室内温度 > 室外温度（冬季工况）',
        actualValue: `室内: ${environment.indoorTemperature}°C, 室外: ${environment.outdoorTemperature}°C`,
      });
    }

    if (Math.abs(environment.indoorTemperature - environment.outdoorTemperature) < 1) {
      issues.push({
        id: generateId(),
        type: 'reversed_temperature',
        severity: 'warning',
        message: `室内外温差过小: ${Math.abs(environment.indoorTemperature - environment.outdoorTemperature).toFixed(1)}K`,
        humanReadableExplanation: `室内外温度几乎一样，温差不到1°C。这种情况下热量流失非常小，计算结果可能没有实际参考价值。`,
        sourceRecordId: 'env-001',
        sourceRecordType: 'environment',
        fieldName: 'temperatureDiff',
        expectedValue: '≥ 1K',
        actualValue: `${Math.abs(environment.indoorTemperature - environment.outdoorTemperature).toFixed(1)}K`,
      });
    }
  }

  return issues;
}

export function validateCrossReferences(
  construction: WallConstruction,
  materialLibrary: MaterialLibrary
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const node of construction.nodes) {
    const material = materialLibrary.materials.find(m => m.id === node.materialId);

    if (!material) {
      issues.push({
        id: generateId(),
        type: 'missing_parameter',
        severity: 'error',
        message: `节点 [${node.nodeCode}] ${node.name}: 引用的材料ID不存在: ${node.materialId}`,
        humanReadableExplanation: `构造节点"${node.name}"使用了材料ID"${node.materialId}"，但在材料库中找不到这个材料。这就像菜谱里写了个不存在的食材名，我们不知道该用什么来计算。请检查材料ID是否正确，或者先在材料库中添加这个材料。`,
        sourceRecordId: node.id,
        sourceRecordType: 'node',
        fieldName: 'materialId',
        expectedValue: '材料库中存在的ID',
        actualValue: node.materialId,
      });
    }
  }

  return issues;
}

export function getIssuesBySeverity(issues: ValidationIssue[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  return {
    errors: issues.filter(i => i.severity === 'error'),
    warnings: issues.filter(i => i.severity === 'warning'),
  };
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some(i => i.severity === 'error');
}

export function getIssueSummary(issues: ValidationIssue[]): {
  total: number;
  errors: number;
  warnings: number;
  byType: Record<string, number>;
} {
  const { errors, warnings } = getIssuesBySeverity(issues);
  const byType: Record<string, number> = {};

  for (const issue of issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  }

  return {
    total: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    byType,
  };
}

export function getIssueTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    missing_parameter: '参数缺失',
    duplicate_node: '节点重复',
    reversed_temperature: '温差反向',
  };
  return labels[type] || type;
}
