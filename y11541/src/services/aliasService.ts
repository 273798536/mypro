import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { run, get, all } from '../db/database';
import { MaterialAlias } from '../types';

export async function addAlias(
  canonicalId: string,
  aliasName: string,
  platform: string
): Promise<MaterialAlias> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  
  try {
    await run(
      'INSERT INTO material_aliases (id, canonical_id, alias_name, platform, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, canonicalId, aliasName, platform, now]
    );
    
    return { id, canonical_id: canonicalId, alias_name: aliasName, platform, created_at: now };
  } catch (error) {
    const existing = await get<MaterialAlias>(
      'SELECT * FROM material_aliases WHERE canonical_id = ? AND alias_name = ? AND platform = ?',
      [canonicalId, aliasName, platform]
    );
    
    if (existing) {
      return existing;
    }
    throw error;
  }
}

export async function getAliases(canonicalId: string): Promise<MaterialAlias[]> {
  return all<MaterialAlias>(
    'SELECT * FROM material_aliases WHERE canonical_id = ?',
    [canonicalId]
  );
}

export async function findCanonicalId(aliasName: string, platform: string): Promise<string | null> {
  const row = await get<{ canonical_id: string }>(
    'SELECT canonical_id FROM material_aliases WHERE alias_name = ? AND platform = ?',
    [aliasName, platform]
  );
  
  return row ? row.canonical_id : null;
}

export interface AttributionResult {
  canonical_id: string;
  canonical_name: string;
  aliases: Array<{ name: string; platform: string }>;
  total_impressions: number;
  total_clicks: number;
  total_cost: number;
  by_platform: Array<{
    platform: string;
    material_names: string[];
    impressions: number;
    clicks: number;
    cost: number;
  }>;
}

export async function getAttribution(materialId: string): Promise<AttributionResult | null> {
  const mainRecord = await get<{ material_name: string }>(
    'SELECT material_name FROM material_records WHERE material_id = ? LIMIT 1',
    [materialId]
  );
  
  if (!mainRecord) {
    return null;
  }
  
  const aliases = await getAliases(materialId);
  const aliasNames = aliases.map(a => a.alias_name);
  
  const allNames = [
    ...new Set([
      mainRecord.material_name,
      ...aliasNames
    ])
  ];
  
  const placeholders = allNames.map(() => '?').join(',');
  
  const platformStats = await all<any>(
    `SELECT 
      platform,
      material_name,
      SUM(COALESCE(impressions, 0)) as impressions,
      SUM(COALESCE(clicks, 0)) as clicks,
      SUM(COALESCE(cost, 0)) as cost
    FROM material_records
    WHERE material_id = ? OR material_name IN (${placeholders})
    GROUP BY platform, material_name
    ORDER BY platform`,
    [materialId, ...allNames]
  );
  
  const byPlatformMap = new Map<string, {
    platform: string;
    material_names: Set<string>;
    impressions: number;
    clicks: number;
    cost: number;
  }>();
  
  for (const stat of platformStats) {
    if (!byPlatformMap.has(stat.platform)) {
      byPlatformMap.set(stat.platform, {
        platform: stat.platform,
        material_names: new Set(),
        impressions: 0,
        clicks: 0,
        cost: 0
      });
    }
    
    const pData = byPlatformMap.get(stat.platform)!;
    pData.material_names.add(stat.material_name);
    pData.impressions += Number(stat.impressions) || 0;
    pData.clicks += Number(stat.clicks) || 0;
    pData.cost += Number(stat.cost) || 0;
  }
  
  const result: AttributionResult = {
    canonical_id: materialId,
    canonical_name: mainRecord.material_name,
    aliases: aliases.map(a => ({ name: a.alias_name, platform: a.platform })),
    total_impressions: 0,
    total_clicks: 0,
    total_cost: 0,
    by_platform: []
  };
  
  for (const pData of byPlatformMap.values()) {
    result.by_platform.push({
      platform: pData.platform,
      material_names: Array.from(pData.material_names),
      impressions: pData.impressions,
      clicks: pData.clicks,
      cost: pData.cost
    });
    result.total_impressions += pData.impressions;
    result.total_clicks += pData.clicks;
    result.total_cost += pData.cost;
  }
  
  return result;
}

export async function getAllRenamedMaterials(): Promise<Array<{
  material_id: string;
  platform: string;
  name_count: number;
  names: string[];
}>> {
  const rows = await all<any>(
    `SELECT 
      material_id,
      platform,
      COUNT(DISTINCT material_name) as name_count,
      GROUP_CONCAT(material_name, ' | ') as names
    FROM (
      SELECT DISTINCT material_id, platform, material_name
      FROM material_records
    )
    GROUP BY material_id, platform
    HAVING name_count > 1
    ORDER BY name_count DESC`
  );
  
  return rows.map(r => ({
    material_id: r.material_id,
    platform: r.platform,
    name_count: r.name_count,
    names: r.names.split(' | ')
  }));
}
