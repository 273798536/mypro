import type { MaterialItem } from '../types';

export const MATERIAL_LIBRARY: MaterialItem[] = [
  {
    id: 'copper',
    name: '铜管',
    roughness: 0.0015,
    roughnessUnit: 'mm',
    description: '新铜管，内壁光滑',
  },
  {
    id: 'steel-galvanized',
    name: '镀锌钢管',
    roughness: 0.15,
    roughnessUnit: 'mm',
    description: '镀锌焊接钢管，新管',
  },
  {
    id: 'steel-black',
    name: '黑铁管',
    roughness: 0.2,
    roughnessUnit: 'mm',
    description: '未镀锌焊接钢管',
  },
  {
    id: 'steel-stainless',
    name: '不锈钢管',
    roughness: 0.002,
    roughnessUnit: 'mm',
    description: '304/316不锈钢管，抛光内壁',
  },
  {
    id: 'cast-iron',
    name: '铸铁管',
    roughness: 0.26,
    roughnessUnit: 'mm',
    description: '普通铸铁管，未衬里',
  },
  {
    id: 'cast-iron-cement',
    name: '水泥衬里铸铁管',
    roughness: 0.12,
    roughnessUnit: 'mm',
    description: '水泥沙浆衬里铸铁管',
  },
  {
    id: 'pvc',
    name: 'PVC管',
    roughness: 0.0015,
    roughnessUnit: 'mm',
    description: '聚氯乙烯塑料管，内壁极光滑',
  },
  {
    id: 'pe',
    name: 'PE管',
    roughness: 0.007,
    roughnessUnit: 'mm',
    description: '聚乙烯塑料管',
  },
  {
    id: 'ppr',
    name: 'PPR管',
    roughness: 0.005,
    roughnessUnit: 'mm',
    description: '无规共聚聚丙烯管',
  },
  {
    id: 'concrete',
    name: '混凝土管',
    roughness: 1.5,
    roughnessUnit: 'mm',
    description: '钢筋混凝土管，一般施工质量',
  },
  {
    id: 'concrete-smooth',
    name: '光滑混凝土管',
    roughness: 0.3,
    roughnessUnit: 'mm',
    description: '预制混凝土管，内壁光滑',
  },
  {
    id: 'rubber',
    name: '橡胶软管',
    roughness: 0.03,
    roughnessUnit: 'mm',
    description: '橡胶管，内壁光滑',
  },
];

export function getMaterialById(id: string): MaterialItem | undefined {
  return MATERIAL_LIBRARY.find((m) => m.id === id);
}

export function getRoughnessByName(name: string): number | undefined {
  const material = MATERIAL_LIBRARY.find((m) => m.name === name);
  return material?.roughness;
}
