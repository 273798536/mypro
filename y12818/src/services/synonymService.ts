/**
 * 物种名同义匹配算法服务
 * 功能：基于词典 + 模糊匹配的物种名识别、冲突检测
 */

// ============= 类型定义 =============

/** 标准物种信息 */
export interface StandardSpecies {
  /** 标准物种编码 */
  code: string;
  /** 标准学名（拉丁名） */
  scientificName: string;
  /** 中文名 */
  chineseName: string;
  /** 常用别名列表 */
  aliases: string[];
  /** 分类层级 */
  taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
}

/** 同义词词典条目 */
export interface SynonymDictEntry {
  /** 词条文本 */
  term: string;
  /** 对应的标准物种编码 */
  standardCode: string;
  /** 词条类型 */
  termType: 'scientific' | 'chinese' | 'alias' | 'abbreviation' | 'common_mistake';
  /** 置信度权重 0-1 */
  weight: number;
}

/** 匹配结果 */
export interface MatchResult {
  /** 原始输入文本 */
  input: string;
  /** 匹配到的标准物种（可能为null表示未匹配） */
  matchedSpecies: StandardSpecies | null;
  /** 匹配方式 */
  matchType: 'exact' | 'dict' | 'fuzzy' | 'none';
  /** 匹配置信度 0-1 */
  confidence: number;
  /** 匹配到的原始词条 */
  matchedTerm?: string;
  /** 候选匹配列表（用于人工确认） */
  candidates: CandidateMatch[];
}

/** 候选匹配项 */
export interface CandidateMatch {
  species: StandardSpecies;
  matchType: 'exact' | 'dict' | 'fuzzy';
  confidence: number;
  matchedTerm: string;
  distance?: number;
}

/** 冲突检测结果 */
export interface ConflictResult {
  /** 是否存在冲突 */
  hasConflict: boolean;
  /** 冲突类型 */
  conflictType?: 'name_mismatch' | 'code_mismatch' | 'taxonomy_mismatch' | 'multi_match';
  /** 冲突描述 */
  description?: string;
  /** 涉及的物种列表 */
  involvedSpecies: StandardSpecies[];
  /** 建议解决方案 */
  suggestion?: string;
}

/** 批量匹配结果 */
export interface BatchMatchResult {
  /** 总数量 */
  total: number;
  /** 精确匹配数 */
  exactMatchCount: number;
  /** 词典匹配数 */
  dictMatchCount: number;
  /** 模糊匹配数 */
  fuzzyMatchCount: number;
  /** 未匹配数 */
  noMatchCount: number;
  /** 冲突数 */
  conflictCount: number;
  /** 详细结果 */
  results: Array<{
    rowIndex: number;
    originalName: string;
    matchResult: MatchResult;
    conflict?: ConflictResult;
  }>;
}

// ============= Mock 数据 =============

/** 标准物种数据库（Mock） */
const STANDARD_SPECIES_DB: StandardSpecies[] = [
  {
    code: 'SP-001',
    scientificName: 'Escherichia coli',
    chineseName: '大肠埃希氏菌',
    aliases: ['大肠杆菌', 'E. coli', '大肠菌'],
    taxonomy: {
      kingdom: '细菌界',
      phylum: '变形菌门',
      class: 'γ-变形菌纲',
      order: '肠杆菌目',
      family: '肠杆菌科',
      genus: '埃希氏菌属',
      species: '大肠埃希氏菌'
    }
  },
  {
    code: 'SP-002',
    scientificName: 'Staphylococcus aureus',
    chineseName: '金黄色葡萄球菌',
    aliases: ['金葡菌', 'S. aureus', '葡萄球菌'],
    taxonomy: {
      kingdom: '细菌界',
      phylum: '厚壁菌门',
      class: '芽孢杆菌纲',
      order: '芽孢杆菌目',
      family: '葡萄球菌科',
      genus: '葡萄球菌属',
      species: '金黄色葡萄球菌'
    }
  },
  {
    code: 'SP-003',
    scientificName: 'Bacillus subtilis',
    chineseName: '枯草芽孢杆菌',
    aliases: ['枯草杆菌', 'B. subtilis', '枯草菌'],
    taxonomy: {
      kingdom: '细菌界',
      phylum: '厚壁菌门',
      class: '芽孢杆菌纲',
      order: '芽孢杆菌目',
      family: '芽孢杆菌科',
      genus: '芽孢杆菌属',
      species: '枯草芽孢杆菌'
    }
  },
  {
    code: 'SP-004',
    scientificName: 'Pseudomonas aeruginosa',
    chineseName: '铜绿假单胞菌',
    aliases: ['绿脓杆菌', 'P. aeruginosa', '假单胞菌'],
    taxonomy: {
      kingdom: '细菌界',
      phylum: '变形菌门',
      class: 'γ-变形菌纲',
      order: '假单胞菌目',
      family: '假单胞菌科',
      genus: '假单胞菌属',
      species: '铜绿假单胞菌'
    }
  },
  {
    code: 'SP-005',
    scientificName: 'Candida albicans',
    chineseName: '白色念珠菌',
    aliases: ['白假丝酵母菌', 'C. albicans', '念珠菌'],
    taxonomy: {
      kingdom: '真菌界',
      phylum: '子囊菌门',
      class: '酵母菌纲',
      order: '酵母菌目',
      family: '酵母菌科',
      genus: '念珠菌属',
      species: '白色念珠菌'
    }
  }
];

