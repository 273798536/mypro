import type { TerrainGrid, VillagePoint, ValidationResult, CapacityCurvePoint } from '@/types';

export function validateUnitConsistency(
  terrain: TerrainGrid,
  villages: VillagePoint[]
): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (terrain.unit !== 'meter') {
    results.push({
      id: `unit-terrain-${Date.now()}`,
      type: 'error',
      category: 'unit',
      message: `地形数据单位为"${terrain.unit}"，非标准"meter"`,
      reason: '水利行业规范要求高程数据统一使用"米(meter)"作为单位。当前地形网格使用了非标准单位，可能导致水位对比错误。',
      suggestion: '请将地形数据转换为meter单位后重新导入，或在数据源中统一单位标准。',
      affectedData: [terrain.id],
    });
  }
  return results;
}

export function validateDuplicateVillages(
  villages: VillagePoint[]
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const seen = new Map<string, VillagePoint[]>();
  for (const v of villages) {
    const key = `${v.x.toFixed(1)},${v.y.toFixed(1)}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(v);
  }
  for (const [coord, group] of seen) {
    if (group.length > 1) {
      const names = group.map((v) => v.name).join('、');
      results.push({
        id: `dup-${coord}-${Date.now()}`,
        type: 'error',
        category: 'duplicate',
        message: `坐标(${coord})存在重复村庄点：${names}`,
        reason: `多个村庄标记在同一坐标位置(${coord})，可能是数据录入时重复提交或坐标精度不足导致。这会导致淹没风险评估时对同一位置重复计算。`,
        suggestion: '请核实这些村庄的实际位置，修改坐标使其分开，或删除重复项。如属同一村庄请合并数据。',
        affectedData: group.map((v) => v.id),
      });
    }
  }
  const nameCount = new Map<string, VillagePoint[]>();
  for (const v of villages) {
    if (!nameCount.has(v.name)) nameCount.set(v.name, []);
    nameCount.get(v.name)!.push(v);
  }
  for (const [name, group] of nameCount) {
    if (group.length > 1) {
      results.push({
        id: `dup-name-${name}-${Date.now()}`,
        type: 'warning',
        category: 'duplicate',
        message: `村庄名称"${name}"重复出现${group.length}次`,
        reason: `同名村庄可能为不同聚落（如上下村），也可能为数据重复录入。需人工确认。`,
        suggestion: '请核实是否为同一村庄的重复数据，若为不同聚落建议添加区分后缀（如"XX村上组""XX村下组"）。',
        affectedData: group.map((v) => v.id),
      });
    }
  }
  return results;
}

export function validateInterpolation(
  curve: CapacityCurvePoint[],
  terrain: TerrainGrid
): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (curve.length < 3) {
    results.push({
      id: `interp-count-${Date.now()}`,
      type: 'warning',
      category: 'interpolation',
      message: '库容曲线数据点不足（少于3个）',
      reason: '库容曲线数据点过少，插值计算结果不可靠，可能严重偏离实际库容值。',
      suggestion: '建议补充更多水位-库容实测数据点，至少提供5个以上均匀分布的测量值。',
      affectedData: curve.map((_, i) => `point-${i}`),
    });
    return results;
  }
  for (let i = 1; i < curve.length; i++) {
    const dCapacity = curve[i].capacity - curve[i - 1].capacity;
    const dLevel = curve[i].level - curve[i - 1].level;
    if (dLevel <= 0) {
      results.push({
        id: `interp-level-${i}-${Date.now()}`,
        type: 'error',
        category: 'interpolation',
        message: `库容曲线水位非单调递增：第${i}点水位${curve[i].level}m ≤ 前一点${curve[i - 1].level}m`,
        reason: '库容曲线水位必须单调递增。出现非递增可能是数据录入顺序错误、水位单位不一致（如混入英尺数据）或测量异常。',
        suggestion: '请检查原始测量记录，确认水位值和单位是否正确，按水位从小到大重新排列。',
        affectedData: [`point-${i - 1}`, `point-${i}`],
      });
    }
    if (dLevel > 0) {
      const slope = dCapacity / dLevel;
      const avgSlope =
        (curve[curve.length - 1].capacity - curve[0].capacity) /
        (curve[curve.length - 1].level - curve[0].level);
      if (avgSlope > 0 && Math.abs(slope - avgSlope) / avgSlope > 2) {
        results.push({
          id: `interp-slope-${i}-${Date.now()}`,
          type: 'warning',
          category: 'interpolation',
          message: `库容曲线在水位${curve[i - 1].level}m~${curve[i].level}m区间斜率异常`,
          reason: `该区间库容增长率${slope.toFixed(1)}万m³/m，与平均增长率${avgSlope.toFixed(1)}万m³/m偏差超过200%。可能原因：(1)地形在该水位段存在突然开阔或收窄的河谷；(2)测量数据有误；(3)水位单位混用。`,
          suggestion: '请对比地形等高线图确认该水位段地形特征是否合理，如无地形依据则需复查原始测量数据。',
          affectedData: [`point-${i - 1}`, `point-${i}`],
        });
      }
    }
  }
  return results;
}

export function validateBoundary(
  terrain: TerrainGrid,
  villages: VillagePoint[],
  waterLevel: number
): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (waterLevel > terrain.maxElevation) {
    results.push({
      id: `boundary-wl-max-${Date.now()}`,
      type: 'error',
      category: 'boundary',
      message: `当前水位${waterLevel}m超过地形最高点${terrain.maxElevation}m`,
      reason: '水位高于所有地形高程，整个库区将被淹没，3D视图中将无法显示任何未淹没区域。此情况在现实中不可能出现，可能是水位数据输入错误。',
      suggestion: '请检查水位数据是否正确，确认单位是否为米(meter)。',
    });
  }
  if (waterLevel < terrain.minElevation) {
    results.push({
      id: `boundary-wl-min-${Date.now()}`,
      type: 'info',
      category: 'boundary',
      message: `当前水位${waterLevel}m低于地形最低点${terrain.minElevation}m`,
      reason: '水位低于库区最低点，不会产生任何淹没。',
      suggestion: '如需查看淹没效果，请提高水位至最低高程以上。',
    });
  }
  for (const v of villages) {
    if (v.x < 0 || v.x >= terrain.gridSize.width || v.y < 0 || v.y >= terrain.gridSize.height) {
      results.push({
        id: `boundary-village-${v.id}-${Date.now()}`,
        type: 'warning',
        category: 'boundary',
        message: `村庄"${v.name}"坐标(${v.x},${v.y})超出地形网格范围`,
        reason: '村庄点位于地形网格范围之外，无法在该地形上正确显示和评估。',
        suggestion: '请修正村庄坐标，使其落在网格范围内。',
        affectedData: [v.id],
      });
    }
  }
  return results;
}

export function validateDataGaps(terrain: TerrainGrid): ValidationResult[] {
  const results: ValidationResult[] = [];
  let gapCount = 0;
  const gapPositions: string[] = [];
  for (let i = 0; i < terrain.gridSize.height; i++) {
    for (let j = 0; j < terrain.gridSize.width; j++) {
      const val = terrain.elevations[i]?.[j];
      if (val === undefined || val === null || isNaN(val)) {
        gapCount++;
        if (gapPositions.length < 5) gapPositions.push(`(${j},${i})`);
      }
    }
  }
  if (gapCount > 0) {
    const total = terrain.gridSize.width * terrain.gridSize.height;
    const pct = ((gapCount / total) * 100).toFixed(1);
    results.push({
      id: `gap-${Date.now()}`,
      type: gapCount / total > 0.05 ? 'error' : 'warning',
      category: 'gap',
      message: `地形网格存在${gapCount}个数据缺口（占${pct}%）`,
      reason: `地形数据中有${gapCount}个网格单元缺失高程值${gapPositions.length > 0 ? `，位置：${gapPositions.join('、')}` : ''}。缺失区域将使用邻近值插值填充，但可能影响淹没范围和库容计算的准确性。`,
      suggestion: gapCount / total > 0.05
        ? '缺口比例超过5%，建议补充测量数据后重新生成地形网格。'
        : '缺口比例较小，可继续使用，但建议后续补充缺失区域的测量数据。',
    });
  }
  return results;
}

export function runAllValidations(
  terrain: TerrainGrid | null,
  villages: VillagePoint[],
  curve: CapacityCurvePoint[],
  waterLevel: number
): ValidationResult[] {
  if (!terrain) return [];
  const results: ValidationResult[] = [];
  results.push(...validateUnitConsistency(terrain, villages));
  results.push(...validateDuplicateVillages(villages));
  results.push(...validateInterpolation(curve, terrain));
  results.push(...validateBoundary(terrain, villages, waterLevel));
  results.push(...validateDataGaps(terrain));
  return results;
}
