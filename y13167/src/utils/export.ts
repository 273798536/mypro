import * as XLSX from 'xlsx';
import type { MotorTorqueRecord, PageSummary, ExportConfig } from '../types';

export function exportToExcel(
  records: MotorTorqueRecord[],
  summary: PageSummary,
  config: ExportConfig
): void {
  const wb = XLSX.utils.book_new();

  if (config.include_summary) {
    const summaryData = buildSummarySheetData(summary, config);
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, '页面摘要');
  }

  if (config.include_filter_criteria) {
    const filterData = buildFilterSheetData(summary.filter_criteria);
    const filterWs = XLSX.utils.json_to_sheet(filterData);
    XLSX.utils.book_append_sheet(wb, filterWs, '筛选口径');
  }

  if (config.include_diagnosis && summary.jump_events.length > 0) {
    const diagnosisData = buildDiagnosisSheetData(summary.jump_events);
    const diagnosisWs = XLSX.utils.json_to_sheet(diagnosisData);
    XLSX.utils.book_append_sheet(wb, diagnosisWs, '跳变诊断');
  }

  if (config.include_raw_data) {
    const dataSheetData = buildDataSheetData(records, config);
    const dataWs = XLSX.utils.json_to_sheet(dataSheetData);
    XLSX.utils.book_append_sheet(wb, dataWs, '原始数据');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `电机扭矩参数回放_${timestamp}.${config.format === 'xlsx' ? 'xlsx' : 'csv'}`;

  XLSX.writeFile(wb, fileName);
}

function buildSummarySheetData(summary: PageSummary, config: ExportConfig): Array<Record<string, string | number>> {
  const data: Array<Record<string, string | number>> = [
    { 项目: '总记录数', 数值: summary.total_records },
    { 项目: '筛选后记录数', 数值: summary.filtered_records },
    { 项目: '异常值数量', 数值: summary.outlier_count },
    { 项目: '重复设备数量', 数值: summary.duplicate_count },
    { 项目: '脏数据数量', 数值: summary.dirty_data_count },
    { 项目: '设备数', 数值: summary.device_count },
    { 项目: '最大扭矩', 数值: summary.max_torque },
    { 项目: '最小扭矩', 数值: summary.min_torque },
    { 项目: '平均扭矩', 数值: Number(summary.avg_torque.toFixed(2)) },
    { 项目: '跳变事件数', 数值: summary.jump_events.length },
    { 项目: '导出时间', 数值: new Date().toLocaleString('zh-CN') }
  ];

  if (summary.time_span) {
    data.push(
      { 项目: '时间范围开始', 数值: summary.time_span[0] },
      { 项目: '时间范围结束', 数值: summary.time_span[1] }
    );
  }

  return data;
}

function buildFilterSheetData(criteria: PageSummary['filter_criteria']): Array<Record<string, string>> {
  return [
    { 筛选项: '设备编号', 筛选值: criteria.device_ids.join(', ') || '全部' },
    { 筛选项: '时间范围', 筛选值: criteria.time_range
      ? `${criteria.time_range[0]} 至 ${criteria.time_range[1]}`
      : '全部' },
    { 筛选项: '扭矩范围', 筛选值: criteria.torque_range
      ? `${criteria.torque_range[0]} 至 ${criteria.torque_range[1]}`
      : '全部' },
    { 筛选项: '单位筛选', 筛选值: criteria.units.join(', ') || '全部' },
    { 筛选项: '仅显示异常值', 筛选值: criteria.show_outliers_only ? '是' : '否' },
    { 筛选项: '仅显示重复设备', 筛选值: criteria.show_duplicates_only ? '是' : '否' },
    { 筛选项: '仅显示脏数据', 筛选值: criteria.show_dirty_data_only ? '是' : '否' },
    { 筛选项: '关键词', 筛选值: criteria.keyword || '无' }
  ];
}

function buildDiagnosisSheetData(jumpEvents: PageSummary['jump_events']): Array<Record<string, string | number>> {
  const causeMap: Record<string, string> = {
    threshold_cross: '阈值穿越',
    unit_change: '单位变化',
    name_mismatch: '名称不一致',
    unknown: '未知原因'
  };

  return jumpEvents.map(event => ({
    记录ID: event.record_id,
    时间戳: event.timestamp,
    跳变值: event.jump_value.toFixed(2),
    跳变百分比: `${event.jump_percentage.toFixed(1)}%`,
    跳变原因: causeMap[event.cause] || event.cause,
    原因详情: event.cause_detail,
    前序记录ID: event.previous_record_id || '',
    前序值: event.previous_value?.toString() || '',
    前序单位: event.previous_unit || '',
    前序设备名: event.previous_name || ''
  }));
}

function buildDataSheetData(
  records: MotorTorqueRecord[],
  config: ExportConfig
): Array<Record<string, string | number | boolean>> {
  return records.map(record => {
    const row: Record<string, string | number | boolean> = {
      ID: record.id,
      时间戳: record.timestamp,
      设备编号: record.device_id,
      设备名称: record.device_name,
      扭矩值: record.torque_value,
      扭矩单位: record.torque_unit,
      额定扭矩: record.rated_torque,
      转速: record.speed,
      电流: record.current,
      温度: record.temperature,
      维修备注_原始: record.maintenance_note_raw,
      数据来源: record.data_source,
      创建时间: record.created_at,
      标签: record.tags.join(', ')
    };

    if (config.include_outlier_markers) {
      row['是否异常值'] = record.is_outlier;
      row['异常类型'] = record.outlier_reason || '';
      row['是否重复设备'] = record.is_device_duplicate;
      row['重复记录ID'] = record.duplicate_device_ids?.join(', ') || '';
      row['是否脏数据'] = record.is_data_dirty;
      if (record.maintenance_note_cleaned) {
        row['维修备注_清洗后'] = record.maintenance_note_cleaned;
      }
    }

    return row;
  });
}
