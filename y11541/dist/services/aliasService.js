"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAlias = addAlias;
exports.getAliases = getAliases;
exports.findCanonicalId = findCanonicalId;
exports.getAttribution = getAttribution;
exports.getAllRenamedMaterials = getAllRenamedMaterials;
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("../db/database");
async function addAlias(canonicalId, aliasName, platform) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
    try {
        await (0, database_1.run)('INSERT INTO material_aliases (id, canonical_id, alias_name, platform, created_at) VALUES (?, ?, ?, ?, ?)', [id, canonicalId, aliasName, platform, now]);
        return { id, canonical_id: canonicalId, alias_name: aliasName, platform, created_at: now };
    }
    catch (error) {
        const existing = await (0, database_1.get)('SELECT * FROM material_aliases WHERE canonical_id = ? AND alias_name = ? AND platform = ?', [canonicalId, aliasName, platform]);
        if (existing) {
            return existing;
        }
        throw error;
    }
}
async function getAliases(canonicalId) {
    return (0, database_1.all)('SELECT * FROM material_aliases WHERE canonical_id = ?', [canonicalId]);
}
async function findCanonicalId(aliasName, platform) {
    const row = await (0, database_1.get)('SELECT canonical_id FROM material_aliases WHERE alias_name = ? AND platform = ?', [aliasName, platform]);
    return row ? row.canonical_id : null;
}
async function getAttribution(materialId) {
    const mainRecord = await (0, database_1.get)('SELECT material_name FROM material_records WHERE material_id = ? LIMIT 1', [materialId]);
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
    const platformStats = await (0, database_1.all)(`SELECT 
      platform,
      material_name,
      SUM(COALESCE(impressions, 0)) as impressions,
      SUM(COALESCE(clicks, 0)) as clicks,
      SUM(COALESCE(cost, 0)) as cost
    FROM material_records
    WHERE material_id = ? OR material_name IN (${placeholders})
    GROUP BY platform, material_name
    ORDER BY platform`, [materialId, ...allNames]);
    const byPlatformMap = new Map();
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
        const pData = byPlatformMap.get(stat.platform);
        pData.material_names.add(stat.material_name);
        pData.impressions += Number(stat.impressions) || 0;
        pData.clicks += Number(stat.clicks) || 0;
        pData.cost += Number(stat.cost) || 0;
    }
    const result = {
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
async function getAllRenamedMaterials() {
    const rows = await (0, database_1.all)(`SELECT 
      material_id,
      platform,
      COUNT(DISTINCT material_name) as name_count,
      GROUP_CONCAT(DISTINCT material_name, ' | ') as names
    FROM material_records
    GROUP BY material_id, platform
    HAVING name_count > 1
    ORDER BY name_count DESC`);
    return rows.map(r => ({
        material_id: r.material_id,
        platform: r.platform,
        name_count: r.name_count,
        names: r.names.split(' | ')
    }));
}
//# sourceMappingURL=aliasService.js.map