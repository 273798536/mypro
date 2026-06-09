import type { ExperimentBatch, ImpurityRecord, ProcessError } from '@/types';
import { generateMissingFieldError } from './errorFormatter';

export function cleanRawRecord(raw: string): {
  batches: Partial<ExperimentBatch>[];
  errors: ProcessError[];
} {
  const errors: ProcessError[] = [];
  const batches: Partial<ExperimentBatch>[] = [];

  const normalized = normalizeText(raw);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentBatch: Partial<ExperimentBatch> | null = null;
  let currentImpurities: ImpurityRecord[] = [];
  let impurityIndex = 0;

  const batchStartRegex = /^(批次[：:]|Batch[：:])\s*(.+)$/i;
  const keyValueRegex = /^(.+?)[：:]\s*(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const batchMatch = line.match(batchStartRegex);

    if (batchMatch) {
      if (currentBatch) {
        finalizeCurrentBatch();
      }
      currentBatch = createNewBatch(batchMatch[2].trim());
      currentImpurities = [];
      impurityIndex = 0;
      continue;
    }

    if (!currentBatch) {
      currentBatch = createNewBatch('');
      currentImpurities = [];
      impurityIndex = 0;
    }

    const kvMatch = line.match(keyValueRegex);
    if (kvMatch) {
      parseKeyValue(kvMatch[1].trim(), kvMatch[2].trim(), currentBatch, lineNumber, errors);
      continue;
    }

    const impurity = parseImpurityLine(line, lineNumber, errors);
    if (impurity) {
      impurity.id = `imp_${Date.now()}_${impurityIndex++}`;
      currentImpurities.push(impurity);
    }
  }

  function finalizeCurrentBatch() {
    if (!currentBatch) return;

    if (!currentBatch.batchId) {
      errors.push(generateMissingFieldError('batchId'));
    }
    if (currentImpurities.length === 0) {
      errors.push({
        code: 'NO_IMPURITIES',
        userMessage: '当前批次缺少杂质检测数据',
        suggestion: '请补充如 杂质A,0.12,0.5,药典2025 格式的杂质数据',
        missingFields: ['impurities'],
      });
    }

    currentBatch.impurities = currentImpurities;
    batches.push({ ...currentBatch });
  }

  finalizeCurrentBatch();

  return { batches, errors };
}

function normalizeText(text: string): string {
  return text
    .replace(/，/g, ',')
    .replace(/　/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

function createNewBatch(batchId: string): Partial<ExperimentBatch> {
  return {
    batchId: batchId || undefined,
    sampleName: undefined,
    recordDate: undefined,
    reactionConditions: {},
    impurities: [],
  };
}

function parseKeyValue(
  key: string,
  value: string,
  batch: Partial<ExperimentBatch>,
  lineNumber: number,
  errors: ProcessError[]
): void {
  const lowerKey = key.toLowerCase();

  if (/温度|temperature/i.test(lowerKey)) {
    const temp = extractNumber(value);
    if (temp !== null) {
      batch.reactionConditions!.temperature = temp;
    } else {
      errors.push(generateMissingFieldError('temperature', lineNumber));
    }
    return;
  }

  if (/ph/i.test(lowerKey)) {
    const ph = extractNumber(value);
    if (ph !== null) {
      batch.reactionConditions!.ph = ph;
    } else {
      errors.push(generateMissingFieldError('ph', lineNumber));
    }
    return;
  }

  if (/时间|time/i.test(lowerKey)) {
    const time = extractNumber(value);
    if (time !== null) {
      batch.reactionConditions!.time = time;
    } else {
      errors.push(generateMissingFieldError('time', lineNumber));
    }
    return;
  }

  if (/样品|sample|品名|name/i.test(lowerKey) && !/杂质/i.test(lowerKey)) {
    batch.sampleName = value;
    return;
  }

  if (/日期|date/i.test(lowerKey)) {
    batch.recordDate = value;
    return;
  }

  if (/批次|batch.?id|batchid/i.test(lowerKey)) {
    batch.batchId = value;
    return;
  }

  batch.reactionConditions![key] = value;
}

function parseImpurityLine(
  line: string,
  lineNumber: number,
  errors: ProcessError[]
): ImpurityRecord | null {
  const parts = line.split(',').map((p) => p.trim());

  if (parts.length < 3) {
    return null;
  }

  const name = parts[0];
  const measuredValue = extractNumber(parts[1]);
  const limitValue = extractNumber(parts[2]);
  const standard = parts[3] || '';

  if (!name) {
    errors.push(generateMissingFieldError('name', lineNumber));
    return null;
  }

  if (measuredValue === null) {
    errors.push(generateMissingFieldError('measuredValue', lineNumber));
    return null;
  }

  if (limitValue === null) {
    errors.push(generateMissingFieldError('limitValue', lineNumber));
    return null;
  }

  if (!standard) {
    errors.push(generateMissingFieldError('standard', lineNumber));
  }

  return {
    id: '',
    name,
    measuredValue,
    limitValue,
    standard,
  };
}

function extractNumber(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[^\d.\-]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
