/**
 * 对象差异对比工具
 * 提供深度对象比较、差异计算、版本变更检测、变更项生成等功能
 */

/** ============================================
 *  类型定义
 * ============================================ */

/**
 * 变更类型
 */
export type ChangeType = 'added' | 'modified' | 'removed';

/**
 * 单个差异项
 */
export interface DiffItem {
  /** 字段路径 (点号分隔, 如 "user.address.city") */
  path: string;
  /** 字段路径数组形式 */
  pathSegments: string[];
  /** 变更类型 */
  changeType: ChangeType;
  /** 旧值 */
  oldValue: unknown;
  /** 新值 */
  newValue: unknown;
  /** 旧值类型 */
  oldType: string;
  /** 新值类型 */
  newType: string;
  /** 字段中文标签 (如果提供了标签映射) */
  label?: string;
}

/**
 * 差异统计
 */
export interface DiffStats {
  /** 总变更数 */
  total: number;
  /** 新增字段数 */
  added: number;
  /** 修改字段数 */
  modified: number;
  /** 删除字段数 */
  removed: number;
}

/**
 * 完整差异结果
 */
export interface DiffResult {
  /** 变更项列表 */
  changes: DiffItem[];
  /** 变更统计 */
  stats: DiffStats;
  /** 是否有变更 */
  hasChanges: boolean;
}

/**
 * 差异比较选项
 */
export interface DiffOptions {
  /** 要忽略的字段路径列表 (支持通配符 *) */
  ignorePaths?: string[];
  /** 要比较的字段路径 (白名单, 不传则比较全部) */
  includePaths?: string[];
  /** 字段路径到中文标签的映射 */
  labels?: Record<string, string>;
  /** 是否比较数组顺序, 默认 false (只比较内容) */
  compareArrayOrder?: boolean;
  /** 数组比较时的主键字段 (用于识别数组元素是否为同一条) */
  arrayKeyFields?: Record<string, string>;
  /** 最大递归深度, 默认 10 */
  maxDepth?: number;
  /** 是否比较 NaN 相等 (NaN === NaN), 默认 true */
  nanEquals?: boolean;
  /** 日期字符串比较时是否归一化, 默认 true */
  normalizeDates?: boolean;
  /** 字符串比较时是否忽略首尾空白, 默认 false */
  trimStrings?: boolean;
}

/** 默认比较选项 */
const DEFAULT_OPTIONS: Required<Omit<DiffOptions, 'labels' | 'arrayKeyFields'>> & Pick<DiffOptions, 'labels' | 'arrayKeyFields'> = {
  ignorePaths: [],
  includePaths: [],
  labels: undefined,
  compareArrayOrder: false,
  arrayKeyFields: undefined,
  maxDepth: 10,
  nanEquals: true,
  normalizeDates: true,
  trimStrings: false,
};

/** ============================================
 *  基础工具函数
 * ============================================ */

/**
 * 获取值的类型字符串
 */
function getType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value instanceof RegExp) return 'regexp';
  if (typeof value === 'object') return value.constructor.name.toLowerCase();
  return typeof value;
}

/**
 * 判断值是否为"纯对象" (不是数组、Date等特殊对象)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * 判断字符串是否匹配通配符模式
 * 支持: * 匹配任意字符 (不跨路径段), ** 匹配任意字符 (跨路径段)
 */
function matchWildcard(path: string, pattern: string): boolean {
  if (pattern === '**') return true;
  if (pattern === path) return true;

  const patternSegments = pattern.split('.');
  const pathSegments = path.split('.');

  let pi = 0;
  let si = 0;
  let starIdx = -1;
  let matchIdx = 0;

  while (si < pathSegments.length) {
    if (pi < patternSegments.length) {
      const pSeg = patternSegments[pi];
      const sSeg = pathSegments[si];

      if (pSeg === '**') {
        starIdx = pi;
        matchIdx = si;
        pi++;
        continue;
      }

      if (pSeg === '*' || pSeg === sSeg) {
        pi++;
        si++;
        continue;
      }
    }

    if (starIdx !== -1) {
      pi = starIdx + 1;
      matchIdx++;
      si = matchIdx;
      continue;
    }

    return false;
  }

  while (pi < patternSegments.length && patternSegments[pi] === '**') {
    pi++;
  }

  return pi === patternSegments.length;
}

/**
 * 检查路径是否应该被忽略
 */
function shouldIgnorePath(path: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => matchWildcard(path, pattern));
}

