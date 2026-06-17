import type { BatterySample, SampleType, ImportWarning, ImportResult, ParameterSet } from '../types';

function generateSampleId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function inferSampleType(
  temp: number,
  soc: number,
  r: number,
  params?: { baseTemp?: number; baseSoc?: number; tolerance?: number; baseR?: number }
): SampleType {
  const baseTemp = params?.baseTemp ?? 25;
  const baseSoc = params?.baseSoc ?? 80;
  const tolerance = params?.tolerance ?? 0.8;
  const baseR = params?.baseR ?? 3.0;

  const tempGap = Math.abs(temp - baseTemp);
  const socGap = Math.abs(soc - baseSoc);
  const errorR = Math.abs(r - baseR);

  if (tempGap > 8 && socGap > 30 && errorR > tolerance * 0.85) {
    return 'boundary';
  }
  if (temp < -10 || temp > 55 || r <= 0 || r > 100) {
    return 'gap';
  }
  return 'normal';
}

function validateSample(raw: unknown, index: number): { sample?: BatterySample; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];
  const o = raw as Record<string, unknown>;

  if (!o || typeof o !== 'object') {
    warnings.push({ level: 'error', message: `第 ${index + 1} 条数据不是对象，已跳过` });
    return { warnings };
  }

  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) {
    warnings.push({ level: 'warning', message: `第 ${index + 1} 条缺少 name，使用默认命名`, sampleName: `样本-${index + 1}` });
  }

  const coerceNumber = (v: unknown, fallback: number, field: string): number => {
    if (v === null || v === undefined || v === '') return fallback;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      warnings.push({ level: 'warning', message: `字段 ${field} 无法解析为数字，使用默认值 ${fallback}`, sampleName: name || `样本-${index + 1}` });
      return fallback;
    }
    return n;
  };

  const internalResistance = coerceNumber(o.internalResistance ?? o.r ?? o.resistance, 3.0, 'internalResistance');
  const temperature = coerceNumber(o.temperature ?? o.temp, 25, 'temperature');
  const soc = coerceNumber(o.soc ?? o.SOC, 80, 'soc');

  if (internalResistance <= 0) {
    warnings.push({ level: 'warning', message: `内阻异常（≤0），标记为采样缺口`, sampleName: name || `样本-${index + 1}` });
  }

  let type: SampleType = 'normal';
  if (typeof o.type === 'string' && ['normal', 'boundary', 'gap'].includes(o.type)) {
    type = o.type as SampleType;
  } else {
    type = inferSampleType(temperature, soc, internalResistance);
  }

  const photoUrl = typeof o.photoUrl === 'string' && o.photoUrl.length > 0
    ? o.photoUrl
    : 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=industrial%20battery%20testing%20workshop%20electronics&image_size=square';

  const testTime = typeof o.testTime === 'string' && o.testTime.length > 0
    ? o.testTime
    : new Date().toLocaleString('zh-CN');

  const notes = typeof o.notes === 'string' ? o.notes : undefined;
  const gapReason = typeof o.gapReason === 'string' ? o.gapReason : undefined;

  const finalName = name || `样本-${index + 1}`;

  const sample: BatterySample = {
    id: typeof o.id === 'string' && o.id.length > 0 ? o.id : generateSampleId(),
    name: finalName,
    photoUrl,
    type,
    internalResistance,
    temperature,
    testTime,
    soc: Math.max(0, Math.min(100, soc)),
    notes,
    gapReason
  };

  return { sample, warnings };
}

export interface ParsedJsonFile {
  samples?: unknown;
  parameterSets?: unknown;
  formatVersion?: unknown;
}

export async function parseBatteryJsonFile(file: File): Promise<ImportResult> {
  const warnings: ImportWarning[] = [];

  if (file.size > 10 * 1024 * 1024) {
    warnings.push({ level: 'error', message: `文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），超过 10MB 上限` });
    return { samples: [], warnings, source: file.name };
  }

  if (!file.name.toLowerCase().endsWith('.json')) {
    warnings.push({ level: 'warning', message: `文件后缀不是 .json，仍尝试按 JSON 解析：${file.name}` });
  }

  let text = '';
  try {
    text = await file.text();
  } catch (e) {
    warnings.push({ level: 'error', message: `读取文件失败：${(e as Error).message || '未知错误'}` });
    return { samples: [], warnings, source: file.name };
  }

  if (!text.trim()) {
    warnings.push({ level: 'error', message: '文件内容为空' });
    return { samples: [], warnings, source: file.name };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    warnings.push({ level: 'error', message: `JSON 解析失败：${(e as Error).message || '格式错误'}` });
    return { samples: [], warnings, source: file.name };
  }

  const samples: BatterySample[] = [];

  const pushValid = (arr: unknown[]) => {
    arr.forEach((raw, idx) => {
      const { sample, warnings: w } = validateSample(raw, idx);
      warnings.push(...w);
      if (sample) samples.push(sample);
    });
  };

  if (Array.isArray(parsed)) {
    pushValid(parsed);
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as ParsedJsonFile;
    if (Array.isArray(obj.samples)) {
      pushValid(obj.samples);
    } else if (obj.samples !== undefined) {
      warnings.push({ level: 'warning', message: '根字段 samples 不是数组' });
    }
    if (!Array.isArray(obj.samples) && !Array.isArray(parsed)) {
      const { sample, warnings: w } = validateSample(parsed, 0);
      warnings.push(...w);
      if (sample) samples.push(sample);
    }
  } else {
    warnings.push({ level: 'error', message: 'JSON 根节点必须是数组或对象' });
  }

  if (samples.length === 0 && warnings.filter(w => w.level === 'error').length === 0) {
    warnings.push({ level: 'warning', message: '未解析到任何有效样本' });
  }

  return { samples, warnings, source: file.name };
}

