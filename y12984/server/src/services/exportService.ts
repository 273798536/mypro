import * as XLSX from 'xlsx';
import { getRun, getRuns } from './runService';
import { getRecordsByRun } from './recordService';
import { ANOMALY_TYPE_LABELS, MIGRATION_STATUS_LABELS, ANOMALY_STATUS_LABELS } from '../types';

export function buildExportWorkbook(runId: number): XLSX.WorkBook {
  const run = getRun(runId);
  if (!run) throw new Error('运行记录不存在');

  const records = getRecordsByRun(runId);
  const prevRuns = getRuns().filter((r) => r.id !== runId);
  const prevRun = prevRuns[0];

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['列存报表压缩评估 - 导出报告'],
    ['本次运行名称', run.run_name],
    ['本次运行时间', run.import_time],
    ['导入文件', run.filename],
    ['记录总数', run.total_records],
    ['异常记录数', run.anomaly_count],
    [''],
    ['对比信息'],
    prevRun
      ? ['上次运行名称', prevRun.run_name]
      : ['上次运行', '（无历史运行记录）'],
    prevRun ? ['上次运行时间', prevRun.import_time] : [],
    prevRun ? ['上次异常数', prevRun.anomaly_count] : [],
    prevRun
      ? ['异常数变化', (run.anomaly_count - prevRun.anomaly_count) > 0
          ? `+${run.anomaly_count - prevRun.anomaly_count}`
          : `${run.anomaly_count - prevRun.anomaly_count}`]
      : []
  ].filter((r) => r.length > 0);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, '概览');

  const recordsHeader = [
    '报表名称', '表名', '列数', '行数', '原始大小(MB)', '压缩后大小(MB)',
    '压缩率', '来源系统', '负责人', '是否有备份', '迁移状态',
    '异常类型', '异常级别', '异常描述', '下一步操作', '处理意见', '来源详情', '异常状态'
  ];

  const recordsData: any[][] = [recordsHeader];

  for (const r of records) {
    if (r.anomalies.length === 0) {
      recordsData.push([
        r.report_name, r.table_name, r.column_count, r.row_count,
        r.original_size_mb, r.compressed_size_mb,
        `${(r.compression_ratio * 100).toFixed(2)}%`,
        r.source_system, r.owner,
        r.backup_exists ? '是' : '否',
        MIGRATION_STATUS_LABELS[r.migration_status],
        '', '', '', '', '', '', ''
      ]);
    } else {
      for (const a of r.anomalies) {
        recordsData.push([
          r.report_name, r.table_name, r.column_count, r.row_count,
          r.original_size_mb, r.compressed_size_mb,
          `${(r.compression_ratio * 100).toFixed(2)}%`,
          r.source_system, r.owner,
          r.backup_exists ? '是' : '否',
          MIGRATION_STATUS_LABELS[r.migration_status],
          ANOMALY_TYPE_LABELS[a.anomaly_type],
          a.severity === 'error' ? '严重' : '警告',
          a.description,
          a.next_action,
          a.handling_opinion,
          a.source_details,
          ANOMALY_STATUS_LABELS[a.status]
        ]);
      }
    }
  }

  const wsRecords = XLSX.utils.aoa_to_sheet(recordsData);
  XLSX.utils.book_append_sheet(wb, wsRecords, '异常明细');

  const backupGapRecords = records.filter((r) =>
    r.anomalies.some((a) => a.anomaly_type === 'backup_gap')
  );
  if (backupGapRecords.length > 0) {
    const backupHeader = [
      ['备份缺口专项说明'],
      ['说明：以下报表因备份校验未通过被拦截，研发团队可根据下方明细判断是需要补充备份材料还是调整校验口径。'],
      [''],
      ['报表名称', '表名', '负责人', '来源系统', '异常描述', '下一步操作', '处理意见', '来源详情']
    ];
    const backupData: any[][] = [...backupHeader];
    for (const r of backupGapRecords) {
      const gap = r.anomalies.find((a) => a.anomaly_type === 'backup_gap');
      if (gap) {
        backupData.push([
          r.report_name, r.table_name, r.owner, r.source_system,
          gap.description, gap.next_action, gap.handling_opinion, gap.source_details
        ]);
      }
    }
    const wsBackup = XLSX.utils.aoa_to_sheet(backupData);
    XLSX.utils.book_append_sheet(wb, wsBackup, '备份缺口专项');
  }

  const permissionsHeader = [
    ['报表名称', '表名', '权限项', '被授权人', '授权人', '授权时间', '状态']
  ];
  const permData: any[][] = [permissionsHeader];
  let hasPerms = false;
  for (const r of records) {
    for (const p of r.permissions) {
      hasPerms = true;
      permData.push([
        r.report_name, r.table_name, p.permission_name, p.grantee, p.granted_by, p.granted_at, p.status
      ]);
    }
  }
  if (hasPerms) {
    const wsPerm = XLSX.utils.aoa_to_sheet(permData);
    XLSX.utils.book_append_sheet(wb, wsPerm, '权限清单');
  }

  return wb;
}

export function getExportFilename(runId: number): string {
  const run = getRun(runId);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `列存报表压缩评估_${run?.run_name || 'run'}_${ts}.xlsx`;
}