/**
 * 检查路径是否在白名单内
 */
function isPathIncluded(path: string, includePatterns: string[]): boolean {
  if (includePatterns.length === 0) return true;
  return includePatterns.some((pattern) => {
    if (matchWildcard(path, pattern)) return true;
    return pattern.startsWith(path + '.');
  });
}

/**
 * 标准化值 (用于比较前的预处理)
 */
function normalizeValue(value: unknown, options: Required<DiffOptions>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (options.trimStrings && typeof value === 'string') {
    return value.trim();
  }

  if (options.normalizeDates) {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'string' && value.length >= 10) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        const isoMatch = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value);
        if (isoMatch) {
          return date.getTime();
        }
      }
    }
  }

  return value;
}

/**
 * 深度相等判断
 */
function deepEqual(a: unknown, b: unknown, options: Required<DiffOptions>): boolean {
  const normA = normalizeValue(a, options);
  const normB = normalizeValue(b, options);

  if (options.nanEquals && Number.isNaN(normA as number) && Number.isNaN(normB as number)) {
    return true;
  }

  if (Object.is(normA, normB)) {
    return true;
  }

  if (typeof normA !== typeof normB) {
    return false;
  }

  if (isPlainObject(normA) && isPlainObject(normB)) {
    const keysA = Object.keys(normA);
    const keysB = Object.keys(normB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(normA[key], normB[key], options));
  }

  if (Array.isArray(normA) && Array.isArray(normB)) {
    if (normA.length !== normB.length) return false;
    if (options.compareArrayOrder) {
      return normA.every((item, idx) => deepEqual(item, normB[idx], options));
    }
    const matched = new Set<number>();
    return normA.every((itemA) => {
      for (let i = 0; i < normB.length; i++) {
        if (!matched.has(i) && deepEqual(itemA, normB[i], options)) {
          matched.add(i);
          return true;
        }
      }
      return false;
    });
  }

  return false;
}

/** ============================================
 *  核心差异计算函数
 * ============================================ */

/**
 * 构建路径字符串
 */
function buildPath(basePath: string, key: string): string {
  return basePath ? `${basePath}.${key}` : key;
}

/**
 * 根据路径获取字段标签
 */
function getLabelForPath(path: string, labels?: Record<string, string>): string | undefined {
  if (!labels) return undefined;
  if (labels[path]) return labels[path];

  const segments = path.split('.');
  for (let i = segments.length - 1; i >= 0; i--) {
    const partialPath = segments.slice(i).join('.');
    if (labels[partialPath]) {
      return labels[partialPath];
    }
  }

  return undefined;
}

/**
 * 创建差异项
 */
function createDiffItem(
  path: string,
  changeType: ChangeType,
  oldValue: unknown,
  newValue: unknown,
  options: Required<DiffOptions>
): DiffItem {
  return {
    path,
    pathSegments: path ? path.split('.') : [],
    changeType,
    oldValue,
    newValue,
    oldType: getType(oldValue),
    newType: getType(newValue),
    label: getLabelForPath(path, options.labels),
  };
}

/**
 * 递归计算两个值的差异
 */
function calculateDiff(
  oldValue: unknown,
  newValue: unknown,
  currentPath: string,
  depth: number,
  options: Required<DiffOptions>,
  changes: DiffItem[]
): void {
  if (depth > options.maxDepth) {
    if (!deepEqual(oldValue, newValue, options)) {
      if (!shouldIgnorePath(currentPath, options.ignorePaths) && isPathIncluded(currentPath, options.includePaths)) {
        changes.push(createDiffItem(currentPath, 'modified', oldValue, newValue, options));
      }
    }
    return;
  }

  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);

    allKeys.forEach((key) => {
      const keyPath = buildPath(currentPath, key);

      if (shouldIgnorePath(keyPath, options.ignorePaths)) {
        return;
      }
      if (!isPathIncluded(keyPath, options.includePaths)) {
        return;
      }

      const hasOld = Object.prototype.hasOwnProperty.call(oldValue, key);
      const hasNew = Object.prototype.hasOwnProperty.call(newValue, key);

      if (hasOld && !hasNew) {
        changes.push(createDiffItem(keyPath, 'removed', oldValue[key], undefined, options));
      } else if (!hasOld && hasNew) {
        changes.push(createDiffItem(keyPath, 'added', undefined, newValue[key], options));
      } else {
        const oldField = oldValue[key];
        const newField = newValue[key];

        if (isPlainObject(oldField) && isPlainObject(newField)) {
          calculateDiff(oldField, newField, keyPath, depth + 1, options, changes);
        } else if (Array.isArray(oldField) && Array.isArray(newField)) {
          compareArrays(oldField, newField, keyPath, depth, options, changes);
        } else if (!deepEqual(oldField, newField, options)) {
          changes.push(createDiffItem(keyPath, 'modified', oldField, newField, options));
        }
      }
    });

    return;
  }

  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    compareArrays(oldValue, newValue, currentPath, depth, options, changes);
    return;
  }

  if (!deepEqual(oldValue, newValue, options)) {
    if (!shouldIgnorePath(currentPath, options.ignorePaths) && isPathIncluded(currentPath, options.includePaths)) {
      changes.push(createDiffItem(currentPath, 'modified', oldValue, newValue, options));
    }
  }
}

