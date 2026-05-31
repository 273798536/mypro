export const MATERIAL_CORRECTION_FACTORS: Record<string, number> = {
  '光滑金属': 1.00,
  '金属': 0.99,
  '玻璃': 0.98,
  '混凝土': 0.98,
  '石材': 0.97,
  '瓷砖': 0.97,
  '木材': 0.95,
  '硬纸板': 0.92,
  '塑料': 0.90,
  '橡胶': 0.88,
  '布料': 0.85,
  '海绵': 0.75,
  '泡沫': 0.70,
  '吸音棉': 0.60,
};

export const MATERIAL_CATEGORIES: Record<string, string[]> = {
  '高反射': ['光滑金属', '金属', '玻璃'],
  '中等反射': ['混凝土', '石材', '瓷砖', '木材', '硬纸板'],
  '低反射': ['塑料', '橡胶', '布料'],
  '吸收型': ['海绵', '泡沫', '吸音棉'],
};

export const getMaterialCategory = (material: string): string => {
  for (const [category, materials] of Object.entries(MATERIAL_CATEGORIES)) {
    if (materials.includes(material)) {
      return category;
    }
  }
  return '未知';
};

export const getMaterialCorrectionFactor = (material: string | undefined): number => {
  if (!material) return 1.0;
  return MATERIAL_CORRECTION_FACTORS[material] ?? 1.0;
};

export const MATERIAL_LIST = Object.keys(MATERIAL_CORRECTION_FACTORS);
