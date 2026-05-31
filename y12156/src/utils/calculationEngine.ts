import {
  Material,
  ConstructionNode,
  WallConstruction,
  MaterialLibrary,
  EnvironmentParams,
  HeatFlowNode,
  CalculationResult,
  ThermalBridgeCalculation,
  DataConflict,
} from '../types';
import { generateId, UNITS } from './formatters';
import { APPLICABLE_SCOPE, ENERGY_PRICE_PER_KWH } from './constants';

interface NodeMaterialPair {
  node: ConstructionNode;
  material: Material | undefined;
  resolvedThickness?: number;
  resolvedConductivity?: number;
}

interface CalculationContext {
  construction: WallConstruction;
  materialLibrary: MaterialLibrary;
  environment: EnvironmentParams;
  conflicts: DataConflict[];
}

export function resolveMaterialForNode(
  node: ConstructionNode,
  materials: Material[],
  conflicts: DataConflict[]
): NodeMaterialPair {
  const material = materials.find(m => m.id === node.materialId);

  const thicknessConflict = conflicts.find(
    c => c.nodeId === node.id && c.type === 'material_thickness' && c.resolved
  );
  const conductivityConflict = conflicts.find(
    c => c.nodeId === node.id && c.type === 'thermal_conductivity' && c.resolved
  );

  return {
    node,
    material,
    resolvedThickness: thicknessConflict ? Number(thicknessConflict.resolvedValue) : undefined,
    resolvedConductivity: conductivityConflict ? Number(conductivityConflict.resolvedValue) : undefined,
  };
}

export function getEffectiveThickness(pair: NodeMaterialPair): number | null {
  if (pair.resolvedThickness !== undefined) {
    return pair.resolvedThickness;
  }
  if (pair.node.thickness !== undefined && pair.node.thickness !== null) {
    return pair.node.thickness;
  }
  if (pair.material?.thickness !== null && pair.material?.thickness !== undefined) {
    return pair.material.thickness;
  }
  return null;
}

export function getEffectiveConductivity(pair: NodeMaterialPair): number | null {
  if (pair.resolvedConductivity !== undefined) {
    return pair.resolvedConductivity;
  }
  if (pair.material?.thermalConductivity !== null && pair.material?.thermalConductivity !== undefined) {
    return pair.material.thermalConductivity;
  }
  return null;
}

export function calculateThermalResistance(thickness: number, conductivity: number): number {
  if (conductivity <= 0) {
    throw new Error('导热率必须大于0');
  }
  return thickness / conductivity;
}

export function calculateTotalThermalResistance(
  pairs: NodeMaterialPair[]
): { totalResistance: number; nodeResistances: Map<string, number>; failures: string[] } {
  const nodeResistances = new Map<string, number>();
  const failures: string[] = [];
  let totalResistance = 0;

  const sortedPairs = [...pairs].sort((a, b) => a.node.layerOrder - b.node.layerOrder);

  for (const pair of sortedPairs) {
    const thickness = getEffectiveThickness(pair);
    const conductivity = getEffectiveConductivity(pair);

    if (thickness === null || thickness <= 0) {
      failures.push(`节点 [${pair.node.nodeCode}] ${pair.node.name}: 材料厚度缺失或无效`);
      continue;
    }

    if (conductivity === null || conductivity <= 0) {
      failures.push(`节点 [${pair.node.nodeCode}] ${pair.node.name}: 材料导热率缺失或无效`);
      continue;
    }

    try {
      const resistance = calculateThermalResistance(thickness, conductivity);
      nodeResistances.set(pair.node.id, resistance);
      totalResistance += resistance;
    } catch (e) {
      failures.push(`节点 [${pair.node.nodeCode}] ${pair.node.name}: 热阻计算失败 - ${(e as Error).message}`);
    }
  }

  return { totalResistance, nodeResistances, failures };
}

export function calculateTemperatureDifference(indoor: number, outdoor: number): number {
  return Math.abs(indoor - outdoor);
}

export function calculateHeatFlowDensity(temperatureDiff: number, totalResistance: number): number {
  if (totalResistance <= 0) {
    throw new Error('总热阻必须大于0');
  }
  return temperatureDiff / totalResistance;
}

export function calculateHeatFlowRate(heatFlowDensity: number, area: number): number {
  return heatFlowDensity * area;
}

export function calculateNodeTemperatureDrop(
  nodeResistance: number,
  totalResistance: number,
  totalTemperatureDiff: number
): number {
  if (totalResistance <= 0) {
    return 0;
  }
  return (nodeResistance / totalResistance) * totalTemperatureDiff;
}

