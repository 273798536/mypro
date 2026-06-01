import * as fs from 'fs';
import * as path from 'path';
import { SoloAnalysis, ExportPackage, Chord } from './types';
import { generateId } from './analyzer';
import { formatChordsForDisplay } from './corrector';
import { saveExport } from './store';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

function ensureExportDir(): void {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

export function generateReport(analysis: SoloAnalysis): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(70));
  lines.push('              爵士即兴Solo结构分析报告');
  lines.push('='.repeat(70));
  lines.push('');
  
  lines.push('【基本信息】');
  lines.push(`分析ID: ${analysis.id}`);
  lines.push(`演奏音频: ${analysis.audioFile}`);
  lines.push(`曲目名称: ${analysis.title}`);
  lines.push(`演奏者: ${analysis.artist || '(未填写)'}`);
  lines.push(`录音日期: ${analysis.dateRecorded || '(未填写)'}`);
  lines.push(`分析日期: ${analysis.dateAnalyzed}`);
  lines.push(`状态: ${getStatusText(analysis.status)}`);
  lines.push(`标记: ${getFlagsText(analysis)}`);
  lines.push('');
  
  lines.push('【和弦进行】');
  lines.push(formatChordsForDisplay(analysis.chordProgression));
  lines.push('');
  
  if (analysis.motifs.length > 0) {
    lines.push('【动机检测】');
    analysis.motifs.forEach((m, i) => {
      lines.push(`  ${i + 1}. ${m.name} (第${m.startBar}-${m.endBar}小节) - 置信度: ${(m.confidence * 100).toFixed(0)}%`);
    });
    lines.push('');
  }
  
  if (analysis.beatDrifts.length > 0) {
    lines.push('⚠️  【节拍漂移 - 坏行单独列出】');
    lines.push('─'.repeat(70));
    analysis.beatDrifts.forEach(d => {
      const severityText = d.severity === 'minor' ? '轻微' : d.severity === 'moderate' ? '中等' : '严重';
      const severityColor = d.severity === 'minor' ? '○' : d.severity === 'moderate' ? '△' : '×';
      lines.push(`  ${severityColor} 第${d.bar}小节第${d.beat}拍 - ${severityText}漂移 (${d.description})`);
      lines.push(`     漂移量: ${(d.driftAmount * 100).toFixed(1)}% | 检测时间: ${d.detectedAt}`);
    });
    lines.push('');
  }
  
  if (analysis.harmonyIssues.length > 0) {
    lines.push('【和声对齐问题】');
    analysis.harmonyIssues.forEach(h => {
      lines.push(`  • 第${h.bar}小节 - ${h.description}`);
    });
    lines.push('');
  }
  
  if (analysis.segments.length > 0) {
    lines.push('【回放片段】');
    analysis.segments.forEach(s => {
      lines.push(`  • ${s.name}: 第${s.startBar}-${s.endBar}小节 (${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s)`);
    });
    lines.push('');
  }
  
  if (analysis.notes) {
    lines.push('【备注】');
    lines.push(`  ${analysis.notes}`);
    lines.push('');
  }
  
  lines.push('【历史记录】');
  analysis.history.forEach(h => {
    const actionText = getActionText(h.action);
    lines.push(`  [${h.timestamp}] ${h.author} - ${actionText}: ${h.description}`);
  });
  lines.push('');
  
  lines.push('【导出复核信息】');
  lines.push(`  导出时间: ${new Date().toISOString()}`);
  lines.push(`  和弦数量: ${analysis.chordProgression.length}`);
  lines.push(`  节拍漂移: ${analysis.beatDrifts.length}处`);
  lines.push(`  动机数量: ${analysis.motifs.length}个`);
  lines.push('');
  lines.push('='.repeat(70));
  
  return lines.join('\n');
}

function getStatusText(status: string): string {
  const map: { [key: string]: string } = {
    draft: '草稿 (需人工审核)',
    analyzed: '已分析',
    corrected: '已修正',
    reviewed: '已审核',
  };
  return map[status] || status;
}