/**
 * 比较两个数组
 */
function compareArrays(
  oldArray: unknown[],
  newArray: unknown[],
  currentPath: string,
  depth: number,
  options: Required<DiffOptions>,
  changes: DiffItem[]
): void {
  const keyField = options.arrayKeyFields?.[currentPath];

  if (keyField) {
    const oldMap = new Map<string, { item: unknown; index: number }>();
    oldArray.forEach((item, index) => {
      if (isPlainObject(item) && item[keyField] !== undefined) {
        oldMap.set(String(item[keyField]), { item, index });
      }
    });

    const newMap = new Map<string, { item: unknown; index: number }>();
    newArray.forEach((item, index) => {
      if (isPlainObject(item) && item[keyField] !== undefined) {
        newMap.set(String(item[keyField]), { item, index });
      }
    });

    oldMap.forEach(({ item: oldItem, index: oldIndex }, key) => {
      const itemPath = buildPath(currentPath, `${oldIndex}`);
      if (shouldIgnorePath(itemPath, options.ignorePaths)) return;

      if (!newMap.has(key)) {
        changes.push(createDiffItem(itemPath, 'removed', oldItem, undefined, options));
      }
    });

    newMap.forEach(({ item: newItem, index: newIndex }, key) => {
      const itemPath = buildPath(currentPath, `${newIndex}`);
      if (shouldIgnorePath(itemPath, options.ignorePaths)) return;

      const oldEntry = oldMap.get(key);
      if (!oldEntry) {
        changes.push(createDiffItem(itemPath, 'added', undefined, newItem, options));
      } else {
        calculateDiff(oldEntry.item, newItem, itemPath, depth + 1, options, changes);
      }
    });

    return;
  }

  if (options.compareArrayOrder) {
    const maxLen = Math.max(oldArray.length, newArray.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = buildPath(currentPath, `${i}`);
      if (shouldIgnorePath(itemPath, options.ignorePaths)) continue;
      if (!isPathIncluded(itemPath, options.includePaths)) continue;

      const hasOld = i < oldArray.length;
      const hasNew = i < newArray.length;

      if (hasOld && !hasNew) {
        changes.push(createDiffItem(itemPath, 'removed', oldArray[i], undefined, options));
      } else if (!hasOld && hasNew) {
        changes.push(createDiffItem(itemPath, 'added', undefined, newArray[i], options));
      } else {
        calculateDiff(oldArray[i], newArray[i], itemPath, depth + 1, options, changes);
      }
    }
    return;
  }

  if (oldArray.length !== newArray.length) {
    changes.push(createDiffItem(currentPath, 'modified', oldArray, newArray, options));
    return;
  }

  const matchedNew = new Set<number>();
  let hasDifference = false;

  for (let i = 0; i < oldArray.length; i++) {
    let foundMatch = false;
    for (let j = 0; j < newArray.length; j++) {
      if (!matchedNew.has(j) && deepEqual(oldArray[i], newArray[j], options)) {
        matchedNew.add(j);
        foundMatch = true;
        break;
      }
    }
    if (!foundMatch) {
      hasDifference = true;
      break;
    }
  }

  if (hasDifference || matchedNew.size !== newArray.length) {
    changes.push(createDiffItem(currentPath, 'modified', oldArray, newArray, options));
  }
}

/** ============================================
 *  公开 API
 * ============================================ */

/**
 * 计算两个值之间的差异
 * @param oldValue 旧值
 * @param newValue 新值
 * @param options 比较选项
 */
