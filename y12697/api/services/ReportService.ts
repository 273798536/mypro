import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SnapshotRepository } from '../repositories/SnapshotRepository.js';
import { RecordRepository } from '../repositories/RecordRepository.js';
import { HistoryRepository } from '../repositories/HistoryRepository.js';
import type { ReportData, TraceResult, TraceLink, ProcessingRecord, Snapshot } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, '..', '..', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

function generatePlainExplanation(snapshot: Snapshot, record: ProcessingRecord): string {
  const riskMap: Record<string, string> = {
    low: '低风险',
    medium: '中等风险',
    high: '较高风险',
    critical: '严重风险',
  };
  const parts: string[] = [];
  parts.push(`各位同事，这是【${snapshot.deviceName}】（编号 ${snapshot.code}）的施工交底说明。`);
  parts.push(``);
  if (record.coordinates) {
    parts.push(
      `本次设备定位坐标已核对：X=${record.coordinates.x.toFixed(2)}${record.coordinates.unit}，Y=${record.coordinates.y.toFixed(2)}${record.coordinates.unit}，Z=${record.coordinates.z.toFixed(2)}${record.coordinates.unit}。`,
    );
  }
  if (record.dimensions) {
    parts.push(
      `设备尺寸参数：宽 ${record.dimensions.width}${record.dimensions.unit} × 高 ${record.dimensions.height}${record.dimensions.unit} × 深 ${record.dimensions.depth}${record.dimensions.unit}。`,
    );
  }
  if (record.conversions && record.conversions.length > 0) {
    const convText = record.conversions
      .map((c) => `${c.value}${c.fromUnit} = ${c.converted.toFixed(3)}${c.toUnit}`)
      .join('，');
    parts.push(`单位换算已复核：${convText}。`);
  }
  if (record.riskNotes) {
    parts.push(`风险备注：${record.riskNotes}`);
  }
  parts.push(``);
  parts.push(
    `综合风险等级评估为【${riskMap[snapshot.riskLevel] || snapshot.riskLevel}】，请施工班组按照以上参数执行，如有疑问请在交底会上提出。`,
  );
  if (record.conclusion) {
    parts.push(`复核结论：${record.conclusion}`);
  }
  return parts.join('\n');
}

export const ReportService = {
  build(snapshotId: string): ReportData {
    const snapshot = SnapshotRepository.findById(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');
    const latestRecord = RecordRepository.findLatest(snapshotId);
    if (!latestRecord) {
      throw new Error('No processing record found');
    }
    const history = HistoryRepository.findBySnapshotId(snapshotId);
    const historySummary = history.map((h) => ({
      version: h.version,
      operator: h.operator,
      reason: h.changeReason,
      date: h.createdAt,
    }));
    return {
      snapshot,
      latestRecord,
      plainExplanation: generatePlainExplanation(snapshot, latestRecord),
      historySummary,
    };
  },

  downloadMarkdown(snapshotId: string): string {
    const data = ReportService.build(snapshotId);
    const lines: string[] = [];
    lines.push(`# ${data.snapshot.deviceName} 施工交底说明`);
    lines.push('');
    lines.push(`- 编号：${data.snapshot.code}`);
    lines.push(`- 风险等级：${data.snapshot.riskLevel}`);
    lines.push(`- 最后操作人：${data.snapshot.lastOperator}`);
    lines.push(`- 更新时间：${data.snapshot.updatedAt}`);
    lines.push('');
    lines.push('## 普通话解释（可直接复制）');
    lines.push('');
    lines.push(data.plainExplanation);
    lines.push('');
    lines.push('## 技术参数');
    lines.push('');
    if (data.latestRecord.coordinates) {
      lines.push('### 设备坐标');
      lines.push('');
      lines.push(`- X: ${data.latestRecord.coordinates.x} ${data.latestRecord.coordinates.unit}`);
      lines.push(`- Y: ${data.latestRecord.coordinates.y} ${data.latestRecord.coordinates.unit}`);
      lines.push(`- Z: ${data.latestRecord.coordinates.z} ${data.latestRecord.coordinates.unit}`);
      lines.push('');
    }
    if (data.latestRecord.dimensions) {
      lines.push('### 尺寸参数');
      lines.push('');
      lines.push(`- 宽: ${data.latestRecord.dimensions.width} ${data.latestRecord.dimensions.unit}`);
      lines.push(`- 高: ${data.latestRecord.dimensions.height} ${data.latestRecord.dimensions.unit}`);
      lines.push(`- 深: ${data.latestRecord.dimensions.depth} ${data.latestRecord.dimensions.unit}`);
      lines.push('');
    }
    if (data.latestRecord.conversions.length > 0) {
      lines.push('### 单位换算');
      lines.push('');
      for (const c of data.latestRecord.conversions) {
        lines.push(`- ${c.value}${c.fromUnit} → ${c.converted}${c.toUnit} (${c.formula})`);
      }
      lines.push('');
    }
    if (data.latestRecord.riskNotes) {
      lines.push('## 风险备注');
      lines.push('');
      lines.push(data.latestRecord.riskNotes);
      lines.push('');
    }
    if (data.latestRecord.conclusion) {
      lines.push('## 复核结论');
      lines.push('');
      lines.push(data.latestRecord.conclusion);
      lines.push('');
    }
    if (data.historySummary.length > 0) {
      lines.push('## 历史版本');
      lines.push('');
      for (const h of data.historySummary) {
        lines.push(`- v${h.version} · ${h.operator} · ${h.date} · ${h.reason}`);
      }
    }
    const content = lines.join('\n');
    const filename = `${data.snapshot.code}-报告.md`;
    const filepath = path.join(exportsDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  },

  trace(snapshotId: string, anomalyId: string): TraceResult {
    const snapshot = SnapshotRepository.findById(snapshotId);
    if (!snapshot) throw new Error('Snapshot not found');
    const records = RecordRepository.findBySnapshotId(snapshotId);
    const history = HistoryRepository.findBySnapshotId(snapshotId);
    const chain: TraceLink[] = [];
    chain.push({
      id: anomalyId,
      type: 'anomaly',
      label: '异常告警',
      description: `检测到与【${snapshot.deviceName}】相关的参数异常，编号 ${anomalyId}`,
      time: new Date().toISOString(),
    });
    chain.push({
      id: snapshot.id,
      type: 'snapshot',
      label: `截图清单 · ${snapshot.code}`,
      description: `设备：${snapshot.deviceName}，风险等级：${snapshot.riskLevel}，状态：${snapshot.status}`,
      time: snapshot.updatedAt,
    });
    if (records.length > 0) {
      const latest = records[0];
      chain.push({
        id: latest.id,
        type: 'record',
        label: '最新处理记录',
        description:
          (latest.conclusion || '无结论') +
          (latest.riskNotes ? `；风险备注：${latest.riskNotes}` : ''),
        time: latest.createdAt,
      });
    }
    if (history.length > 0) {
      const latestHistory = history[0];
      chain.push({
        id: latestHistory.id,
        type: 'opinion',
        label: `处理意见 v${latestHistory.version}`,
        description: `${latestHistory.operator}：${latestHistory.changeReason}`,
        time: latestHistory.createdAt,
      });
    }
    return { anomalyId, chain };
  },
};
