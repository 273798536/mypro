import type { CalcParams, CalcResult, DroneSpec, BatterySpec } from '../types';

export function exportToCSV(
  params: CalcParams,
  result: CalcResult,
  drone: DroneSpec,
  battery: BatterySpec,
  sourceRef: string
): string {
  const rows: string[][] = [];
  
  rows.push(['无人机电池续航试算报告']);
  rows.push(['生成时间', new Date().toLocaleString('zh-CN')]);
  rows.push(['数据来源', sourceRef]);
  rows.push([]);
  
  rows.push(['=== 设备参数 ===']);
  rows.push(['项目', '数值', '单位', '来源']);
  rows.push(['无人机型号', drone.name, '', drone.sourceRef]);
  rows.push(['空机重量', drone.emptyWeight.toString(), 'kg', drone.sourceRef]);
  rows.push(['最大载重', drone.maxPayload.toString(), 'kg', drone.sourceRef]);
  rows.push(['悬停功率', drone.hoverPower.toString(), 'W', drone.sourceRef]);
  rows.push(['巡航速度', drone.cruiseSpeed.toString(), 'm/s', drone.sourceRef]);
  rows.push(['迎风面积', drone.frontalArea.toString(), 'm²', drone.sourceRef]);
  rows.push(['风阻系数', drone.dragCoefficient.toString(), '', drone.sourceRef]);
  rows.push([]);
  
  rows.push(['电池型号', battery.name, '', battery.sourceRef]);
  rows.push(['电池容量', battery.capacityWh.toString(), 'Wh', battery.sourceRef]);
  rows.push(['电池电压', battery.voltage.toString(), 'V', battery.sourceRef]);
  rows.push(['电池重量', battery.weight.toString(), 'kg', battery.sourceRef]);
  rows.push(['放电效率', (battery.dischargeEfficiency * 100).toFixed(0) + '%', '', battery.sourceRef]);
  rows.push([]);
  
  rows.push(['=== 飞行参数 ===']);
  rows.push(['项目', '数值', '单位', '来源行号']);
  rows.push(['载重', params.payload.toFixed(1), 'kg', 'params.payload']);
  rows.push(['风速', params.windSpeed.toFixed(1), 'm/s', 'params.windSpeed']);
  rows.push(['风向', params.windDirection.toString(), '°', 'params.windDirection']);
  rows.push(['航线距离', params.routeDistance.toFixed(0), 'm', 'params.routeDistance']);
  rows.push(['飞行高度', params.altitude.toString(), 'm', 'params.altitude']);
  rows.push(['返航余量比例', (params.returnReserveRatio * 100).toFixed(0) + '%', '', 'params.returnReserveRatio']);
  rows.push([]);
  
  rows.push(['=== 能耗明细 ===']);
  rows.push(['项目', '能耗', '单位', '占比']);
  const total = result.totalEnergyNeeded;
  rows.push(['悬停能耗', result.breakdown.hoverEnergy.toFixed(1), 'Wh', ((result.breakdown.hoverEnergy / total) * 100).toFixed(1) + '%']);
  rows.push(['爬升能耗', result.breakdown.climbEnergy.toFixed(1), 'Wh', ((result.breakdown.climbEnergy / total) * 100).toFixed(1) + '%']);
  rows.push(['前飞能耗(去程)', result.breakdown.cruiseOutEnergy.toFixed(1), 'Wh', ((result.breakdown.cruiseOutEnergy / total) * 100).toFixed(1) + '%']);
  rows.push(['前飞能耗(回程)', result.breakdown.cruiseBackEnergy.toFixed(1), 'Wh', ((result.breakdown.cruiseBackEnergy / total) * 100).toFixed(1) + '%']);
  rows.push(['逆风附加能耗', result.breakdown.windPenalty.toFixed(1), 'Wh', ((result.breakdown.windPenalty / total) * 100).toFixed(1) + '%']);
  rows.push(['载重附加能耗', result.breakdown.payloadPenalty.toFixed(1), 'Wh', ((result.breakdown.payloadPenalty / total) * 100).toFixed(1) + '%']);
  rows.push(['返航余量', result.reserveEnergy.toFixed(1), 'Wh', ((result.reserveEnergy / total) * 100).toFixed(1) + '%']);
  rows.push([]);
  
  rows.push(['=== 结果汇总 ===']);
  rows.push(['项目', '数值', '单位']);
  rows.push(['总能耗', result.totalEnergyNeeded.toFixed(1), 'Wh']);
  rows.push(['可用电量', (battery.capacityWh * battery.dischargeEfficiency).toFixed(1), 'Wh']);
  rows.push(['剩余电量', result.remainingEnergy.toFixed(1), 'Wh']);
  rows.push(['飞行时间', result.flightTime.toFixed(1), '分钟']);
  rows.push(['有效航程', result.effectiveRange.toFixed(0), 'm']);
  rows.push([]);
  
  rows.push(['=== 告警信息 ===']);
  if (result.warnings.length > 0) {
    rows.push(['严重程度', '类型', '描述', '来源行号']);
    for (const w of result.warnings) {
      rows.push([w.severity === 'error' ? '错误' : '警告', w.type, w.message, w.sourceLine]);
    }
  } else {
    rows.push(['无告警']);
  }
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
