import type { Anomaly, ReportOptions, SensorRecord, PointStatus } from '../../shared/types.js';
import { RecordService } from './RecordService.js';
import { AnomalyService } from './AnomalyService.js';
import { writeReport, getReportsDir, listReports } from '../storage/FileStorage.js';
import path from 'path';
import { POINT_STATUS_LABEL, DETECTION_TYPE_LABEL, ACTION_LABEL } from '../../shared/types.js';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function escape(str: string) {
  return str.replace(/\|/g, '\\|');
}

function renderOne(anomaly: Anomaly, record: SensorRecord | undefined): string {
  const lines: string[] = [];
  lines.push(`## 异常对象：${anomaly.point_id}  \`${anomaly.id}\``);
  lines.push('');
  lines.push('| 项目 | 内容 |');
  lines.push('| --- | --- |');
  lines.push(`| **点位编号** | \`${anomaly.point_id}\` |`);
  lines.push(`| **当前状态** | ${POINT_STATUS_LABEL[anomaly.status]} |`);
  lines.push(`| **异常类型** | ${DETECTION_TYPE_LABEL[anomaly.detection_reason.type]} |`);
  lines.push(`| **待确认原因** | ${escape(anomaly.detection_reason.description)} |`);
  const affected = anomaly.affected_points.map(p => `\`${p}\``).join('、');
  lines.push(`| **影响范围** | ${affected || '（无）'} |`);
  lines.push(`| **创建时间** | ${fmtDate(anomaly.created_at)} |`);
  lines.push(`| **更新时间** | ${fmtDate(anomaly.updated_at)} |`);
  lines.push('');

  lines.push(`### 空间位置`);
  if (record) {
    lines.push(`- 行号：第 ${record.row} 行`);
    lines.push(`- 列号：第 ${record.col} 列`);
    lines.push(`- 温度（原始值）：${record.temperature === null ? '**缺失**' : `\`${record.temperature}℃\``}`);
    lines.push(`- 湿度（原始值）：${record.humidity === null ? '**缺失**' : `\`${record.humidity}%\``}`);
  } else {
    lines.push(`> ⚠️ 关联的传感器记录不存在，可能已被删除或 ID 不匹配`);
  }
  lines.push('');

  lines.push(`### 复核备注（运营主管填写）`);
  if (anomaly.remark && anomaly.remark.trim()) {
    lines.push(anomaly.remark);
  } else {
    lines.push(`> （暂无备注，请在前端「异常详情」页填写）`);
  }
  lines.push('');

  if (record) {
    lines.push(`### 原始数据来源（保留痕迹，不做清洗）`);
    lines.push(`- 文件：\`${record.raw_source.file_name}\``);
    lines.push(`- 导入时间：${fmtDate(record.raw_source.import_time)}`);
    lines.push(`- 原始行号：第 ${record.raw_source.line_number} 行`);
    if (record.is_dirty) {
      lines.push(`- **脏数据标记**：是 — ${record.dirty_reason || ''}`);
    }
    lines.push('');
    lines.push(`#### 原始字段全量（raw_values）`);
    lines.push('| 字段 | 原始值 |');
    lines.push('| --- | --- |');
    for (const [k, v] of Object.entries(record.raw_source.raw_values)) {
      lines.push(`| ${escape(String(k))} | ${escape(String(v ?? ''))} |`);
    }
    lines.push('');
  }

  if (anomaly.operation_logs.length > 0) {
    lines.push(`### 操作留痕`);
    lines.push('| 时间 | 操作 | 操作者 | 详情 |');
    lines.push('| --- | --- | --- | --- |');
    for (const log of anomaly.operation_logs) {
      lines.push(`| ${fmtDate(log.time)} | ${ACTION_LABEL[log.action] ?? log.action} | ${log.operator} | ${escape(log.detail ?? '')} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

export interface ReportResult {
  markdown: string;
  filename: string;
  anomaly_count: number;
}

function applyFilter(anomalies: Anomaly[], opts: ReportOptions): Anomaly[] {
  let list = anomalies;
  if (opts.statuses && opts.statuses.length > 0) {
    const set = new Set<PointStatus>(opts.statuses);
    list = list.filter(a => set.has(a.status));
  }
  if (opts.point_range) {
    const { start, end } = opts.point_range;
    list = list.filter(a => a.point_id.localeCompare(start) >= 0 && a.point_id.localeCompare(end) <= 0);
  }
  if (opts.anomaly_ids && opts.anomaly_ids.length > 0) {
    const set = new Set(opts.anomaly_ids);
    list = list.filter(a => set.has(a.id));
  }
  return list;
}

export const ReportService = {
  generate(opts: ReportOptions = {}): ReportResult {
    const records = RecordService.getAll();
    const allAnomalies = AnomalyService.getAll();
    const list = applyFilter(allAnomalies, opts);

    const byId = new Map(records.map(r => [r.id, r]));
    const body: string[] = [];
    body.push(`# 数据中心冷通道空间复核报告`);
    body.push('');
    body.push(`> 生成时间：**${fmtDate(new Date().toISOString())}**`);
    body.push(`>`);
    body.push(`> 筛选条件：状态 ${opts.statuses?.map(s => POINT_STATUS_LABEL[s]).join(' / ') || '全部'}，点位 ${opts.point_range ? `${opts.point_range.start} ~ ${opts.point_range.end}` : '全部'}，指定异常数 ${opts.anomaly_ids?.length ?? 0}`);
    body.push('');
    body.push(`## 汇总`);
    body.push(`| 指标 | 数量 |`);
    body.push(`| --- | --- |`);
    body.push(`| 传感器记录总数 | ${records.length} |`);
    body.push(`| 脏数据（保留原始值） | ${records.filter(r => r.is_dirty).length} |`);
    body.push(`| 筛选后异常对象数 | ${list.length} |`);
    const counts: Record<PointStatus, number> = { normal: 0, pending: 0, confirmed_anomaly: 0, dismissed: 0 };
    for (const a of list) counts[a.status]++;
    body.push(`| - 待确认 | ${counts.pending} |`);
    body.push(`| - 已确认异常 | ${counts.confirmed_anomaly} |`);
    body.push(`| - 已驳回 | ${counts.dismissed} |`);
    body.push('');
    body.push(`---`);
    body.push('');

    for (const anomaly of list) {
      const record = byId.get(anomaly.sensor_record_id);
      body.push(renderOne(anomaly, record));
    }

    if (list.length === 0) {
      body.push(`> 🎉 当前筛选条件下没有异常对象。`);
      body.push('');
    }

    const md = body.join('\n');
    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}`;
    const filename = `report_${stamp}.md`;
    return { markdown: md, filename, anomaly_count: list.length };
  },

  generateSingle(anomalyId: string): ReportResult | null {
    const anomaly = AnomalyService.getById(anomalyId);
    if (!anomaly) return null;
    const record = RecordService.getById(anomaly.sensor_record_id);
    const body: string[] = [];
    body.push(`# 数据中心冷通道空间复核 — 单异常对象报告`);
    body.push('');
    body.push(`> 生成时间：**${fmtDate(new Date().toISOString())}**`);
    body.push('');
    body.push(renderOne(anomaly, record));
    const md = body.join('\n');
    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}`;
    const filename = `single_${anomaly.id}_${stamp}.md`;
    return { markdown: md, filename, anomaly_count: 1 };
  },

  saveToDisk(result: ReportResult): string {
    return writeReport(result.filename, result.markdown);
  },

  listReports() {
    return listReports();
  },

  getReportPath(filename: string): string | null {
    const p = path.join(getReportsDir(), filename);
    // 防止目录穿越
    if (!p.startsWith(getReportsDir())) return null;
    const fs = require('fs');
    if (!fs.existsSync(p)) return null;
    return p;
  },
};
