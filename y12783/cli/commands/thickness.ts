import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateThickness, generateId } from '../../shared/utils/calculate.js';
import type { ThicknessParameters, ThicknessAlgorithm } from '../../shared/types/index.js';

interface ProcessOptions {
  inputDir: string;
  outputDir: string;
  algorithm: string;
  onlyBlankMissing: boolean;
  logLevel: string;
}

interface ProcessResult {
  total: number;
  success: number;
  skipped: number;
  errors: string[];
  outputFile: string;
  summaryFile: string;
}

interface InputRecord {
  batchNo: string;
  materialNo: string;
  materialName?: string;
  wavelength: number;
  refractiveIndex: number;
  reflectance?: number;
  transmittance?: number;
  blankControlComplete?: boolean;
  operator?: string;
  remark?: string;
  version?: number;
}

interface OutputRecord {
  id: string;
  batchNo: string;
  materialNo: string;
  materialName?: string;
  version: number;
  algorithm: ThicknessAlgorithm;
  blankControlComplete: boolean;
  parameters: ThicknessParameters;
  thicknessNm: number;
  confidenceMin: number;
  confidenceMax: number;
  source: 'cli';
  operator: string;
  status: 'pass' | 'pending' | 'fail';
  remark?: string;
  createdAt: string;
}

function log(level: string, message: string, minLevel: string) {
  const levels = ['error', 'warn', 'info'];
  const currentLevel = levels.indexOf(minLevel);
  const msgLevel = levels.indexOf(level);
  if (msgLevel <= currentLevel) {
    const prefix = level === 'error' ? '[错误]' : level === 'warn' ? '[警告]' : '[信息]';
    console.log(`${prefix} ${message}`);
  }
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readInputFiles(inputDir: string, logLevel: string): InputRecord[] {
  const records: InputRecord[] = [];

  if (!fs.existsSync(inputDir)) {
    log('error', `输入目录不存在: ${inputDir}`, logLevel);
    return records;
  }

  const files = fs.readdirSync(inputDir).filter(
    (f) => f.endsWith('.json') && !f.startsWith('.')
  );

  log('info', `发现 ${files.length} 个 JSON 文件`, logLevel);

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        records.push(...data);
      } else if (typeof data === 'object' && data !== null) {
        records.push(data);
      }

      log('info', `读取文件: ${file} (${Array.isArray(data) ? data.length : 1} 条记录)`, logLevel);
    } catch (err) {
      log('warn', `读取文件失败 ${file}: ${(err as Error).message}`, logLevel);
    }
  }

  return records;
}

function validateRecord(record: InputRecord, index: number, logLevel: string): boolean {
  if (!record.batchNo) {
    log('warn', `第 ${index} 条: 缺少 batchNo（批次号），跳过`, logLevel);
    return false;
  }
  if (!record.materialNo) {
    log('warn', `第 ${index} 条: 缺少 materialNo（材料编号），跳过`, logLevel);
    return false;
  }
  if (record.wavelength === undefined || record.wavelength <= 0) {
    log('warn', `第 ${index} 条 (${record.batchNo}): 波长无效，跳过`, logLevel);
    return false;
  }
  if (record.refractiveIndex === undefined || record.refractiveIndex <= 0) {
    log('warn', `第 ${index} 条 (${record.batchNo}): 折射率无效，跳过`, logLevel);
    return false;
  }
  return true;
}

function getVersionMap(records: InputRecord[]): Map<string, number> {
  const versionMap = new Map<string, number>();
  for (const record of records) {
    const key = `${record.batchNo}-${record.materialNo}`;
    const current = versionMap.get(key) || 0;
    if (record.version !== undefined && record.version > current) {
      versionMap.set(key, record.version);
    } else if (record.version === undefined) {
      versionMap.set(key, current + 1);
    }
  }
  return versionMap;
}

