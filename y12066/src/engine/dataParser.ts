import type { BadRow, BadRowSource } from '@/types';

interface RawRow {
  lineNumber: number;
  content: string;
}

export function parseRawData(
  rawText: string,
  source: BadRowSource,
  expectedColumns: number,
  delimiter: string = ','
): { validRows: string[][]; badRows: BadRow[] } {
  const lines = rawText.split('\n');
  const validRows: string[][] = [];
  const badRows: BadRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const trimmed = line.trim();

    if (trimmed === '') {
      badRows.push({
        lineNumber,
        rawContent: line,
        reason: '空行',
        source,
      });
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('--')) {
      badRows.push({
        lineNumber,
        rawContent: line,
        reason: '备注行',
        source,
      });
      continue;
    }

    const columns = trimmed.split(delimiter).map(c => c.trim());

    if (columns.length < expectedColumns) {
      badRows.push({
        lineNumber,
        rawContent: line,
        reason: `缺列：期望 ${expectedColumns} 列，实际 ${columns.length} 列`,
        source,
      });
      continue;
    }

    const hasEmptyRequired = columns.slice(0, expectedColumns).some(c => c === '');
    if (hasEmptyRequired) {
      badRows.push({
        lineNumber,
        rawContent: line,
        reason: '必要列包含空值',
        source,
      });
      continue;
    }

    validRows.push(columns);
  }

  return { validRows, badRows };
}

export function parseFuelBarData(rawText: string): {
  fuelEntries: { step: number; fuel: number; event: string }[];
  badRows: BadRow[];
} {
  const { validRows, badRows } = parseRawData(rawText, 'fuel_bar', 3);
  const fuelEntries: { step: number; fuel: number; event: string }[] = [];

  for (const cols of validRows) {
    const step = parseInt(cols[0], 10);
    const fuel = parseFloat(cols[1]);
    const event = cols[2] || '';

    if (isNaN(step) || isNaN(fuel)) {
      badRows.push({
        lineNumber: badRows.length + validRows.indexOf(cols) + 1,
        rawContent: cols.join(','),
        reason: '数值解析失败',
        source: 'fuel_bar',
      });
      continue;
    }

    fuelEntries.push({ step, fuel, event });
  }

  return { fuelEntries, badRows };
}

export function parseMissionLogData(rawText: string): {
  logEntries: { step: number; action: string; result: string }[];
  badRows: BadRow[];
} {
  const { validRows, badRows } = parseRawData(rawText, 'mission_log', 3);
  const logEntries: { step: number; action: string; result: string }[] = [];

  for (const cols of validRows) {
    const step = parseInt(cols[0], 10);
    const action = cols[1];
    const result = cols[2] || '';

    if (isNaN(step)) {
      badRows.push({
        lineNumber: badRows.length + validRows.indexOf(cols) + 1,
        rawContent: cols.join(','),
        reason: '步骤号解析失败',
        source: 'mission_log',
      });
      continue;
    }

    logEntries.push({ step, action, result });
  }

  return { logEntries, badRows };
}

export function parseOrbitData(rawText: string): {
  orbitEntries: { id: string; name: string; radius: number; speed: number }[];
  badRows: BadRow[];
} {
  const { validRows, badRows } = parseRawData(rawText, 'orbit_data', 4);
  const orbitEntries: { id: string; name: string; radius: number; speed: number }[] = [];

  for (const cols of validRows) {
    const id = cols[0];
    const name = cols[1];
    const radius = parseFloat(cols[2]);
    const speed = parseFloat(cols[3]);

    if (isNaN(radius) || isNaN(speed)) {
      badRows.push({
        lineNumber: badRows.length + validRows.indexOf(cols) + 1,
        rawContent: cols.join(','),
        reason: '轨道参数解析失败',
        source: 'orbit_data',
      });
      continue;
    }

    orbitEntries.push({ id, name, radius, speed });
  }

  return { orbitEntries, badRows };
}