export function calculateThermalBridgeLoss(
  node: ConstructionNode,
  temperatureDiff: number
): { bridgeLoss: number; formula: string } {
  if (!node.isThermalBridge) {
    return { bridgeLoss: 0, formula: '非热桥节点' };
  }

  if (node.bridgeType === 'linear' && node.psiValue !== undefined && node.bridgeLength !== undefined) {
    const loss = node.psiValue * node.bridgeLength * temperatureDiff;
    return {
      bridgeLoss: loss,
      formula: `Φ = ψ × L × ΔT = ${node.psiValue.toFixed(4)} × ${node.bridgeLength.toFixed(2)} × ${temperatureDiff.toFixed(1)}`,
    };
  }

  if (node.bridgeType === 'point' && node.chiValue !== undefined) {
    const loss = node.chiValue * temperatureDiff;
    return {
      bridgeLoss: loss,
      formula: `Φ = χ × ΔT = ${node.chiValue.toFixed(4)} × ${temperatureDiff.toFixed(1)}`,
    };
  }

  if (node.bridgeType === 'planar') {
    return { bridgeLoss: 0, formula: '面状热桥已包含在主体热流计算中' };
  }

  return { bridgeLoss: 0, formula: '热桥参数不完整，未单独计算' };
}

export function calculateUValue(totalResistance: number): number {
  if (totalResistance <= 0) {
    return 0;
  }
  return 1 / totalResistance;
}

export function calculateMonthlyEnergyLoss(totalHeatLoss: number, calculationPeriodDays: number): number {
  const hours = calculationPeriodDays * 24;
  return (totalHeatLoss * hours) / 1000;
}

export function performThermalBridgeCalculation(
  context: CalculationContext
): CalculationResult {
  const { construction, materialLibrary, environment, conflicts } = context;
  const failureReasons: string[] = [];

  if (!construction.nodes || construction.nodes.length === 0) {
    return createFailedResult(context, ['墙体构造节点为空，无法进行计算']);
  }

  if (environment.indoorTemperature === undefined || environment.outdoorTemperature === undefined) {
    return createFailedResult(context, ['室内外温度参数不完整']);
  }

  if (isNaN(environment.indoorTemperature) || isNaN(environment.outdoorTemperature)) {
    return createFailedResult(context, ['室内外温度参数无效']);
  }

  const temperatureDiff = calculateTemperatureDifference(
    environment.indoorTemperature,
    environment.outdoorTemperature
  );

  if (temperatureDiff === 0) {
    return createFailedResult(context, ['室内外温差为0，无热流产生']);
  }

  const pairs: NodeMaterialPair[] = construction.nodes.map(node =>
    resolveMaterialForNode(node, materialLibrary.materials, conflicts)
  );

  const { totalResistance, nodeResistances, failures } = calculateTotalThermalResistance(pairs);

  if (failures.length > 0) {
    failureReasons.push(...failures);
  }

  if (totalResistance <= 0) {
    return createFailedResult(context, [...failureReasons, '总热阻计算结果无效，无法继续计算']);
  }

  const heatFlowDensity = calculateHeatFlowDensity(temperatureDiff, totalResistance);
  const uValue = calculateUValue(totalResistance);

  const heatFlowNodes: HeatFlowNode[] = [];
  let totalHeatLoss = 0;
  let totalBridgeLoss = 0;

  for (const pair of pairs) {
    const nodeResistance = nodeResistances.get(pair.node.id) || 0;
    const nodeHeatFlowRate = calculateHeatFlowRate(heatFlowDensity, pair.node.area);
    const temperatureDrop = calculateNodeTemperatureDrop(
      nodeResistance,
      totalResistance,
      temperatureDiff
    );

    const { bridgeLoss, formula: bridgeFormula } = calculateThermalBridgeLoss(pair.node, temperatureDiff);
    totalBridgeLoss += bridgeLoss;

    const thickness = getEffectiveThickness(pair);
    const conductivity = getEffectiveConductivity(pair);

    heatFlowNodes.push({
      nodeId: pair.node.id,
      nodeName: pair.node.name,
      nodeCode: pair.node.nodeCode,
      heatFlowDensity,
      heatFlowRate: nodeHeatFlowRate,
      thermalResistance: nodeResistance,
      temperatureDrop,
      isThermalBridge: pair.node.isThermalBridge,
      calculationDetails: {
        formula: `q = ΔT / R_total = ${temperatureDiff.toFixed(1)} / ${totalResistance.toFixed(4)}`,
        inputs: {
          thickness: thickness ?? 0,
          conductivity: conductivity ?? 0,
          area: pair.node.area,
          resistance: nodeResistance,
          temperatureDrop,
          bridgeLoss,
        },
      },
    });

    totalHeatLoss += nodeHeatFlowRate;
  }

  const totalHeatLossIncludingBridges = totalHeatLoss + totalBridgeLoss;
  const monthlyLoss = calculateMonthlyEnergyLoss(totalHeatLossIncludingBridges, environment.calculationPeriod);
  const bridgeLossRatio = totalHeatLossIncludingBridges > 0
    ? (totalBridgeLoss / totalHeatLossIncludingBridges) * 100
    : 0;
  const monthlyEnergyConsumption = {
    kwh: monthlyLoss,
    cost: monthlyLoss * ENERGY_PRICE_PER_KWH,
  };

  const applicableScope = determineApplicableScope(construction, materialLibrary);

  return {
    id: generateId(),
    calculationId: generateId(),
    status: failureReasons.length > 0 ? 'partial' : 'success',
    totalHeatLoss: totalHeatLossIncludingBridges,
    totalHeatLossMonthly: monthlyLoss,
    averageUValue: uValue,
    heatFlowNodes,
    thermalBridgeLoss: totalBridgeLoss,
    thermalBridgeLossRatio: bridgeLossRatio,
    monthlyEnergyConsumption,
    applicableScope,
    failureReasons,
    dataSourceChain: [
      { type: 'construction', id: construction.id, name: construction.name, maintainer: construction.maintainedBy },
      { type: 'material', id: materialLibrary.id, name: materialLibrary.name, maintainer: materialLibrary.maintainedBy },
      { type: 'environment', id: 'env-001', name: '环境参数', maintainer: '当前用户' },
    ],
    calculatedAt: new Date(),
    units: {
      totalHeatLoss: UNITS.heatFlowRate,
      totalHeatLossMonthly: UNITS.energyMonthly,
      averageUValue: UNITS.uValue,
      thermalBridgeLoss: UNITS.heatFlowRate,
      thermalBridgeLossRatio: UNITS.percentage,
      monthlyEnergyConsumption: UNITS.energy,
    },
  };
}