export async function processThickness(options: ProcessOptions): Promise<ProcessResult> {
  const { inputDir, outputDir, algorithm, onlyBlankMissing, logLevel } = options;

  log('info', '开始批量处理厚度估算...', logLevel);
  log('info', `输入目录: ${inputDir}`, logLevel);
  log('info', `输出目录: ${outputDir}`, logLevel);
  log('info', `算法: ${algorithm}`, logLevel);
  log('info', `仅处理空白对照缺失: ${onlyBlankMissing ? '是' : '否'}`, logLevel);

  const inputRecords = readInputFiles(inputDir, logLevel);
  log('info', `共读取 ${inputRecords.length} 条记录`, logLevel);

  const results: OutputRecord[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let success = 0;

  const versionMap = new Map<string, number>();
  const now = new Date().toISOString();

  for (let i = 0; i < inputRecords.length; i++) {
    const record = inputRecords[i];

    if (!validateRecord(record, i + 1, logLevel)) {
      skipped++;
      continue;
    }

    const blankComplete = record.blankControlComplete !== false;

    if (onlyBlankMissing && blankComplete) {
      log('info', `跳过 ${record.batchNo}: 空白对照完整`, logLevel);
      skipped++;
      continue;
    }

    try {
      const parameters: ThicknessParameters = {
        wavelength: record.wavelength,
        refractiveIndex: record.refractiveIndex,
      };
      if (record.reflectance !== undefined) {
        parameters.reflectance = record.reflectance;
      }
      if (record.transmittance !== undefined) {
        parameters.transmittance = record.transmittance;
      }

      const algo: ThicknessAlgorithm = algorithm === 'degraded' || !blankComplete
        ? 'degraded_cli'
        : 'standard';

      const calcResult = calculateThickness(parameters, algo, blankComplete);

      const key = `${record.batchNo}-${record.materialNo}`;
      const currentVersion = versionMap.get(key) || 0;
      const nextVersion = currentVersion + 1;
      versionMap.set(key, nextVersion);

      const outputRecord: OutputRecord = {
        id: generateId('t-cli-'),
        batchNo: record.batchNo,
        materialNo: record.materialNo,
        materialName: record.materialName,
        version: nextVersion,
        algorithm: algo,
        blankControlComplete: blankComplete,
        parameters,
        thicknessNm: calcResult.thicknessNm,
        confidenceMin: calcResult.confidenceMin,
        confidenceMax: calcResult.confidenceMax,
        source: 'cli',
        operator: record.operator || 'cli-system',
        status: blankComplete ? 'pass' : 'pending',
        remark: record.remark || (!blankComplete ? '空白对照缺失，降级估算' : undefined),
        createdAt: now,
      };

      results.push(outputRecord);
      success++;

      log(
        'info',
        `处理完成 ${record.batchNo}: ${calcResult.thicknessNm} nm (v${nextVersion})`,
        logLevel
      );
    } catch (err) {
      const msg = `${record.batchNo}: ${(err as Error).message}`;
      errors.push(msg);
      log('error', msg, logLevel);
    }
  }

  ensureDir(outputDir);

  const outputFile = path.join(outputDir, 'thickness_results.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
  log('info', `结果已写入: ${outputFile}`, logLevel);

  const summaryFile = path.join(outputDir, 'summary.csv');
  const csvHeaders = [
    '批次号',
    '材料编号',
    '材料名称',
    '版本',
    '算法',
    '空白对照',
    '厚度(nm)',
    '置信区间下限',
    '置信区间上限',
    '来源',
    '操作员',
    '状态',
    '备注',
    '创建时间',
  ];
  const csvRows = results.map((r) => [
    r.batchNo,
    r.materialNo,
    r.materialName || '',
    String(r.version),
    r.algorithm === 'standard' ? '标准算法' : '降级算法',
    r.blankControlComplete ? '完整' : '缺失',
    String(r.thicknessNm),
    String(r.confidenceMin),
    String(r.confidenceMax),
    'CLI',
    r.operator,
    r.status === 'pass' ? '通过' : r.status === 'fail' ? '未通过' : '待确认',
    r.remark || '',
    r.createdAt,
  ]);

  const csvContent = [
    csvHeaders.join(','),
    ...csvRows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  fs.writeFileSync(summaryFile, '\uFEFF' + csvContent, 'utf-8');
  log('info', `摘要已写入: ${summaryFile}`, logLevel);

  return {
    total: inputRecords.length,
    success,
    skipped,
    errors,
    outputFile,
    summaryFile,
  };
}
