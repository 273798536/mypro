import type { BusBay, ResidentFeedback, BadDataFlag } from '@/types';

/**
 * 坏数据检测配置接口
 */
interface DetectionConfig {
  minNameLength: number;
  minContentLength: number;
  nameSpecialCharsRegex: RegExp;
  phoneRegex: RegExp;
}

/**
 * 默认检测配置
 */
const DEFAULT_CONFIG: DetectionConfig = {
  minNameLength: 2,
  minContentLength: 5,
  nameSpecialCharsRegex: /[!@#$%^&*(),.?":{}|<>0-9]/,
  phoneRegex: /^1[3-9]\d{9}$/
};

/**
 * 检测居民姓名字段是否为空
 * @param name 居民姓名
 * @returns true表示缺少姓名
 */
function isMissingName(name: string): boolean {
  return !name || name.trim().length === 0;
}

/**
 * 检测居民姓名是否无效（长度过短或含特殊字符）
 * @param name 居民姓名
 * @param config 检测配置
 * @returns true表示姓名无效
 */
function isInvalidName(name: string, config: DetectionConfig): boolean {
  if (!name) return false;
  const trimmedName = name.trim();
  if (trimmedName.length < config.minNameLength) return true;
  if (config.nameSpecialCharsRegex.test(trimmedName)) return true;
  return false;
}

/**
 * 检测手机号是否为空
 * @param phone 手机号
 * @returns true表示缺少手机号
 */
function isMissingPhone(phone: string): boolean {
  return !phone || phone.trim().length === 0;
}

/**
 * 检测手机号是否无效（不是11位数字或格式不符）
 * @param phone 手机号
 * @param config 检测配置
 * @returns true表示手机号无效
 */
function isInvalidPhone(phone: string, config: DetectionConfig): boolean {
  if (!phone) return false;
  const trimmedPhone = phone.trim().replace(/\s|-/g, '');
  if (!/^\d+$/.test(trimmedPhone)) return true;
  if (trimmedPhone.length !== 11) return true;
  if (!config.phoneRegex.test(trimmedPhone)) return true;
  return false;
}

/**
 * 检测反馈内容是否为空
 * @param content 反馈内容
 * @returns true表示缺少内容
 */
function isMissingContent(content: string): boolean {
  return !content || content.trim().length === 0;
}

/**
 * 检测反馈内容是否过短
 * @param content 反馈内容
 * @param config 检测配置
 * @returns true表示内容过短
 */
function isShortContent(content: string, config: DetectionConfig): boolean {
  if (!content) return false;
  return content.trim().length < config.minContentLength;
}

/**
 * 从原始数据中提取站点名称或道路信息用于匹配
 * 优先提取站点名称，其次提取道路信息
 * @param rawData 原始数据
 * @param feedback 反馈记录
 * @returns 提取的关键词数组
 */
function extractBayKeywords(
  rawData: Record<string, string | number | boolean | null | undefined>,
  feedback: Partial<ResidentFeedback>
): string[] {
  const keywords: string[] = [];

  const bayNameKeys = ['bayName', 'bay_name', 'stationName', 'station_name', '站名', '站点'];
  const roadKeys = ['road', 'roadName', 'road_name', '道路', '路段'];

  for (const key of bayNameKeys) {
    if (rawData[key] && typeof rawData[key] === 'string') {
      keywords.push(rawData[key].trim());
    }
  }

  for (const key of roadKeys) {
    if (rawData[key] && typeof rawData[key] === 'string') {
      keywords.push(rawData[key].trim());
    }
  }

  if (feedback.content && feedback.content.length > 0) {
    keywords.push(feedback.content.trim());
  }

  return keywords.filter(k => k.length > 0);
}

/**
 * 检测是否能匹配到对应的站点
 * @param feedback 居民反馈记录
 * @param bays 所有站点列表
 * @returns true表示匹配不到任何站点
 */
function hasNoMatchingBay(
  feedback: Partial<ResidentFeedback>,
  bays: BusBay[]
): boolean {
  if (bays.length === 0) return true;

  if (feedback.bayId) {
    const found = bays.some(bay => bay.id === feedback.bayId);
    if (found) return false;
  }

  const keywords = extractBayKeywords(feedback.rawData ?? {}, feedback);
  if (keywords.length === 0) return true;

  for (const keyword of keywords) {
    for (const bay of bays) {
      if (
        bay.name.includes(keyword) ||
        keyword.includes(bay.name) ||
        bay.road.includes(keyword) ||
        keyword.includes(bay.road)
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 坏数据检测器
 * 输入一条居民反馈记录和所有站点列表，输出检测到的坏数据标记数组
 * @param feedback 居民反馈记录（可以是未完全填充的部分记录）
 * @param bays 所有公交港湾站点列表
 * @param customConfig 自定义检测配置（可选）
 * @returns 坏数据标记数组 BadDataFlag[]
 */
export function detectBadData(
  feedback: Partial<ResidentFeedback>,
  bays: BusBay[],
  customConfig?: Partial<DetectionConfig>
): BadDataFlag[] {
  const flags: BadDataFlag[] = [];
  const config: DetectionConfig = { ...DEFAULT_CONFIG, ...customConfig };

  const residentName = feedback.residentName ?? '';
  const phone = feedback.phone ?? '';
  const content = feedback.content ?? '';

  if (isMissingName(residentName)) {
    flags.push('missing_name');
  } else if (isInvalidName(residentName, config)) {
    flags.push('invalid_name');
  }

  if (isMissingPhone(phone)) {
    flags.push('missing_phone');
  } else if (isInvalidPhone(phone, config)) {
    flags.push('invalid_phone');
  }

  if (isMissingContent(content)) {
    flags.push('missing_content');
  } else if (isShortContent(content, config)) {
    flags.push('short_content');
  }

  if (hasNoMatchingBay(feedback, bays)) {
    flags.push('no_matching_bay');
  }

  return flags;
}

/**
 * 批量检测坏数据
 * @param feedbacks 居民反馈记录数组
 * @param bays 所有公交港湾站点列表
 * @param customConfig 自定义检测配置（可选）
 * @returns 每条记录对应的坏数据标记二维数组
 */
export function detectBadDataBatch(
  feedbacks: Partial<ResidentFeedback>[],
  bays: BusBay[],
  customConfig?: Partial<DetectionConfig>
): BadDataFlag[][] {
  return feedbacks.map(feedback => detectBadData(feedback, bays, customConfig));
}

/**
 * 坏数据标记中文说明映射
 */
export const BAD_DATA_FLAG_LABELS: Record<BadDataFlag, { label: string; severity: 'info' | 'warning' | 'danger' }> = {
  missing_name: { label: '居民姓名为空', severity: 'warning' },
  invalid_name: { label: '姓名格式无效', severity: 'info' },
  missing_phone: { label: '手机号为空', severity: 'danger' },
  invalid_phone: { label: '手机号格式无效', severity: 'danger' },
  missing_content: { label: '反馈内容为空', severity: 'danger' },
  short_content: { label: '反馈内容过短', severity: 'info' },
  no_matching_bay: { label: '未匹配到对应站点', severity: 'danger' },
  duplicate_content: { label: '疑似重复投诉', severity: 'warning' }
};