function createFailedResult(context: CalculationContext, reasons: string[]): CalculationResult {
  return {
    id: generateId(),
    calculationId: generateId(),
    status: 'failed',
    totalHeatLoss: 0,
    totalHeatLossMonthly: 0,
    averageUValue: 0,
    heatFlowNodes: [],
    thermalBridgeLoss: 0,
    thermalBridgeLossRatio: 0,
    monthlyEnergyConsumption: {
      kwh: 0,
      cost: 0,
    },
    applicableScope: '',
    failureReasons: reasons,
    dataSourceChain: [
      { type: 'construction', id: context.construction.id, name: context.construction.name, maintainer: context.construction.maintainedBy },
      { type: 'material', id: context.materialLibrary.id, name: context.materialLibrary.name, maintainer: context.materialLibrary.maintainedBy },
      { type: 'environment', id: 'env-001', name: '环境参数', maintainer: '当前用户' },
    ],
    calculatedAt: new Date(),
    units: {},
  };
}

function determineApplicableScope(construction: WallConstruction, materialLibrary: MaterialLibrary): string {
  const hasInsulation = materialLibrary.materials.some(m =>
    m.name.includes('保温') || m.name.includes('隔热') ||
    (m.thermalConductivity !== null && m.thermalConductivity < 0.1)
  );

  if (hasInsulation) {
    return APPLICABLE_SCOPE.residential + '；' + APPLICABLE_SCOPE.commercial;
  }

  return APPLICABLE_SCOPE.all;
}

export async function performCalculationAsync(
  calculation: ThermalBridgeCalculation,
  onProgress?: (progress: number, message: string) => void
): Promise<CalculationResult> {
  const steps = [
    { progress: 10, message: '正在解析墙体构造数据...' },
    { progress: 30, message: '正在匹配材料参数...' },
    { progress: 50, message: '正在计算各层热阻...' },
    { progress: 70, message: '正在计算热流密度...' },
    { progress: 85, message: '正在归集热桥损耗...' },
    { progress: 95, message: '正在生成计算结果...' },
    { progress: 100, message: '计算完成' },
  ];

  for (let i = 0; i < steps.length - 1; i++) {
    await new Promise(resolve => setTimeout(resolve, 200));
    onProgress?.(steps[i].progress, steps[i].message);
  }

  const result = performThermalBridgeCalculation({
    construction: calculation.wallConstruction,
    materialLibrary: calculation.materialLibrary,
    environment: calculation.environmentParams,
    conflicts: calculation.conflicts,
  });

  onProgress?.(100, '计算完成');
  return result;
}
