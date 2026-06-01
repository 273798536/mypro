import { BuildingBlock, AnomalyItem } from '../types';
import { SITE_BOUNDARY } from '../data/mockData';

export function detectSetbackErrors(buildings: BuildingBlock[]): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];

  for (const building of buildings) {
    const deficits: { side: string; deficit: number; distance: number }[] = [];

    const leftEdge = building.position.x - building.dimensions.width / 2;
    const rightEdge = building.position.x + building.dimensions.width / 2;
    const frontEdge = building.position.z - building.dimensions.depth / 2;
    const backEdge = building.position.z + building.dimensions.depth / 2;

    const leftDistance = leftEdge - SITE_BOUNDARY.minX;
    if (leftDistance < building.requiredSetback) {
      deficits.push({
        side: '西侧',
        deficit: building.requiredSetback - leftDistance,
        distance: leftDistance,
      });
    }

    const rightDistance = SITE_BOUNDARY.maxX - rightEdge;
    if (rightDistance < building.requiredSetback) {
      deficits.push({
        side: '东侧',
        deficit: building.requiredSetback - rightDistance,
        distance: rightDistance,
      });
    }

    const frontDistance = frontEdge - SITE_BOUNDARY.minZ;
    if (frontDistance < building.requiredSetback) {
      deficits.push({
        side: '南侧',
        deficit: building.requiredSetback - frontDistance,
        distance: frontDistance,
      });
    }

    const backDistance = SITE_BOUNDARY.maxZ - backEdge;
    if (backDistance < building.requiredSetback) {
      deficits.push({
        side: '北侧',
        deficit: building.requiredSetback - backDistance,
        distance: backDistance,
      });
    }

    if (deficits.length > 0) {
      const totalDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0);
      const sideNames = deficits.map((d) => d.side).join('、');
      const details = deficits
        .map((d) => `${d.side}退界${d.distance.toFixed(1)}m（缺${d.deficit.toFixed(1)}m）`)
        .join('，');

      anomalies.push({
        id: `setback-${building.id}`,
        type: 'setback_error',
        severity: totalDeficit > 5 ? 'error' : 'warning',
        relatedEntities: [building.id],
        reason: `${building.name} ${sideNames}退界距离不满足要求，${details}，规定退界${building.requiredSetback}m`,
        suggestion: generateSetbackSuggestion(building, deficits),
        position: { ...building.position, y: building.dimensions.height / 2 },
        setbackDeficit: totalDeficit,
        resolved: false,
      });
    }
  }

  return anomalies;
}

function generateSetbackSuggestion(
  building: BuildingBlock,
  deficits: { side: string; deficit: number }[]
): string {
  const suggestions: string[] = [];
  const maxDeficit = Math.max(...deficits.map((d) => d.deficit));

  if (maxDeficit > 5) {
    suggestions.push('【严重】退界严重不足，需大幅调整建筑位置');
  } else {
    suggestions.push('建议调整建筑位置以满足退界要求');
  }

  for (const deficit of deficits) {
    if (deficit.side === '西侧') {
      suggestions.push(`可将建筑向东移动约 ${(deficit.deficit + 1).toFixed(1)}m`);
    } else if (deficit.side === '东侧') {
      suggestions.push(`可将建筑向西移动约 ${(deficit.deficit + 1).toFixed(1)}m`);
    } else if (deficit.side === '南侧') {
      suggestions.push(`可将建筑向北移动约 ${(deficit.deficit + 1).toFixed(1)}m`);
    } else if (deficit.side === '北侧') {
      suggestions.push(`可将建筑向南移动约 ${(deficit.deficit + 1).toFixed(1)}m`);
    }
  }

  if (deficits.length >= 2) {
    suggestions.push('或考虑缩小建筑体量');
  }

  suggestions.push('如特殊情况，可申请退界豁免');

  return suggestions.join('；');
}