/** 同义词词典（Mock） */
const SYNONYM_DICTIONARY: SynonymDictEntry[] = [
  { term: 'Escherichia coli', standardCode: 'SP-001', termType: 'scientific', weight: 1.0 },
  { term: '大肠埃希氏菌', standardCode: 'SP-001', termType: 'chinese', weight: 1.0 },
  { term: '大肠杆菌', standardCode: 'SP-001', termType: 'alias', weight: 0.95 },
  { term: 'E. coli', standardCode: 'SP-001', termType: 'abbreviation', weight: 0.9 },
  { term: '大肠菌', standardCode: 'SP-001', termType: 'alias', weight: 0.85 },
  { term: 'Staphylococcus aureus', standardCode: 'SP-002', termType: 'scientific', weight: 1.0 },
  { term: '金黄色葡萄球菌', standardCode: 'SP-002', termType: 'chinese', weight: 1.0 },
  { term: '金葡菌', standardCode: 'SP-002', termType: 'alias', weight: 0.95 },
  { term: 'S. aureus', standardCode: 'SP-002', termType: 'abbreviation', weight: 0.9 },
  { term: 'Bacillus subtilis', standardCode: 'SP-003', termType: 'scientific', weight: 1.0 },
  { term: '枯草芽孢杆菌', standardCode: 'SP-003', termType: 'chinese', weight: 1.0 },
  { term: '枯草杆菌', standardCode: 'SP-003', termType: 'alias', weight: 0.95 },
  { term: 'B. subtilis', standardCode: 'SP-003', termType: 'abbreviation', weight: 0.9 },
  { term: 'Pseudomonas aeruginosa', standardCode: 'SP-004', termType: 'scientific', weight: 1.0 },
  { term: '铜绿假单胞菌', standardCode: 'SP-004', termType: 'chinese', weight: 1.0 },
  { term: '绿脓杆菌', standardCode: 'SP-004', termType: 'alias', weight: 0.9 },
  { term: 'Candida albicans', standardCode: 'SP-005', termType: 'scientific', weight: 1.0 },
  { term: '白色念珠菌', standardCode: 'SP-005', termType: 'chinese', weight: 1.0 },
  { term: '白假丝酵母菌', standardCode: 'SP-005', termType: 'alias', weight: 0.9 },
];

// ============= 工具函数 =============

/**
 * 计算编辑距离（Levenshtein距离）
 * 用于模糊匹配算法
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[s2.length][s1.length];
}

/**
 * 基于编辑距离计算相似度得分（0-1）
 */
function similarityScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * 标准化字符串（去除多余空格、统一大小写等）
 */
function normalizeText(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[._\-\s]/g, '')
    .toLowerCase();
}

// ============= 核心服务 =============

/**
 * 物种名同义匹配服务类
 */
export class SynonymService {
  private speciesDb: StandardSpecies[];
  private synonymDict: SynonymDictEntry[];
  private fuzzyThreshold: number = 0.75;
  private maxCandidates: number = 5;

  constructor() {
    this.speciesDb = [...STANDARD_SPECIES_DB];
    this.synonymDict = [...SYNONYM_DICTIONARY];
  }