export function diff<T>(
  oldValue: T,
  newValue: T,
  options: DiffOptions = {}
): DiffResult {
  const opts: Required<DiffOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    ignorePaths: options.ignorePaths ?? [],
    includePaths: options.includePaths ?? [],
    labels: options.labels ?? {},
    arrayKeyFields: options.arrayKeyFields ?? {},
  };

  const changes: DiffItem[] = [];
  calculateDiff(oldValue, newValue, '', 0, opts, changes);

  const stats: DiffStats = {
    total: changes.length,
    added: changes.filter((c) => c.changeType === 'added').length,
    modified: changes.filter((c) => c.changeType === 'modified').length,
    removed: changes.filter((c) => c.changeType === 'removed').length,
  };

  return {
    changes,
    stats,
    hasChanges: changes.length > 0,
  };
}

/**
 * 深度相等判断 (公开方法)
 */
export function isDeepEqual<T>(a: T, b: T, options: DiffOptions = {}): boolean {
  const opts: Required<DiffOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    ignorePaths: options.ignorePaths ?? [],
    includePaths: options.includePaths ?? [],
    labels: options.labels ?? {},
    arrayKeyFields: options.arrayKeyFields ?? {},
  };
  return deepEqual(a, b, opts);
}

/**
 * 按变更类型筛选差异项
 */
export function filterChangesByType(
  result: DiffResult,
  changeType: ChangeType
): DiffItem[] {
  return result.changes.filter((c) => c.changeType === changeType);
}

/**
 * 按路径前缀筛选差异项
 */
export function filterChangesByPathPrefix(
  result: DiffResult,
  prefix: string
): DiffItem[] {
  return result.changes.filter((c) => c.path.startsWith(prefix));
}

/** ============================================
 *  变更项格式化输出
 * ============================================ */

/**
 * 格式化差异项为人类可读字符串
 */
export function formatDiffItem(item: DiffItem): string {
  const path = item.label ?? item.path;
  const oldStr = formatDiffValue(item.oldValue);
  const newStr = formatDiffValue(item.newValue);

  switch (item.changeType) {
    case 'added':
      return `[新增] ${path}: ${newStr}`;
    case 'removed':
      return `[删除] ${path}: ${oldStr}`;
    case 'modified':
      return `[修改] ${path}: ${oldStr} → ${newStr}`;
  }
}

/**
 * 格式化差异值显示
 */
function formatDiffValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > 50 ? `${str.slice(0, 50)}...` : str;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

/**
 * 格式化完整差异结果为摘要文本
 */
export function formatDiffSummary(result: DiffResult): string {
  if (!result.hasChanges) {
    return '无差异';
  }

  const lines: string[] = [];
  lines.push(`共 ${result.stats.total} 处变更: `);
  lines.push(`  新增 ${result.stats.added} 项`);
  lines.push(`  修改 ${result.stats.modified} 项`);
  lines.push(`  删除 ${result.stats.removed} 项`);
  lines.push('');
  lines.push('变更详情:');
  result.changes.forEach((item, index) => {
    lines.push(`  ${index + 1}. ${formatDiffItem(item)}`);
  });

  return lines.join('\n');
}

/** ============================================
 *  变更项转换 (用于版本管理等场景)
 * ============================================ */

/**
 * 将差异项转换为可序列化的版本变更记录格式
 * 适配 types 中 VersionChangeItem 类型
 */
export function toVersionChanges(result: DiffResult): Array<{
  fieldPath: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: 'added' | 'modified' | 'removed';
}> {
  return result.changes.map((item) => ({
    fieldPath: item.path,
    fieldLabel: item.label ?? item.path,
    oldValue: item.oldValue !== undefined ? safeStringify(item.oldValue) : null,
    newValue: item.newValue !== undefined ? safeStringify(item.newValue) : null,
    changeType: item.changeType,
  }));
}

/**
 * 将差异项转换为人工修正记录格式
 * 适配 types 中 CorrectionFieldChange 类型
 */
export function toCorrectionChanges(result: DiffResult): Array<{
  fieldPath: string;
  fieldName: string;
  beforeValue: unknown;
  afterValue: unknown;
}> {
  return result.changes
    .filter((c) => c.changeType === 'modified' || c.changeType === 'removed' || c.changeType === 'added')
    .map((item) => ({
      fieldPath: item.path,
      fieldName: item.label ?? item.path,
      beforeValue: item.oldValue,
      afterValue: item.newValue,
    }));
}

/**
 * 安全的 JSON 序列化 (处理循环引用)
 */
function safeStringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return null;
    }
  }
}

/** ============================================
 *  补丁操作 (应用差异到目标对象)
 * ============================================ */

