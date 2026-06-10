/**
 * 物种同义词典
 * 用于物种名称的标准化映射，支持学名、俗名、缩写等多种形式
 * 每条记录以标准名称为key，同义词数组包含所有别名
 */

/** 同义词组接口定义 */
export interface SpeciesSynonymGroup {
  /** 标准物种名称（学名） */
  standardName: string;
  /** 分类学门 */
  phylum: string;
  /** 分类学纲 */
  class: string;
  /** 同义词列表（包含学名、俗名、英文、缩写等） */
  synonyms: string[];
  /** 备注说明 */
  remark?: string;
}

/** 物种同义词典完整数据 */
export const speciesSynonyms: SpeciesSynonymGroup[] = [
  {
    standardName: '大肠埃希氏菌',
    phylum: '变形菌门',
    class: 'γ-变形菌纲',
    synonyms: ['大肠埃希氏菌', '大肠杆菌', 'E.coli', 'Escherichia coli', '大肠菌群', '大肠菌'],
    remark: '最常见的模式生物，食品卫生指示菌'
  },
  {
    standardName: '金黄色葡萄球菌',
    phylum: '厚壁菌门',
    class: '芽孢杆菌纲',
    synonyms: ['金黄色葡萄球菌', '金葡菌', 'S.aureus', 'Staphylococcus aureus', '金葡球菌'],
    remark: '革兰氏阳性菌，常见食源性致病菌'
  },
  {
    standardName: '铜绿假单胞菌',
    phylum: '变形菌门',
    class: 'γ-变形菌纲',
    synonyms: ['铜绿假单胞菌', '绿脓杆菌', 'P.aeruginosa', 'Pseudomonas aeruginosa', '铜绿杆菌'],
    remark: '条件致病菌，可产生绿色色素'
  },
  {
    standardName: '枯草芽孢杆菌',
    phylum: '厚壁菌门',
    class: '芽孢杆菌纲',
    synonyms: ['枯草芽孢杆菌', '枯草杆菌', 'B.subtilis', 'Bacillus subtilis', '枯草芽胞杆菌'],
    remark: '革兰氏阳性，产芽孢，常用作益生菌'
  },
  {
    standardName: '白色念珠菌',
    phylum: '子囊菌门',
    class: '酵母菌纲',
    synonyms: ['白色念珠菌', '白假丝酵母菌', 'C.albicans', 'Candida albicans', '白色假丝酵母'],
    remark: '条件致病性真菌，可引起念珠菌病'
  },
  {
    standardName: '鼠伤寒沙门氏菌',
    phylum: '变形菌门',
    class: 'γ-变形菌纲',
    synonyms: ['鼠伤寒沙门氏菌', '鼠伤寒沙门菌', 'S.typhimurium', 'Salmonella typhimurium', '鼠伤寒杆菌'],
    remark: '重要食源性致病菌，引起胃肠炎'
  },
  {
    standardName: '产气荚膜梭菌',
    phylum: '厚壁菌门',
    class: '梭菌纲',
    synonyms: ['产气荚膜梭菌', '产气荚膜杆菌', 'C.perfringens', 'Clostridium perfringens', '魏氏梭菌'],
    remark: '厌氧革兰氏阳性菌，可产生气性坏疽'
  },
  {
    standardName: '黑曲霉',
    phylum: '子囊菌门',
    class: '散囊菌纲',
    synonyms: ['黑曲霉', 'A.niger', 'Aspergillus niger', '黑曲霉菌', '黑色曲霉'],
    remark: '常见霉菌，工业生产柠檬酸用菌'
  },
  {
    standardName: '酿酒酵母',
    phylum: '子囊菌门',
    class: '酵母菌纲',
    synonyms: ['酿酒酵母', '啤酒酵母', 'S.cerevisiae', 'Saccharomyces cerevisiae', '面包酵母'],
    remark: '模式真菌，用于酿酒和面包发酵'
  },
  {
    standardName: '单核细胞增生李斯特氏菌',
    phylum: '厚壁菌门',
    class: '芽孢杆菌纲',
    synonyms: ['单核细胞增生李斯特氏菌', '单增李斯特菌', 'L.monocytogenes', 'Listeria monocytogenes', '单核增生李斯特菌'],
    remark: '食源性致病菌，耐寒，可在冷藏环境繁殖'
  }
];

/**
 * 根据任意同义词查找标准物种名称
 * @param name 待查询的物种名称（任意同义词形式）
 * @returns 标准物种名称，未找到则返回原名称
 */
export function findStandardName(name: string): string {
  const trimmedName = name.trim().toLowerCase();
  for (const group of speciesSynonyms) {
    for (const syn of group.synonyms) {
      if (syn.toLowerCase() === trimmedName) {
        return group.standardName;
      }
    }
  }
  return name;
}

/**
 * 根据任意同义词获取完整同义词组
 * @param name 待查询的物种名称
 * @returns 同义词组对象，未找到返回null
 */
export function findSynonymGroup(name: string): SpeciesSynonymGroup | null {
  const trimmedName = name.trim().toLowerCase();
  for (const group of speciesSynonyms) {
    for (const syn of group.synonyms) {
      if (syn.toLowerCase() === trimmedName) {
        return group;
      }
    }
  }
  return null;
}

/**
 * 判断两个物种名称是否为同一物种（同义词）
 * @param name1 物种名称1
 * @param name2 物种名称2
 * @returns 是否为同一物种
 */
export function isSameSpecies(name1: string, name2: string): boolean {
  return findStandardName(name1) === findStandardName(name2);
}

/**
 * 获取所有标准物种名称列表
 * @returns 标准名称数组
 */
export function getAllStandardNames(): string[] {
  return speciesSynonyms.map(g => g.standardName);
}