function getFlagsText(analysis: SoloAnalysis): string {
  const flags: string[] = [];
  if (analysis.hasMissingFields) flags.push('字段不完整');
  if (analysis.isLateEntry) flags.push('晚补记录');
  if (analysis.beatDrifts.length > 0) flags.push(`有${analysis.beatDrifts.length}处节拍漂移`);
  return flags.length > 0 ? flags.join(', ') : '无特殊标记';
}

function getActionText(action: string): string {
  const map: { [key: string]: string } = {
    created: '创建',
    analyzed: '分析',
    corrected: '修正',
    noted: '备注',
    exported: '导出',
  };
  return map[action] || action;
}

export function exportToText(analysis: SoloAnalysis): string {
  const report = generateReport(analysis);
  const safeTitle = analysis.title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
  const filename = `${analysis.id}_${safeTitle}.txt`;
  const filepath = path.join(EXPORT_DIR, filename);
  
  ensureExportDir();
  fs.writeFileSync(filepath, report, 'utf-8');
  
  const exp: ExportPackage = {
    exportId: generateId(),
    exportedAt: new Date().toISOString(),
    analysisId: analysis.id,
    audioFile: analysis.audioFile,
    chordProgression: analysis.chordProgression,
    reportFile: filename,
    status: analysis.status,
  };
  saveExport(exp);
  
  return filepath;
}

export function exportToJSON(analysis: SoloAnalysis): string {
  const safeTitle = analysis.title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
  const filename = `${analysis.id}_${safeTitle}.json`;
  const filepath = path.join(EXPORT_DIR, filename);
  
  ensureExportDir();
  fs.writeFileSync(filepath, JSON.stringify(analysis, null, 2), 'utf-8');
  
  const exp: ExportPackage = {
    exportId: generateId(),
    exportedAt: new Date().toISOString(),
    analysisId: analysis.id,
    audioFile: analysis.audioFile,
    chordProgression: analysis.chordProgression,
    reportFile: filename,
    status: analysis.status,
  };
  saveExport(exp);
  
  return filepath;
}

export function generateCorrespondenceTable(analyses: SoloAnalysis[]): string {
  const lines: string[] = [];
  lines.push('='.repeat(100));
  lines.push('                     演奏音频 - 和弦进行 - 报告 对应关系表');
  lines.push('='.repeat(100));
  lines.push('');
  lines.push('序号  状态    节拍漂移  演奏音频                     和弦数量    报告文件');
  lines.push('─'.repeat(100));
  
  analyses.forEach((a, i) => {
    const statusShort = a.status === 'draft' ? '草稿' : a.status === 'analyzed' ? '分析' : a.status === 'corrected' ? '修正' : '审核';
    const driftCount = a.beatDrifts.length > 0 ? `${a.beatDrifts.length}处` : ' 无 ';
    const safeTitle = a.title.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    const reportFile = `${a.id}_${safeTitle}.txt`.substring(0, 20);
    
    lines.push(
      String(i + 1).padEnd(4) +
      statusShort.padEnd(6) +
      driftCount.padEnd(8) +
      a.audioFile.substring(0, 25).padEnd(27) +
      String(a.chordProgression.length).padEnd(10) +
      reportFile
    );
  });
  
  lines.push('');
  lines.push('='.repeat(100));
  lines.push(`总计: ${analyses.length}条记录`);
  lines.push(`  - 节拍漂移: ${analyses.filter(a => a.beatDrifts.length > 0).length}条`);
  lines.push(`  - 字段完整: ${analyses.filter(a => !a.hasMissingFields).length}条`);
  lines.push(`  - 晚补记录: ${analyses.filter(a => a.isLateEntry).length}条`);
  
  return lines.join('\n');
}

export function exportCorrespondence(analyses: SoloAnalysis[]): string {
  const table = generateCorrespondenceTable(analyses);
  const filename = `correspondence_${Date.now()}.txt`;
  const filepath = path.join(EXPORT_DIR, filename);
  
  ensureExportDir();
  fs.writeFileSync(filepath, table, 'utf-8');
  
  return filepath;
}