export async function mergeImageFilesAsSamples(files: File[]): Promise<ImportResult> {
  const warnings: ImportWarning[] = [];
  const samples: BatterySample[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!f.type.startsWith('image/')) {
      warnings.push({ level: 'warning', message: `跳过非图片文件：${f.name}` });
      continue;
    }

    let dataUrl = '';
    try {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let j = 0; j < bytes.byteLength; j++) binary += String.fromCharCode(bytes[j]);
      const base64 = btoa(binary);
      dataUrl = `data:${f.type};base64,${base64}`;
    } catch (e) {
      warnings.push({ level: 'error', message: `读取图片失败 ${f.name}：${(e as Error).message}`, sampleName: f.name });
      continue;
    }

    const sample: BatterySample = {
      id: generateSampleId(),
      name: f.name.replace(/\.[^./]+$/, '') || `现场照片-${i + 1}`,
      photoUrl: dataUrl,
      type: 'normal',
      internalResistance: 3.0,
      temperature: 25,
      testTime: new Date().toLocaleString('zh-CN'),
      soc: 80,
      notes: '图片导入，数值需手动修正'
    };

    samples.push(sample);
  }

  return { samples, warnings, source: `${files.length} 张现场照片` };
}

export function buildSampleFromForm(form: {
  name: string;
  internalResistance: string;
  temperature: string;
  soc: string;
  type: SampleType;
  testTime: string;
  notes?: string;
  gapReason?: string;
}): { sample?: BatterySample; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = [];

  if (!form.name.trim()) {
    warnings.push({ level: 'error', message: '样本名称不能为空' });
    return { warnings };
  }

  const r = Number(form.internalResistance);
  const t = Number(form.temperature);
  const s = Number(form.soc);

  if (!Number.isFinite(r) || r <= 0) {
    warnings.push({ level: 'error', message: '内阻必须为正数' });
  }
  if (!Number.isFinite(t)) {
    warnings.push({ level: 'error', message: '温度格式错误' });
  }
  if (!Number.isFinite(s) || s < 0 || s > 100) {
    warnings.push({ level: 'error', message: 'SOC 必须在 0-100 之间' });
  }

  if (warnings.some(w => w.level === 'error')) return { warnings };

  return {
    warnings,
    sample: {
      id: generateSampleId(),
      name: form.name.trim(),
      photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=industrial%20battery%20testing%20multimeter%20reading&image_size=square',
      type: form.type,
      internalResistance: r,
      temperature: t,
      testTime: form.testTime || new Date().toLocaleString('zh-CN'),
      soc: s,
      notes: form.notes || undefined,
      gapReason: form.gapReason || undefined
    }
  };
}

export function createJsonImportTemplate(): string {
  const example: Array<Partial<BatterySample>> = [
    {
      id: 'demo-001',
      name: '电池组示例-A',
      type: 'normal',
      internalResistance: 3.15,
      temperature: 26,
      soc: 78,
      testTime: '2026-06-15 10:20',
      notes: '这是正常样本示例'
    },
    {
      id: 'demo-002',
      name: '电池组示例-B（边界）',
      type: 'boundary',
      internalResistance: 3.92,
      temperature: 34,
      soc: 32,
      testTime: '2026-06-15 10:35',
      notes: '这是边界样本示例，type 字段可留空由系统自动推断'
    },
    {
      id: 'demo-003',
      name: '电池组示例-C（缺口）',
      type: 'gap',
      internalResistance: 0,
      temperature: 25,
      soc: 50,
      testTime: '2026-06-15 10:40',
      gapReason: '端子松脱，采样异常'
    }
  ];
  return JSON.stringify({ formatVersion: '1.0', samples: example }, null, 2);
}

export function validateParameterSets(raw: unknown): ParameterSet[] | null {
  if (!Array.isArray(raw)) return null;
  const result: ParameterSet[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const required = ['name', 'version', 'baseResistance', 'temperatureCoefficient', 'tolerance'];
    if (required.some(k => !(k in o))) continue;
    result.push({
      id: typeof o.id === 'string' ? o.id : `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(o.name),
      version: String(o.version),
      baseResistance: Number(o.baseResistance) || 3.0,
      baseTemperature: Number(o.baseTemperature ?? 25),
      baseSoc: Number(o.baseSoc ?? 80),
      temperatureCoefficient: Number(o.temperatureCoefficient) || 0.02,
      socCorrectionFactor: Number(o.socCorrectionFactor ?? 0.005),
      tolerance: Number(o.tolerance) || 0.8,
      updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toLocaleDateString('zh-CN')
    });
  }
  return result.length > 0 ? result : null;
}
