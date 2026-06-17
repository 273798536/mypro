import { Sample, DataSplit } from '../types';
import { generateId } from './index';

export interface ParsedSplitList {
  samples: Omit<Sample, 'id' | 'runId' | 'clusterId'>[];
  metadata: {
    totalCount: number;
    trainCount: number;
    valCount: number;
    testCount: number;
    labels: string[];
    labelDistribution: Record<string, number>;
    duplicateCount: number;
    duplicateGroups: number;
  };
}

interface RawSample {
  id?: string;
  content?: string;
  text?: string;
  data?: string;
  query?: string;
  label?: string;
  split?: DataSplit | string;
  split_type?: string;
  dataset?: string;
  set?: string;
  embedding?: number[];
  features?: Record<string, any>;
  [key: string]: any;
}

export function parseSplitList(fileName: string, content: string): ParsedSplitList {
  const ext = fileName.split('.').pop()?.toLowerCase();
  let rawSamples: RawSample[] = [];
  let lastError: Error | null = null;

  const parsers = [
    { name: 'json', fn: parseJSON },
    { name: 'jsonl', fn: parseJSONL },
    { name: 'csv', fn: parseCSV },
    { name: 'txt', fn: parseTXT }
  ];

  let orderedParsers = parsers;
  if (ext) {
    const extIndex = parsers.findIndex(p => p.name === ext);
    if (extIndex >= 0) {
      const matchParser = parsers[extIndex];
      orderedParsers = [matchParser, ...parsers.filter(p => p.name !== ext)];
    }
  }

  for (const parser of orderedParsers) {
    try {
      rawSamples = parser.fn(content);
      if (rawSamples.length > 0) {
        break;
      }
    } catch (e) {
      lastError = e as Error;
    }
  }

  if (rawSamples.length === 0) {
    if (lastError) {
      throw new Error(`无法解析文件: ${lastError.message}`);
    }
    throw new Error('文件中未找到有效样本数据');
  }

  return processRawSamples(rawSamples);
}

function parseJSON(content: string): RawSample[] {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
  if (parsed.samples && Array.isArray(parsed.samples)) return parsed.samples;
  if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
  throw new Error('JSON 格式不正确，需要是数组或包含 data/samples/items 数组的对象');
}

function parseJSONL(content: string): RawSample[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))
    .map(line => JSON.parse(line));
}

function parseCSV(content: string): RawSample[] {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes('\t') ? '\t' : headerLine.includes(';') ? ';' : ',';
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim().toLowerCase());

  const idIdx = headers.findIndex(h => ['id', 'sample_id', 'sampleid', 'index'].includes(h));
  const contentIdx = headers.findIndex(h => ['content', 'text', 'query', 'data', 'prompt', 'input'].includes(h));
  const labelIdx = headers.findIndex(h => ['label', 'category', 'class', 'tag', 'target'].includes(h));
  const splitIdx = headers.findIndex(h => ['split', 'dataset', 'set', 'split_type', 'data_split'].includes(h));

  return lines.slice(1).map((line, idx) => {
    const values = parseCSVLine(line, delimiter);
    const sample: RawSample = {};
    headers.forEach((h, i) => {
      sample[h] = values[i] ?? '';
    });
    if (idIdx === -1) sample.id = `sample_${String(idx + 1).padStart(5, '0')}`;
    if (contentIdx >= 0) sample.content = values[contentIdx];
    if (labelIdx >= 0) sample.label = values[labelIdx];
    if (splitIdx >= 0) sample.split = values[splitIdx] as DataSplit;
    return sample;
  });
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}

function parseTXT(content: string): RawSample[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))
    .map((line, idx) => ({
      id: `sample_${String(idx + 1).padStart(5, '0')}`,
      content: line,
      split: inferSplit(idx)
    }));
}

function inferSplit(index: number): DataSplit {
  const r = index % 10;
  if (r < 7) return 'train';
  if (r < 9) return 'val';
  return 'test';
}

