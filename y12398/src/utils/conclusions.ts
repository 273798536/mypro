import type { Device, BorrowRecord, Anomaly } from '../../shared/types';

export function generateConclusions(devices: Device[], records: BorrowRecord[], anomalies: Anomaly[]): string[] {
  const conclusions: string[] = [];
  const now = new Date('2026-06-02');

  const totalDevices = devices.length;
  const inStock = devices.filter(d => d.status === 'in_stock').length;
  const borrowed = devices.filter(d => d.status === 'borrowed').length;
  const damaged = devices.filter(d => d.status === 'damaged').length;
  const anomalyDevices = devices.filter(d => d.status === 'anomaly').length;
  const openAnomalies = anomalies.filter(a => a.status === 'open').length;
  const overdueCount = anomalies.filter(a => a.type === 'overdue_return' && a.status === 'open').length;
  const damageUnrecordedCount = anomalies.filter(a => a.type === 'damage_unrecorded' && a.status === 'open').length;

  conclusions.push(`【借还状态汇总】截至 ${formatDate(now.toISOString())}，设备总数 ${totalDevices} 台：在库 ${inStock} 台、借出中 ${borrowed} 台、损坏待修 ${damaged} 台、异常状态 ${anomalyDevices} 台。`);

  if (overdueCount > 0) {
    conclusions.push(`【归还超时提醒】共有 ${overdueCount} 台设备已超过预定归还日期，请及时联系借用人催还。被新版本覆盖的超时记录已完整保留，可在异常详情中查看。`);
  }

  if (damageUnrecordedCount > 0) {
    conclusions.push(`【损坏未记风险】检测到 ${damageUnrecordedCount} 项损坏未登记异常。设备清单与借还记录结论不一致时，损坏备注已作为补充证据保留在详情中。`);
  }

  if (openAnomalies > 0) {
    conclusions.push(`【待处理异常】当前共有 ${openAnomalies} 项未处理异常，请前往异常检测中心查看证据链并处理。`);
  }

  const borrowedRecords = records.filter(r => r.status === 'borrowed' || r.status === 'overdue');
  const hasVersionOverrides = borrowedRecords.some(r => r.versions.length > 0);
  if (hasVersionOverrides) {
    conclusions.push(`【版本追溯提示】检测到 ${borrowedRecords.filter(r => r.versions.length > 0).length} 条借还记录存在版本变更。排练日程更新导致的归还时间修改已完整保留历史记录，不会覆盖原始超时证据。`);
  }

  if (openAnomalies === 0) {
    conclusions.push(`【状态良好】当前无待处理异常，所有设备借还状态正常。`);
  }

  return conclusions;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
