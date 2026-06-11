import { getWorkflowRuns } from './storage';

/**
 * 通用唯一ID生成器
 * 基于时间戳和随机数生成带前缀的唯一标识符
 *
 * @param prefix - ID前缀，如 "sample"、"run" 等
 * @returns 格式化的唯一ID，格式为 {prefix}_{timestamp}_{random}
 *
 * @example
 * ```ts
 * generateId('sample'); // "sample_1718000000000_a1b2c3"
 * ```
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 生成工作流运行ID
 * 使用 "run_" 作为前缀
 *
 * @returns 格式为 run_{timestamp}_{random} 的唯一ID
 *
 * @example
 * ```ts
 * generateRunId(); // "run_1718000000000_a1b2c3"
 * ```
 */
export function generateRunId(): string {
  return generateId('run');
}

/**
 * 将日期格式化为 YYYY.MM.DD 格式（带前导零）
 *
 * @param date - 要格式化的日期对象
 * @returns 格式化后的日期字符串
 *
 * @example
 * ```ts
 * formatDate(new Date(2025, 5, 11)); // "2025.06.11"
 * ```
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * 从版本标签中提取日期部分
 * 用于判断当天已有的运行次数
 *
 * @param versionLabel - 版本标签，如 "v2025.06.11-r3"
 * @returns 日期字符串，如 "2025.06.11"，解析失败返回空字符串
 *
 * @example
 * ```ts
 * extractDateFromLabel("v2025.06.11-r3"); // "2025.06.11"
 * ```
 */
function extractDateFromLabel(versionLabel: string): string {
  const match = versionLabel.match(/^v(\d{4}\.\d{2}\.\d{2})-r\d+$/);
  return match ? match[1] : '';
}

/**
 * 生成版本标签
 * 格式为 v{YYYY.MM.DD}-r{N}，其中 N 是当天的运行序号（从1开始）
 *
 * 算法逻辑：
 * 1. 获取当前日期并格式化为 YYYY.MM.DD
 * 2. 从存储中读取所有已有的工作流运行记录
 * 3. 统计当天（日期部分匹配）的运行次数
 * 4. 序号 = 当天已有运行数 + 1
 *
 * @returns 版本标签字符串
 *
 * @example
 * ```ts
 * // 假设今天是 2025-06-11，且今天已有 2 次运行
 * generateVersionLabel(); // "v2025.06.11-r3"
 * ```
 */
export function generateVersionLabel(): string {
  const now = new Date();
  const dateStr = formatDate(now);

  try {
    const runs = getWorkflowRuns();
    const todayRunCount = runs.filter((run) => extractDateFromLabel(run.version_label) === dateStr).length;
    const runNumber = todayRunCount + 1;
    return `v${dateStr}-r${runNumber}`;
  } catch {
    return `v${dateStr}-r1`;
  }
}

/**
 * 解析版本标签，提取日期和运行序号
 *
 * @param versionLabel - 版本标签字符串
 * @returns 解析结果对象，包含 date 和 runNumber；解析失败返回 null
 *
 * @example
 * ```ts
 * parseVersionLabel("v2025.06.11-r3");
 * // { date: "2025.06.11", runNumber: 3 }
 * ```
 */
export function parseVersionLabel(
  versionLabel: string,
): { date: string; runNumber: number } | null {
  const match = versionLabel.match(/^v(\d{4}\.\d{2}\.\d{2})-r(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    date: match[1],
    runNumber: parseInt(match[2], 10),
  };
}

/**
 * 比较两个版本标签的先后顺序
 *
 * @param labelA - 版本标签A
 * @param labelB - 版本标签B
 * @returns 负数表示 A 在 B 之前，正数表示 A 在 B 之后，0 表示相同
 *
 * @example
 * ```ts
 * compareVersionLabels("v2025.06.11-r1", "v2025.06.11-r2"); // -1
 * compareVersionLabels("v2025.06.12-r1", "v2025.06.11-r5"); // 1
 * ```
 */
export function compareVersionLabels(labelA: string, labelB: string): number {
  const parsedA = parseVersionLabel(labelA);
  const parsedB = parseVersionLabel(labelB);

  if (!parsedA && !parsedB) return 0;
  if (!parsedA) return -1;
  if (!parsedB) return 1;

  if (parsedA.date !== parsedB.date) {
    return parsedA.date < parsedB.date ? -1 : 1;
  }
  return parsedA.runNumber - parsedB.runNumber;
}
