import type { SpeciesSynonymCheck } from '../types';
import { generateId } from './version';

/**
 * 物种字典版本号
 * 每次更新字典内容时应递增此版本号，便于追溯和审计
 */
export const DICTIONARY_VERSION = '1.2.0';

/**
 * 物种字典
 * key 为标准物种名（中文），value 包含标准学名、拉丁学名和别名列表
 *
 * 包含物种：
 * - 斑马鱼（Danio rerio）
 * - 青鳉鱼（Oryzias latipes）
 * - 孔雀鱼（Poecilia reticulata）
 */
export const SPECIES_DICTIONARY: Record<
  string,
  { standard: string; latin: string; synonyms: string[] }
> = {
  斑马鱼: {
    standard: '斑马鱼',
    latin: 'Danio rerio',
    synonyms: [
      '蓝条鱼',
      '印度斑马鱼',
      '孟加拉斑马鱼',
      'zebrafish',
      'Zebra Fish',
      'Danio rerio',
      'zebra danio',
      '条纹鱼',
    ],
  },
  青鳉鱼: {
    standard: '青鳉鱼',
    latin: 'Oryzias latipes',
    synonyms: [
      '稻田鱼',
      '青鳉',
      '米鱼',
      '青锵',
      '青锵鱼',
      'killifish',
      'Japanese medaka',
      'medaka',
      'Oryzias latipes',
    ],
  },
  孔雀鱼: {
    standard: '孔雀鱼',
    latin: 'Poecilia reticulata',
    synonyms: [
      '彩虹鱼',
      '百万鱼',
      '古比鱼',
      '孔雀',
      'guppy',
      'Guppy',
      'Poecilia reticulata',
      'rainbow fish',
      'million fish',
    ],
  },
  金鱼: {
    standard: '金鱼',
    latin: 'Carassius auratus',
    synonyms: [
      '金鲫鱼',
      'goldfish',
      'Goldfish',
      'Carassius auratus',
    ],
  },
  鲤鱼: {
    standard: '鲤鱼',
    latin: 'Cyprinus carpio',
    synonyms: [
      '鲤拐子',
      '锦鲤',
      'common carp',
      'koi',
      'Cyprinus carpio',
    ],
  },
};

/**
 * 将字符串标准化用于比较
 * 转换为小写并去除首尾空格
 *
 * @param str - 输入字符串
 * @returns 标准化后的字符串
 */
function normalize(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * 检查物种名是否为同义名
 *
 * 匹配逻辑：
 * 1. 去除输入名的首尾空格并转换为小写
 * 2. 遍历字典中每个标准名的别名列表
 * 3. 如果输入名与某个别名完全匹配（不区分大小写），返回匹配信息
 * 4. 如果输入名本身就是标准名，也返回匹配信息（reason_blocked 为空）
 * 5. 如果未找到匹配，返回 null
 *
 * @param inputName - 用户输入的物种名称
 * @param runId - 关联的工作流运行ID（可选，用于创建校验记录）
 * @returns 匹配到的物种同义校验信息，未找到返回 null
 *
 * @example
 * ```ts
 * checkSpeciesSynonym("蓝条鱼");
 * // 返回匹配斑马鱼的校验记录
 *
 * checkSpeciesSynonym("未知物种");
 * // 返回 null
 * ```
 */
export function checkSpeciesSynonym(
  inputName: string,
  runId?: string,
): SpeciesSynonymCheck | null {
  const normalizedInput = normalize(inputName);

  if (!normalizedInput) {
    return null;
  }

  for (const [standardName, info] of Object.entries(SPECIES_DICTIONARY)) {
    const normalizedStandard = normalize(standardName);

    if (normalizedInput === normalizedStandard) {
      return {
        id: generateId('syncheck'),
        run_id: runId ?? '',
        input_name: inputName,
        standard_name: info.standard,
        synonyms: info.synonyms,
        dictionary_version: DICTIONARY_VERSION,
        reason_blocked: '',
        resolved: true,
      };
    }

    const matchedSynonym = info.synonyms.find(
      (syn) => normalize(syn) === normalizedInput,
    );

    if (matchedSynonym) {
      return {
        id: generateId('syncheck'),
        run_id: runId ?? '',
        input_name: inputName,
        standard_name: info.standard,
        synonyms: info.synonyms,
        dictionary_version: DICTIONARY_VERSION,
        reason_blocked: `输入名称"${inputName}"为${info.standard}（${info.latin}）的别名，已自动标准化为"${info.standard}"`,
        resolved: false,
      };
    }
  }

  return null;
}

/**
 * 获取物种的标准名
 *
 * @param inputName - 输入的物种名称（可以是别名或标准名）
 * @returns 标准物种名，未找到返回原输入名
 *
 * @example
 * ```ts
 * getStandardSpeciesName("蓝条鱼"); // "斑马鱼"
 * getStandardSpeciesName("斑马鱼"); // "斑马鱼"
 * getStandardSpeciesName("未知");   // "未知"
 * ```
 */
export function getStandardSpeciesName(inputName: string): string {
  const check = checkSpeciesSynonym(inputName);
  return check ? check.standard_name : inputName;
}

/**
 * 获取物种的拉丁学名
 *
 * @param speciesName - 物种名称（可以是别名或标准名）
 * @returns 拉丁学名，未找到返回空字符串
 *
 * @example
 * ```ts
 * getSpeciesLatinName("斑马鱼"); // "Danio rerio"
 * ```
 */
export function getSpeciesLatinName(speciesName: string): string {
  const standard = getStandardSpeciesName(speciesName);
  const info = SPECIES_DICTIONARY[standard];
  return info ? info.latin : '';
}

/**
 * 获取物种的所有别名列表
 *
 * @param speciesName - 物种名称（可以是别名或标准名）
 * @returns 别名列表，未找到返回空数组
 *
 * @example
 * ```ts
 * getSpeciesSynonyms("斑马鱼");
 * // ["蓝条鱼", "印度斑马鱼", ...]
 * ```
 */
export function getSpeciesSynonyms(speciesName: string): string[] {
  const standard = getStandardSpeciesName(speciesName);
  const info = SPECIES_DICTIONARY[standard];
  return info ? [...info.synonyms] : [];
}

/**
 * 获取所有标准物种名列表
 *
 * @returns 标准物种名数组
 */
export function getAllStandardSpecies(): string[] {
  return Object.keys(SPECIES_DICTIONARY);
}
