import { parseDiameterToken, computeSedimentation } from './sedimentation';
import type { Sample } from '@/types';

export interface ParseResult {
  kind: 'add' | 'list' | 'filter' | 'select' | 'export' | 'clear' | 'help' | 'unknown';
  samples?: Sample[];
  status?: 'all' | 'normal' | 'boundary' | 'error';
  target?: 'csv' | 'png';
  id?: string;
  message?: string;
  error?: string;
}

function splitArgs(line: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inQuote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
    } else {
      cur += ch;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

export function parseCLILine(line: string): ParseResult {
  const trimmed = line.trim();
  if (!trimmed) return { kind: 'unknown', message: '(空命令)' };

  const tokens = splitArgs(trimmed);
  const [cmd = ''] = tokens;
  const rest = tokens.slice(1);

  switch (cmd.toLowerCase()) {
    case 'help':
      return {
        kind: 'help',
        message:
          '命令: add | list [--status normal|boundary|error] | filter status=... | select <id> | export csv|png | clear | help',
      };
    case 'clear':
      return { kind: 'clear' };
    case 'list': {
      let status: ParseResult['status'] = 'all';
      for (const t of rest) {
        if (t === '--status=normal') status = 'normal';
        else if (t === '--status=boundary') status = 'boundary';
        else if (t === '--status=error') status = 'error';
      }
      return { kind: 'list', status };
    }
    case 'filter': {
      let status: ParseResult['status'] = 'all';
      for (const t of rest) {
        const [k, v] = t.split('=');
        if (k === 'status' && (v === 'normal' || v === 'boundary' || v === 'error' || v === 'all')) {
          status = v as ParseResult['status'];
        }
      }
      return { kind: 'filter', status };
    }
    case 'select':
      return { kind: 'select', id: rest[0] };
    case 'export': {
      const t = (rest[0] || 'csv').toLowerCase();
      if (t === 'csv' || t === 'png') return { kind: 'export', target: t };
      return { kind: 'unknown', error: 'export 仅支持 csv 或 png' };
    }
    case 'add': {
      return parseAdd(rest);
    }
    default:
      return { kind: 'unknown', error: `未知命令: ${cmd}` };
  }
}

function parseAdd(tokens: string[]): ParseResult {
  const kv: Record<string, string> = {};
  for (const t of tokens) {
    const idx = t.indexOf('=');
    if (idx <= 0) continue;
    const k = t.slice(0, idx).toLowerCase();
    const v = t.slice(idx + 1);
    kv[k] = v;
  }

  const errors: string[] = [];
  const corrections: string[] = [];

  const dRaw = kv.d ?? kv['d='];
  if (!dRaw) return { kind: 'add', error: '缺少粒径 d=...' };

  const dParsed = parseDiameterToken(dRaw);
  if ('error' in dParsed) {
    errors.push(dParsed.error);
  }

  const particleDensity = parseFloat(kv.pp ?? kv.rho ?? kv['ρp'] ?? kv.dp ?? 'nan');
  const liquidViscosity = parseFloat(kv.mu ?? kv['μ'] ?? kv.visc ?? 'nan');
  const tempRaw = kv.t ?? kv.temp;
  const temperature = tempRaw !== undefined && tempRaw !== '' ? parseFloat(tempRaw) : null;
  const observationHeight = parseFloat(kv.h ?? kv.height ?? 'nan');
  const source = kv.src ?? kv.source ?? '未标注';
  const note = kv.note ?? '';

  if (Number.isNaN(particleDensity)) errors.push('颗粒密度缺失或非法');
  if (Number.isNaN(liquidViscosity)) errors.push('液体黏度缺失或非法');
  if (Number.isNaN(observationHeight)) errors.push('观测高度缺失或非法');
  if (tempRaw === undefined || tempRaw === '') errors.push('温度缺失');
  else if (Number.isNaN(temperature)) errors.push('温度非法');

  if (errors.length > 0) {
    return { kind: 'add', error: errors.join('；') };
  }

  const sample = computeSedimentation({
    diameter: dParsed as { value: number; unit: 'um' | 'mm' | 'cm' },
    particleDensity,
    liquidViscosity,
    temperature,
    observationHeight,
    source,
    note,
    corrections,
    raw: tokens.join(' '),
  });

  return { kind: 'add', samples: [sample] };
}