/**
 * 获取对象中指定路径的值
 */
function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      current = Number.isNaN(idx) ? undefined : current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * 设置对象中指定路径的值
 */
function setByPath(obj: unknown, path: string, value: unknown): void {
  if (!path) return;
  const segments = path.split('.');
  let current: Record<string, unknown> | unknown[] = obj as Record<string, unknown>;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const isNextArray = /^\d+$/.test(nextSeg);

    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      if (current[idx] === undefined) {
        current[idx] = isNextArray ? [] : {};
      }
      current = current[idx] as Record<string, unknown> | unknown[];
    } else {
      if ((current as Record<string, unknown>)[seg] === undefined) {
        (current as Record<string, unknown>)[seg] = isNextArray ? [] : {};
      }
      current = (current as Record<string, unknown>)[seg] as Record<string, unknown> | unknown[];
    }
  }

  const lastSeg = segments[segments.length - 1];
  if (Array.isArray(current)) {
    const idx = parseInt(lastSeg, 10);
    current[idx] = value;
  } else {
    (current as Record<string, unknown>)[lastSeg] = value;
  }
}

/**
 * 从对象中删除指定路径的值
 */
function deleteByPath(obj: unknown, path: string): void {
  if (!path) return;
  const segments = path.split('.');
  let current: Record<string, unknown> | unknown[] = obj as Record<string, unknown>;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (Array.isArray(current)) {
      const idx = parseInt(seg, 10);
      current = current[idx] as Record<string, unknown> | unknown[];
    } else {
      current = (current as Record<string, unknown>)[seg] as Record<string, unknown> | unknown[];
    }
    if (current === undefined || current === null) return;
  }

  const lastSeg = segments[segments.length - 1];
  if (Array.isArray(current)) {
    const idx = parseInt(lastSeg, 10);
    current.splice(idx, 1);
  } else if (typeof current === 'object') {
    delete (current as Record<string, unknown>)[lastSeg];
  }
}

/**
 * 应用差异补丁到目标对象 (非破坏性操作, 返回新对象)
 */
export function applyPatch<T>(target: T, changes: DiffItem[]): T {
  const result = structuredClone(target) as Record<string, unknown>;

  changes.forEach((change) => {
    switch (change.changeType) {
      case 'added':
      case 'modified':
        setByPath(result, change.path, change.newValue);
        break;
      case 'removed':
        deleteByPath(result, change.path);
        break;
    }
  });

  return result as T;
}

/**
 * 反向应用差异 (用于回滚操作)
 */
export function applyReversePatch<T>(target: T, changes: DiffItem[]): T {
  const result = structuredClone(target) as Record<string, unknown>;

  changes.forEach((change) => {
    switch (change.changeType) {
      case 'added':
        deleteByPath(result, change.path);
        break;
      case 'removed':
      case 'modified':
        setByPath(result, change.path, change.oldValue);
        break;
    }
  });

  return result as T;
}

/** ============================================
 *  辅助工具
 * ============================================ */

/**
 * 按路径分组差异项
 */
export function groupChangesByTopLevel(result: DiffResult): Record<string, DiffItem[]> {
  const groups: Record<string, DiffItem[]> = {};

  result.changes.forEach((item) => {
    const topLevel = item.pathSegments[0] ?? '__root__';
    if (!groups[topLevel]) {
      groups[topLevel] = [];
    }
    groups[topLevel].push(item);
  });

  return groups;
}

/**
 * 计算对象的变更摘要 (用于列表页快速预览)
 */
export function getChangePreview(result: DiffResult, maxItems = 3): string {
  if (!result.hasChanges) {
    return '无变更';
  }

  const previews = result.changes.slice(0, maxItems).map((item) => {
    const name = item.label ?? item.path.split('.').pop() ?? item.path;
    return `${name}${changeTypeIcon(item.changeType)}`;
  });

  if (result.changes.length > maxItems) {
    previews.push(`+${result.changes.length - maxItems}`);
  }

  return previews.join(', ');
}

/**
 * 变更类型图标字符
 */
function changeTypeIcon(type: ChangeType): string {
  switch (type) {
    case 'added':
      return '+';
    case 'removed':
      return '-';
    case 'modified':
      return '~';
  }
}

/**
 * 克隆对象 (深度克隆, 处理常见类型)
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    Object.keys(value).forEach((key) => {
      result[key] = deepClone((value as Record<string, unknown>)[key]);
    });
    return result as unknown as T;
  }
  return structuredClone(value);
}
