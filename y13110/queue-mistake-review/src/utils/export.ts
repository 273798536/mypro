import html2canvas from 'html2canvas';
import type { MistakeRecord } from '../types';
import { ProcessStatusLabel } from '../types';

export interface ExportOptions {
  filename?: string;
  includeTimestamp?: boolean;
  scale?: number;
}

export interface ExportMetadata {
  queueNumber: number;
  title: string;
  status: string;
  statusLabel: string;
  unitPassed: boolean;
  unitIssues: string[];
  hasLateAttachment: boolean;
  hasJump: boolean;
  dataSource: string;
  exportedAt: string;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\s]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

export function buildExportMetadata(record: MistakeRecord): ExportMetadata {
  const unitIssues: string[] = [];
  if (!record.unitCheck.passed) {
    if (record.unitCheck.missingUnits.length > 0) {
      unitIssues.push('单位缺失');
    }
    if (record.unitCheck.unitMismatch) {
      unitIssues.push('单位不匹配');
    }
  }
  const hasLateAttachment = record.attachments.some(a => a.isLateArrival);
  const hasJump = record.jumpAnalysis?.hasJump ?? false;

  return {
    queueNumber: record.queueNumber,
    title: record.title,
    status: record.status,
    statusLabel: ProcessStatusLabel[record.status],
    unitPassed: record.unitCheck.passed,
    unitIssues,
    hasLateAttachment,
    hasJump,
    dataSource: record.dataSource,
    exportedAt: new Date().toISOString()
  };
}

export function buildExportFilename(metadata: ExportMetadata): string {
  const statusTag = metadata.statusLabel;
  const issueTags: string[] = [];
  if (metadata.unitIssues.length > 0) {
    issueTags.push(metadata.unitIssues.join('+'));
  }
  if (metadata.hasLateAttachment) {
    issueTags.push('晚到附件');
  }
  if (metadata.hasJump) {
    issueTags.push('结果跳变');
  }
  const statusOrException = issueTags.length > 0 
    ? `${statusTag}_${issueTags.join('_')}` 
    : `${statusTag}_无异常`;
  const date = metadata.exportedAt.slice(0, 10);
  const cleanTitle = sanitizeFilename(metadata.title);
  const cleanTags = sanitizeFilename(statusOrException);
  return `错题#${metadata.queueNumber}_${cleanTags}_${cleanTitle}_${date}`;
}

export function generateExportFilenameFromRecord(record: MistakeRecord): string {
  const metadata = buildExportMetadata(record);
  return buildExportFilename(metadata);
}

export async function exportElementAsImage(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = '错题复盘',
    includeTimestamp = false,
    scale = 2
  } = options;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const link = document.createElement('a');
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  link.download = `${filename}${timestamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function exportMistakeAsImage(
  element: HTMLElement,
  record: MistakeRecord
): Promise<{ filename: string; metadata: ExportMetadata }> {
  const metadata = buildExportMetadata(record);
  const filename = buildExportFilename(metadata);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  return { filename: `${filename}.png`, metadata };
}

export async function exportElementAsCanvas(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<HTMLCanvasElement> {
  const { scale = 2 } = options;

  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });
}

export function verifyExportConsistency(
  record: MistakeRecord,
  metadata: ExportMetadata
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (record.queueNumber !== metadata.queueNumber) {
    issues.push(`排队号不一致：页面=${record.queueNumber}，导出=${metadata.queueNumber}`);
  }
  if (record.status !== metadata.status) {
    issues.push(`状态不一致：页面=${record.status}，导出=${metadata.status}`);
  }
  if (record.unitCheck.passed !== metadata.unitPassed) {
    issues.push(`单位校验结果不一致：页面=${record.unitCheck.passed ? '通过' : '异常'}，导出=${metadata.unitPassed ? '通过' : '异常'}`);
  }

  return { valid: issues.length === 0, issues };
}

export function generateExportFilename(baseName: string, includeTimestamp: boolean = true): string {
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  return `${baseName}${timestamp}`;
}

export function getStatusLabelForExport(status: string, statusMap: Record<string, string>): string {
  return statusMap[status] || status;
}
