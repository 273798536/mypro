import * as itemRepo from '../repositories/itemRepo';
import * as materialRepo from '../repositories/materialRepo';
import * as locationRepo from '../repositories/locationRepo';
import { pointInPolygon, detectCrossStreet } from '../lib/match';
import type { Judgement, JudgementSuggestion, MaterialType, Material } from '../../shared/types';

const REQUIRED_TYPES: MaterialType[] = ['photo', 'boundary', 'verbal_note'];

const TYPE_LABELS: Record<MaterialType, string> = {
  photo: '照片',
  boundary: '边界',
  verbal_note: '口头说明'
};

function mapSuggestion(internal: string): JudgementSuggestion {
  switch (internal) {
    case 'release':
      return 'approve';
    case 'supplement':
      return 'need_supplement';
    case 'manual_confirm':
      return 'pending_manual';
    default:
      return 'approve';
  }
}

export async function analyze(itemId: string): Promise<Judgement> {
  const now = new Date().toISOString();
  const item = itemRepo.getItemById(itemId);
  if (!item) {
    throw new Error(`未找到 item: ${itemId}`);
  }

  const { materialIds, locationId } = item;
  const materials: Material[] = materialIds
    .map((mid) => materialRepo.getMaterialById(mid))
    .filter((m): m is Material => !!m);

  const grouped: Record<string, Material[]> = {};
  for (const m of materials) {
    if (!grouped[m.type]) grouped[m.type] = [];
    grouped[m.type].push(m);
  }

  const missingMaterials: MaterialType[] = REQUIRED_TYPES.filter(
    (t) => !grouped[t] || grouped[t].length === 0
  );

  const location = locationRepo.getLocationById(locationId);
  if (!location) {
    throw new Error(`未找到 location: ${locationId}`);
  }

  const allLocations = locationRepo.listLocations();
  const insideOwnBoundary = pointInPolygon(
    location.lng,
    location.lat,
    location.boundaryGeoJSON
  );
  const crossStreetResult = detectCrossStreet(location, allLocations);

  const hasCaliberChange = materials.some((m) => m.hasCaliberChange === 1);

  let suggestion: JudgementSuggestion;
  let remark: string;
  let nextActions: string[] = [];
  let confidence: number;

  if (!insideOwnBoundary || crossStreetResult.isCross) {
    suggestion = mapSuggestion('manual_confirm');
    confidence = 0.55;
    if (crossStreetResult.isCross && crossStreetResult.hitName) {
      remark = `坐标 (${location.lng}, ${location.lat}) 实际落在「${crossStreetResult.hitName}」的边界内，疑似偏到隔壁街，建议重新测绘坐标或调整边界并录入说明。`;
    } else {
      remark = `坐标 (${location.lng}, ${location.lat}) 不在自己的边界范围之内，建议重新测绘坐标、调整边界并录入说明。`;
    }
    nextActions = ['重新测绘坐标', '确认边界范围', '人工录入说明'];
  } else if (hasCaliberChange && missingMaterials.length > 0) {
    suggestion = mapSuggestion('manual_confirm');
    confidence = 0.65;
    const missingLabels = missingMaterials.map((t) => TYPE_LABELS[t]).join('、');
    remark = `存在口径变更材料，同时缺少${missingLabels}类材料，需人工确认变更的合法性与补件方案。`;
    nextActions = ['人工复核口径变更说明', `补充${missingLabels}类材料`];
  } else if (missingMaterials.length > 0) {
    suggestion = mapSuggestion('supplement');
    confidence = 0.85;
    const missingLabels = missingMaterials.map((t) => TYPE_LABELS[t]).join('、');
    remark = `缺少${missingLabels}类材料，请补充后重新提交。`;
    nextActions = [`请补充${missingLabels}类材料`];
  } else {
    suggestion = mapSuggestion('release');
    confidence = 0.92;
    const photoCount = grouped['photo']?.length ?? 0;
    const boundaryCount = grouped['boundary']?.length ?? 0;
    const noteCount = grouped['verbal_note']?.length ?? 0;
    remark = `材料齐备（${photoCount} 照片 + ${boundaryCount} 边界 + ${noteCount} 说明），坐标在边界内，无口径冲突。`;
    nextActions = ['信息完备，符合公告条件'];
  }

  const result: Judgement = {
    suggestion,
    confidence,
    missingMaterials,
    crossStreetCheck: crossStreetResult,
    remark,
    modelVersion: 'night-market-judge-v1.3.0',
    judgedAt: now
  };

  (result as any).nextActions = nextActions;
  return result;
}