  /**
   * 设置模糊匹配阈值
   * @param threshold 阈值 0-1，默认0.75
   */
  setFuzzyThreshold(threshold: number): void {
    this.fuzzyThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * 添加新的同义词条目到词典
   */
  addSynonymEntry(entry: Omit<SynonymDictEntry, 'weight'> & { weight?: number }): void {
    const weight = entry.weight ?? this.getDefaultWeight(entry.termType);
    this.synonymDict.push({ ...entry, weight });
  }

  /**
   * 根据词条类型获取默认权重
   */
  private getDefaultWeight(termType: SynonymDictEntry['termType']): number {
    const weights: Record<SynonymDictEntry['termType'], number> = {
      scientific: 1.0,
      chinese: 1.0,
      alias: 0.9,
      abbreviation: 0.85,
      common_mistake: 0.7
    };
    return weights[termType];
  }

  /**
   * 匹配单个物种名
   * @param input 输入的物种名
   */
  matchSpecies(input: string): MatchResult {
    const normalized = normalizeText(input);
    const candidates: CandidateMatch[] = [];

    // 1. 精确匹配（标准学名、中文名）
    const exactMatch = this.speciesDb.find(
      sp =>
        normalizeText(sp.scientificName) === normalized ||
        normalizeText(sp.chineseName) === normalized
    );
    if (exactMatch) {
      return {
        input,
        matchedSpecies: exactMatch,
        matchType: 'exact',
        confidence: 1.0,
        matchedTerm: exactMatch.scientificName,
        candidates: [{ species: exactMatch, matchType: 'exact', confidence: 1.0, matchedTerm: exactMatch.scientificName }]
      };
    }

    // 2. 词典匹配
    const dictMatches = this.synonymDict.filter(entry =>
      normalizeText(entry.term) === normalized
    );
    if (dictMatches.length > 0) {
      const bestDictMatch = dictMatches.reduce((prev, curr) =>
        prev.weight > curr.weight ? prev : curr
      );
      const matchedSpecies = this.speciesDb.find(sp => sp.code === bestDictMatch.standardCode)!;

      this.speciesDb.forEach(sp => {
        const allTerms = [sp.scientificName, sp.chineseName, ...sp.aliases];
        allTerms.forEach(term => {
          if (normalizeText(term) === normalized) {
            candidates.push({
              species: sp,
              matchType: 'dict',
              confidence: bestDictMatch.weight,
              matchedTerm: term
            });
          }
        });
      });

      return {
        input,
        matchedSpecies,
        matchType: 'dict',
        confidence: bestDictMatch.weight,
        matchedTerm: bestDictMatch.term,
        candidates: candidates.slice(0, this.maxCandidates)
      };
    }

    // 3. 模糊匹配
    const fuzzyCandidates: CandidateMatch[] = [];

    for (const sp of this.speciesDb) {
      const termsToCheck = [
        { term: sp.scientificName, type: 'scientific' as const },
        { term: sp.chineseName, type: 'chinese' as const },
        ...sp.aliases.map(a => ({ term: a, type: 'alias' as const }))
      ];

      for (const { term, type } of termsToCheck) {
        const similarity = similarityScore(input, term);
        if (similarity >= this.fuzzyThreshold) {
          const baseWeight = this.getDefaultWeight(type);
          const confidence = similarity * baseWeight;
          fuzzyCandidates.push({
            species: sp,
            matchType: 'fuzzy',
            confidence: Math.round(confidence * 100) / 100,
            matchedTerm: term,
            distance: levenshteinDistance(input, term)
          });
        }
      }
    }

    // 按置信度排序并去重（同一物种只保留最高分）
    const uniqueCandidates = new Map<string, CandidateMatch>();
    for (const candidate of fuzzyCandidates.sort((a, b) => b.confidence - a.confidence)) {
      if (!uniqueCandidates.has(candidate.species.code)) {
        uniqueCandidates.set(candidate.species.code, candidate);
      }
    }
    const sortedCandidates = Array.from(uniqueCandidates.values()).slice(0, this.maxCandidates);

    if (sortedCandidates.length > 0) {
      const bestMatch = sortedCandidates[0];
      return {
        input,
        matchedSpecies: bestMatch.species,
        matchType: 'fuzzy',
        confidence: bestMatch.confidence,
        matchedTerm: bestMatch.matchedTerm,
        candidates: sortedCandidates
      };
    }

    // 4. 未匹配
    return {
      input,
      matchedSpecies: null,
      matchType: 'none',
      confidence: 0,
      candidates: []
    };
  }

  /**
   * 批量匹配物种名
   * @param inputs 输入列表 [{rowIndex, speciesName}]
   */
  batchMatchSpecies(inputs: Array<{ rowIndex: number; originalName: string }>): BatchMatchResult {
    const results: BatchMatchResult['results'] = [];
    let exactMatchCount = 0;
    let dictMatchCount = 0;
    let fuzzyMatchCount = 0;
    let noMatchCount = 0;

    for (const item of inputs) {
      const matchResult = this.matchSpecies(item.originalName);
      const conflict = this.detectConflict(item.originalName, matchResult);

      switch (matchResult.matchType) {
        case 'exact': exactMatchCount++; break;
        case 'dict': dictMatchCount++; break;
        case 'fuzzy': fuzzyMatchCount++; break;
        case 'none': noMatchCount++; break;
      }

      results.push({
        rowIndex: item.rowIndex,
        originalName: item.originalName,
        matchResult,
        conflict: conflict.hasConflict ? conflict : undefined
      });
    }

    return {
      total: inputs.length,
      exactMatchCount,
      dictMatchCount,
      fuzzyMatchCount,
      noMatchCount,
      conflictCount: results.filter(r => r.conflict).length,
      results
    };
  }

  /**
   * 冲突检测
   * 检测同一名称是否可能对应多个物种，或存在分类学冲突
   */
  detectConflict(input: string, matchResult: MatchResult): ConflictResult {
    // 情况1：多个高置信度候选
    if (matchResult.candidates.length >= 2) {
      const topTwo = matchResult.candidates.slice(0, 2);
      if (topTwo[1].confidence >= 0.7 && (topTwo[0].confidence - topTwo[1].confidence) < 0.1) {
        return {
          hasConflict: true,
          conflictType: 'multi_match',
          description: `输入"${input}"匹配到多个候选物种，置信度相近，需要人工确认`,
          involvedSpecies: topTwo.map(c => c.species),
          suggestion: '建议人工审核确认具体物种，或补充更多信息（如菌株编号、分类信息等）'
        };
      }
    }

    // 情况2：模糊匹配置信度过低
    if (matchResult.matchType === 'fuzzy' && matchResult.confidence < 0.8) {
      return {
        hasConflict: true,
        conflictType: 'name_mismatch',
        description: `模糊匹配置信度较低（${matchResult.confidence}），可能存在名称拼写错误或该物种未收录`,
        involvedSpecies: matchResult.matchedSpecies ? [matchResult.matchedSpecies] : [],
        suggestion: '建议核对物种名称拼写，或使用标准学名/中文名'
      };
    }

    // 情况3：未匹配
    if (matchResult.matchType === 'none') {
      return {
        hasConflict: true,
        conflictType: 'name_mismatch',
        description: `物种"${input}"未在标准库中找到匹配项`,
        involvedSpecies: [],
        suggestion: '建议确认物种名称是否正确，或联系管理员添加到标准物种库'
      };
    }

    return {
      hasConflict: false,
      involvedSpecies: matchResult.matchedSpecies ? [matchResult.matchedSpecies] : []
    };
  }

  /**
   * 获取所有标准物种列表
   */
  getAllStandardSpecies(): StandardSpecies[] {
    return [...this.speciesDb];
  }

  /**
   * 根据编码查询标准物种
   */
  getSpeciesByCode(code: string): StandardSpecies | undefined {
    return this.speciesDb.find(sp => sp.code === code);
  }

  /**
   * 搜索标准物种（用于前端下拉联想）
   */
  searchSpecies(keyword: string, limit: number = 10): StandardSpecies[] {
    const normalized = normalizeText(keyword);
    if (!normalized) return this.speciesDb.slice(0, limit);

    return this.speciesDb
      .filter(sp => {
        const allTerms = [sp.scientificName, sp.chineseName, sp.code, ...sp.aliases];
        return allTerms.some(term => normalizeText(term).includes(normalized));
      })
      .slice(0, limit);
  }
}

/** 单例导出 */
export const synonymService = new SynonymService();