function normalizeSplit(split?: string): DataSplit {
  if (!split) return 'train';
  const s = split.toLowerCase().trim();
  if (['train', 'training', 'trn', '训练集'].includes(s)) return 'train';
  if (['val', 'valid', 'validation', 'dev', '验证集'].includes(s)) return 'val';
  if (['test', 'testing', 'tst', 'eval', '测试集'].includes(s)) return 'test';
  return 'train';
}

function processRawSamples(rawSamples: RawSample[]): ParsedSplitList {
  const contentMap = new Map<string, string[]>();
  const labelSet = new Set<string>();
  const labelDistribution: Record<string, number> = {};

  let trainCount = 0;
  let valCount = 0;
  let testCount = 0;

  const samples: ParsedSplitList['samples'] = rawSamples.map((raw, idx) => {
    const content = (raw.content ?? raw.text ?? raw.data ?? raw.query ?? String(raw.id ?? idx)).toString();
    const originalId = raw.id ?? `sample_${String(idx + 1).padStart(5, '0')}`;
    const split = normalizeSplit(raw.split ?? raw.split_type ?? raw.dataset ?? raw.set);
    const label = (raw.label ?? raw.category ?? raw.class ?? '未标注').toString();

    if (!contentMap.has(content)) contentMap.set(content, []);
    contentMap.get(content)!.push(originalId);

    labelSet.add(label);
    labelDistribution[label] = (labelDistribution[label] ?? 0) + 1;

    if (split === 'train') trainCount++;
    else if (split === 'val') valCount++;
    else testCount++;

    return {
      originalId,
      content,
      sourceSplit: split,
      isDuplicate: false,
      duplicateGroupId: undefined,
      rawData: { ...raw, label }
    };
  });

  let duplicateCount = 0;
  let duplicateGroups = 0;
  contentMap.forEach((ids, content) => {
    if (ids.length > 1) {
      duplicateGroups++;
      duplicateCount += ids.length;
      const groupId = `dup_group_${duplicateGroups}`;
      ids.forEach((id, i) => {
        const sample = samples.find(s => s.originalId === id);
        if (sample) {
          sample.isDuplicate = i > 0;
          sample.duplicateGroupId = groupId;
        }
      });
    }
  });

  return {
    samples,
    metadata: {
      totalCount: samples.length,
      trainCount,
      valCount,
      testCount,
      labels: Array.from(labelSet),
      labelDistribution,
      duplicateCount,
      duplicateGroups
    }
  };
}

export interface ParsedSamplesForRun {
  samples: Sample[];
  dedupStats: {
    totalSamples: number;
    uniqueSamples: number;
    duplicateSamples: number;
    duplicateGroups: number;
  };
  distributionStats: {
    trainSplit: number;
    valSplit: number;
    testSplit: number;
    byLabel: Record<string, number>;
  };
}

export function prepareSamplesForRun(
  parsedSamples: ParsedSplitList['samples'],
  runId: string
): ParsedSamplesForRun {
  const uniqueSamples = parsedSamples.filter(s => !s.isDuplicate);
  const samples: Sample[] = parsedSamples.map(ps => ({
    id: generateId(),
    runId,
    originalId: ps.originalId,
    content: ps.content,
    sourceSplit: ps.sourceSplit,
    isDuplicate: ps.isDuplicate,
    duplicateGroupId: ps.duplicateGroupId,
    rawData: ps.rawData
  }));

  const splitCounts = { train: 0, val: 0, test: 0 };
  const byLabel: Record<string, number> = {};

  samples.forEach(s => {
    splitCounts[s.sourceSplit]++;
    const label = s.rawData?.label ?? '未标注';
    byLabel[label] = (byLabel[label] ?? 0) + 1;
  });

  return {
    samples,
    dedupStats: {
      totalSamples: samples.length,
      uniqueSamples: uniqueSamples.length,
      duplicateSamples: samples.length - uniqueSamples.length,
      duplicateGroups: new Set(parsedSamples.filter(s => s.duplicateGroupId).map(s => s.duplicateGroupId)).size
    },
    distributionStats: {
      trainSplit: splitCounts.train,
      valSplit: splitCounts.val,
      testSplit: splitCounts.test,
      byLabel
    }
  };
}
