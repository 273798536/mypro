import { MaterialAlias } from '../types';
export declare function addAlias(canonicalId: string, aliasName: string, platform: string): Promise<MaterialAlias>;
export declare function getAliases(canonicalId: string): Promise<MaterialAlias[]>;
export declare function findCanonicalId(aliasName: string, platform: string): Promise<string | null>;
export interface AttributionResult {
    canonical_id: string;
    canonical_name: string;
    aliases: Array<{
        name: string;
        platform: string;
    }>;
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
export declare function getAttribution(materialId: string): Promise<AttributionResult | null>;
export declare function getAllRenamedMaterials(): Promise<Array<{
    material_id: string;
    platform: string;
    name_count: number;
    names: string[];
}>>;
